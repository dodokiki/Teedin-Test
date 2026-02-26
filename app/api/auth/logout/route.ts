import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // ดึง token จาก Authorization header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "ไม่พบ token การเข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    // ตรวจสอบ session และ logout
    const { error: signOutError } = await supabase.auth.admin.signOut(token);

    if (signOutError) {
      console.error("Error signing out:", signOutError);
      // ถึงแม้จะมี error ใน signOut เราก็ยังคืน success เพื่อให้ client logout
    }

    // ลบ token จาก database sessions (ถ้ามี)
    // ใน Supabase auth.admin.signOut จะจัดการให้อัตโนมัติ

    return NextResponse.json({
      message: "ออกจากระบบสำเร็จ",
      success: true,
    });
  } catch (error) {
    console.error("Error during logout:", error);
    // ถึงแม้จะมี error เราก็ควรให้ client logout ได้
    return NextResponse.json({
      message: "ออกจากระบบสำเร็จ",
      success: true,
    });
  }
}

// สำหรับ Super Admin logout - ไม่ต้องใช้ token
export async function DELETE() {
  try {
    // Force logout - ลบ session ทั้งหมด
    await supabase.auth.signOut();

    return NextResponse.json({
      message: "ออกจากระบบสำเร็จ",
      success: true,
    });
  } catch (error) {
    console.error("Error during force logout:", error);
    return NextResponse.json({
      message: "ออกจากระบบสำเร็จ",
      success: true,
    });
  }
}
