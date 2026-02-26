# Deployment Checklist - Omise Payment Integration

## ✅ Pre-Deployment

### Database

- [ ] รัน migration `create-property-payments-table.sql` บน Production Database
- [ ] ตรวจสอบว่าตาราง `property_payments` ถูกสร้างแล้ว
- [ ] ตรวจสอบว่า RLS policies ทำงานถูกต้อง
- [ ] ทดสอบ query ข้อมูลจากตาราง

### Environment Variables

- [ ] ตั้งค่า `NEXT_PUBLIC_OMISE_PUBLIC_KEY` (Live key)
- [ ] ตั้งค่า `OMISE_SECRET_KEY` (Live key)
- [ ] ตั้งค่า `OMISE_WEBHOOK_SECRET` (Live webhook secret)
- [ ] ตั้งค่า `NEXT_PUBLIC_CONTACT_REVEAL_PRICE` (ถ้าต้องการเปลี่ยนราคา)
- [ ] ตั้งค่า Supabase Production credentials
- [ ] ตรวจสอบว่าไม่มี Test keys เหลืออยู่ใน Production

### Omise Dashboard

- [ ] สร้าง Webhook ใน Omise Live Dashboard
- [ ] ตั้งค่า Webhook URL เป็น Production URL: `https://yourdomain.com/api/omise-webhook`
- [ ] เลือก Events: `charge.create`, `charge.complete`, `charge.update`
- [ ] คัดลอก Webhook Signing Secret ไปใส่ใน Environment Variables
- [ ] ทดสอบส่ง Test Event จาก Omise Dashboard

### Code

- [ ] ตรวจสอบว่าไม่มี hardcoded keys ในโค้ด
- [ ] ตรวจสอบว่า error handling ครบถ้วน
- [ ] ตรวจสอบว่า logging ทำงานถูกต้อง

---

## 🚀 Deployment

### Build & Deploy

- [ ] Build production: `pnpm build`
- [ ] ตรวจสอบว่า build สำเร็จไม่มี errors
- [ ] Deploy ไปยัง production server
- [ ] ตรวจสอบว่า deployment สำเร็จ

### Post-Deployment Verification

- [ ] ตรวจสอบว่า API endpoints ทำงานได้:
  - [ ] `POST /api/omise-charge` (ต้อง authenticated)
  - [ ] `GET /api/property-payments/access` (ต้อง authenticated)
  - [ ] `POST /api/omise-webhook` (ต้องมี valid signature)
- [ ] ทดสอบการชำระเงินด้วย Omise Live Mode
- [ ] ตรวจสอบว่า payment records ถูกบันทึกใน database
- [ ] ตรวจสอบว่า webhook รับ events และอัปเดต status ได้

---

## 🧪 Testing

### Payment Flow

- [ ] ทดสอบชำระเงินด้วยบัตรจริง (Live mode)
- [ ] ตรวจสอบว่า charge สร้างสำเร็จ
- [ ] ตรวจสอบว่า payment record ถูกบันทึก
- [ ] ตรวจสอบว่า webhook อัปเดต status เป็น `successful`
- [ ] ตรวจสอบว่าผู้ใช้สามารถดูข้อมูลติดต่อได้หลังชำระเงิน

### Error Handling

- [ ] ทดสอบกรณี payment failed
- [ ] ทดสอบกรณี webhook signature ไม่ถูกต้อง
- [ ] ทดสอบกรณี user ไม่ได้ login
- [ ] ทดสอบกรณี propertyId ไม่ถูกต้อง

### Security

- [ ] ตรวจสอบว่า secret keys ไม่ถูก expose ใน client-side
- [ ] ตรวจสอบว่า webhook signature verification ทำงาน
- [ ] ตรวจสอบว่า RLS policies ป้องกันการเข้าถึงข้อมูลของผู้อื่น

---

## 📊 Monitoring

### Logs

- [ ] ตั้งค่า error logging
- [ ] ตั้งค่า payment transaction logging
- [ ] ตรวจสอบว่า logs ถูกเก็บไว้สำหรับ audit

### Alerts

- [ ] ตั้งค่า alerts สำหรับ payment failures
- [ ] ตั้งค่า alerts สำหรับ webhook failures
- [ ] ตั้งค่า alerts สำหรับ database errors

---

## 🔄 Rollback Plan

ถ้ามีปัญหา:

- [ ] เก็บ backup ของ database ก่อน deploy
- [ ] รู้วิธี rollback code
- [ ] รู้วิธี disable webhook ใน Omise Dashboard
- [ ] มีแผนการแจ้งผู้ใช้ถ้ามีปัญหา

---

## 📝 Post-Deployment

### Documentation

- [ ] อัปเดต API documentation
- [ ] บันทึก deployment notes
- [ ] บันทึก issues ที่พบและวิธีแก้

### Team Communication

- [ ] แจ้งทีมว่า deployment สำเร็จ
- [ ] แจ้งทีมเกี่ยวกับการเปลี่ยนแปลง
- [ ] แจ้งทีมเกี่ยวกับ monitoring และ alerts

---

## 🆘 Emergency Contacts

- Omise Support: support@omise.co
- Supabase Support: [Supabase Dashboard](https://app.supabase.com)
- Team Lead: [Your contact]

---

## 📅 Deployment Date

- **Date**: **\*\***\_\_\_**\*\***
- **Deployed by**: **\*\***\_\_\_**\*\***
- **Version**: **\*\***\_\_\_**\*\***
- **Notes**: **\*\***\_\_\_**\*\***
