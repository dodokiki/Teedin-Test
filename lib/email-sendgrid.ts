import sgMail from "@sendgrid/mail";

// กำหนด API Key ของ SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// สร้างเทมเพลตอีเมล HTML สวยๆ
const createEmailTemplate = (otpCode: string) => `
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
    .otp-code {
      background-color: #f0f4ff;
      border: 2px solid #2563eb;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      color: #2563eb;
      margin: 30px 0;
      font-family: 'Courier New', monospace;
    }
    .info {
      background-color: #f8fafc;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning {
      background-color: #fef3e2;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
    .btn {
      display: inline-block;
      background-color: #2563eb;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🏢 TedIn Easy</div>
      <h1>รหัส OTP สำหรับการรีเซ็ตรหัสผ่าน</h1>
    </div>
    
    <p>สวัสดีครับ/ค่ะ</p>
    
    <p>คุณได้ร้องขอการรีเซ็ตรหัสผ่านสำหรับบัญชี TedIn Easy ของคุณ กรุณาใช้รหัส OTP ด้านล่างเพื่อดำเนินการต่อ:</p>
    
    <div class="otp-code">${otpCode}</div>
    
    <div class="info">
      <strong>📋 วิธีการใช้งาน:</strong>
      <ul>
        <li>คัดลอกรหัส OTP ข้างต้น</li>
        <li>กลับไปที่หน้าเว็บไซต์ TedIn Easy</li>
        <li>กรอกรหัส OTP ในช่องที่กำหนด</li>
        <li>ตั้งรหัสผ่านใหม่ตามต้องการ</li>
      </ul>
    </div>
    
    <div class="warning">
      <strong>⚠️ ข้อควรระวัง:</strong>
      <ul>
        <li>รหัส OTP นี้จะหมดอายุใน <strong>5 นาที</strong></li>
        <li>ใช้งานได้เพียง <strong>1 ครั้งเท่านั้น</strong></li>
        <li>หากไม่ได้ร้องขอ กรุณาเพิกเฉยต่ออีเมลนี้</li>
        <li>ห้ามแชร์รหัส OTP ให้กับผู้อื่น</li>
      </ul>
    </div>
    
    <p>หากคุณประสบปัญหาในการใช้งาน กรุณาติดต่อทีมสนับสนุนของเรา</p>
    
    <div class="footer">
      <p>ขอบคุณที่ใช้บริการ TedIn Easy</p>
      <p>อีเมลนี้ส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ</p>
      <p>© 2025 TedIn Easy - ระบบจัดการอสังหาริมทรัพย์</p>
    </div>
  </div>
</body>
</html>
`;

// ส่ง OTP ผ่าน SendGrid
export const sendOTPEmail = async (
  to: string,
  otpCode: string
): Promise<{ success: boolean; error?: string; provider?: string }> => {
  if (!process.env.SENDGRID_API_KEY) {
    return {
      success: false,
      error: "SendGrid API key is not configured",
    };
  }

  if (!process.env.SENDGRID_FROM_EMAIL) {
    return {
      success: false,
      error: "SendGrid from email is not configured",
    };
  }

  try {
    console.log(`📧 กำลังส่งอีเมล OTP ผ่าน SendGrid ไปยัง: ${to}`);

    const msg = {
      to: to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: "TedIn Easy - ระบบอสังหาริมทรัพย์",
      },
      subject: "🔐 รหัส OTP สำหรับการรีเซ็ตรหัสผ่าน - TedIn Easy",
      html: createEmailTemplate(otpCode),
      // เพิ่ม text version สำหรับ email clients ที่ไม่รองรับ HTML
      text: `
รหัส OTP สำหรับการรีเซ็ตรหัสผ่าน TedIn Easy

รหัส OTP ของคุณคือ: ${otpCode}

รหัสนี้จะหมดอายุใน 5 นาที และใช้งานได้เพียง 1 ครั้งเท่านั้น

หากคุณไม่ได้ร้องขอการรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้

ขอบคุณที่ใช้บริการ TedIn Easy
      `.trim(),
    };

    const response = await sgMail.send(msg);

    console.log("✅ ส่งอีเมล OTP ผ่าน SendGrid สำเร็จ");
    console.log("📧 Message ID:", response[0].headers["x-message-id"]);
    console.log(`📬 อีเมลถูกส่งไปยัง ${to} แล้ว`);

    return {
      success: true,
      provider: "sendgrid",
    };
  } catch (error: unknown) {
    const baseError = error instanceof Error ? error : new Error(String(error));
    console.error("❌ SendGrid Error:", baseError.message);

    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      (error as { response?: { body?: unknown } }).response?.body
    ) {
      const responseBody = (error as { response?: { body?: unknown } }).response
        ?.body;
      console.error(
        "📋 SendGrid Error Details:",
        JSON.stringify(responseBody, null, 2)
      );
    }

    return {
      success: false,
      error: baseError.message || "Failed to send email via SendGrid",
    };
  }
};

export default sendOTPEmail;
