import { verifyTwilioOTP } from "@/lib/twilio-sms";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        {
          error: "กรุณาระบุเบอร์โทรศัพท์และรหัส OTP",
        },
        { status: 400 }
      );
    }

    console.log("🔐 API: ยืนยัน OTP", { phone, code });

    const result = await verifyTwilioOTP(phone, code);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "ยืนยัน OTP สำเร็จ",
        status: result.status,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error(
      "❌ Verify OTP API error:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      {
        success: false,
        error: "ไม่สามารถยืนยัน OTP ได้",
      },
      { status: 500 }
    );
  }
}
