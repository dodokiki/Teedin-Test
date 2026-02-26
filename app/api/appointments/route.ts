import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  console.log(request, "request");
  try {
    const body = await request.json();

    const { property_id, appointment_date, notes } = body;
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!property_id || !appointment_date) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: property_id, appointment_date, customer_name, customer_phone",
        },
        { status: 400 }
      );
    }

    // หาเอเจ้นท์ที่รับผิดชอบทรัพย์สินนี้ (หากมี)
    const { data: propertyData } = await supabase
      .from("properties")
      .select("agent_id")
      .eq("id", property_id)
      .single();

    // สร้างการนัดหมาย
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        property_id,
        agent_id: propertyData?.agent_id,
        appointment_date,
        customer_id: null, // ถ้าไม่มี customer_id ให้เป็น null
        notes,
      })
      .select()
      .single();

    if (error) {
      console.error("Appointment creation error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create appointment: " + error.message,
        },
        { status: 500 }
      );
    }

    // ส่งการแจ้งเตือนไปยังเอเจ้นท์ (ถ้ามี)
    if (propertyData?.agent_id) {
      // TODO: ส่งอีเมลหรือ SMS แจ้งเตือนเอเจ้นท์
      console.log(`New appointment for agent ${propertyData.agent_id}:`, data);
    }

    return NextResponse.json({
      success: true,
      data: data,
      message:
        "นัดหมายได้รับการบันทึกเรียบร้อยแล้ว เอเจ้นท์จะติดต่อกลับในเร็วๆ นี้",
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
      .from("appointments")
      .select(
        `
        *,
        properties(id, title, address),
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
      console.error("Get appointments error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch appointments: " + error.message,
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
