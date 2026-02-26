import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getUserFromRequest(request);

    if (!authResult.user || authResult.error) {
      return NextResponse.json(
        { success: false, error: "ต้องเข้าสู่ระบบก่อนดูสถานะการชำระเงิน" },
        { status: 401 }
      );
    }

    const propertyId = request.nextUrl.searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: "propertyId is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("property_payments")
      .select("id, status, amount")
      .eq("user_id", authResult.user.id)
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Failed to fetch payment status:", error);
      return NextResponse.json(
        { success: false, error: "ไม่สามารถตรวจสอบสถานะการชำระเงินได้" },
        { status: 500 }
      );
    }

    const hasAccess = data?.status === "successful";

    return NextResponse.json({
      success: true,
      hasAccess,
      paymentStatus: data?.status ?? null,
      currentPlanAmount: hasAccess ? data?.amount : null,
    });
  } catch (error) {
    console.error("property-payments/access error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดภายในระบบ" },
      { status: 500 }
    );
  }
}
