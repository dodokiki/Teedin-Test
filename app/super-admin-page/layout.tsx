import { getSuperAdminServerClient } from "@/lib/super-admin-supabase";
import { redirect } from "next/navigation";
import React from "react";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSuperAdminServerClient();

  // ตรวจสอบ session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/super-admin-login");
  }

  // ตรวจสอบ role เป็น admin
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/super-admin-login");
  }

  return <>{children}</>;
}
