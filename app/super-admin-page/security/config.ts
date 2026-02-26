/**
 * Smart Adaptive Security Configuration
 * เฉพาะสำหรับ Super Admin Page
 */

export const SUPER_ADMIN_SECURITY_CONFIG = {
  // JWT Token Configuration
  JWT: {
    ACCESS_TOKEN_EXPIRY: 30 * 60 * 1000, // 30 นาที
    REFRESH_TOKEN_EXPIRY: 8 * 60 * 60 * 1000, // 8 ชั่วโมง
    SECRET_KEY: process.env.SUPER_ADMIN_JWT_SECRET || "super-admin-secret",
    REFRESH_SECRET:
      process.env.SUPER_ADMIN_JWT_REFRESH_SECRET ||
      "super-admin-refresh-secret",
  },

  // Session Timeout Configuration (แบบ Adaptive)
  SESSION_TIMEOUT: {
    // ตามเวลาใช้งาน
    WORK_HOURS: {
      start: 9,
      end: 17,
      idleTimeout: 45 * 60 * 1000, // 45 นาที
      warningTime: 5 * 60 * 1000, // แจ้งเตือน 5 นาทีก่อน
    },
    EVENING: {
      start: 17,
      end: 22,
      idleTimeout: 20 * 60 * 1000, // 20 นาที
      warningTime: 3 * 60 * 1000, // แจ้งเตือน 3 นาทีก่อน
    },
    NIGHT: {
      start: 22,
      end: 9,
      idleTimeout: 10 * 60 * 1000, // 10 นาที
      warningTime: 2 * 60 * 1000, // แจ้งเตือน 2 นาทีก่อน
    },
  },

  // Risk-Based Timeout Adjustment
  RISK_LEVELS: {
    LOW: {
      actions: ["VIEW_USERS", "VIEW_PROPERTIES", "VIEW_REPORTS"],
      timeoutMultiplier: 1.2, // เพิ่มเวลา 20%
    },
    MEDIUM: {
      actions: ["EDIT_USER", "EDIT_PROPERTY", "APPROVE_LISTING"],
      timeoutMultiplier: 1.0, // เวลาปกติ
    },
    HIGH: {
      actions: ["DELETE_USER", "DELETE_PROPERTY", "BULK_DELETE"],
      timeoutMultiplier: 0.3, // ลดเวลาเหลือ 30%
    },
    CRITICAL: {
      actions: ["SYSTEM_SETTINGS", "USER_PERMISSIONS", "DATABASE_BACKUP"],
      timeoutMultiplier: 0.15, // ลดเวลาเหลือ 15%
    },
  },

  // Security Features
  SECURITY: {
    MAX_CONCURRENT_SESSIONS: 2, // จำกัด 2 session
    SESSION_INACTIVITY_CHECK: 30 * 1000, // เช็คทุก 30 วินาที
    AUTO_SAVE_INTERVAL: 30 * 1000, // บันทึกอัตโนมัติทุก 30 วินาที
    DEVICE_FINGERPRINT_ENABLED: true,
    IP_MONITORING_ENABLED: true,
    AUDIT_LOGGING_ENABLED: true,
  },

  // UI/UX Settings
  NOTIFICATIONS: {
    POSITION: "top-right",
    SOUND_ENABLED: true,
    ANIMATION_DURATION: 300,
    TOAST_AUTO_DISMISS: false, // ไม่หายเอง ต้องกดปิด
    WARNING_SOUND_URL: "/sounds/warning.mp3",
  },
};

// Time-based configuration helper
export const getTimeBasedConfig = () => {
  const hour = new Date().getHours();
  const config = SUPER_ADMIN_SECURITY_CONFIG.SESSION_TIMEOUT;

  if (hour >= config.WORK_HOURS.start && hour < config.WORK_HOURS.end) {
    return config.WORK_HOURS;
  } else if (hour >= config.EVENING.start && hour < config.EVENING.end) {
    return config.EVENING;
  } else {
    return config.NIGHT;
  }
};

// Risk level calculator
export const calculateRiskLevel = (
  action: string
): keyof typeof SUPER_ADMIN_SECURITY_CONFIG.RISK_LEVELS => {
  const riskLevels = SUPER_ADMIN_SECURITY_CONFIG.RISK_LEVELS;

  for (const [level, config] of Object.entries(riskLevels)) {
    if (config.actions.includes(action)) {
      return level as keyof typeof riskLevels;
    }
  }

  return "MEDIUM"; // Default
};

export default SUPER_ADMIN_SECURITY_CONFIG;
