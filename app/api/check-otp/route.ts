import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import type { VerificationInstance } from "twilio/lib/rest/verify/v2/service/verification";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        {
          error: "ต้องระบุเบอร์โทรศัพท์",
        },
        { status: 400 }
      );
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    // Normalize phone number
    const normalizePhone = (p: string) => {
      const digits = p.replace(/[^0-9+]/g, "");
      if (digits.startsWith("+")) return digits;
      if (digits.startsWith("66")) return "+" + digits;
      if (digits.startsWith("0")) return "+66" + digits.slice(1);
      return "+" + digits;
    };

    const e164Phone = normalizePhone(phone);

    // ดึงรายการ verification ล่าสุด
    const verificationsList = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID!)
      .verifications.list({
        to: e164Phone,
        limit: 5,
      });

    const recentVerifications = verificationsList.map(
      (verification: VerificationInstance) => ({
        sid: verification.sid,
        status: verification.status,
        to: verification.to,
        channel: verification.channel,
        dateCreated: verification.dateCreated,
        dateUpdated: verification.dateUpdated,
        valid: verification.valid,
      })
    );

    return NextResponse.json({
      phone: e164Phone,
      verifications: recentVerifications,
      message: "✅ ข้อมูล OTP สำหรับการทดสอบ (Production ไม่ควรมี API นี้)",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Check OTP API error:", message);
    return NextResponse.json(
      {
        error: "ไม่สามารถตรวจสอบ OTP ได้",
        details: message,
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json({
    message: "ใช้ GET method พร้อม query parameter ?phone=0647601846",
  });
}
