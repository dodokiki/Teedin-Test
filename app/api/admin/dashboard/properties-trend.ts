import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "day";

    let fn = "properties_trend_daily";
    if (period === "week") fn = "properties_trend_weekly";
    if (period === "month") fn = "properties_trend_monthly";
    if (period === "year") fn = "properties_trend_yearly";

    // ตรวจสอบสิทธิ์ admin (ถ้าต้องการ)
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // ดึงข้อมูลจำนวน properties ที่ published แยกตามวัน (ย้อนหลัง 30 วัน)
    const { data, error } = await supabase.rpc(fn, {});
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Properties trend API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
