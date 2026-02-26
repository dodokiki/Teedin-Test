import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, otpCode } = await request.json();

    if (!email || !otpCode) {
      return NextResponse.json(
        { error: "กรุณาระบุอีเมลและรหัส OTP" },
        { status: 400 }
      );
    } // ตรวจสอบ OTP ในฐานข้อมูล
    const supabaseAdmin = createSupabaseAdmin();
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from("password_reset_otps")
      .select("*")
      .eq("email", email)
      .eq("otp_code", otpCode)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (otpError || !otpData) {
      return NextResponse.json(
        { error: "รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว" },
        { status: 400 }
      );
    } // ทำเครื่องหมายว่า OTP ถูกใช้แล้ว
    const { error: markUsedError } = await supabaseAdmin
      .from("password_reset_otps")
      .update({ used: true })
      .eq("id", otpData.id);

    if (markUsedError) {
      console.error("Error marking OTP as used:", markUsedError);
    }

    // สร้าง temporary token สำหรับการรีเซ็ตรหัสผ่าน
    const resetToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // เก็บ reset token ที่มีอายุ 10 นาที
    const tokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const { error: tokenError } = await supabaseAdmin
      .from("password_reset_tokens")
      .upsert({
        email: email,
        reset_token: resetToken,
        expires_at: tokenExpiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString(),
      });

    if (tokenError) {
      console.error("Error storing reset token:", tokenError);
      return NextResponse.json(
        { error: "เกิดข้อผิดพลาดในการสร้าง token" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "ยืนยัน OTP สำเร็จ",
      resetToken: resetToken,
    });
  } catch (error) {
    console.error("Verify OTP API error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการยืนยัน OTP" },
      { status: 500 }
    );
  }
}
