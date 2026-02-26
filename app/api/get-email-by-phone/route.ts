import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "").slice(0, 10);
    if (cleanPhone.length !== 10 || !cleanPhone.startsWith("0")) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("phone", cleanPhone)
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Phone number not found" },
          { status: 404 }
        );
      }
      console.error("Error finding user by phone (admin):", error);
      return NextResponse.json(
        { error: "Error searching for phone number" },
        { status: 500 }
      );
    }

    if (!data || !data.email) {
      return NextResponse.json(
        { error: "Email not found for this phone number" },
        { status: 404 }
      );
    }

    return NextResponse.json({ email: data.email });
  } catch (error) {
    console.error("Exception in get-email-by-phone:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
