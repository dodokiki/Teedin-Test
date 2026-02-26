import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    // ลอง parse cookies เพื่อหา access token
    const cookies = request.headers.get("cookie") || "";
    let accessToken = "";

    // หา sb-access-token หรือ supabase access token จาก cookies
    const cookiePairs = cookies.split(";");
    for (const cookie of cookiePairs) {
      const [name, value] = cookie.trim().split("=");
      if (name === "sb-access-token" || name.includes("access-token")) {
        accessToken = decodeURIComponent(value);
        break;
      }
    }

    // ถ้าไม่เจอใน cookies ให้ลองจาก Authorization header
    if (!accessToken) {
      const authHeader = request.headers.get("authorization");
      accessToken = authHeader?.replace("Bearer ", "") || "";
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "ไม่พบ token การเข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    // ตรวจสอบ session โดยใช้ supabase client
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.log("Auth error:", authError);
      return NextResponse.json(
        { error: "token ไม่ถูกต้องหรือหมดอายุ" },
        { status: 401 }
      );
    }

    // ดึงข้อมูล user จาก database
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, email, full_name, phone, role, created_at, updated_at")
      .eq("id", user.id)
      .single();

    if (userError) {
      console.log("User error:", userError);
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้" }, { status: 404 });
    }

    // ตรวจสอบว่าเป็น Super Admin หรือไม่
    const isSuperAdmin = userData?.role === "admin";
    const isAdmin = userData?.role === "admin";

    return NextResponse.json({
      id: userData?.id || user.id,
      email: userData?.email || user.email,
      fullName: userData?.full_name || "",
      phone: userData?.phone || "",
      role: userData?.role || "customer",
      isSuperAdmin,
      isAdmin,
      createdAt: userData?.created_at,
      updatedAt: userData?.updated_at,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้" },
      { status: 500 }
    );
  }
}
