import {
  applyPendingCookies,
  createSuperAdminRouteClient,
  type PendingCookie,
} from "@/lib/super-admin-supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pendingCookies: PendingCookie[] = [];
  try {
    const supabase = createSuperAdminRouteClient(request, pendingCookies);

    const { id: propertyId } = await params;

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

    const body = await request.json();
    const { coordinates } = body;

    if (!coordinates || !Array.isArray(coordinates)) {
      const response = NextResponse.json(
        { error: "Invalid coordinates format" },
        { status: 400 }
      );
      applyPendingCookies(response, pendingCookies);
      return response;
    }

    // Format as MultiPolygon GeoJSON
    const boundaryData = {
      type: "MultiPolygon",
      coordinates: [coordinates], // Wrap in array for MultiPolygon
    };

    // Update property with boundary coordinates
    const { data, error } = await supabase
      .from("properties")
      .update({ boundary_coordinates: boundaryData })
      .eq("id", propertyId)
      .select()
      .single();

    if (error) {
      const response = NextResponse.json(
        { error: "Failed to save boundary coordinates" },
        { status: 500 }
      );
      applyPendingCookies(response, pendingCookies);
      return response;
    }

    const response = NextResponse.json({
      success: true,
      data,
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pendingCookies: PendingCookie[] = [];
  try {
    const supabase = createSuperAdminRouteClient(request, pendingCookies);

    const { id: propertyId } = await params;

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

    // Get boundary coordinates
    const { data, error } = await supabase
      .from("properties")
      .select("boundary_coordinates")
      .eq("id", propertyId)
      .single();

    if (error) {
      const response = NextResponse.json(
        { error: "Failed to fetch boundary coordinates" },
        { status: 500 }
      );
      applyPendingCookies(response, pendingCookies);
      return response;
    }

    const response = NextResponse.json({
      boundary_coordinates: data?.boundary_coordinates || null,
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
