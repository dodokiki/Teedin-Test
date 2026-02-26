import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get user from Supabase Auth
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !user) {
      console.error("❌ User not found:", userError);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate a magic link for the user
    const { data: magicLinkData, error: magicLinkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: user.email!,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      });

    if (magicLinkError || !magicLinkData) {
      console.error("❌ Failed to generate magic link:", magicLinkError);
      return NextResponse.json(
        { error: "Failed to generate session" },
        { status: 500 }
      );
    }

    // Get the hashed_token from the magic link data
    const hashedToken = magicLinkData.properties?.hashed_token;

    if (!hashedToken) {
      console.error("❌ No hashed token in magic link data");
      return NextResponse.json(
        { error: "Failed to extract session token" },
        { status: 500 }
      );
    }

    // Use the hashed token to create a session
    // We'll return the magic link URL and let the client handle it
    const magicLinkUrl = magicLinkData.properties.action_link;

    console.log("✅ Magic link generated successfully");

    // Return both the magic link and user info
    // The client will use the magic link to authenticate
    return NextResponse.json({
      magic_link: magicLinkUrl,
      user: user,
    });
  } catch (error) {
    console.error("❌ LINE session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
