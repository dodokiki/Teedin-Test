import { sendOTPEmail } from "@/lib/email-multi-provider";
import { checkRateLimit, OTP_RATE_LIMIT } from "@/lib/rate-limiter";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "กรุณาระบุอีเมล" }, { status: 400 });
    }

    // ตรวจสอบ rate limit
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitKey = `otp:${email}:${clientIP}`;
    const rateLimit = checkRateLimit(rateLimitKey, OTP_RATE_LIMIT);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `คุณส่งคำขอ OTP บ่อยเกินไป กรุณารอ ${Math.ceil(rateLimit.retryAfter! / 60)} นาที`,
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetTime.toString(),
            "Retry-After": rateLimit.retryAfter!.toString(),
          },
        }
      );
    } // ตรวจสอบว่าอีเมลนี้มีในระบบหรือไม่ โดยการตรวจสอบจากตาราง profiles หรือการลอง sign in
    // วิธีนี้ปลอดภัยกว่าการใช้ admin API

    // สำหรับการตรวจสอบผู้ใช้ในระบบ production ให้ข้ามขั้นตอนนี้
    // และส่ง OTP ไปยังอีเมลที่ร้องขอ เพื่อความปลอดภัย
    // หากอีเมลไม่มีในระบบจริง ผู้ใช้จะไม่ได้รับ OTP
    console.log(`Processing OTP request for email: ${email}`);

    const supabaseAdmin = createSupabaseAdmin();
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (userRow) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(userRow.id);
      const identities = (data?.user as any)?.identities || [];
      const providersArr: string[] = ((data?.user as any)?.app_metadata
        ?.providers || []) as any;
      const metaProvider =
        (data?.user as any)?.user_metadata?.provider ||
        (data?.user as any)?.app_metadata?.provider;
      const hasEmailIdentity =
        identities?.some((i: any) => i?.provider === "email") ||
        providersArr?.includes?.("email") ||
        metaProvider === "email";
      if (!hasEmailIdentity) {
        const isGoogle =
          metaProvider === "google" ||
          identities.find((i: any) => i?.provider === "google");
        const isLine =
          metaProvider === "line" ||
          identities.find((i: any) => i?.provider === "line");
        if (isGoogle) {
          return NextResponse.json(
            { error: "บัญชีนี้สมัครด้วย Google กรุณาเข้าสู่ระบบด้วย Google" },
            { status: 400 }
          );
        }
        if (isLine) {
          return NextResponse.json(
            { error: "บัญชีนี้สมัครด้วย LINE กรุณาเข้าสู่ระบบด้วย LINE" },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: "บัญชีนี้ไม่ได้สมัครด้วยอีเมลและรหัสผ่าน" },
          { status: 400 }
        );
      }
    }

    // สร้าง OTP 6 หลัก
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // เก็บ OTP ในฐานข้อมูล พร้อมเวลาหมดอายุ (5 นาที)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // ใช้ admin client สำหรับการเขียนข้อมูลที่ต้องการสิทธิ์พิเศษ
    const { error: otpError } = await supabaseAdmin
      .from("password_reset_otps")
      .upsert({
        email: email,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString(),
      });

    if (otpError) {
      console.error("Error storing OTP:", otpError);
      return NextResponse.json(
        { error: "เกิดข้อผิดพลาดในการสร้าง OTP" },
        { status: 500 }
      );
    } // ส่ง OTP ผ่านอีเมล
    console.log("🚀 กำลังส่งอีเมล OTP...");
    const emailResult = await sendOTPEmail(email, otpCode);

    if (!emailResult.success) {
      console.error("Error sending OTP email:", emailResult.error);
      return NextResponse.json(
        {
          success: false,
          error: "ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง",
        },
        { status: 500 }
      );
    }

    console.log(`✅ ส่ง OTP สำเร็จผ่าน ${emailResult.provider}`);

    return NextResponse.json(
      {
        success: true,
        message: `ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบกล่องขาเข้า (รวมถึงโฟลเดอร์ Spam)`,
        provider: emailResult.provider,
        previewUrl: emailResult.previewUrl, // สำหรับ Ethereal Email
      },
      {
        headers: {
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": rateLimit.resetTime.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Send OTP API error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการส่ง OTP" },
      { status: 500 }
    );
  }
}
