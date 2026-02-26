import { NextRequest, NextResponse } from "next/server";
import type Omise from "omise";

import { getUserFromRequest } from "@/lib/auth-server";
import { getOmiseClient } from "@/lib/omise";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const DEFAULT_CURRENCY = "thb";
const MIN_PROMPTPAY_AMOUNT_THB = 20;

type ChargeRequestBody = {
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  token?: string;
  source?: string;
  customer?: string;
  capture?: boolean;
  propertyId?: string;
};

const sanitizeAmount = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const extractOmiseError = (error: unknown) => {
  if (error instanceof Error) {
    return { message: error.message };
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage =
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : undefined;
    const maybeCode =
      "code" in error && typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : undefined;
    return {
      message: maybeMessage ?? "Unexpected Omise error.",
      code: maybeCode,
    };
  }

  return { message: "Unexpected Omise error." };
};

export async function POST(request: NextRequest) {
  try {
    const authResult = await getUserFromRequest(request);

    if (!authResult.user || authResult.error) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณาเข้าสู่ระบบก่อนชำระเงิน (Please login)",
        },
        { status: 401 }
      );
    }

    // Parse body first to get propertyId
    const body = (await request.json()) as ChargeRequestBody;
    const {
      amount,
      currency = DEFAULT_CURRENCY,
      description,
      metadata,
      token,
      source,
      customer,
      propertyId,
      capture = true,
    } = body;

    // Check user role, property existence, and existing payment in parallel
    const supabaseAdmin = createSupabaseAdmin();

    const [userResult, propertyResult, existingPaymentResult] =
      await Promise.all([
        supabaseAdmin
          .from("users")
          .select("role")
          .eq("id", authResult.user.id)
          .maybeSingle(),
        propertyId
          ? supabaseAdmin
              .from("properties")
              .select(
                `
              id,
              property_details (
                project_name
              )
            `
              )
              .eq("id", propertyId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        propertyId
          ? supabaseAdmin
              .from("property_payments")
              .select("id, status")
              .eq("user_id", authResult.user.id)
              .eq("property_id", propertyId)
              .eq("status", "successful")
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

    const { data: userData, error: userError } = userResult;
    const { data: propertyRecord, error: propertyError } = propertyResult;
    const { data: existingPayment, error: existingPaymentError } =
      existingPaymentResult;

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลผู้ใช้ กรุณาลองใหม่อีกครั้ง" },
        { status: 404 }
      );
    }

    const userRole = userData.role;

    const normalizedAmount = sanitizeAmount(amount);

    if (!normalizedAmount || normalizedAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Amount is required, must be numeric, and greater than zero.",
        },
        { status: 400 }
      );
    }

    // System Separation Logic
    // Case 1: Contact Agent Purchase (Small amount, e.g. 20 THB)
    if (normalizedAmount <= 50) {
      if (userRole !== "customer") {
        return NextResponse.json(
          {
            success: false,
            error: "รายการนี้สำหรับลูกค้าทั่วไปเท่านั้น (Only Customers)",
          },
          { status: 403 }
        );
      }
    }
    // Case 2: Package Purchase (Larger amount, e.g. 69+ THB)
    else {
      if (userRole !== "agent") {
        return NextResponse.json(
          {
            success: false,
            error: "รายการนี้สำหรับนายหน้าเท่านั้น (Only Agents)",
          },
          { status: 403 }
        );
      }
    }

    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: "propertyId is required." },
        { status: 400 }
      );
    }

    if (!token && !source && !customer) {
      return NextResponse.json(
        {
          success: false,
          error: "Provide at least one of token, source, or customer.",
        },
        { status: 400 }
      );
    }

    if (propertyError || !propertyRecord) {
      return NextResponse.json(
        { success: false, error: "ไม่พบประกาศที่ต้องการ" },
        { status: 404 }
      );
    }

    if (existingPaymentError) {
      console.error("Failed to check existing payments:", existingPaymentError);
    }

    if (existingPayment) {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        charge: null,
      });
    }

    const effectiveAmount = Math.max(
      Number(normalizedAmount),
      MIN_PROMPTPAY_AMOUNT_THB
    );
    const amountInMinorUnit = Math.round(effectiveAmount * 100);

    const projectName =
      (propertyRecord.property_details as Array<{ project_name?: any }>)?.[0]
        ?.project_name?.th ||
      (propertyRecord.property_details as Array<{ project_name?: any }>)?.[0]
        ?.project_name?.en ||
      (propertyRecord.property_details as Array<{ project_name?: any }>)?.[0]
        ?.project_name ||
      propertyId;

    const omise = getOmiseClient();
    const chargePayload: Omise.Charges.IRequest = {
      amount: amountInMinorUnit,
      currency: currency.toLowerCase(),
      description:
        description ||
        `Contact access for property ${projectName as string} (${propertyId})`,
      metadata: {
        propertyId,
        userId: authResult.user.id,
        projectName,
        ...(metadata || {}),
      },
      capture,
    };

    if (token) {
      chargePayload.card = token;
    } else if (source) {
      chargePayload.source = source;
    } else if (customer) {
      chargePayload.customer = customer;
    }

    const charge = await omise.charges.create(chargePayload);

    const paymentRecord = {
      user_id: authResult.user.id,
      property_id: propertyId,
      charge_id: charge.id,
      amount: effectiveAmount,
      currency: currency.toLowerCase(),
      status: charge.status,
      metadata: charge.metadata,
      provider: "omise",
      charge_snapshot: charge,
    };

    const { error: insertError } = await supabaseAdmin
      .from("property_payments")
      .insert(paymentRecord);

    if (insertError) {
      console.error("Failed to store property payment:", insertError);
    }

    return NextResponse.json({
      success: true,
      charge,
      hasAccess: charge.status === "successful",
    });
  } catch (error) {
    console.error("Omise charge error:", error);
    const { message, code } = extractOmiseError(error);
    return NextResponse.json(
      {
        success: false,
        error: code ? `${message} (code: ${code})` : message,
        omiseCode: code,
      },
      { status: 500 }
    );
  }
}
