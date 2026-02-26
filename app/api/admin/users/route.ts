import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getSuperAdminServerClient } from "@/lib/super-admin-supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // ตรวจสอบสิทธิ์ super admin
    const supabaseAuth = await getSuperAdminServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ตรวจสอบ role ว่าเป็น admin หรือ super_admin
    const supabase = createSupabaseAdmin();
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userProfile || !["admin", "super_admin"].includes(userProfile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ใช้ service role key เพื่อ bypass RLS และดึงข้อมูลทั้งหมด

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get("role") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "1000"); // เพิ่ม limit เพื่อดึงข้อมูลทั้งหมด
    const search = searchParams.get("search") || "";

    let query = supabase
      .from("users")
      .select(
        "id, email, first_name, last_name, role, phone, created_at, updated_at",
        { count: "exact" }
      );

    // Filter by role
    if (role !== "all") {
      query = query.eq("role", role);
    }

    // Search filter
    if (search) {
      query = query.or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
      );
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: users,
      error,
      count,
    } = await query.range(from, to).order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      users: users || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Users API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // ตรวจสอบสิทธิ์ super admin
    const supabaseAuth = await getSuperAdminServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ตรวจสอบ role ว่าเป็น admin หรือ super_admin (ลบ user ได้)
    const supabase = createSupabaseAdmin();
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userProfile || !["admin", "super_admin"].includes(userProfile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าไม่ใช่การลบตัวเอง
    if (userId === user.id) {
      return NextResponse.json(
        { error: "Cannot delete yourself" },
        { status: 400 }
      );
    }

    // ใช้ service role key เพื่อ bypass RLS

    // 1. ลบข้อมูลในตาราง customers ที่เกี่ยวข้องก่อน (แก้ปัญหา FK constraint)
    const { error: deleteCustomersError } = await supabase
      .from("customers")
      .delete()
      .eq("user_id", userId);

    if (deleteCustomersError) {
      console.warn(
        "Warning: Failed to delete related customers:",
        deleteCustomersError
      );
      // ไม่ throw error เพราะอาจจะไม่มีข้อมูลใน customers หรือเป็น optional
    }

    // 2. ลบผู้ใช้ (CASCADE จะลบข้อมูลที่เกี่ยวข้องอื่นๆ ถ้ามีการตั้งค่าไว้)
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
