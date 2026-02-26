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

// อีเมลที่ได้รับอนุญาตใน Resend Free Plan
const ALLOWED_EMAILS = [
  "asngiun@gmail.com", // อีเมลเจ้าของบัญชี
  // เพิ่มอีเมลอื่นๆ ที่ verify ใน Resend ได้ที่นี่
];

export async function sendOTPEmail({ to, otpCode }: SendOTPEmailParams) {
  try {
    // เช็คว่าอีเมลได้รับอนุญาตหรือไม่
    if (!ALLOWED_EMAILS.includes(to)) {
      return {
        success: false,
        error: `Resend Free Plan: ไม่สามารถส่งไปยัง ${to} ได้ กรุณาเพิ่มอีเมลนี้ใน Resend Dashboard หรือ verify domain`,
      };
    }

    const { data, error } = await resend.emails.send({
      from: "TedIn Easy <onboarding@resend.dev>", // Resend sandbox domain
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
            .subtitle {
              color: #6b7280;
              font-size: 14px;
            }
            .otp-section {
              text-align: center;
              margin: 30px 0;
              padding: 30px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 15px;
              color: white;
            }
            .otp-title {
              font-size: 18px;
              margin-bottom: 15px;
              font-weight: 600;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 8px;
              margin: 10px 0;
              padding: 15px 30px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 10px;
              display: inline-block;
            }
            .instructions {
              background-color: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #2563eb;
              margin: 20px 0;
            }
            .warning {
              background-color: #fef2f2;
              border: 1px solid #fecaca;
              color: #dc2626;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: center;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 12px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🏠 TedIn Easy</div>
              <div class="subtitle">ระบบจัดการอสังหาริมทรัพย์</div>
            </div>

            <h2 style="color: #1f2937; text-align: center;">🔐 รหัส OTP สำหรับรีเซ็ตรหัสผ่าน</h2>
            
            <p style="color: #4b5563;">สวัสดีครับ/ค่ะ,</p>
            
            <p style="color: #4b5563;">
              คุณได้ทำการร้องขอรีเซ็ตรหัสผ่านสำหรับบัญชี TedIn Easy 
              กรุณาใช้รหัส OTP ด้านล่างเพื่อยืนยันตัวตนและตั้งรหัสผ่านใหม่
            </p>

            <div class="otp-section">
              <div class="otp-title">รหัส OTP ของคุณ</div>
              <div class="otp-code">${otpCode}</div>
              <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
                รหัสนี้จะหมดอายุใน 10 นาที
              </p>
            </div>

            <div class="instructions">
              <h3 style="color: #1f2937; margin-top: 0;">📋 วิธีการใช้งาน:</h3>
              <ol style="color: #4b5563; padding-left: 20px;">
                <li>กลับไปที่หน้าเว็บ TedIn Easy</li>
                <li>กรอกรหัส OTP: <strong>${otpCode}</strong></li>
                <li>ตั้งรหัสผ่านใหม่ที่ต้องการ</li>
                <li>เข้าสู่ระบบด้วยรหัสผ่านใหม่</li>
              </ol>
            </div>

            <div class="warning">
              ⚠️ <strong>ข้อควรระวัง:</strong><br>
              • รหัส OTP นี้จะหมดอายุใน 10 นาที<br>
              • ห้ามแชร์รหัสนี้กับผู้อื่น<br>
              • หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยต่ออีเมลนี้
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #4b5563;">
                หากมีปัญหาหรือข้อสงสัย กรุณาติดต่อทีมสนับสนุน
              </p>
            </div>

            <div class="footer">
              <p>
                อีเมลนี้ถูกส่งโดยอัตโนมัติจากระบบ TedIn Easy<br>
                กรุณาอย่าตอบกลับอีเมลนี้<br><br>
                © 2025 TedIn Easy. สงวนลิขสิทธิ์.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Resend API Error:", error);
      return {
        success: false,
        error: `ไม่สามารถส่งอีเมลได้: ${error.message}`,
      };
    }

    console.log("✅ ส่งอีเมล OTP ผ่าน Resend สำเร็จ:", data);
    return {
      success: true,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("เกิดข้อผิดพลาดใน Resend:", message);
    return {
      success: false,
      error: `เกิดข้อผิดพลาด: ${message}`,
    };
  }
}
