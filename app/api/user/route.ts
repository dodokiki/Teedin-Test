import { supabase } from "@/lib/supabase";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// GET - ดึงข้อมูลผู้ใช้
export async function GET(request: NextRequest) {
  try {
    // ดึง authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "ไม่พบ Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // สร้าง supabase client ใหม่พร้อม token
    const supabaseWithToken = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // ตรวจสอบ user จาก token
    const { data: authData, error: authError } =
      await supabaseWithToken.auth.getUser();

    if (authError || !authData.user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Token ไม่ถูกต้อง" }, { status: 401 });
    }

    const userId = authData.user.id;
    const userEmail = authData.user.email;

    console.log("🔍 Looking for user:", userEmail, "with ID:", userId); // ดึงข้อมูลผู้ใช้จาก custom users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select(
        "id, email, role, first_name, last_name, phone, created_at, updated_at"
      )
      .eq("email", userEmail)
      .limit(1)
      .single();

    if (userError) {
      console.error("Error fetching user data:", userError);
      console.log("Error details:", {
        code: userError.code,
        message: userError.message,
        details: userError.details,
        hint: userError.hint,
      });
      return NextResponse.json(
        { error: `Database error: ${userError.message}` },
        { status: 500 }
      );
    }

    console.log("✅ User data found:", userData);

    return NextResponse.json({
      success: true,
      user: {
        ...userData,
        passwordManaged: true,
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}

// PUT - อัปเดตข้อมูลผู้ใช้
export async function PUT(request: NextRequest) {
  try {
    // ดึง authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "ไม่พบ Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const body = await request.json();

    // ตรวจสอบ token กับ Supabase
    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Token ไม่ถูกต้อง" }, { status: 401 });
    }

    const userId = authData.user.id;
    const userEmail = authData.user.email;
    const { first_name, last_name, phone, password } = body;

    // สร้าง admin client สำหรับการอัปเดต
    const supabaseAdmin = createSupabaseAdmin();

    // อัปเดตข้อมูลใน custom users table
    type UserUpdatePayload = {
      updated_at: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
    };

    const updateData: UserUpdatePayload = {
      updated_at: new Date().toISOString(),
    };

    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone !== undefined) updateData.phone = phone;

    const { error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("email", userEmail);

    if (updateError) {
      console.error("Error updating user data:", updateError);
      return NextResponse.json(
        { error: "ไม่สามารถอัปเดตข้อมูลได้" },
        { status: 500 }
      );
    }

    // อัปเดตรหัสผ่านใน Supabase Auth (ถ้ามีการเปลี่ยนแปลง)
    if (password && password !== "••••••••") {
      console.log("🔧 Updating password in Supabase Auth...");
      const { error: authUpdateError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: password,
        });

      if (authUpdateError) {
        console.error(
          "Error updating Supabase Auth password:",
          authUpdateError
        );
        // ไม่ return error เพราะ custom table อัปเดตสำเร็จแล้ว
        console.log(
          "⚠️ Auth password update failed but custom table updated successfully"
        );
      } else {
        console.log("✅ Password updated in both Auth and custom table");
      }
    }

    // อัปเดต user metadata ใน Supabase Auth
    if (first_name || last_name || phone) {
      const userMetadata: Record<string, string> = {};
      if (first_name) userMetadata.first_name = first_name;
      if (last_name) userMetadata.last_name = last_name;
      if (phone) userMetadata.phone = phone;

      const { error: metadataError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: userMetadata,
        });

      if (metadataError) {
        console.error("Error updating user metadata:", metadataError);
      } else {
        console.log("✅ User metadata updated");
      }
    }

    return NextResponse.json({
      success: true,
      message: "อัปเดตข้อมูลสำเร็จ",
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}

// DELETE - ลบผู้ใช้แบบปลอดภัย (ลบข้อมูลทั้งหมดที่เกี่ยวข้อง)
export async function DELETE(request: NextRequest) {
  try {
    // ดึง query parameter สำหรับ email ของผู้ใช้ที่จะลบ
    const url = new URL(request.url);
    const userEmail = url.searchParams.get("email");

    if (!userEmail) {
      return NextResponse.json(
        { error: "กรุณาระบุอีเมลของผู้ใช้ที่จะลบ" },
        { status: 400 }
      );
    }

    // ตรวจสอบ authorization (ต้องเป็น admin เท่านั้น)
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "ไม่พบ Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // ตรวจสอบ token และสิทธิ์ admin
    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Token ไม่ถูกต้อง" }, { status: 401 });
    }

    // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("email", authData.user.email)
      .single();

    if (!userData || userData.role !== "admin") {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์ในการลบผู้ใช้" },
        { status: 403 }
      );
    }

    console.log(`🗑️ Admin ${authData.user.email} กำลังลบผู้ใช้: ${userEmail}`);

    // สร้าง admin client
    const supabaseAdmin = createSupabaseAdmin();

    // ป้องกันการลบ admin เอง
    if (userEmail === authData.user.email) {
      return NextResponse.json(
        { error: "ไม่สามารถลบบัญชีของตัวเองได้" },
        { status: 400 }
      );
    }

    // ค้นหาข้อมูลผู้ใช้ที่จะลบ
    const { data: targetUser } = await supabase
      .from("users")
      .select("*")
      .eq("email", userEmail)
      .single();

    if (!targetUser) {
      return NextResponse.json(
        { error: "ไม่พบผู้ใช้ที่ระบุ" },
        { status: 404 }
      );
    }

    const userId = targetUser.id;

    // เริ่มการลบข้อมูลอย่างปลอดภัย
    console.log(`📋 กำลังลบข้อมูลที่เกี่ยวข้องกับ User ID: ${userId}`);

    // 1. ลบจากตาราง properties (ถ้าเป็น agent)
    const { error: propertiesError } = await supabaseAdmin
      .from("properties")
      .delete()
      .eq("agent_id", userId);

    if (propertiesError && !propertiesError.message.includes("No rows")) {
      console.error("Properties deletion error:", propertiesError);
    } else {
      console.log("✅ ลบ properties สำเร็จ");
    }

    // 2. ลบจากตาราง agents (ถ้าเป็น agent)
    const { error: agentsError } = await supabaseAdmin
      .from("agents")
      .delete()
      .eq("user_id", userId);

    if (agentsError && !agentsError.message.includes("No rows")) {
      console.error("Agents deletion error:", agentsError);
    } else {
      console.log("✅ ลบ agents สำเร็จ");
    }

    // 3. ลบจากตาราง admins (ถ้าเป็น admin)
    const { error: adminsError } = await supabaseAdmin
      .from("admins")
      .delete()
      .eq("user_id", userId);

    if (adminsError && !adminsError.message.includes("No rows")) {
      console.error("Admins deletion error:", adminsError);
    } else {
      console.log("✅ ลบ admins สำเร็จ");
    }

    // 4. ลบจากตาราง customers (ถ้าเป็น customer)
    const { error: customersError } = await supabaseAdmin
      .from("customers")
      .delete()
      .eq("user_id", userId);

    if (customersError && !customersError.message.includes("No rows")) {
      console.error("Customers deletion error:", customersError);
    } else {
      console.log("✅ ลบ customers สำเร็จ");
    }

    // 5. ลบจากตาราง profiles
    const { error: profilesError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", userId);

    if (profilesError && !profilesError.message.includes("No rows")) {
      console.error("Profiles deletion error:", profilesError);
    } else {
      console.log("✅ ลบ profiles สำเร็จ");
    }

    // 6. ลบจาก custom users table
    const { error: usersError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("email", userEmail);

    if (usersError) {
      console.error("Users table deletion error:", usersError);
      return NextResponse.json(
        { error: "ไม่สามารถลบข้อมูลผู้ใช้ได้" },
        { status: 500 }
      );
    } else {
      console.log("✅ ลบจาก users table สำเร็จ");
    }

    // 7. ลบจาก Supabase Auth
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers.users.find(
      (u: { email?: string }) => u.email === userEmail
    );

    if (authUser) {
      const { error: authDeleteError } =
        await supabaseAdmin.auth.admin.deleteUser(authUser.id);

      if (authDeleteError) {
        console.error("Auth user deletion error:", authDeleteError);
        // ถึงแม้จะไม่สามารถลบจาก Auth ได้ แต่ยังถือว่าสำเร็จ เพราะลบจาก users table แล้ว
        console.log(
          "⚠️ ไม่สามารถลบจาก Supabase Auth ได้ แต่ลบจาก users table สำเร็จแล้ว"
        );
      } else {
        console.log("✅ ลบจาก Supabase Auth สำเร็จ");
      }
    } else {
      console.log("⚠️ ไม่พบใน Supabase Auth");
    }

    console.log(`🎉 ลบผู้ใช้ ${userEmail} สำเร็จแล้ว!`);

    return NextResponse.json({
      success: true,
      message: `ลบผู้ใช้ ${userEmail} สำเร็จแล้ว (รวมข้อมูลทั้งหมดที่เกี่ยวข้อง)`,
    });
  } catch (error) {
    console.error("Delete user API Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการลบผู้ใช้" },
      { status: 500 }
    );
  }
}
