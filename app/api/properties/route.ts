import {
  newProperties as staticNewProperties,
  rentalProperties as staticRentalProperties,
  saleProperties as staticSaleProperties,
} from "@/data/properties";
import { NextResponse } from "next/server";

// Static generation only - ไม่ต่อ Supabase ใน build time
export const revalidate = false;
export const dynamic = "force-static";

export async function GET() {
  try {
    // ใช้ static data เท่านั้นเพื่อให้ build ผ่าน
    const allStaticProperties = [
      ...staticNewProperties,
      ...staticRentalProperties,
      ...staticSaleProperties,
    ];

    console.log(
      `API: ส่งข้อมูล static - ทั้งหมด: ${allStaticProperties.length}`
    );

    return NextResponse.json({
      success: true,
      data: allStaticProperties,
      count: allStaticProperties.length,
      source: "static",
    });
  } catch (error) {
    console.error("API Error:", error);

    return NextResponse.json(
      {
        success: false,
        data: [],
        count: 0,
        source: "error",
        error: "Failed to load properties",
      },
      { status: 500 }
    );
  }
}
