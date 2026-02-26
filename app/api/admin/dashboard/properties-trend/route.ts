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

    // ดึงข้อมูลจำนวน properties ที่ published แยกตามวัน (ย้อนหลัง 30 วัน)
    const { data, error } = await supabase.rpc(fn, {});
    
    if (error) {
      console.warn(`RPC ${fn} failed, falling back to manual aggregation:`, error.message);
      
      // Fallback: Manual aggregation (Slower but works without RPC)
      const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("created_at")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true });

      if (propertiesError) throw propertiesError;

      const filteredProperties = propertiesData || [];
      const groupedData: { [key: string]: number } = {};

      filteredProperties.forEach(property => {
        const createdAt = new Date(property.created_at);
        let key = "";
        
        if (period === "month" || period === "year") {
           key = `${createdAt.getFullYear()}-${(createdAt.getMonth() + 1).toString().padStart(2, "0")}-01`;
        } else {
           // Daily/Weekly fallback to daily for now
           key = createdAt.toISOString().split('T')[0];
        }
        groupedData[key] = (groupedData[key] || 0) + 1;
      });

      // Transform to chart data
      const chartData = [];
      if (period === "month" || period === "year") {
        for (let month = 0; month < 12; month++) {
          const monthKey = `${year}-${(month + 1).toString().padStart(2, "0")}-01`;
          chartData.push({ date: monthKey, count: groupedData[monthKey] || 0 });
        }
      } else {
         // Return raw grouped data for day/week fallback
         for (const [date, count] of Object.entries(groupedData)) {
            chartData.push({ date, count });
         }
      }
      
      chartData.sort((a, b) => a.date.localeCompare(b.date));
      return NextResponse.json(chartData);
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
