// components/session-guard.tsx
"use client";

import { useSessionSync } from "@/hooks/use-session-sync";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

interface SessionGuardProps {
  children: React.ReactNode;
}

export function SessionGuard({ children }: SessionGuardProps) {
  const { sessionState, isLoaded } = useSessionSync();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // เฉพาะหน้า super-admin เท่านั้นที่ต้องตรวจสอบ session sync
    if (
      pathname.startsWith("/super-admin") &&
      pathname !== "/super-admin-login"
    ) {
      if (
        isLoaded &&
        (!sessionState?.isAuthenticated || sessionState?.userRole !== "admin")
      ) {
        console.log("🔄 Super admin access denied, redirecting to login...");
        router.replace("/super-admin-login");
        return;
      }
    }

    // หน้าอื่นๆ ให้ AuthContext จัดการเอง
  }, [sessionState, isLoaded, pathname, router]);

  // แสดง loading เฉพาะหน้า super-admin ขณะโหลด session state
  if (!isLoaded && pathname.startsWith("/super-admin")) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
