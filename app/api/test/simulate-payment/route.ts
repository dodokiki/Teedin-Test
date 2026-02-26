import { getUserFromRequest } from "@/lib/auth-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const authResult = await getUserFromRequest(request);
    if (!authResult.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { chargeId } = body;

    if (!chargeId) {
      return NextResponse.json(
        { success: false, error: "chargeId is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdmin();

    // Update the payment status to successful
    const { data: paymentData, error: paymentError } = await supabaseAdmin
      .from("property_payments")
      .update({ status: "successful" })
      .eq("charge_id", chargeId)
      .eq("user_id", authResult.user.id)
      .select("property_id")
      .single();

    if (paymentError) {
      console.error("Error simulating payment:", paymentError);
      return NextResponse.json(
        { success: false, error: "Failed to update payment" },
        { status: 500 }
      );
    }

    // Also update the property to be promoted/featured
    if (paymentData && paymentData.property_id) {
      const { error: propertyError } = await supabaseAdmin
        .from("properties")
        .update({
          is_promoted: true,
          // If you have other fields like 'isTopPick' or 'status' to update, add them here
          // status: 'published'
        })
        .eq("id", paymentData.property_id);

      if (propertyError) {
        console.error("Error updating property status:", propertyError);
        // We don't fail the whole request if this fails, but we log it
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Simulate payment error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
