import { NextRequest, NextResponse } from "next/server";
import type Omise from "omise";

import { getUserFromRequest } from "@/lib/auth-server";
import { getOmiseClient } from "@/lib/omise";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const DEFAULT_CURRENCY = "thb";
const MIN_PROMPTPAY_AMOUNT_THB = 20;

type PromptPaySource = Omise.Sources.ISource & {
  scannable_code?: {
    image?: {
      uri?: string;
      download_uri?: string;
    } | null;
  } | null;
  references?: {
    barcode?: string | null;
  } | null;
  expires_at?: number | null;
};

type SourceRequestBody = {
  amount: number;
  currency?: string;
  type?: "promptpay" | "truemoney" | "alipay" | "alipay_cn" | "wechat";
  name?: string;
  email?: string;
  phone?: string;
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

const extractPromptPayQrCode = (source: PromptPaySource): string | null => {
  if (source.scannable_code?.image?.download_uri) {
    return source.scannable_code.image.download_uri;
  }

  if (source.scannable_code?.image?.uri) {
    return source.scannable_code.image.uri;
  }

  if (source.references?.barcode) {
    return source.references.barcode;
  }

  return null;
};

export async function POST(request: NextRequest) {
  try {
    const authResult = await getUserFromRequest(request);

    if (!authResult.user || authResult.error) {
      return NextResponse.json(
        { success: false, error: "กรุณาเข้าสู่ระบบเป็นลูกค้าก่อนชำระเงิน" },
        { status: 401 }
      );
    }

    // Check user role - only customers can make payments
    const supabaseAdmin = createSupabaseAdmin();
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", authResult.user.id)
      .maybeSingle();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลผู้ใช้ กรุณาลองใหม่อีกครั้ง" },
        { status: 404 }
      );
    }

    const userRole = userData.role;
    if (
      userRole === "agent" ||
      userRole === "admin" ||
      userRole === "super_admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "คุณเป็น Agent/Admin ไม่สามารถชำระเงินเพื่อดูรายละเอียด Agent คนอื่นได้",
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as SourceRequestBody;
    const {
      amount,
      currency = DEFAULT_CURRENCY,
      type = "promptpay",
      name,
      email,
      phone,
    } = body;

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

    const effectiveAmount = Math.max(
      Number(normalizedAmount),
      MIN_PROMPTPAY_AMOUNT_THB
    );
    const amountInMinorUnit = Math.round(effectiveAmount * 100);

    const omise = getOmiseClient();

    // Create source for QR code payment
    const sourcePayload: Omise.Sources.IRequest = {
      type,
      amount: amountInMinorUnit,
      currency: currency.toLowerCase(),
    };

    // Add optional fields
    if (name) {
      sourcePayload.name = name;
    }
    if (email) {
      sourcePayload.email = email;
    }
    if (phone) {
      sourcePayload.phone_number = phone;
    }

    const source = (await omise.sources.create(
      sourcePayload
    )) as PromptPaySource;

    const qrCodeUri = extractPromptPayQrCode(source);

    if (!qrCodeUri) {
      console.warn("PromptPay source missing QR, waiting for charge", {
        sourceId: source.id,
      });
    }

    return NextResponse.json({
      success: true,
      sourceId: source.id,
      qrCode: qrCodeUri,
      // expose minimal metadata needed on the client
      meta: {
        amount: source.amount,
        currency: source.currency,
        flow: source.flow,
        expires_at: source.expires_at ?? null,
      },
    });
  } catch (error) {
    console.error("Omise source creation error:", error);
    const message =
      error instanceof Error ? error.message : "Unexpected Omise error.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
