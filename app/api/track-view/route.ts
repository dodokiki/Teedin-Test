import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId =
      searchParams.get("property_id") || searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // ดึง view count
    const { data: record, error } = await supabase
      .from("property_details")
      .select("view_count")
      .eq("property_id", propertyId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: true, viewCount: 0, view_count: 0 },
        { headers: { "Cache-Control": "public, max-age=30" } }
      );
    }

    const viewCount = record?.view_count || 0;

    return NextResponse.json(
      { success: true, viewCount: viewCount, view_count: viewCount },
      { headers: { "Cache-Control": "public, max-age=30" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const propertyId = body.property_id || body.propertyId;

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // ตรวจสอบว่ามี property_details record หรือไม่
    const { data: existingRecord, error: checkError } = await supabase
      .from("property_details")
      .select("view_count")
      .eq("property_id", propertyId)
      .maybeSingle();

    if (checkError) {
      // ถ้าอ่านไม่ได้ ให้ลองสร้างเรกคอร์ดใหม่แทน
      const { error: insertOnReadFail } = await supabase
        .from("property_details")
        .insert({
          property_id: propertyId,
          view_count: 1,
          created_at: new Date().toISOString(),
        });
      if (insertOnReadFail) {
        return NextResponse.json(
          { error: "Failed to record view", details: insertOnReadFail.message },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        newViewCount: 1,
        view_count: 1,
      });
    }

    let newViewCount: number;

    if (existingRecord) {
      // มี record อยู่แล้ว อัปเดต
      newViewCount = (existingRecord.view_count || 0) + 1;

      const { error: updateError } = await supabase
        .from("property_details")
        .update({
          view_count: newViewCount,
        })
        .eq("property_id", propertyId);

      if (updateError) {
        return NextResponse.json(
          {
            error: "Failed to update view count",
            details: updateError.message,
            code: updateError.code,
          },
          { status: 500 }
        );
      }
    } else {
      // ไม่มี record สร้างใหม่
      newViewCount = 1;

      const { error: insertError } = await supabase
        .from("property_details")
        .insert({
          property_id: propertyId,
          view_count: newViewCount,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        return NextResponse.json(
          {
            error: "Failed to create property details record",
            details: insertError.message,
            code: insertError.code,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      newViewCount: newViewCount,
      view_count: newViewCount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
