import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const email = (payload?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "ต้องระบุ email" }, { status: 400 });
    }

    // ตรวจสอบอีเมลในตาราง users
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("id")
      .ilike("email", email); // case-insensitive exact match

    if (usersError) {
      console.error("Error checking email in users table:", usersError);
      return NextResponse.json(
        { error: "เกิดข้อผิดพลาดในการตรวจสอบอีเมล" },
        { status: 500 }
      );
    }

    const existsInUsers = !!(usersData && usersData.length > 0);

    if (existsInUsers) {
      return NextResponse.json({
        exists: true,
        message: "อีเมลนี้มีอยู่ในระบบแล้ว กรุณาเข้าสู่ระบบแทน",
      });
    }

    // ตรวจสอบอีเมลใน Supabase Auth (auth.users) โดยใช้ Admin API
    // เพื่อป้องกันการส่ง OTP เมื่ออีเมลมีอยู่ในระบบแล้ว
    try {
      const supabaseAdmin = createSupabaseAdmin();

      // ใช้ Admin API เพื่อตรวจสอบว่ามีอีเมลในระบบ Auth หรือไม่
      // เนื่องจาก Admin API ไม่รองรับการค้นหาโดยตรง เราจะ list users และค้นหา
      // ตรวจสอบหลายหน้าเพื่อเพิ่มโอกาสในการพบอีเมล (จำกัดไว้ที่ 5 หน้าเพื่อประสิทธิภาพ)
      // Supabase Admin API ค่าเริ่มต้นคือ 50 users ต่อหน้า
      const maxPages = 5;
      const perPage = 50; // ใช้ค่าเริ่มต้นของ Supabase (50 users ต่อหน้า)

      for (let page = 1; page <= maxPages; page++) {
        const { data: authUsersData, error: authError } =
          await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage,
          });

        if (authError) {
          console.error(
            `Error checking email in Auth (page ${page}):`,
            authError
          );
          // ถ้าไม่สามารถตรวจสอบใน Auth ได้ ให้ข้ามการตรวจสอบนี้
          break;
        }

        if (!authUsersData?.users || authUsersData.users.length === 0) {
          // ไม่มีผู้ใช้ในหน้านี้ แสดงว่าเป็นหน้าสุดท้าย
          break;
        }

        // ตรวจสอบว่ามีอีเมลใน Auth หรือไม่
        const existsInAuth = authUsersData.users.some(
          user => user.email?.toLowerCase() === email
        );

        if (existsInAuth) {
          return NextResponse.json({
            exists: true,
            message: "อีเมลนี้มีอยู่ในระบบแล้ว กรุณาเข้าสู่ระบบแทน",
          });
        }

        // ถ้ามีผู้ใช้น้อยกว่า perPage แสดงว่าเป็นหน้าสุดท้าย
        if (authUsersData.users.length < perPage) {
          break;
        }
      }

      // หากตรวจสอบแล้วไม่พบอีเมล และระบบมีผู้ใช้มากกว่า 3000 คน
      // อาจไม่พบใน 3 หน้าแรก แต่การตรวจสอบสุดท้ายใน finalizeRegistration
      // จะป้องกันไม่ให้สร้างบัญชีซ้ำได้แน่นอน
    } catch (adminError) {
      console.error("Error using admin API to check Auth:", adminError);
      // ถ้าเกิดข้อผิดพลาดในการใช้ Admin API ให้ข้ามการตรวจสอบนี้
      // และให้ไปตรวจสอบตอนสร้างบัญชีแทน
    }

    return NextResponse.json({
      exists: false,
      message: "สามารถสมัครสมาชิกได้",
    });
  } catch (error) {
    console.error("Error in check-user-exists:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" },
      { status: 500 }
    );
  }
}
