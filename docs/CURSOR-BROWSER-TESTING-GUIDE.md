# คู่มือทดสอบ Teedin ด้วย Cursor + Google Chrome

เอกสารนี้อธิบายวิธีให้ Cursor ใช้ **cursor-ide-browser** MCP เปิด Chrome เพื่อทดสอบทุก Role ทุก Workflow และออก Report ให้คุณ

---

## 1. สิ่งที่ต้องเตรียม

- **Cursor** พร้อม MCP **cursor-ide-browser** เปิดใช้งาน
- **แอป Teedin** รันอยู่ (เช่น `npm run dev`) และรู้ URL (เช่น `http://localhost:3000`)
- **บัญชีทดสอบ** สำหรับแต่ละ Role (ถ้ามี):
  - Customer
  - Agent
  - Admin
  - Super Admin

---

## 2. Roles ในระบบ

| Role | คำอธิบาย | Dashboard / จุดเข้า |
|------|----------|----------------------|
| **customer** | ผู้ใช้ทั่วไป (ลูกค้า) | `/dashboard` → redirect ไป `/dashboard/account` |
| **agent** | เอเจนต์อสังหาริมทรัพย์ | `/dashboard` → redirect ไป `/dashboard/agent` |
| **admin** | แอดมิน (เข้า Super Admin ผ่านหน้าแยก) | `/dashboard` แสดงปุ่ม "เปิด Super Admin ในหน้าต่างใหม่" → `/super-admin-login` |
| **super_admin** | ซูเปอร์แอดมิน | Login ที่ `/super-admin-login` แล้วเข้า `/super-admin-page` |

---

## 3. Workflows หลักที่ควรทดสอบ

### 3.1 Customer

| # | Workflow | หน้าที่เกี่ยวข้อง | สิ่งที่ควรเทส |
|---|----------|-------------------|----------------|
| 1 | ดูหน้าหลัก | `/` | โหลดได้, Hero, ปุ่ม Agent/ลงประกาศ (ถ้า login แล้วและไม่ใช่ agent) |
| 2 | Login / Register | Login Drawer, Register Drawer | Login สำเร็จ, Register สำเร็จ, redirect ถูก |
| 3 | Dashboard (Customer) | `/dashboard` → `/dashboard/account` | redirect ไป account, ข้อมูลโปรไฟล์ แก้ไขได้ |
| 4 | รายการโปรด | `/dashboard/favorites` | ดูรายการ, ลบรายการโปรด |
| 5 | เปรียบเทียบ | `/dashboard/compare` | เพิ่ม/ลบรายการเปรียบเทียบ, ดูหน้าคอมแพร์ |
| 6 | แพ็กเกจ | `/dashboard/packages` | ดูแพ็กเกจ (ถ้ามี) |
| 7 | การแจ้งเตือน | `/dashboard/notifications` | ดูรายการแจ้งเตือน |
| 8 | ดูรายการประกาศทั้งหมด | `/all-properties` | โหลดได้, filter/search ทำงาน |
| 9 | ดูหน้ารายละเอียดประกาศ | `/property/[id]` | โหลดได้, แสดงข้อมูล Agent, ปุ่มติดต่อ/ซ่อนเบอร์ (ตามสิทธิ์) |
| 10 | ค้นหา / แผนที่ | `/map` | แผนที่โหลด, ค้นหา/ฟิลเตอร์ |
| 11 | ลงประกาศ (Customer พยายามลง) | `/add-property` | แสดง RoleSwitchAlert หรือ redirect ไปสมัคร Agent |
| 12 | Coming Soon | `/coming-soon` | หน้าโหลดได้, ปุ่มกลับ/ไป dashboard |

### 3.2 Agent

| # | Workflow | หน้าที่เกี่ยวข้อง | สิ่งที่ควรเทส |
|---|----------|-------------------|----------------|
| 1 | Login แล้วเข้า Dashboard Agent | `/dashboard` → `/dashboard/agent` | redirect ไป agent dashboard |
| 2 | ลงประกาศ | `/add-property` | กรอกฟอร์ม, อัพโหลดรูป, เลือกตำแหน่ง, บันทึก/ส่ง |
| 3 | รายการประกาศของฉัน | `/dashboard/listings` | ดูรายการ, แก้ไข, ลบ, สถานะ |
| 4 | ดูหน้ารายละเอียดประกาศ (ของตัวเอง) | `/property/[id]` | แก้ไขได้, ดูสถิติ/ลูกค้าสนใจ (ถ้ามี) |
| 5 | ติดต่อลูกค้า (ซ่อนเบอร์) | `/property/[id]` | ปุ่มขอเบอร์/แสดงเบอร์ ทำงานตามสิทธิ์ |
| 6 | Add Property Header | Header บน `/add-property` | ปุ่ม "ไป Dashboard Agent" ทำงาน |

### 3.3 Admin

| # | Workflow | หน้าที่เกี่ยวข้อง | สิ่งที่ควรเทส |
|---|----------|-------------------|----------------|
| 1 | เข้า Dashboard | `/dashboard` | เห็นปุ่ม "เปิด Super Admin Login ในหน้าต่างใหม่" |
| 2 | เปิด Super Admin | คลิกปุ่ม → `/super-admin-login` | เปิดแท็บใหม่ไปหน้า login Super Admin |
| 3 | จัดการบัญชีตัวเอง | `/dashboard/account` | แก้ไขโปรไฟล์ได้ |

### 3.4 Super Admin

| # | Workflow | หน้าที่เกี่ยวข้อง | สิ่งที่ควรเทส |
|---|----------|-------------------|----------------|
| 1 | Login Super Admin | `/super-admin-login` | Login ด้วยบัญชี super_admin ได้, redirect ไป `/super-admin-page` |
| 2 | Dashboard | `/super-admin-page?tab=dashboard` | สถิติ, กราฟ, ตารางประกาศล่าสุด |
| 3 | จัดการผู้ใช้ | `/super-admin-page?tab=users` | ดูรายการ user, role, ค้นหา, (แก้ไข/เปลี่ยน role ถ้ามี) |
| 4 | จัดการประกาศ | `/super-admin-page?tab=properties` | ดูรายการประกาศ, สถานะ, ค้นหา, pagination |
| 5 | รออนุมัติ | `/super-admin-page?tab=pending-properties` | ดูรายการรออนุมัติ, อนุมัติ/ปฏิเสธ, Draw Boundary (ถ้ามี) |
| 6 | แจ้งเตือน | `/super-admin-page?tab=notifications` | ดูการแจ้งเตือน |
| 7 | ตั้งค่า | `/super-admin-page?tab=settings` | ตั้งค่าระบบ/โปรไฟล์แอดมิน |
| 8 | ออกจากระบบ | ปุ่ม Logout ใน Sidebar | Logout แล้ว redirect ไป `/super-admin-login` |
| 9 | Session / Security | Idle timeout, warning | แจ้งเตือนเมื่อ idle, logout อัตโนมัติ (ถ้ามี) |

---

## 4. ระบบควรเทสอะไรบ้าง (Checklist สรุป)

### 4.1 การเข้าใช้งานและสิทธิ์

- [ ] แต่ละ Role login ได้และถูก redirect ไปหน้าที่ถูกต้อง
- [ ] Customer ไม่เห็นเมนู/ปุ่มของ Agent หรือ Super Admin ที่ไม่ควรเข้า
- [ ] Agent เข้า `/add-property` และ `/dashboard/listings` ได้
- [ ] Super Admin เข้าได้เฉพาะหลัง login ที่ `/super-admin-login` เท่านั้น
- [ ] การเข้า URL โดยตรงโดยไม่มีสิทธิ์ (เช่น ไม่ login) ถูก redirect ไป login หรือหน้าเหมาะสม

### 4.2 หน้าที่สำคัญ (Smoke Test)

- [ ] หน้าหลัก `/` โหลดได้
- [ ] `/all-properties` โหลดและแสดงรายการ (หรือ empty state)
- [ ] `/property/[id]` โหลดและแสดงรายละเอียด
- [ ] `/add-property` โหลด (Agent เท่านั้นควรใช้ได้เต็มที่)
- [ ] `/dashboard` redirect ตาม role
- [ ] `/dashboard/account`, `/dashboard/favorites`, `/dashboard/compare`, `/dashboard/notifications` โหลดได้
- [ ] `/dashboard/agent`, `/dashboard/listings` โหลดได้เมื่อเป็น Agent
- [ ] `/super-admin-login` และ `/super-admin-page` โหลดได้หลัง login Super Admin

### 4.3 ฟอร์มและปุ่มหลัก

- [ ] Login / Register ทำงาน (ถ้าเทสได้)
- [ ] ฟอร์มลงประกาศ (add-property): บันทึก/ส่งได้ ไม่ crash
- [ ] ปุ่มติดต่อ/ซ่อนเบอร์ในหน้ารายละเอียดประกาศ
- [ ] ปุ่ม Export / CSV ใน Super Admin (ถ้ามี)
- [ ] ปุ่มอนุมัติ/ปฏิเสธใน pending-properties
- [ ] Logout ทุก role ทำงานและ redirect ถูก

### 4.4 UI / UX พื้นฐาน

- [ ] ไม่มี error แดงบนหน้า (console error ที่ทำให้ฟีเจอร์เสีย)
- [ ] Mobile/Responsive: เมนูเปิดปิดได้, ฟอร์มใช้ได้
- [ ] ภาษา: ไทย/EN สลับได้และไม่แตก (ถ้ามี i18n)

### 4.5 Performance (ถ้าต้องการลงลึก)

- [ ] หน้าแรกและหน้ารายการโหลดในเวลาที่ยอมรับได้
- [ ] แผนที่ (`/map`, component แผนที่) โหลดและไม่ค้าง

---

## 5. วิธีให้ Cursor เปิด Chrome และทดสอบ

### 5.1 ใช้ MCP cursor-ide-browser

Cursor มี MCP **cursor-ide-browser** ใช้เปิดเบราว์เซอร์และควบคุมได้ คุณสามารถสั่ง Cursor แบบนี้:

- *"ใช้ browser MCP เปิด Chrome ไปที่ http://localhost:3000 แล้วทดสอบหน้าแรก: ตรวจว่าโหลดได้และมีปุ่มลงประกาศ"*
- *"เปิด /dashboard แล้ว login ด้วยบัญชี customer ตรวจว่า redirect ไป /dashboard/account"*
- *"เปิด /super-admin-login login แล้วไป tab จัดการผู้ใช้ และรายงานว่าหน้าโหลดได้หรือไม่"*

### 5.2 ลำดับการทำงานที่แนะนำ (สำหรับ Cursor)

1. **browser_navigate** ไป base URL (เช่น `http://localhost:3000`)
2. **browser_snapshot** เพื่อดูโครงสร้างหน้าและ element ref
3. **browser_click** / **browser_type** ตาม flow (เช่น login, ไปเมนู)
4. รอโหลดด้วย **browser_wait** หรือ snapshot ซ้ำ
5. ทำซ้ำตาม Workflow แต่ละ Role ด้านบน

หมายเหตุจาก MCP: ต้อง **browser_navigate** ก่อน แล้วค่อย **browser_lock** ถ้าต้องการ lock แท็บ; ใช้ **browser_snapshot** ก่อน click/type ทุกครั้ง

### 5.3 ตัวอย่าง Prompt สำหรับ Cursor

- *"รัน dev server แล้วใช้ browser MCP ทดสอบทุก Role ตาม docs/CURSOR-BROWSER-TESTING-GUIDE.md: Customer (dashboard, favorites, หน้ารายละเอียด), Agent (add-property, listings), Admin (dashboard + ลิงก์ Super Admin), Super Admin (login, dashboard, users, properties, pending). สรุปเป็น report ว่าหน้าไหนผ่าน/ไม่ผ่าน และมี error อะไรบ้าง"*

---

## 6. รูปแบบ Report ที่ควรได้จาก Cursor

หลังจากให้ Cursor ช่วยเทส คุณควรได้รายงานอย่างน้อยในรูปแบบนี้:

### 6.1 Report Template

```markdown
# Teedin Browser Test Report
**วันที่:** YYYY-MM-DD  
**Environment:** e.g. http://localhost:3000  
**Tester:** Cursor (cursor-ide-browser)

## สรุปผล
- ผ่าน: X / Y ข้อ
- ไม่ผ่าน: รายการด้านล่าง
- ไม่ได้ทดสอบ: (เหตุผล เช่น ไม่มีบัญชี test)

## รายละเอียดแยกตาม Role

### Customer
| Workflow / หน้า | ผล | หมายเหตุ |
|-----------------|-----|----------|
| หน้าหลัก / | ✅/❌ | |
| Dashboard → account | ✅/❌ | |
| ... | | |

### Agent
| Workflow / หน้า | ผล | หมายเหตุ |
|-----------------|-----|----------|
| ... | | |

### Admin
...

### Super Admin
...

## ข้อผิดพลาด / Console Errors (ถ้ามี)
- หน้า X: ข้อความ error
- ...

## ข้อเสนอแนะ
- ...
```

### 6.2 สิ่งที่ควรมีใน Report

- **ผ่าน/ไม่ผ่าน** ต่อ workflow หรือต่อหน้า
- **URL ที่ทดสอบ** และ role ที่ใช้
- **Console errors** ที่เห็นและเกี่ยวข้องกับฟีเจอร์
- **Screenshot หรือข้อความจาก snapshot** เฉพาะจุดที่ล้ม (ถ้า Cursor ส่งมาได้)
- **สิ่งที่ไม่ได้เทส** (เช่น ไม่มีบัญชี agent) เพื่อให้คุณรู้ว่าต้องเติมทีหลัง

---

## 7. สรุป

- ใช้ **Cursor + cursor-ide-browser** เปิด Chrome แล้วไล่ตาม **Roles** และ **Workflows** ในเอกสารนี้
- ระบบควรเทสเรื่อง **สิทธิ์, หน้าที่สำคัญ, ฟอร์ม/ปุ่มหลัก, UI พื้นฐาน** ตาม Checklist ข้างบน
- ให้ Cursor สรุปผลเป็น **Report** ตาม Template ในหัวข้อ 6 เพื่อใช้ตรวจสอบและเก็บไว้อ้างอิง

ถ้าต้องการเพิ่ม Role หรือ Workflow อื่น (เช่น OAuth, upload mobile) ให้เพิ่มในหัวข้อ 3 และ 4 แล้วอัปเดต Prompt ในหัวข้อ 5.3 ให้สอดคล้องกัน

---

## 8. HTML Report Dashboard

หลังทดสอบแล้ว สามารถกรอกผลลงใน **Report แบบ HTML** ได้ที่:

- **ไฟล์:** `docs/teedin-test-report.html`

เปิดด้วยเบราว์เซอร์ (Chrome, Edge ฯลฯ) จะได้หน้า Report แบบ dashboard พร้อม:

- **Part Tester** — แสดง Tester, วันที่, Environment, คู่มืออ้างอิง
- **สรุปผล** — ผ่าน / ไม่ผ่าน / ไม่ได้ทดสอบ (อัปเดตอัตโนมัติเมื่อคลิกเลือกผลในตาราง)
- **ตารางแยกตาม Role** — Customer, Agent, Admin, Super Admin ครบทุก workflow ตามคู่มือ
- **Checklist** — ระบบควรเทสอะไรบ้าง (คลิกเพื่อติ๊ก done)
- **Console Errors** และ **ข้อเสนอแนะ** — กรอกเพิ่มได้

**วิธีใช้:**

1. **รันเทสแบบไม่ใช้ Browser MCP (ใช้ได้ทุกเซสชัน)**  
   - เปิด dev server: `npm run dev`  
   - รัน smoke test: `npm run test:smoke` หรือ `node scripts/teedin-smoke-test.mjs`  
   - สคริปต์จะเรียก GET แต่ละ URL ตามคู่มือ แล้วเขียนผลลง `docs/teedin-test-results.json`  
   - เปิด `docs/teedin-test-report.html` ในเบราว์เซอร์ → กด **"โหลดผลจากไฟล์ JSON"** → เลือก `docs/teedin-test-results.json`  

2. **กรอกผลด้วยมือ:** คลิกที่เซลล์ "ผล" ในแต่ละแถวเพื่อสลับสถานะ (— → ✅ ผ่าน → ❌ ไม่ผ่าน → —) ตัวเลขสรุปจะอัปเดตเอง
