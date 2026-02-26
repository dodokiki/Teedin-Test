import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// translation object
const translations: Record<string, Record<string, string>> = {
  th: {
    property_not_found: "ไม่พบรายการนี้",
    property_sold: "รายการนี้ถูกขายแล้ว",
    customer_already_exists: "ลูกค้าคนนี้มีรายการนี้อยู่แล้ว",
    update_failed: "ไม่สามารถอัปเดตข้อมูลได้",
    customer_notification_title: "ทำรายการสำเร็จ",
    customer_notification_message: "คุณได้รับการเพิ่มเป็นเจ้าของรายการนี้แล้ว",
  },
  en: {
    property_not_found: "Property not found",
    property_sold: "This property has been sold",
    customer_already_exists: "This customer already has this property",
    update_failed: "Failed to update data",
    customer_notification_title: "Successful",
    customer_notification_message:
      "You have been added as the owner of this property",
  },
};

function t(key: string, language: string = "th"): string {
  return translations[language]?.[key] || translations.th[key] || key;
}

export async function PATCH(request: NextRequest) {
  try {
    const { propertyId, customerId, language = "th" } = await request.json();

    if (!propertyId || !customerId) {
      return NextResponse.json(
        { error: "ต้องระบุ propertyId และ customerId" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // ดึง agent_id และสถานะจากตาราง properties
    const { data: propertyData, error: propertyError } = await supabase
      .from("properties")
      .select("agent_id, status")
      .eq("id", propertyId)
      .single();

    if (propertyError || !propertyData) {
      return NextResponse.json(
        { error: t("property_not_found", language) },
        { status: 404 }
      );
    }

    const agentId = propertyData.agent_id;

    // หากสถานะเป็น sold ให้ไม่อนุญาตการอัปเดต (ไม่ให้แสดงในแท็บอัปเดต)
    if (propertyData.status === "sold") {
      return NextResponse.json({ error: t("property_sold", language) }, { status: 410 });
    }

    // ตรวจสอบก่อนว่าลูกค้าคนนี้เป็นเจ้าของรายการนี้อยู่แล้วหรือไม่
    const { data: currentData, error: checkError } = await supabase
      .from("property_details")
      .select("customer_id")
      .eq("property_id", propertyId)
      .single();

    if (!checkError && currentData && currentData.customer_id === customerId) {
      return NextResponse.json(
        { error: t("customer_already_exists", language) },
        { status: 409 }
      );
    }

    // อัปเดต customer_id และเปลี่ยนสถานะเป็น rented ใน property_details
    const { data, error } = await supabase
      .from("property_details")
      .update({
        customer_id: customerId,
        status: "rented",
      })
      .eq("property_id", propertyId)
      .select();

    if (error) {
      console.error("ข้อผิดพลาดในการอัปเดต customer_id:", error);
      return NextResponse.json(
        { error: t("update_failed", language) },
        { status: 500 }
      );
    }

    // สร้างการแจ้งเตือนให้ลูกค้า
    try {
      await supabase.from("notifications").insert([
        {
          sender_id: agentId, // Agent ที่เพิ่มลูกค้า
          receiver_id: customerId,
          message: t("customer_notification_message", language),
          headder: t("customer_notification_title", language),
          read: "false",
          role: "agent",
          is_read: false,
        },
      ]);
    } catch (notificationError) {
      console.warn("ไม่สามารถสร้างการแจ้งเตือน:", notificationError);
      // ไม่ throw error ต่อ เพราะการอัปเดต customer_id สำเร็จแล้ว
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("ข้อผิดพลาดใน update-property-customer:", error);
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตข้อมูลได้" },
      { status: 500 }
    );
  }
}
