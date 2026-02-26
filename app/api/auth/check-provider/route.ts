import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

function resolveProvider(user: any): "email" | "google" | "line" {
  const metaProvider =
    user?.user_metadata?.provider || user?.app_metadata?.provider;
  const identities = user?.identities || [];
  const providersArr: string[] = (user?.app_metadata?.providers || []) as any;
  // Prefer explicit metadata provider when available
  if (metaProvider === "google") return "google";
  if (metaProvider === "line") return "line";
  if (metaProvider === "email") return "email";
  // Otherwise infer: prefer LINE to avoid misclassifying LINE-first users that happen to have an email identity
  if (
    identities.find((i: any) => i?.provider === "line") ||
    providersArr?.includes?.("line")
  )
    return "line";
  if (
    identities.find((i: any) => i?.provider === "google") ||
    providersArr?.includes?.("google")
  )
    return "google";
  const hasEmail =
    identities?.some((i: any) => i?.provider === "email") ||
    providersArr?.includes?.("email");
  if (hasEmail) return "email";
  return "email";
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams
      .get("email")
      ?.toLowerCase()
      .trim();
    if (!email) return NextResponse.json({ provider: null }, { status: 200 });

    const supabaseAdmin = createSupabaseAdmin();
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!userRow) return NextResponse.json({ provider: null }, { status: 200 });

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(
      userRow.id
    );
    if (error || !data?.user)
      return NextResponse.json({ provider: null }, { status: 200 });

    const provider = resolveProvider(data.user);
    return NextResponse.json({ provider }, { status: 200 });
  } catch (_) {
    return NextResponse.json({ provider: null }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "")
      .toLowerCase()
      .trim();
    if (!email) return NextResponse.json({ provider: null }, { status: 200 });

    const supabaseAdmin = createSupabaseAdmin();
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!userRow) return NextResponse.json({ provider: null }, { status: 200 });

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(
      userRow.id
    );
    if (error || !data?.user)
      return NextResponse.json({ provider: null }, { status: 200 });

    const provider = resolveProvider(data.user);
    return NextResponse.json({ provider }, { status: 200 });
  } catch (_) {
    return NextResponse.json({ provider: null }, { status: 200 });
  }
}
