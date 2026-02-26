import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    // ตรวจสอบสิทธิ์ admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ตรวจสอบ role
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userProfile || !["admin", "super_admin"].includes(userProfile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    let query = supabase
      .from("system_announcements")
      .select("*", { count: "exact" });

    // Filter by status
    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: announcements,
      error,
      count,
    } = await query.range(from, to).order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      announcements: announcements || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Announcements API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบสิทธิ์ admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ตรวจสอบ role
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userProfile || !["admin", "super_admin"].includes(userProfile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      content,
      type,
      status,
      target_audience,
      start_date,
      end_date,
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("system_announcements")
      .insert({
        title,
        content,
        type: type || "general",
        status: status || "draft",
        target_audience: target_audience || "all",
        start_date,
        end_date,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // บันทึก log
    await supabase.from("admin_logs").insert({
      admin_id: user.id,
      action: "CREATE_ANNOUNCEMENT",
      target_type: "announcement",
      target_id: data.id,
      details: { title, type, status },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Create announcement error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // ตรวจสอบสิทธิ์ admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ตรวจสอบ role
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userProfile || !["admin", "super_admin"].includes(userProfile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      title,
      content,
      type,
      status,
      target_audience,
      start_date,
      end_date,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Announcement ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("system_announcements")
      .update({
        title,
        content,
        type,
        status,
        target_audience,
        start_date,
        end_date,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // บันทึก log
    await supabase.from("admin_logs").insert({
      admin_id: user.id,
      action: "UPDATE_ANNOUNCEMENT",
      target_type: "announcement",
      target_id: id,
      details: { title, type, status },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Update announcement error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // ตรวจสอบสิทธิ์ admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ตรวจสอบ role
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userProfile || userProfile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Announcement ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("system_announcements")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    // บันทึก log
    await supabase.from("admin_logs").insert({
      admin_id: user.id,
      action: "DELETE_ANNOUNCEMENT",
      target_type: "announcement",
      target_id: id,
      details: { deleted_by: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete announcement error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
