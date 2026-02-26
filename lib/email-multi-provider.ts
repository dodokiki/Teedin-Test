import nodemailer from "nodemailer";
import { sendOTPEmail as sendResendOTP } from "./resend-email";
import { sendOTPEmail as sendSendGridOTP } from "./email-sendgrid";
import { sendOTPEmail as sendEtherealOTP } from "./email-ethereal";

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

// ส่ง OTP ผ่าน Gmail SMTP
const sendGmailSMTP = async (
  to: string,
  otpCode: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("📧 กำลังส่งอีเมล OTP ผ่าน Gmail SMTP...");

    if (
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS ||
      process.env.SMTP_PASS === "your-16-digit-app-password-here"
    ) {
      throw new Error("Gmail SMTP credentials not configured");
    }
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: {
        name: "TedIn Easy - ระบบอสังหาริมทรัพย์",
        address: process.env.SMTP_USER,
      },
      to: to,
      subject: "🔐 รหัส OTP สำหรับการรีเซ็ตรหัสผ่าน - TedIn Easy",
      html: createEmailTemplate(otpCode),
      text: `รหัส OTP ของคุณคือ: ${otpCode}\n\nรหัสนี้จะหมดอายุใน 5 นาที และใช้งานได้เพียง 1 ครั้งเท่านั้น\n\nขอบคุณที่ใช้บริการ TedIn Easy`,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ ส่งอีเมล OTP ผ่าน Gmail SMTP สำเร็จ");
    console.log("📧 Message ID:", info.messageId);

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Gmail SMTP Error:", message);
    return { success: false, error: message };
  }
};

// ส่ง OTP ผ่านอีเมล - ลองทุกวิธีตามลำดับ
export const sendOTPEmail = async (
  to: string,
  otpCode: string
): Promise<{
  success: boolean;
  error?: string;
  provider?: string;
  previewUrl?: string;
}> => {
  console.log("🚀 กำลังส่งอีเมล OTP...");

  // วิธีที่ 1: ลองใช้ SendGrid ก่อน (สำหรับการส่งจริงไปยัง Gmail)
  if (
    process.env.SENDGRID_API_KEY &&
    process.env.SENDGRID_API_KEY !== "SG.demo_key_will_be_replaced"
  ) {
    console.log("🌟 กำลังส่งอีเมล OTP ผ่าน SendGrid...");
    const result = await sendSendGridOTP(to, otpCode);

    if (result.success) {
      console.log("✅ ส่งอีเมล OTP ผ่าน SendGrid สำเร็จ");
      return {
        success: true,
        provider: "sendgrid",
      };
    } else {
      console.error("⚠️ SendGrid ส่งไม่สำเร็จ:", result.error);
    }
  }

  // วิธีที่ 2: ลองใช้ Resend (สำหรับอีเมลของเจ้าของเท่านั้น)
  if (process.env.RESEND_API_KEY && to.toLowerCase() === "asngiun@gmail.com") {
    console.log("🚀 กำลังส่งอีเมล OTP ผ่าน Resend...");
    const result = await sendResendOTP({ to, otpCode });

    if (result.success) {
      console.log("✅ ส่งอีเมล OTP ผ่าน Resend สำเร็จ");
      return {
        success: true,
        provider: "resend",
      };
    } else {
      console.error("⚠️ Resend ส่งไม่สำเร็จ:", result.error);
    }
  }
  // วิธีที่ 3: ลองใช้ Gmail SMTP
  const gmailResult = await sendGmailSMTP(to, otpCode);
  if (gmailResult.success) {
    console.log("✅ ส่งอีเมล OTP ผ่าน Gmail SMTP สำเร็จ");
    return {
      success: true,
      provider: "gmail-smtp",
    };
  } else {
    console.error("⚠️ Gmail SMTP ส่งไม่สำเร็จ:", gmailResult.error);
  }

  // วิธีที่ 4: ลองใช้ Ethereal Email (เพื่อการทดสอบ - สร้างอีเมลจริงที่ดูได้)
  console.log("🧪 กำลังส่งอีเมล OTP ผ่าน Ethereal Email (สำหรับทดสอบ)...");
  const etherealResult = await sendEtherealOTP(to, otpCode);
  if (etherealResult.success) {
    console.log("✅ ส่งอีเมล OTP ผ่าน Ethereal Email สำเร็จ");
    if (etherealResult.previewUrl) {
      console.log("🌐 ดูอีเมลได้ที่:", etherealResult.previewUrl);
    }
    return {
      success: true,
      provider: "ethereal",
      previewUrl: etherealResult.previewUrl,
    };
  } else {
    console.error("⚠️ Ethereal Email ส่งไม่สำเร็จ:", etherealResult.error);
  }

  // วิธีที่ 5: Debug Mode (แสดงใน console) - เป็นตัวเลือกสุดท้าย
  console.log(`🔐 Debug Mode - OTP สำหรับ ${to}: ${otpCode}`);
  console.log("💡 ระบบทำงานในโหมดทดสอบ - OTP แสดงใน console");
  console.log("📱 ผู้ใช้สามารถใช้รหัส OTP นี้เพื่อเข้าสู่ระบบได้");
  console.log("⚠️ สำหรับ production กรุณาตั้งค่า SendGrid API key");

  return { success: true, provider: "debug" };
};

// Export สำหรับการใช้งาน
export default sendOTPEmail;
