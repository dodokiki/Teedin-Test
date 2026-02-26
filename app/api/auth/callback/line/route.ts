import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function resolveProvider(user: any): "email" | "google" | "line" {
  const metaProvider =
    user?.user_metadata?.provider || user?.app_metadata?.provider;
  const identities = user?.identities || [];
  const providersArr: string[] = (user?.app_metadata?.providers || []) as any;
  const hasEmail =
    identities?.some((i: any) => i?.provider === "email") ||
    providersArr?.includes?.("email") ||
    metaProvider === "email";
  if (hasEmail) return "email";
  if (
    identities.find((i: any) => i?.provider === "line") ||
    providersArr?.includes?.("line") ||
    metaProvider === "line"
  )
    return "line";
  if (
    identities.find((i: any) => i?.provider === "google") ||
    providersArr?.includes?.("google") ||
    metaProvider === "google"
  )
    return "google";
  return "email";
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Check for error from LINE
    if (error) {
      console.error("❌ LINE OAuth error:", error);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/callback?error=${encodeURIComponent(error)}`
      );
    }

    // Get stored state from cookie
    const storedState = request.cookies.get("line_oauth_state")?.value;

    // Verify state to prevent CSRF attacks
    if (!state || state !== storedState) {
      console.error("❌ Invalid state parameter");
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/callback?error=invalid_state`
      );
    }

    if (!code) {
      console.error("❌ No authorization code received");
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/callback?error=no_code`
      );
    }

    const channelId =
      process.env.LINE_CHANNEL_ID || process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const redirectUri = process.env.LINE_REDIRECT_URI;

    if (!channelId || !channelSecret || !redirectUri) {
      console.error("❌ LINE credentials not configured");
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/callback?error=config_error`
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: redirectUri!,
        client_id: channelId as string,
        client_secret: channelSecret as string,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("❌ Failed to exchange token:", errorData);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/callback?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const idToken = tokenData.id_token;

    // Verify and decode ID token to get user info
    const idTokenResponse = await fetch(
      "https://api.line.me/oauth2/v2.1/verify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          id_token: idToken,
          client_id: channelId,
        }),
      }
    );

    if (!idTokenResponse.ok) {
      console.error("❌ Failed to verify ID token");
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/callback?error=token_verify_failed`
      );
    }

    const idTokenData = await idTokenResponse.json();
    const lineUserId = idTokenData.sub;
    const email = idTokenData.email;
    const name = idTokenData.name;
    const picture = idTokenData.picture;

    const effectiveEmail =
      email && typeof email === "string" && email.length > 0
        ? email
        : `line_${lineUserId}@line.local`;

    console.log("✅ LINE user info:", { lineUserId, email, name });

    // Get LINE profile (additional info)
    const profileResponse = await fetch("https://api.line.me/v2/profile", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let displayName = name;
    let pictureUrl = picture;

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      displayName = profileData.displayName || name;
      pictureUrl = profileData.pictureUrl || picture;
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

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", effectiveEmail)
      .single();

    if (existingUser) {
      console.log("✅ Existing user found:", existingUser.id);

      // Determine original provider for this email
      const { data: byId, error: byIdErr } =
        await supabaseAdmin.auth.admin.getUserById(existingUser.id);
      const existingProvider = byId?.user
        ? resolveProvider(byId.user)
        : "email";
      if (byIdErr) {
        console.error("Error fetching auth user:", byIdErr);
      }

      if (existingProvider === "google") {
        const required = existingProvider;
        console.warn("Blocking LINE login due to provider mismatch:", {
          email: effectiveEmail,
          required,
        });
        return NextResponse.redirect(
          `${request.nextUrl.origin}/auth/callback?error=provider_mismatch&required=${encodeURIComponent(
            required
          )}&email=${encodeURIComponent(effectiveEmail)}`
        );
      }

      // Allow when original is 'line' or 'email' (email-first linked SSO)
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/callback?provider=line&email=${encodeURIComponent(effectiveEmail)}&name=${encodeURIComponent(displayName)}&picture=${encodeURIComponent(pictureUrl || "")}&userId=${existingUser.id}`
      );
    }

    // Create new user
    console.log("🆕 Creating new LINE user...");

    // Extract first and last name from LINE display name
    const nameParts = displayName.split(" ");
    const firstName = nameParts[0] || displayName;
    const lastName = nameParts.slice(1).join(" ") || "";

    // Generate a random password for Supabase Auth
    const randomPassword = `line_${lineUserId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: effectiveEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          provider: "line",
          line_user_id: lineUserId,
          first_name: firstName,
          last_name: lastName,
          picture: pictureUrl,
          full_name: displayName,
        },
      });

    if (authError || !authData.user) {
      console.error("❌ Failed to create auth user:", authError);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/callback?error=user_creation_failed`
      );
    }

    console.log("✅ Auth user created:", authData.user.id);

    // Create user record in users table
    const now = new Date().toISOString();
    const userInsertData = {
      id: authData.user.id,
      email: effectiveEmail,
      first_name: firstName,
      last_name: lastName,
      role: "customer",
      phone: "", // Empty string for OAuth users
      created_at: now,
      updated_at: now,
    };

    console.log("Creating user with data:", userInsertData);

    const { error: userError } = await supabaseAdmin
      .from("users")
      .insert(userInsertData);

    if (userError) {
      console.error("❌ Failed to create user record:", userError);
      console.error("Error details:", {
        message: userError.message,
        code: userError.code,
        details: userError.details,
        hint: userError.hint,
      });

      // Check if it's a duplicate user error (shouldn't happen for new LINE users)
      if (
        userError.code === "23505" &&
        userError.message.includes("duplicate")
      ) {
        console.log("🔄 User already exists, redirecting...");
        return NextResponse.redirect(
          `${request.nextUrl.origin}/auth/callback?provider=line&email=${encodeURIComponent(effectiveEmail)}&name=${encodeURIComponent(displayName)}&picture=${encodeURIComponent(pictureUrl || "")}&userId=${authData.user.id}`
        );
      }

      // If user creation failed, don't continue to create customer record
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/callback?error=user_creation_failed`
      );
    }

    console.log("✅ User record created successfully");

    // Create customer record
    const { error: customerError } = await supabaseAdmin
      .from("customers")
      .insert({
        user_id: authData.user.id,
        full_name: displayName,
        created_at: now,
      });

    if (customerError && !customerError.message.includes("duplicate")) {
      console.error("❌ Failed to create customer record:", customerError);
    }

    console.log("✅ New LINE user created successfully");

    // Redirect to auth callback page
    return NextResponse.redirect(
      `${request.nextUrl.origin}/auth/callback?provider=line&email=${encodeURIComponent(effectiveEmail)}&name=${encodeURIComponent(displayName)}&picture=${encodeURIComponent(pictureUrl || "")}&userId=${authData.user.id}&isNewUser=true`
    );
  } catch (error) {
    console.error("❌ LINE callback error:", error);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/auth/callback?error=callback_error`
    );
  }
}
