# 🔐 Smart Adaptive Security System

ระบบความปลอดภัยอัจฉริยะสำหรับ Super Admin Page เฉพาะ

## ✨ Features

### Phase 1: JWT Foundation ✅

- **JWT Access Token** (30 นาที) + **Refresh Token** (8 ชั่วโมง)
- **Device Fingerprinting** - ตรวจสอบอุปกรณ์
- **IP Monitoring** - ตรวจสอบ IP address
- **Automatic Token Refresh** - ต่ออายุอัตโนมัติ

### Phase 2: Smart UX ✅

- **Adaptive Timeout** - ปรับเวลาตามการใช้งาน
- **Beautiful Warning Modal** - แจ้งเตือนสวยงาม
- **Quick Extend Options** - ต่อเวลาง่ายๆ
- **Sound Notifications** - เสียงแจ้งเตือน

### Phase 3: Intelligence (Coming Soon)

- **Risk-Based Timeout** - ปรับเวลาตามความเสี่ยง
- **Activity Analytics** - วิเคราะห์การใช้งาน
- **Advanced Monitoring** - ตรวจสอบขั้นสูง

## 🚀 วิธีการใช้งาน

### 1. ติดตั้งระบบ

```typescript
// ใน Super Admin component
import { useSuperAdminSession, SessionWarning } from './security';

function SuperAdminPage() {
  const {
    isAuthenticated,
    user,
    timeRemaining,
    isWarningShown,
    currentRiskLevel,
    login,
    logout,
    extendSession,
    trackActivity
  } = useSuperAdminSession();

  // ตรวจสอบการเข้าสู่ระบบ
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div>
      {/* เนื้อหาหลัก */}
      <YourAdminContent />

      {/* ระบบแจ้งเตือน */}
      <SessionWarning
        isVisible={isWarningShown}
        timeRemaining={timeRemaining}
        riskLevel={currentRiskLevel}
        onExtendSession={extendSession}
        onLogout={logout}
        onDismiss={() => {/* จัดการการปิดแจ้งเตือน */}}
      />
    </div>
  );
}
```

### 2. ติดตาม Activities

```typescript
// เมื่อทำการกระทำสำคัญ
<button onClick={() => {
  trackActivity('DELETE_USER');
  handleDeleteUser();
}}>
  ลบผู้ใช้
</button>

// กิจกรรมที่ระบบจดจำ
- VIEW_USERS, VIEW_PROPERTIES (Risk: LOW)
- EDIT_USER, EDIT_PROPERTY (Risk: MEDIUM)
- DELETE_USER, DELETE_PROPERTY (Risk: HIGH)
- SYSTEM_SETTINGS (Risk: CRITICAL)
```

## ⚙️ Configuration

### Timeout Settings

```typescript
// เวลาทำงาน (9-17): 45 นาที
// เวลาเย็น (17-22): 20 นาที
// เวลากลางคืน (22-9): 10 นาที
```

### Risk-Based Adjustment

```typescript
LOW Risk:    +20% เวลา (54 นาที)
MEDIUM Risk: เวลาปกติ (45 นาที)
HIGH Risk:   -70% เวลา (13.5 นาที)
CRITICAL:    -85% เวลา (6.75 นาที)
```

## 🔧 Customization

### แก้ไข Timeout

```typescript
// ใน config.ts
SESSION_TIMEOUT: {
  WORK_HOURS: {
    idleTimeout: 60 * 60 * 1000, // เปลี่ยนเป็น 60 นาที
    warningTime: 10 * 60 * 1000  // เตือน 10 นาทีก่อน
  }
}
```

### เพิ่ม Risk Actions

```typescript
// ใน config.ts
RISK_LEVELS: {
  HIGH: {
    actions: ['DELETE_USER', 'BULK_EXPORT', 'YOUR_NEW_ACTION'],
    timeoutMultiplier: 0.3
  }
}
```

## 📁 File Structure

```
super-admin-page/security/
├── config.ts              # การตั้งค่าหลัก
├── index.ts               # Export หลัก
├── hooks/
│   └── useSuperAdminSession.ts # Hook หลัก
├── components/
│   └── SessionWarning.tsx # Component แจ้งเตือน
└── utils/
    └── jwt-utils.ts       # JWT utilities
```

## 🛡️ Security Features

- ✅ **JWT Tokens** - ความปลอดภัยมาตรฐาน
- ✅ **Device Fingerprinting** - ตรวจสอบอุปกรณ์
- ✅ **IP Monitoring** - ติดตาม IP address
- ✅ **Session Limits** - จำกัด session พร้อมกัน
- ✅ **Auto Refresh** - ต่ออายุอัตโนมัติ
- ✅ **Activity Logging** - บันทึกการใช้งาน

## 🎯 Benefits

### สำหรับ Admin

- 🚫 **ไม่เด้งออกบ่อย** - ต่ออายุอัตโนมัติ
- ⚡ **ใช้งานลื่นไหล** - UX ที่ดี
- 🔒 **ปลอดภัยสูง** - มาตรฐานโลก
- 📊 **ตรวจสอบได้** - มี log ครบถ้วน

### สำหรับระบบ

- 🛡️ **ป้องกันการบุกรุก** - ตรวจสอบอุปกรณ์และ IP
- ⏰ **ควบคุมเวลา** - timeout ที่เหมาะสม
- 📈 **ขยายได้** - เพิ่มฟีเจอร์ได้ง่าย
- 🔄 **บำรุงรักษาง่าย** - โครงสร้างชัดเจน

## 🚀 Next Steps (Phase 2 & 3)

1. **Audit Logging** - บันทึกทุกการกระทำ
2. **RBAC System** - จัดการสิทธิ์
3. **Advanced Analytics** - วิเคราะห์การใช้งาน
4. **Real-time Monitoring** - ตรวจสอบแบบเรียลไทม์

---

**🎉 ระบบพร้อมใช้งานแล้ว!**

Import เข้าไปในหน้า Super Admin และเริ่มใช้งานได้เลย
