/**
 * JWT Token Management สำหรับ Super Admin
 */

import { SignJWT, jwtVerify } from "jose";
import SUPER_ADMIN_SECURITY_CONFIG from "../config";

const {
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  SECRET_KEY,
  REFRESH_SECRET,
} = SUPER_ADMIN_SECURITY_CONFIG.JWT;

// Convert secrets to Uint8Array for jose library
const getSecretKey = () => new TextEncoder().encode(SECRET_KEY);
const getRefreshSecretKey = () => new TextEncoder().encode(REFRESH_SECRET);

export interface SuperAdminTokenPayload {
  userId: string;
  email: string;
  role: "super_admin";
  sessionId: string;
  deviceFingerprint: string;
  ipAddress: string;
  loginTime: number;
  lastActivity: number;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  deviceFingerprint: string;
  type: "refresh";
}

/**
 * สร้าง Access Token สำหรับ Super Admin
 */
export async function generateAccessToken(
  payload: SuperAdminTokenPayload
): Promise<string> {
  try {
    const token = await new SignJWT({
      ...payload,
      type: "access",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + ACCESS_TOKEN_EXPIRY) / 1000),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(Math.floor((Date.now() + ACCESS_TOKEN_EXPIRY) / 1000))
      .sign(getSecretKey());

    return token;
  } catch (error) {
    console.error("❌ Error generating access token:", error);
    throw new Error("Failed to generate access token");
  }
}

/**
 * สร้าง Refresh Token สำหรับ Super Admin
 */
export async function generateRefreshToken(
  payload: RefreshTokenPayload
): Promise<string> {
  try {
    const token = await new SignJWT({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + REFRESH_TOKEN_EXPIRY) / 1000),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(Math.floor((Date.now() + REFRESH_TOKEN_EXPIRY) / 1000))
      .sign(getRefreshSecretKey());

    return token;
  } catch (error) {
    console.error("❌ Error generating refresh token:", error);
    throw new Error("Failed to generate refresh token");
  }
}

/**
 * ตรวจสอบ Access Token
 */
export async function verifyAccessToken(
  token: string
): Promise<SuperAdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    // ตรวจสอบว่าเป็น access token และยังไม่หมดอายุ
    if (
      payload.type !== "access" ||
      !payload.exp ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload as unknown as SuperAdminTokenPayload;
  } catch (error) {
    console.error("❌ Error verifying access token:", error);
    return null;
  }
}

/**
 * ตรวจสอบ Refresh Token
 */
export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getRefreshSecretKey());

    // ตรวจสอบว่าเป็น refresh token และยังไม่หมดอายุ
    if (
      payload.type !== "refresh" ||
      !payload.exp ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload as unknown as RefreshTokenPayload;
  } catch (error) {
    console.error("❌ Error verifying refresh token:", error);
    return null;
  }
}

/**
 * สร้าง Device Fingerprint
 */
export function generateDeviceFingerprint(): string {
  if (typeof window === "undefined") return "server";

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx?.fillText("Super Admin Security", 10, 10);

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 0,
    (navigator as { deviceMemory?: number }).deviceMemory || 0,
  ].join("|");

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * สร้าง Session ID
 */
export function generateSessionId(): string {
  return `super_admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * ตรวจสอบว่า token ใกล้หมดอายุหรือไม่
 */
export function isTokenExpiringSoon(
  token: string,
  warningTimeMs: number = 5 * 60 * 1000
): boolean {
  try {
    // Decode token without verification (just to read expiration)
    const parts = token.split(".");
    if (parts.length !== 3) return true;

    const payload = JSON.parse(atob(parts[1]));
    const expTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();

    return expTime - currentTime <= warningTimeMs;
  } catch (error) {
    console.error("❌ Error checking token expiration:", error);
    return true; // Assume expired if can't decode
  }
}

/**
 * คำนวณเวลาที่เหลือของ token
 */
export function getTokenTimeRemaining(token: string): number {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return 0;

    const payload = JSON.parse(atob(parts[1]));
    const expTime = payload.exp * 1000;
    const currentTime = Date.now();

    return Math.max(0, expTime - currentTime);
  } catch (error) {
    console.error("❌ Error getting token time remaining:", error);
    return 0;
  }
}
