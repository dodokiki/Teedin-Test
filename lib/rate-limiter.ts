interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// เก็บข้อมูลการ rate limit ใน memory
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number; // ช่วงเวลาในหน่วย milliseconds
  maxRequests: number; // จำนวนคำขอสูงสุดในช่วงเวลาที่กำหนด
}

// กำหนดค่าเริ่มต้นสำหรับ OTP requests
export const OTP_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 นาที
  maxRequests: 5, // สูงสุด 5 ครั้งใน 15 นาที
};

export const PASSWORD_RESET_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
  maxRequests: 10, // สูงสุด 10 ครั้งใน 1 ชั่วโมง
};

/**
 * ตรวจสอบ rate limit สำหรับ IP หรือ email
 * @param key - คีย์สำหรับ rate limit (เช่น IP address หรือ email)
 * @param config - การกำหนดค่า rate limit
 * @returns { allowed: boolean, remaining: number, resetTime: number }
 */
export const checkRateLimit = (
  key: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} => {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // ถ้าไม่มีข้อมูลหรือเวลาหมดแล้ว ให้รีเซ็ต
  if (!entry || now >= entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, newEntry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // ถ้ายังไม่เกินขำกำหนด
  if (entry.count < config.maxRequests) {
    entry.count++;
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  // เกินขีดจำกัดแล้ว
  return {
    allowed: false,
    remaining: 0,
    resetTime: entry.resetTime,
    retryAfter: Math.ceil((entry.resetTime - now) / 1000), // seconds
  };
};

/**
 * ล้างข้อมูล rate limit ที่หมดอายุแล้ว
 */
export const cleanupExpiredEntries = () => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

/**
 * รีเซ็ต rate limit สำหรับ key ที่กำหนด (สำหรับการทดสอบ)
 */
export const resetRateLimit = (key: string) => {
  rateLimitStore.delete(key);
};

/**
 * ดูข้อมูล rate limit ปัจจุบันทั้งหมด (สำหรับการ debug)
 */
export const getRateLimitStats = () => {
  cleanupExpiredEntries();
  return Array.from(rateLimitStore.entries()).map(([key, entry]) => ({
    key,
    count: entry.count,
    resetTime: new Date(entry.resetTime).toISOString(),
    remainingTime: Math.max(0, entry.resetTime - Date.now()),
  }));
};

// ทำความสะอาดทุก 10 นาที
setInterval(cleanupExpiredEntries, 10 * 60 * 1000);
