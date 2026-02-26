import {
  applyPendingCookies,
  createSuperAdminRouteClient,
  type PendingCookie,
} from "@/lib/super-admin-supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const pendingCookies: PendingCookie[] = [];
  try {
    const supabase = createSuperAdminRouteClient(request, pendingCookies);

    // ตรวจสอบสิทธิ์ admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const response = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
      applyPendingCookies(response, pendingCookies);
      return response;
    }

    // ตรวจสอบ role
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userProfile || !["admin", "super_admin"].includes(userProfile.role)) {
      const response = NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
      applyPendingCookies(response, pendingCookies);
      return response;
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // ดึง pending properties
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: properties,
      error: propertiesError,
      count,
    } = await supabase
      .from("properties")
      .select(
        `
        id,
        agent_id,
        listing_type,
        property_category,
        location,
        created_at,
        status,
        boundary_coordinates,
        property_details (
          project_name,
          address,
          price,
          images,
          latitude,
          longitude
        ),
        users!properties_agent_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `,
        { count: "exact" }
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (propertiesError) {
      const response = NextResponse.json(
        { error: "Failed to fetch pending properties" },
        { status: 500 }
      );
      applyPendingCookies(response, pendingCookies);
      return response;
    }

    const response = NextResponse.json({
      properties: properties || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
    applyPendingCookies(response, pendingCookies);
    return response;
  } catch (error) {
    const response = NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
    applyPendingCookies(response, pendingCookies);
    return response;
  }
}
