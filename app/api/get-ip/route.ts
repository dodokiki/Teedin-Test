/**
 * API Route to get client IP address
 * Used by Super Admin Security System
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get IP from various headers
    const forwarded = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const clientIP = request.headers.get("x-client-ip");

    // Determine the most reliable IP
    let ip = "127.0.0.1";

    if (forwarded) {
      // x-forwarded-for can contain multiple IPs, get the first one
      ip = forwarded.split(",")[0].trim();
    } else if (realIP) {
      ip = realIP;
    } else if (clientIP) {
      ip = clientIP;
    }

    // Basic IP validation
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    if (!ipRegex.test(ip)) {
      ip = "127.0.0.1"; // Fallback to localhost
    }

    return NextResponse.json({
      ip,
      headers: {
        "x-forwarded-for": forwarded,
        "x-real-ip": realIP,
        "x-client-ip": clientIP,
      },
    });
  } catch (error) {
    console.error("❌ Error getting client IP:", error);
    return NextResponse.json({ ip: "127.0.0.1" });
  }
}
