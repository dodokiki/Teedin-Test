import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

// สร้าง Supabase client สำหรับ server-side
const supabase = createSupabaseAdmin();

interface RecentProperty {
  id: string;
  status: string | null;
  created_at: string;
  agent_id: string | null;
  users: Array<{
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  }> | null;
}

interface PropertyDetail {
  property_id: string;
  price: number | null;
  project_name: string | null;
  description: string | null;
}

interface AgentRecord {
  user_id: string;
  created_at: string;
}

interface AgentUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface PropertyAgentRecord {
  id: string;
  agent_id: string | null;
}

interface RecentActivity {
  id: string;
  action: string;
  created_at: string;
  users: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  [key: string]: unknown;
}

export async function GET() {
  try {


    // Counts (head-only)
    const [
      usersCountRes,
      propertiesCountRes,
      approvedAgentsCountRes,
      pendingPropsCountRes,
      approvedPropsCountRes,
      publishedPropsCountRes,
      soldPropsCountRes,
    ] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("properties").select("id", { count: "exact", head: true }),
      supabase
        .from("agens")
        .select("user_id", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("status", "sold"),
    ]);

    const totalUsers = usersCountRes.count || 0;
    const totalProperties = propertiesCountRes.count || 0;
    const totalAgents = approvedAgentsCountRes.count || 0;
    const pendingProperties = pendingPropsCountRes.count || 0;
    const activeProperties =
      (approvedPropsCountRes.count || 0) + (publishedPropsCountRes.count || 0);
    const soldProperties = soldPropsCountRes.count || 0;

    // Users created this month (head-only)
    const thisMonth = new Date();
    const firstDayThisMonth = new Date(
      thisMonth.getFullYear(),
      thisMonth.getMonth(),
      1
    );
    const { count: newUsersThisMonth } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", firstDayThisMonth.toISOString());

    // คำนวณ properties ใหม่ในเดือนนี้
    const { count: newPropertiesThisMonth } = await supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .gte("created_at", firstDayThisMonth.toISOString());

    // Recent users (5)
    const { data: recentUsers } = await supabase
      .from("users")
      .select("id, email, role, first_name, last_name, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    // Recent properties (5) + slim joins
    const { data: recentProps } = await supabase
      .from("properties")
      .select(
        `id, status, created_at, agent_id,
         users:users!properties_agent_id_fkey (first_name, last_name, email)`
      )
      .order("created_at", { ascending: false })
      .limit(5);

    const recentPropertyIds = (recentProps ?? []).map(
      (property: RecentProperty) => property.id
    );

    const { data: recentDetails } = await supabase
      .from("property_details")
      .select("property_id, price, project_name, description")
      .in("property_id", recentPropertyIds);

    const recentPropertiesWithDetails = (recentProps ?? []).map(
      (property: RecentProperty) => {
        const details = (recentDetails ?? []).find(
          (detail: PropertyDetail) => detail.property_id === property.id
        );
        const agentInfo = Array.isArray(property.users)
          ? (property.users[0] ?? null)
          : property.users;
        return {
          id: property.id,
          title:
            details?.project_name ||
            details?.description?.substring(0, 50) ||
            "ไม่ระบุชื่อโครงการ",
          price: details?.price ?? 0,
          status: property.status,
          created_at: new Date(property.created_at).toLocaleDateString(
            "th-TH",
            {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
          users: agentInfo
            ? {
                first_name: agentInfo.first_name ?? "",
                last_name: agentInfo.last_name ?? "",
                email: agentInfo.email ?? "",
              }
            : null,
        };
      }
    );

    // Top agents (approx):
    const { data: approvedAgents } = await supabase
      .from("agens")
      .select("user_id, created_at")
      .eq("status", "approved")
      .limit(200);
    const { data: propsForTop } = await supabase
      .from("properties")
      .select("id, agent_id")
      .not("agent_id", "is", null)
      .limit(1000);
    const { data: agentUsers } = await supabase
      .from("users")
      .select("id, first_name, last_name, email")
      .in(
        "id",
        (approvedAgents ?? []).map((agent: AgentRecord) => agent.user_id)
      );

    const propertiesByAgent: Record<string, number> = {};
    (propsForTop ?? []).forEach((property: PropertyAgentRecord) => {
      if (!property.agent_id) return;
      propertiesByAgent[property.agent_id] =
        (propertiesByAgent[property.agent_id] || 0) + 1;
    });
    const topAgents = (approvedAgents ?? [])
      .map((agent: AgentRecord) => {
        const user = (agentUsers ?? []).find(
          (agentUser: AgentUser) => agentUser.id === agent.user_id
        );
        return {
          id: agent.user_id,
          first_name: user?.first_name ?? "",
          last_name: user?.last_name ?? "",
          email: user?.email ?? "",
          created_at: agent.created_at,
          properties_count: propertiesByAgent[agent.user_id] || 0,
        };
      })
      .sort((a, b) => (b.properties_count ?? 0) - (a.properties_count ?? 0))
      .slice(0, 5);

    // ดึงข้อมูล recent activities
    let recentActivities: RecentActivity[] = [];
    try {
      const { data } = await supabase
        .from("admin_logs")
        .select(
          `
          *,
          users(first_name, last_name, email)
        `
        )
        .order("created_at", { ascending: false })
        .limit(10);
      recentActivities = (data as RecentActivity[]) || [];
    } catch (activityError) {

    }

    const safeRecentUsers = recentUsers ?? [];
    const safeRecentProperties = recentPropertiesWithDetails;

    const stats = {
      overview: {
        totalUsers,
        totalProperties,
        totalAgents,
        pendingProperties,
        activeProperties,
        soldProperties,
        newUsersThisMonth,
        newPropertiesThisMonth,
      },
      recentActivities,
      topAgents,
      recentUsers: safeRecentUsers,
      recentProperties: safeRecentProperties,
    };



    return NextResponse.json(stats, {
      headers: { "Cache-Control": "private, max-age=15" },
    });
  } catch (error) {
    console.error("Stats API error:", error);

    // ส่งข้อมูล fallback เมื่อเกิดข้อผิดพลาด
    return NextResponse.json(
      {
        overview: {
          totalUsers: 0,
          totalProperties: 0,
          totalAgents: 0,
          pendingProperties: 0,
          activeProperties: 0,
          soldProperties: 0,
          newUsersThisMonth: 0,
          newPropertiesThisMonth: 0,
        },
        recentActivities: [],
        topAgents: [],
        recentUsers: [],
        recentProperties: [],
      },
      { status: 200 }
    ); // ส่ง 200 แทน 500 เพื่อไม่ให้ frontend error
  }
}
