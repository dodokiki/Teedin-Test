import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { propertyId, agentId, buyerId } = await request.json();

    if (!propertyId || !agentId) {
      return NextResponse.json(
        { success: false, error: "Missing propertyId or agentId" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Get property details to include in the notification message
    const { data: propertyData, error: propertyError } = await supabase
      .from("properties")
      .select("property_details(project_name)")
      .eq("id", propertyId)
      .single();

    if (propertyError || !propertyData) {
      console.error("Error fetching property details:", propertyError);
      // Continue without property name in message
    }

    const projectName =
      (propertyData?.property_details as any)?.[0]?.project_name ||
      "an unnamed property";

    const notification = {
      sender_id: buyerId, // Can be null if the user is not logged in
      receiver_id: agentId,
      message: `A potential buyer has viewed your phone number for the property: ${projectName}`,
      headder: "มีคนสนใจประกาศของคุณ",
      is_read: false,
      role: "buyer",
    };

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert([notification]);

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      return NextResponse.json(
        { success: false, error: "Failed to create notification" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
