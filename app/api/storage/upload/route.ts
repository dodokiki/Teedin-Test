import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const propertyId = formData.get("propertyId");
    const scope = formData.get("scope") || "general";
    const slot = formData.get("slot") || "0";
    const roomType = formData.get("roomType");
    const file = formData.get("file");

    if (typeof propertyId !== "string" || propertyId.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing propertyId" },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file upload" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const bucket = "property-images";

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = [
      propertyId,
      roomType || scope,
      slot,
      Date.now(),
      Math.random().toString(36).slice(2),
    ]
      .filter(Boolean)
      .join("-");
    const filePath = `properties/${fileName}.${fileExt}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 403 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return NextResponse.json({
      publicUrl,
      path: filePath,
    });
  } catch (err) {
    console.error("[storage/upload] error", err);
    const message =
      err instanceof Error ? err.message : "Unexpected upload error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
