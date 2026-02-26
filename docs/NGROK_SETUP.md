# Ngrok Setup Guide - สำหรับ Omise Webhook

## 📋 Overview

คู่มือการตั้งค่า ngrok สำหรับทดสอบ Omise Webhook ใน local development

---

## 🔧 Step 1: สมัครบัญชี Ngrok (ฟรี)

1. ไปที่: https://dashboard.ngrok.com/signup
2. สมัครบัญชีด้วยอีเมล (ฟรี)
3. ตรวจสอบอีเมลเพื่อยืนยันบัญชี

---

## 🔑 Step 2: รับ Authtoken

1. ไปที่: https://dashboard.ngrok.com/get-started/your-authtoken
2. คัดลอก **authtoken** (จะขึ้นต้นด้วย `ngrok_`)

---

## ⚙️ Step 3: ตั้งค่า Authtoken

เปิด PowerShell หรือ Command Prompt แล้วรัน:

```powershell
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

**ตัวอย่าง:**

```powershell
ngrok config add-authtoken ngrok_2abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

---

## ✅ Step 4: ตรวจสอบการตั้งค่า

รันคำสั่งนี้เพื่อตรวจสอบ:

```powershell
ngrok version
```

ถ้าเห็นเวอร์ชันแสดงว่าตั้งค่าสำเร็จแล้ว

---

## 🚀 Step 5: เริ่มใช้ Ngrok

### สำหรับ Omise Webhook:

1. **เริ่ม Next.js** (ใน terminal แรก):

   ```powershell
   pnpm dev
   ```

2. **เริ่ม ngrok** (ใน terminal ใหม่):

   ```powershell
   ngrok http 3000
   ```

3. **ดู URL**:
   - จะเห็นข้อความ: `Forwarding https://abc123.ngrok-free.app -> http://localhost:3000`
   - คัดลอก URL `https://abc123.ngrok-free.app`
   - เพิ่ม `/api/omise-webhook` ต่อท้าย:
     ```
     https://abc123.ngrok-free.app/api/omise-webhook
     ```

4. **ใส่ใน Omise Dashboard**:
   - ไปที่: https://dashboard.omise.co/test
   - Settings > Webhooks > Add new webhook
   - ใส่ Webhook URL ที่คัดลอกมา
   - เลือก Events: `charge.create`, `charge.complete`, `charge.update`
   - Save

---

## 🔍 วิธีดู Ngrok URL

### วิธีที่ 1: ดูจาก Terminal

ดูจาก terminal ที่รัน ngrok จะเห็น:

```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:3000
```

### วิธีที่ 2: ใช้ Web Interface

เปิดเบราว์เซอร์ไปที่: http://localhost:4040

### วิธีที่ 3: ใช้ Script

หลังจากรัน ngrok แล้ว เปิด terminal ใหม่และรัน:

```powershell
pnpm ngrok:url
```

---

## ⚠️ หมายเหตุสำคัญ

1. **Ngrok URL เปลี่ยนทุกครั้ง**: ngrok ฟรีจะเปลี่ยน URL ทุกครั้งที่รันใหม่
   - ถ้า URL เปลี่ยน ต้องอัปเดตใน Omise Dashboard ใหม่

2. **ต้องให้ ngrok รันอยู่**: อย่าปิด terminal ที่รัน ngrok ขณะทดสอบ

3. **ใช้ HTTPS URL เท่านั้น**: Omise ต้องการ HTTPS URL สำหรับ webhook

---

## 🆘 Troubleshooting

### Error: authentication failed

- ตรวจสอบว่าได้ตั้งค่า authtoken แล้วหรือยัง
- รัน: `ngrok config add-authtoken YOUR_TOKEN`

### Error: port already in use

- ตรวจสอบว่า Next.js รันอยู่ที่พอร์ต 3000 หรือไม่
- หรือเปลี่ยนพอร์ต: `ngrok http 3001`

### ไม่เห็น URL

- รอสักครู่ให้ ngrok เริ่มทำงาน (2-3 วินาที)
- ตรวจสอบว่า Next.js รันอยู่
- ลองเปิด http://localhost:4040 ในเบราว์เซอร์

---

## 📝 Alternative: ใช้ Static Domain (ต้อง Upgrade)

ถ้าต้องการ URL ที่ไม่เปลี่ยน:

1. Upgrade ngrok plan (มีค่าใช้จ่าย)
2. ตั้งค่า static domain ใน ngrok dashboard
3. ใช้ static domain แทน random URL

---

## 🔗 Links

- Ngrok Signup: https://dashboard.ngrok.com/signup
- Get Authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
- Ngrok Docs: https://ngrok.com/docs
