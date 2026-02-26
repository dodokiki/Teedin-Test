import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Admin client for privileged operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Anon client for verifying tokens
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requester }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !requester) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // 2. Authorization Check
    // Allow if requester is the target user (Self-Upgrade) OR requester is an admin
    let isAuthorized = requester.id === userId;

    if (!isAuthorized) {
      // Check if requester is admin
      const { data: requesterProfile } = await supabaseAdmin
        .from("users")
        .select("role")
        .eq("id", requester.id)
        .single();

      if (requesterProfile && (requesterProfile.role === 'admin' || requesterProfile.role === 'super_admin')) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: You can only update your own role" },
        { status: 403 }
      );
    }

    console.log("🔄 API: Updating user role to agent for user:", userId);

    // อัปเดต role เป็น agent
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        role: "agent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id, email, role, updated_at");

    if (updateError) {
      console.error("❌ API: Role update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update role", details: updateError.message },
        { status: 500 }
      );
    }

    if (
      !updatedUser ||
      !Array.isArray(updatedUser) ||
      updatedUser.length === 0
    ) {
      console.error("❌ API: No user found or updated");
      return NextResponse.json(
        { error: "User not found or not updated" },
        { status: 404 }
      );
    }

    const user = updatedUser[0];
    console.log("✅ API: Role updated successfully:", user);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error("❌ API: Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
