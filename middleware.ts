import { SUPER_ADMIN_COOKIE_NAME } from "@/lib/super-admin-cookie";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // ยกเลิกการบังคับล้างคุกกี้/รีไดเรกต์สำหรับ /super-admin-page

  // ถ้าเข้า /super-admin แต่ยกเว้นหน้า login และหน้า dashboard หลัก ให้ตรวจคุกกี้
  if (
    url.pathname.startsWith("/super-admin") &&
    url.pathname !== "/super-admin-login" &&
    url.pathname !== "/super-admin-page"
  ) {
    try {
      // ตรวจสอบคุกกี้ Supabase auth ที่ตั้งโดย auth-helpers (ปลอดภัยกว่า)
      const hasAdminCookie = request.cookies
        .getAll()
        .some(cookie => cookie.name.startsWith(SUPER_ADMIN_COOKIE_NAME));

      if (!hasAdminCookie) {
        console.log("❌ No auth cookies found, redirecting to login");
        url.pathname = "/super-admin-login";
        return NextResponse.redirect(url);
      }
      // Optional: เพิ่มการตรวจสอบ token/role ภายหลังหากต้องการ
    } catch (error) {
      console.error("Middleware error:", error);
      url.pathname = "/super-admin-login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/super-admin/:path*"],
};
