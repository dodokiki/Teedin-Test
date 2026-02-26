import { sendTwilioOTP } from "@/lib/twilio-sms";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        {
          error: "กรุณาระบุเบอร์โทรศัพท์",
        },
        { status: 400 }
      );
    }

    console.log("📱 API: ส่ง OTP ไปยัง", phone);

    const result = await sendTwilioOTP(phone);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "ส่ง OTP สำเร็จ",
        verificationSid: result.verificationSid,
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
      "❌ Send OTP API error:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      {
        success: false,
        error: "ไม่สามารถส่ง OTP ได้",
      },
      { status: 500 }
    );
  }
}
