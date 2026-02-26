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

    // ตรวจสอบว่ามี boundary_coordinates หรือไม่
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("boundary_coordinates, status")
      .eq("id", propertyId)
      .single();

    if (propertyError) {
      const response = NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
      applyPendingCookies(response, pendingCookies);
      return response;
    }

    if (!property.boundary_coordinates) {
      const response = NextResponse.json(
        {
          error: "กรุณาวาดเส้นกรอบที่ดินก่อนอนุมัติ",
          requiresBoundary: true,
        },
        { status: 400 }
      );
      applyPendingCookies(response, pendingCookies);
      return response;
    }

    if (property.status === "approved") {
      const response = NextResponse.json(
        { error: "Property already approved" },
        { status: 400 }
      );
      applyPendingCookies(response, pendingCookies);
      return response;
    }

    // Update property status to approved
    const { data, error } = await supabase
      .from("properties")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq("id", propertyId)
      .select()
      .single();

    if (error) {
      const response = NextResponse.json(
        { error: "Failed to approve property" },
        { status: 500 }
      );
      applyPendingCookies(response, pendingCookies);
      return response;
    }

    // Also update property_details status
    await supabase
      .from("property_details")
      .update({ status: "approved" })
      .eq("property_id", propertyId);

    const response = NextResponse.json({
      success: true,
      data,
      message: "อนุมัติการ์ดสำเร็จ",
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
