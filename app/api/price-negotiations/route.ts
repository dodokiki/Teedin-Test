import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// สร้าง Supabase admin client สำหรับการทำงานฝั่งเซิร์ฟเวอร์ (ใช้ Service Role Key)
const supabase = createSupabaseAdmin();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      property_id,
      original_price,
      offered_price,
      negotiation_reason,
      customer_name,
      customer_phone,
      customer_email,
    } = body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (
      !property_id ||
      !original_price ||
      !offered_price ||
      !customer_name ||
      !customer_phone
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: property_id, original_price, offered_price, customer_name, customer_phone",
        },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าราคาที่เสนอเป็นตัวเลขที่ถูกต้อง
    const originalPriceNum = parseFloat(original_price);
    const offeredPriceNum = parseFloat(offered_price);

    if (isNaN(originalPriceNum) || isNaN(offeredPriceNum)) {
      return NextResponse.json(
        { success: false, error: "Invalid price values" },
        { status: 400 }
      );
    }

    // หาเอเจ้นท์ที่รับผิดชอบทรัพย์สินนี้
    const { data: propertyData } = await supabase
      .from("properties")
      .select("agent_id, title")
      .eq("id", property_id)
      .single();

    // สร้างการต่อรองราคา
    const { data, error } = await supabase
      .from("price_negotiations")
      .insert({
        property_id,
        agent_id: propertyData?.agent_id || null,
        original_price: originalPriceNum,
        offered_price: offeredPriceNum,
        negotiation_reason,
        customer_name,
        customer_phone,
        customer_email,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Price negotiation creation error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create price negotiation: " + error.message,
        },
        { status: 500 }
      );
    }

    // ส่งการแจ้งเตือนไปยังเอเจ้นท์
    if (propertyData?.agent_id) {
      // TODO: ส่งอีเมลหรือ SMS แจ้งเตือนเอเจ้นท์
      console.log(`New price negotiation for agent ${propertyData.agent_id}:`, {
        property: propertyData.title,
        original_price: originalPriceNum,
        offered_price: offeredPriceNum,
        customer: customer_name,
      });
    }

    return NextResponse.json({
      success: true,
      data: data,
      message:
        "คำขอต่อรองราคาได้รับการบันทึกเรียบร้อยแล้ว เอเจ้นท์จะพิจารณาและติดต่อกลับ",
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const property_id = searchParams.get("property_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "10");

    let query = supabase
      .from("price_negotiations")
      .select(
        `
        *,
        properties(id, title, address, price),
        agens(user_id, company_name)
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (property_id) {
      query = query.eq("property_id", property_id);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get price negotiations error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch price negotiations: " + error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
