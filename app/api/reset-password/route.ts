import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// 🚨 TESTING MODE: เก็บ plain text password ใน custom users table
// ⚠️ ในการใช้งานจริง ควรเปลี่ยนกลับไปใช้ hash เพื่อความปลอดภัย

export async function POST(request: NextRequest) {
  try {
    const { email, resetToken, newPassword } = await request.json();

    if (!email || !resetToken || !newPassword) {
      return NextResponse.json(
        { error: "กรุณาระบุข้อมูลให้ครบถ้วน" },
        { status: 400 }
      );
    } // ตรวจสอบ reset token
    const supabaseAdmin = createSupabaseAdmin();
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("*")
      .eq("email", email)
      .eq("reset_token", resetToken)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: "Token ไม่ถูกต้องหรือหมดอายุแล้ว" },
        { status: 400 }
      );
    } // ตรวจสอบรหัสผ่านใหม่
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีตัวอักษรและตัวเลขอย่างน้อย 1 ตัวแต่ละอย่าง
    const letterCount = (newPassword.match(/[A-Za-z]/g) || []).length;
    const digitCount = (newPassword.match(/[0-9]/g) || []).length;

    if (letterCount < 1) {
      return NextResponse.json(
        { error: "รหัสผ่านต้องมีตัวอักษรอย่างน้อย 1 ตัว" },
        { status: 400 }
      );
    }

    if (digitCount < 1) {
      return NextResponse.json(
        { error: "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว" },
        { status: 400 }
      );
    } // หา user ID จากอีเมลใน Supabase Auth
    console.log(`🔍 กำลังค้นหาผู้ใช้สำหรับอีเมล: ${email}`);

    // ค้นหา user id จาก public.users ก่อน (แม่นยำกว่า) หากไม่พบจึง fallback ไปหาจาก Auth
    let userId: string | null = null;
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (userRow?.id) {
      userId = userRow.id as string;
    } else {
      // Fallback: ค้นหาผู้ใช้จาก Supabase Auth
      const { data: authUsers, error: authUserError } =
        await supabaseAdmin.auth.admin.listUsers();

      if (authUserError) {
        console.error("Error fetching auth users:", authUserError);
        return NextResponse.json(
          { error: "เกิดข้อผิดพลาดในการค้นหาผู้ใช้" },
          { status: 500 }
        );
      }

      const authUser = authUsers.users.find(
        (user: any) => (user.email || "").toLowerCase() === email.toLowerCase()
      );
      if (!authUser) {
        return NextResponse.json(
          { error: "ไม่พบผู้ใช้ในระบบ" },
          { status: 404 }
        );
      }
      userId = authUser.id as string;
    }

    // ดึงข้อมูลผู้ใช้แบบเต็มเพื่อให้ได้ identities ที่ถูกต้อง
    const { data: fullUser, error: fullUserErr } =
      await supabaseAdmin.auth.admin.getUserById(userId);
    if (fullUserErr || !fullUser?.user) {
      return NextResponse.json(
        { error: "เกิดข้อผิดพลาดในการค้นหาผู้ใช้" },
        { status: 500 }
      );
    }

    // อนุญาตรีเซ็ตถ้ามี identity แบบ 'email' (สมัครด้วยอีเมล/รหัสผ่านเป็นบัญชีหลัก)
    const providerMeta =
      (fullUser.user as any)?.user_metadata?.provider ||
      (fullUser.user as any)?.app_metadata?.provider;
    const identities = (fullUser.user as any)?.identities || [];
    const providersArr: string[] = ((fullUser.user as any)?.app_metadata
      ?.providers || []) as any;
    const hasEmailIdentity =
      identities?.some((i: any) => i?.provider === "email") ||
      providersArr?.includes?.("email") ||
      providerMeta === "email";
    if (!hasEmailIdentity) {
      const isGoogle =
        providerMeta === "google" ||
        identities.find((i: any) => i?.provider === "google");
      const isLine =
        providerMeta === "line" ||
        identities.find((i: any) => i?.provider === "line");
      if (isGoogle) {
        return NextResponse.json(
          { error: "บัญชีนี้สมัครด้วย Google กรุณาเข้าสู่ระบบด้วย Google" },
          { status: 400 }
        );
      }
      if (isLine) {
        return NextResponse.json(
          { error: "บัญชีนี้สมัครด้วย LINE กรุณาเข้าสู่ระบบด้วย LINE" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "บัญชีนี้ไม่ได้สมัครด้วยอีเมลและรหัสผ่าน" },
        { status: 400 }
      );
    }
    console.log(`✅ พบผู้ใช้: ${userId}`);

    // อัปเดตรหัสผ่านในระบบ Supabase Auth (หลัก)
    console.log(
      `🔧 กำลังอัปเดตรหัสผ่านใน Supabase Auth สำหรับผู้ใช้: ${userId}`
    );

    const { error: authUpdateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

    if (authUpdateError) {
      console.error("Error updating Supabase Auth password:", authUpdateError);
      return NextResponse.json(
        { error: "เกิดข้อผิดพลาดในการอัปเดตรหัสผ่าน" },
        { status: 500 }
      );
    }

    console.log(`✅ อัปเดตรหัสผ่านใน Supabase Auth สำเร็จ`);
    const { error: markTokenUsedError } = await supabaseAdmin
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("id", tokenData.id);

    if (markTokenUsedError) {
      console.error("Error marking token as used:", markTokenUsedError);
    }

    // ลบ OTP และ token ที่หมดอายุ (cleanup)
    await supabaseAdmin
      .from("password_reset_otps")
      .delete()
      .lt("expires_at", new Date().toISOString());

    await supabaseAdmin
      .from("password_reset_tokens")
      .delete()
      .lt("expires_at", new Date().toISOString());

    return NextResponse.json({
      success: true,
      message: "เปลี่ยนรหัสผ่านสำเร็จ",
    });
  } catch (error) {
    console.error("Reset password API error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน" },
      { status: 500 }
    );
  }
}
