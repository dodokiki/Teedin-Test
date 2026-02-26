import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// สร้าง Supabase client สำหรับ server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "recent";
    const limitParam = parseInt(searchParams.get("limit") || "100");
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 10), 500)
      : 100;



    let startDate: Date | null = null;
    const now = new Date();

    // กำหนดช่วงเวลาตาม period
    switch (period) {
      case "daily":
        // 30 วันล่าสุด
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "weekly":
        // 12 สัปดาห์ล่าสุด
        startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        // 12 เดือนล่าสุด
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
      case "recent":
      default:
        // ไม่จำกัดเวลา แสดงทั้งหมด
        startDate = null;
        break;
    }

    // ดึงข้อมูล properties พร้อม join users (agent) แบบเลือกเฉพาะฟิลด์ที่จำเป็น
    let query = supabase
      .from("properties")
      .select(
        `
        id,
        agent_id,
        listing_type,
        property_category,
        created_at,
        status,
        users:users!properties_agent_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        details:property_details (
          price,
          project_name
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    // เพิ่มเงื่อนไขเวลาถ้ามี
    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }

    const { data: propertiesData, error: propertiesError } = await query;

    if (propertiesError) {
      console.error("❌ Properties query error:", propertiesError);
      throw propertiesError;
    }



    return NextResponse.json(
      {
        properties: propertiesData,
        period: period,
        total: propertiesData.length,
        startDate: startDate?.toISOString() || null,
      },
      { headers: { "Cache-Control": "public, max-age=30" } }
    );
  } catch (error) {
    console.error("Properties API error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch properties from database",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
