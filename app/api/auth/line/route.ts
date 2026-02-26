import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const channelId =
      process.env.LINE_CHANNEL_ID || process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const redirectUri = process.env.LINE_REDIRECT_URI;

    if (!channelId || !channelSecret || !redirectUri) {
      console.error(" LINE credentials not configured");
      return NextResponse.json(
        { error: "LINE credentials not configured" },
        { status: 500 }
      );
    }

    // Generate state parameter for CSRF protection
    const state = Buffer.from(Date.now().toString()).toString("base64");

    // Store state in a cookie for verification in callback
    const response = NextResponse.redirect(
      `https://access.line.me/oauth2/v2.1/authorize?` +
        `response_type=code&` +
        `client_id=${channelId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}&` +
        `scope=profile%20openid%20email&` +
        `nonce=${Date.now()}`
    );

    // Store state in httpOnly cookie
    response.cookies.set("line_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error("❌ LINE login error:", error);
    return NextResponse.json(
      { error: "Failed to initiate LINE login" },
      { status: 500 }
    );
  }
}
