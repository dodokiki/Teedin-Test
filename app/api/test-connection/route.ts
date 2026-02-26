import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = createSupabaseAdmin();

    // Test connection by checking if properties table exists
    const { data, error } = await supabase
      .from("properties")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Supabase connection error:", error);
      return NextResponse.json(
        { success: false, error: error.message, details: error },
        { status: 500 }
      );
    }

    console.log("Supabase connection successful");
    return NextResponse.json({
      success: true,
      message: "Supabase connection successful",
      data: data,
    });
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
