"use client";
import type React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardLayoutProvider } from "@/contexts/dashboard-layout-context";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const router = useRouter();

  // ตรวจสอบ auth state และ redirect ถ้าไม่ได้ login
  useEffect(() => {
    const checkAuth = async () => {
      if (authLoading) return;

      // ตรวจสอบ session จาก Supabase โดยตรงเพื่อป้องกัน cache
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !isLoggedIn) {
        // ใช้ replace เพื่อป้องกัน back button
        router.replace("/");
        return;
      }
    };

    checkAuth();

    // ตรวจสอบอีกครั้งเมื่อกลับมาที่หน้า (เช่น หลังกด back button)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAuth();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLoggedIn, authLoading, router]);

  // แสดง loading ถ้ายังตรวจสอบ auth อยู่
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // ถ้าไม่ได้ login ให้ return null (จะถูก redirect)
  if (!isLoggedIn) {
    return null;
  }

  return (
    <DashboardLayoutProvider>
      <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
        <DashboardHeader />
        <div className="flex flex-1 overflow-hidden">
          <DashboardSidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </DashboardLayoutProvider>
  );
}
