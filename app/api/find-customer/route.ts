import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // ค้นหา user ที่มี email นี้
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("email", email.toLowerCase())
      .single();

    if (userError || !user) {
      console.error("User not found or error:", userError);
      return NextResponse.json(
        { error: "ไม่พบข้อมูลกรุณากรอกใหม่" },
        { status: 404 }
      );
    }

    // ตรวจสอบว่า user นี้มี role เป็น customer
    if (user.role !== "customer") {
      console.error("User found but role is not customer:", user.role);
      return NextResponse.json(
        { error: "ผู้ใช้นี้ไม่ใช่ลูกค้า (Role ไม่ถูกต้อง)" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      customerId: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error("Error finding customer:", error);
    return NextResponse.json(
      { error: "ไม่พบข้อมูลกรุณากรอกใหม่" },
      { status: 500 }
    );
  }
}
