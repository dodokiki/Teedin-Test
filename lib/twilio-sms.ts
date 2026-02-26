import twilio from "twilio";

// สร้าง Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// ส่ง OTP ผ่าน Twilio Verify Service
export async function sendTwilioOTP(phone: string): Promise<{
  success: boolean;
  error?: string;
  verificationSid?: string;
}> {
  try {
    // ตรวจสอบว่า environment variables ถูกต้องหรือไม่
    if (
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      (!process.env.TWILIO_VERIFY_SID && !process.env.TWILIO_VERIFY_SERVICE_SID)
    ) {
      console.warn(
        "⚠️ Twilio environment variables not configured, using mock response"
      );
      // Mock response สำหรับ development
      return {
        success: true,
        verificationSid: `mock_verification_${Date.now()}`,
      };
    }

    // Normalize phone number to E.164 format
    const normalizePhone = (p: string) => {
      const digits = p.replace(/[^0-9+]/g, "");
      if (digits.startsWith("+")) return digits;
      if (digits.startsWith("66")) return "+" + digits;
      if (digits.startsWith("0")) return "+66" + digits.slice(1);
      return "+" + digits;
    };

    const e164Phone = normalizePhone(phone);

    const verification = await client.verify.v2
      .services(
        process.env.TWILIO_VERIFY_SERVICE_SID || process.env.TWILIO_VERIFY_SID!
      )
      .verifications.create({
        to: e164Phone,
        channel: "sms",
      });

    return {
      success: true,
      verificationSid: verification.sid,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Twilio OTP Error:", message);

    // ถ้าเป็น development environment และมี credentials ให้ใช้ mock response
    if (
      process.env.NODE_ENV === "development" &&
      (process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_AUTH_TOKEN)
    ) {
      console.warn("⚠️ Using mock response for development");
      return {
        success: true,
        verificationSid: `mock_verification_${Date.now()}`,
      };
    }

    return {
      success: false,
      error: message || "ไม่สามารถส่ง OTP ได้",
    };
  }
}

// ยืนยัน OTP ผ่าน Twilio Verify Service
export async function verifyTwilioOTP(
  phone: string,
  code: string
): Promise<{
  success: boolean;
  error?: string;
  status?: string;
}> {
  try {
    // Normalize phone number
    const normalizePhone = (p: string) => {
      const digits = p.replace(/[^0-9+]/g, "");
      if (digits.startsWith("+")) return digits;
      if (digits.startsWith("66")) return "+" + digits;
      if (digits.startsWith("0")) return "+66" + digits.slice(1);
      return "+" + digits;
    };

    const e164Phone = normalizePhone(phone);

    const verificationCheck = await client.verify.v2
      .services(
        process.env.TWILIO_VERIFY_SERVICE_SID || process.env.TWILIO_VERIFY_SID!
      )
      .verificationChecks.create({
        to: e164Phone,
        code: code,
      });

    if (verificationCheck.status === "approved") {
      return {
        success: true,
        status: verificationCheck.status,
      };
    } else {
      return {
        success: false,
        error: "รหัส OTP ไม่ถูกต้องหรือหมดอายุ",
        status: verificationCheck.status,
      };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Twilio Verify Error:", message);
    return {
      success: false,
      error: message || "ไม่สามารถยืนยัน OTP ได้",
    };
  }
}
