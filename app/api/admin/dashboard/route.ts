import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
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
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      !["admin", "super_admin"].includes(userProfile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // เรียกใช้ function เพื่อดึงสถิติ
    const { data: stats, error: statsError } = await supabase.rpc(
      "get_dashboard_stats"
    );

    if (statsError) {
      throw statsError;
    }

    // ดึงข้อมูลล่าสุด (Parallel Execution)
    const [
      { data: recentUsers },
      { data: pendingAgents },
      { data: pendingProperties },
    ] = await Promise.all([
      supabase
        .from("users")
        .select("id, email, first_name, last_name, role, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("v_pending_approvals")
        .select("id, type, ref_id, created_at, status")
        .eq("type", "agent")
        .limit(5),
      supabase
        .from("v_pending_approvals")
        .select("id, type, ref_id, created_at, status")
        .eq("type", "property")
        .limit(5),
    ]);

    return NextResponse.json(
      {
        stats,
        recent_users: recentUsers || [],
        pending_agents: pendingAgents || [],
        pending_properties: pendingProperties || [],
      },
      { headers: { "Cache-Control": "public, max-age=30" } }
    );
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
