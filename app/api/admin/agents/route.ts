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

    let query = supabase.from("agens").select(
      `
        user_id,
        company_name,
        license_number,
        business_license_id,
        address,
        property_types,
        service_areas,
        status,
        created_at,
        updated_at,
        approved_by,
        approved_at,
        rejection_reason,
        users!inner(
          email,
          first_name,
          last_name,
          phone
        )
      `,
      { count: "exact" }
    );

    // Filter by status
    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: agents,
      error,
      count,
    } = await query.range(from, to).order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      agents: agents || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Agents API error:", error);
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
    const { agentUserId, status, rejectionReason } = body;

    if (!agentUserId || !status) {
      return NextResponse.json(
        { error: "Agent ID and status are required" },
        { status: 400 }
      );
    }

    // เรียกใช้ function เพื่ออนุมัติเอเจนท์
    const { error } = await supabase.rpc("approve_agent", {
      agent_user_id: agentUserId,
      admin_user_id: user.id,
      approval_status: status,
    });

    if (error) {
      throw error;
    }

    // อัปเดต rejection_reason ถ้ามี
    if (status === "rejected" && rejectionReason) {
      await supabase
        .from("agens")
        .update({ rejection_reason: rejectionReason })
        .eq("user_id", agentUserId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Approve agent error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
