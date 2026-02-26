import { createServerClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone } = body;

    if (!email || !phone) {
      return NextResponse.json(
        { error: "Email และ Phone ห้ามว่าง" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // ตรวจสอบ email ซ้ำ
    const { data: existingEmail, error: emailError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .single();

    if (emailError && emailError.code !== "PGRST116") {
      console.error("Email check error:", emailError);
      return NextResponse.json(
        { error: "เกิดข้อผิดพลาดในการตรวจสอบ email" },
        { status: 500 }
      );
    }

    // ตรวจสอบ phone ซ้ำ
    const { data: existingPhone, error: phoneError } = await supabase
      .from("users")
      .select("id, phone")
      .eq("phone", phone)
      .single();

    if (phoneError && phoneError.code !== "PGRST116") {
      console.error("Phone check error:", phoneError);
      return NextResponse.json(
        { error: "เกิดข้อผิดพลาดในการตรวจสอบเบอร์โทรศัพท์" },
        { status: 500 }
      );
    }

    // ถ้ามี email หรือ phone ซ้ำ
    if (existingEmail) {
      return NextResponse.json(
        {
          isDuplicate: true,
          field: "email",
          message: "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น",
        },
        { status: 409 }
      );
    }

    if (existingPhone) {
      return NextResponse.json(
        {
          isDuplicate: true,
          field: "phone",
          message: "เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว กรุณาใช้เบอร์อื่น",
        },
        { status: 409 }
      );
    }

    // ไม่มีข้อมูลซ้ำ
    return NextResponse.json(
      {
        isDuplicate: false,
        message: "ข้อมูลพร้อมใช้งาน",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Check duplicate error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" },
      { status: 500 }
    );
  }
}
