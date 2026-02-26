import { Resend } from "resend";

// ตรวจสอบว่ามี API key หรือไม่
if (!process.env.RESEND_API_KEY) {
  throw new Error("ไม่พบ RESEND_API_KEY ใน environment variables");
}

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendOTPEmailParams {
  to: string;
  otpCode: string;
}

export async function sendOTPEmail({ to, otpCode }: SendOTPEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: "TedIn Easy <onboarding@resend.dev>", // Resend verified domain
      to: [to],
      subject: "รหัส OTP สำหรับรีเซ็ตรหัสผ่าน - TedIn Easy",
      html: `
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>รหัส OTP - TedIn Easy</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              border-radius: 10px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .otp-container {
              background: linear-gradient(135deg, #2563eb, #1d4ed8);
              color: white;
              padding: 20px;
              border-radius: 10px;
              text-align: center;
              margin: 30px 0;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              margin: 15px 0;
              font-family: 'Courier New', monospace;
            }
            .warning {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 0 5px 5px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
            .button {
              display: inline-block;
              background-color: #2563eb;
              color: white;
              padding: 12px 24px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: bold;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🏠 TedIn Easy</div>
              <h1>รหัส OTP สำหรับรีเซ็ตรหัสผ่าน</h1>
            </div>
            
            <p>สวัสดีครับ/ค่ะ,</p>
            
            <p>คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชี TedIn Easy ของคุณ กรุณาใช้รหัส OTP ด้านล่างเพื่อดำเนินการต่อ:</p>
            
            <div class="otp-container">
              <div>รหัส OTP ของคุณคือ:</div>
              <div class="otp-code">${otpCode}</div>
              <div>รหัสนี้จะหมดอายุใน 5 นาที</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ คำเตือนด้านความปลอดภัย:</strong>
              <ul>
                <li>ห้ามแชร์รหัส OTP นี้กับผู้อื่น</li>
                <li>ทีมงาน TedIn Easy จะไม่มีวันขอรหัส OTP จากคุณทางโทรศัพท์หรืออีเมล</li>
                <li>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้</li>
              </ul>
            </div>
            
            <p>หากคุณต้องการความช่วยเหลือ หรือมีคำถามใดๆ สามารถติดต่อทีมสนับสนุนของเราได้</p>
            
            <div class="footer">
              <p>ขอบคุณที่ใช้บริการ TedIn Easy</p>
              <p>© 2025 TedIn Easy - แพลตฟอร์มอสังหาริมทรัพย์ออนไลน์</p>
              <p>หากคุณไม่ต้องการรับอีเมลนี้อีก กรุณาติดต่อเรา</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
รหัส OTP สำหรับรีเซ็ตรหัสผ่าน - TedIn Easy

สวัสดีครับ/ค่ะ,

คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชี TedIn Easy ของคุณ

รหัส OTP ของคุณคือ: ${otpCode}

รหัสนี้จะหมดอายุใน 5 นาที

คำเตือนด้านความปลอดภัย:
- ห้ามแชร์รหัส OTP นี้กับผู้อื่น
- ทีมงาน TedIn Easy จะไม่มีวันขอรหัส OTP จากคุณ
- หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้

ขอบคุณที่ใช้บริการ TedIn Easy
© 2025 TedIn Easy - แพลตฟอร์มอสังหาริมทรัพย์ออนไลน์
      `,
    });
    if (error) {
      console.error("Resend API Error:", error);
      return {
        success: false,
        error: `ไม่สามารถส่งอีเมลได้: ${error.message}`,
        provider: "resend",
      };
    }

    console.log("✅ ส่งอีเมล OTP สำเร็จผ่าน Resend:", {
      id: data?.id,
      to: to,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      messageId: data?.id,
      provider: "resend",
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ เกิดข้อผิดพลาดในการส่งอีเมล Resend:", message);
    return {
      success: false,
      error: `ไม่สามารถส่งอีเมล OTP ได้: ${message}`,
      provider: "resend",
    };
  }
}

// ทดสอบการเชื่อมต่อ Resend
export async function testResendConnection() {
  try {
    // ส่งอีเมลทดสอบไปที่อีเมลที่กำหนด
    const testResult = await sendOTPEmail({
      to: "test@example.com", // จะต้องเปลี่ยนเป็นอีเมลจริงเมื่อทดสอบ
      otpCode: "123456",
    });

    return {
      success: true,
      message: "Resend API ทำงานได้ปกติ",
      result: testResult,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `ไม่สามารถเชื่อมต่อ Resend API ได้: ${message}`,
      error: error,
    };
  }
}

export default resend;
