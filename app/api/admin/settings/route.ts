import { supabase } from "@/lib/supabase";
import type { PostgrestResponse } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

interface SystemSetting {
  id: string;
  category: string | null;
  setting_key: string;
  setting_value: string;
  updated_at: string | null;
}

type SystemSettingGroup = Record<string, SystemSetting[]>;

interface UpdateSettingPayload {
  setting_key: string;
  setting_value: string;
}

export async function GET(request: NextRequest) {
  try {
    // ตรวจสอบสิทธิ์ admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ตรวจสอบ role
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userProfile || !["admin", "super_admin"].includes(userProfile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category") || "all";

    let query = supabase
      .from("system_settings")
      .select("id, category, setting_key, setting_value, updated_at");

    // Filter by category
    if (category !== "all") {
      query = query.eq("category", category);
    }

    const { data: settings, error } = await query
      .order("category", { ascending: true })
      .order("setting_key", { ascending: true });

    if (error) {
      throw error;
    }

    // จัดกลุ่มตาม category
    const grouped = (settings || []).reduce<SystemSettingGroup>(
      (acc, setting) => {
        const cat = setting.category ?? "general";
        if (!acc[cat]) {
          acc[cat] = [];
        }
        acc[cat].push(setting);
        return acc;
      },
      {}
    );

    return NextResponse.json(
      {
        settings: settings || [],
        grouped,
      },
      { headers: { "Cache-Control": "public, max-age=30" } }
    );
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // ตรวจสอบสิทธิ์ admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ตรวจสอบ role
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userProfile || userProfile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body as { settings?: UpdateSettingPayload[] };

    if (!settings || !Array.isArray(settings) || settings.length === 0) {
      return NextResponse.json(
        { error: "Settings array is required" },
        { status: 400 }
      );
    }

    // อัปเดตการตั้งค่าทีละรายการ
    const updatePromises = settings.map(async setting => {
      const { setting_key, setting_value } = setting;

      return supabase
        .from("system_settings")
        .update({ setting_value })
        .eq("setting_key", setting_key);
    });

    const results: PostgrestResponse<SystemSetting>[] =
      await Promise.all(updatePromises);

    // ตรวจสอบข้อผิดพลาด
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      throw new Error(`Failed to update ${errors.length} settings`);
    }

    // บันทึก log
    await supabase.from("admin_logs").insert({
      admin_id: user.id,
      action: "UPDATE_SETTINGS",
      target_type: "system_settings",
      details: {
        updated_count: settings.length,
        settings: settings.map(s => s.setting_key),
      },
    });

    return NextResponse.json({ success: true, updated: settings.length });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
