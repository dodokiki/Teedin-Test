import { TRANSLATION_KEYS } from "@/app/add-property/constants";
import {
  makeLocalizedValue,
  normalizeLocalizedValue,
  type LocalizedValue,
} from "@/lib/localization";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

const sanitizeString = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseList = (value: string | null | undefined): string[] | null => {
  if (!value) {
    return null;
  }

  const items = value
    .split(/\r?\n/)
    .map(item => item.replace(/^[•\-*\s]+/, "").trim())
    .filter(Boolean);

  return items.length > 0 ? items : null;
};

const coerceLocalizedString = (
  key: string,
  localized: Record<string, LocalizedValue<string>> | undefined,
  fallback: string | null
): LocalizedValue<string> => {
  const candidate = localized?.[key];
  if (candidate) {
    const normalized = normalizeLocalizedValue<string>(candidate);
    if (!normalized.th && fallback) {
      normalized.th = fallback;
    }
    return normalized;
  }

  if (!fallback) {
    return makeLocalizedValue<string | null>(null, null, {
      detectedLanguage: "unknown",
      confidence: null,
      source: { th: "user" },
    });
  }

  return makeLocalizedValue(fallback, null, {
    detectedLanguage: "th",
    confidence: null,
    source: { th: "user" },
  });
};

const coerceLocalizedList = (
  key: string,
  localized: Record<string, LocalizedValue<string>> | undefined,
  fallback: string[]
): LocalizedValue<string[]> => {
  const candidate = localized?.[key];
  if (candidate) {
    const normalized = normalizeLocalizedValue<string>(candidate);
    const thList =
      parseList(normalized.th) ?? (fallback.length ? fallback : null);
    const enList = parseList(normalized.en);
    return {
      th: thList,
      en: enList,
      meta: normalized.meta,
    };
  }

  return makeLocalizedValue<string[]>(fallback.length ? fallback : null, null, {
    detectedLanguage: "th",
    confidence: null,
    source: { th: "user" },
  });
};

export async function POST(request: NextRequest) {
  try {
    console.log("=== API /properties/create called ===");

    const formData = await request.formData();
    console.log("FormData received:", {
      saleType: formData.get("saleType"),
      propertyType: formData.get("propertyType"),
      isProject: formData.get("isProject"),
      rentalPeriod: formData.get("rentalPeriod"),
      projectLocation: formData.get("projectLocation"),
      projectName: formData.get("projectName"),
      address: formData.get("address"),
      area: formData.get("area"),
      bedrooms: formData.get("bedrooms"),
      bathrooms: formData.get("bathrooms"),
      parking: formData.get("parking"),
      houseAge: formData.get("houseAge"),
      projectDescription: formData.get("projectDescription"),
      highlightsType: formData.get("highlightsType"),
      highlightsSurrounding: formData.get("highlightsSurrounding"),
      price: formData.get("price"),
      agent_id: formData.get("agent_id"),
      selectedLocation: formData.get("selectedLocation"),
      amenities: formData.get("amenities"),
      projectAmenities: formData.get("projectAmenities"),
      imagesCount: formData.getAll("images").length,
    });

    // Extract form data
    const saleType = formData.get("saleType") as string;
    const propertyType = formData.get("propertyType") as string;
    const isProject = formData.get("isProject") === "true";
    const rentalPeriod = formData.get("rentalPeriod") as string;
    const projectLocation = formData.get("projectLocation") as string;
    const projectName = formData.get("projectName") as string;
    const address = formData.get("address") as string;
    const area = formData.get("area") as string;
    const bedrooms = formData.get("bedrooms") as string;
    const bathrooms = formData.get("bathrooms") as string;
    const parking = formData.get("parking") as string;
    const houseAgeRaw = formData.get("houseAge") as string;
    // Extract only numbers from houseAge
    const houseAge = houseAgeRaw ? houseAgeRaw.replace(/\D/g, "") : "";
    const projectDescription = formData.get("projectDescription") as string;
    const highlightsType = formData.get("highlightsType") as string;
    const highlightsSurrounding = formData.get(
      "highlightsSurrounding"
    ) as string;
    const price = formData.get("price") as string;
    const agent_id = formData.get("agent_id") as string;

    // Parse JSON data
    let selectedLocation, amenities, projectAmenities;
    try {
      selectedLocation = JSON.parse(formData.get("selectedLocation") as string);
      amenities = JSON.parse(formData.get("amenities") as string);
      projectAmenities = JSON.parse(formData.get("projectAmenities") as string);
      console.log("Parsed JSON data:", {
        selectedLocation,
        amenities,
        projectAmenities,
      });
    } catch (jsonError) {
      console.error("JSON parsing error:", jsonError);
      console.error("Raw data:", {
        selectedLocation: formData.get("selectedLocation"),
        amenities: formData.get("amenities"),
        projectAmenities: formData.get("projectAmenities"),
      });
      return NextResponse.json(
        { error: "ข้อมูลที่ส่งมาไม่ถูกต้อง: " + (jsonError as Error).message },
        { status: 400 }
      );
    }

    let localizedPayload: {
      localized?: Record<string, LocalizedValue<string>>;
      source?: Record<string, unknown>;
    } = {};
    const localizedPayloadRaw = formData.get("localizedPayload");
    if (localizedPayloadRaw && typeof localizedPayloadRaw === "string") {
      try {
        localizedPayload = JSON.parse(localizedPayloadRaw);
      } catch (error) {
        console.warn("Invalid localizedPayload provided", error);
      }
    }

    // Handle images
    const images = formData.getAll("images") as File[];

    // Validate required fields
    if (
      !projectName ||
      !address ||
      !area ||
      !bedrooms ||
      !bathrooms ||
      !parking ||
      !price ||
      !agent_id ||
      !selectedLocation ||
      selectedLocation.ละติจูด === null ||
      selectedLocation.ละติจูด === undefined ||
      selectedLocation.ลองจิจูด === null ||
      selectedLocation.ลองจิจูด === undefined
    ) {
      console.log("Validation failed:", {
        projectName,
        address,
        area,
        bedrooms,
        bathrooms,
        parking,
        price,
        agent_id,
        selectedLocation,
      });
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" },
        { status: 400 }
      );
    }

    // Create Supabase admin client
    const supabase = createSupabaseAdmin();
    console.log("Supabase admin client created successfully");

    // Debug environment variables
    console.log("Environment variables check:", {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "NOT SET",
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "NOT SET",
      nodeEnv: process.env.NODE_ENV || "NOT SET",
    });

    // Test connection and check if table exists
    try {
      console.log("Testing Supabase connection...");
      const { error: testError } = await supabase
        .from("properties")
        .select("count")
        .limit(1);

      if (testError) {
        console.error("Supabase connection test failed:", testError);
        console.error("Test error details:", {
          message: testError.message,
          details: testError.details,
          hint: testError.hint,
          code: testError.code,
        });

        // Try to create table if it doesn't exist
        console.log("Attempting to create properties table...");
        const { error: createError } = await supabase.rpc(
          "create_properties_table"
        );
        if (createError) {
          console.error("Failed to create table:", createError);
          console.error("Create error details:", {
            message: createError.message,
            details: createError.details,
            hint: createError.hint,
            code: createError.code,
          });
        } else {
          console.log(
            "Table created successfully, retrying connection test..."
          );
          const { error: retryError } = await supabase
            .from("properties")
            .select("count")
            .limit(1);

          if (retryError) {
            console.error("Retry connection test failed:", retryError);
          } else {
            console.log("Retry connection test successful");
          }
        }
      } else {
        console.log("Supabase connection test successful");
      }
    } catch (testErr) {
      console.error("Supabase connection test error:", testErr);
      console.error("Test error stack:", (testErr as Error).stack);
    }

    // Handle images - upload WebP files to Supabase Storage
    const imageUrls: string[] = [];
    for (let i = 0; i < images.length; i++) {
      if (images[i] && images[i].size > 0) {
        const image = images[i];
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);

        // ตรวจสอบว่าเป็นไฟล์ WebP หรือไม่
        const fileExtension =
          image.name.split(".").pop()?.toLowerCase() || "webp";
        const isWebP = fileExtension === "webp" || image.type === "image/webp";

        // ใช้ .webp extension เสมอ
        const fileName = `properties/${agent_id}/${timestamp}-${randomString}.webp`;

        try {
          console.log(`Uploading image ${i + 1}:`, {
            originalName: image.name,
            originalType: image.type,
            originalSize: image.size,
            isWebP: isWebP,
            fileName: fileName,
          });

          // อัปโหลดไปยัง Supabase Storage
          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from("property-images")
              .upload(fileName, image, {
                cacheControl: "3600",
                upsert: false,
                contentType: "image/webp", // บังคับใช้ content type เป็น WebP
              });

          if (!uploadError && uploadData) {
            // สำเร็จ - ดึง public URL
            const { data: urlData } = supabase.storage
              .from("property-images")
              .getPublicUrl(fileName);
            imageUrls.push(urlData.publicUrl);
            console.log(
              `Successfully uploaded image ${i + 1}:`,
              urlData.publicUrl
            );
          } else {
            console.error("Upload error:", uploadError);
            // ถ้าอัปโหลดไม่ได้ ให้ใช้ placeholder
            imageUrls.push("/placeholder-property.jpg");
          }
        } catch (error) {
          console.error("Image upload error:", error);
          // ถ้ามีข้อผิดพลาด ให้ใช้ placeholder
          imageUrls.push("/placeholder-property.jpg");
        }
      }
    } // Convert saleType to array format for listing_type

    let listingTypeArray: string[] = [];
    // แปลงจากภาษาไทยเป็นอังกฤษสำหรับการบันทึกในฐานข้อมูล
    if (saleType === "ขาย" || saleType === "sale") {
      listingTypeArray = ["sale"];
    } else if (saleType === "เช่า" || saleType === "rent") {
      listingTypeArray = ["rent"];
    } else if (saleType === "ขายและเช่า" || saleType === "both") {
      listingTypeArray = ["sale", "rent"];
    } else {
      console.error("Unknown saleType value:", saleType);
      // Default to sale if unknown
      listingTypeArray = ["sale"];
    }

    // Prepare location data
    const locationData = {
      latitude: selectedLocation?.ละติจูด || null,
      longitude: selectedLocation?.ลองจิจูด || null,
      address: projectLocation,
    };

    // Convert amenities to array format
    const facilitiesArray = [];
    if (amenities?.aircon) facilitiesArray.push(`แอร์: ${amenities.aircon}`);
    if (amenities?.kitchen) facilitiesArray.push(`ครัว: ${amenities.kitchen}`);
    if (amenities?.additional) facilitiesArray.push(amenities.additional);

    const projectFacilitiesArray = [];
    if (projectAmenities?.pool) projectFacilitiesArray.push("สระว่ายน้ำ");
    if (projectAmenities?.gym) projectFacilitiesArray.push("ฟิตเนส");
    if (projectAmenities?.security) projectFacilitiesArray.push("รปภ. 24 ชม.");
    if (projectAmenities?.parking) projectFacilitiesArray.push("ที่จอดรถ");

    const localizedMap = localizedPayload.localized ?? {};
    const sourceMap = localizedPayload.source ?? {};

    const fallbackProjectName =
      sanitizeString(sourceMap[TRANSLATION_KEYS.projectName] as string) ||
      sanitizeString(projectName);
    const fallbackAddress =
      sanitizeString(sourceMap[TRANSLATION_KEYS.address] as string) ||
      sanitizeString(address);
    const fallbackDescription =
      sanitizeString(sourceMap[TRANSLATION_KEYS.description] as string) ||
      sanitizeString(projectDescription);
    const fallbackHighlight =
      sanitizeString(sourceMap[TRANSLATION_KEYS.highlight] as string) ||
      sanitizeString(`${highlightsType || ""}\n${highlightsSurrounding || ""}`);
    const fallbackAreaAround =
      sanitizeString(sourceMap[TRANSLATION_KEYS.areaAround] as string) ||
      sanitizeString(highlightsSurrounding);
    // Use only the numeric value from houseAge, not from translation
    const fallbackHouseCondition = houseAge ? sanitizeString(houseAge) : null;
    const fallbackFacilitiesList = Array.isArray(
      sourceMap[TRANSLATION_KEYS.facilities]
    )
      ? (sourceMap[TRANSLATION_KEYS.facilities] as string[])
      : facilitiesArray;
    const fallbackProjectFacilitiesList = Array.isArray(
      sourceMap[TRANSLATION_KEYS.projectFacilities]
    )
      ? (sourceMap[TRANSLATION_KEYS.projectFacilities] as string[])
      : projectFacilitiesArray;

    const localizedProjectName = coerceLocalizedString(
      TRANSLATION_KEYS.projectName,
      localizedMap,
      fallbackProjectName
    );
    const localizedAddress = coerceLocalizedString(
      TRANSLATION_KEYS.address,
      localizedMap,
      fallbackAddress
    );
    const localizedDescription = coerceLocalizedString(
      TRANSLATION_KEYS.description,
      localizedMap,
      fallbackDescription
    );
    const localizedHighlight = coerceLocalizedString(
      TRANSLATION_KEYS.highlight,
      localizedMap,
      fallbackHighlight
    );
    const localizedAreaAround = coerceLocalizedString(
      TRANSLATION_KEYS.areaAround,
      localizedMap,
      fallbackAreaAround
    );
    const localizedHouseCondition = coerceLocalizedString(
      TRANSLATION_KEYS.houseCondition,
      localizedMap,
      fallbackHouseCondition
    );
    const localizedFacilities = coerceLocalizedList(
      TRANSLATION_KEYS.facilities,
      localizedMap,
      fallbackFacilitiesList
    );
    const localizedProjectFacilities = coerceLocalizedList(
      TRANSLATION_KEYS.projectFacilities,
      localizedMap,
      fallbackProjectFacilitiesList
    );

    // First, insert into properties table

    const { data: propertyData, error: propertyError } = await supabase
      .from("properties")
      .insert([
        {
          agent_id: agent_id,
          listing_type: listingTypeArray,
          property_category: propertyType,
          in_project: isProject,
          rental_duration: rentalPeriod || null,
          location: locationData,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (propertyError) {
      console.error("Properties table error:", propertyError);
      return NextResponse.json(
        {
          error:
            "เกิดข้อผิดพลาดในการบันทึกข้อมูลหลัก: " + propertyError.message,
        },
        { status: 500 }
      );
    }

    // Then, insert into property_details table
    const { data: detailsData, error: detailsError } = await supabase
      .from("property_details")
      .insert([
        {
          property_id: propertyData.id,
          project_name: localizedProjectName,
          address: localizedAddress,
          usable_area: parseFloat(area),
          bedrooms: parseInt(bedrooms),
          bathrooms: parseInt(bathrooms),
          parking_spaces: parseInt(parking),
          house_condition: localizedHouseCondition,
          highlight: localizedHighlight,
          area_around: localizedAreaAround,
          facilities: localizedFacilities,
          project_facilities: localizedProjectFacilities,
          description: localizedDescription,
          price: parseFloat(price.replace(/,/g, "")),
          images: imageUrls,
          latitude: selectedLocation?.ละติจูด || null,
          longitude: selectedLocation?.ลองจิจูด || null,
          view_count: 0,
          created_at: new Date().toISOString(),
          status: "pending",
        },
      ]);

    if (detailsError) {
      console.error("Property details error:", detailsError);
      // Clean up: delete the property record if details failed
      await supabase.from("properties").delete().eq("id", propertyData.id);
      return NextResponse.json(
        {
          error: "เกิดข้อผิดพลาดในการบันทึกรายละเอียด: " + detailsError.message,
        },
        { status: 500 }
      );
    }

    // Get property name and address for notification
    const propertyName =
      typeof localizedProjectName === "object"
        ? localizedProjectName.th || localizedProjectName.en || projectName
        : localizedProjectName || projectName;
    const propertyAddress =
      typeof localizedAddress === "object"
        ? localizedAddress.th || localizedAddress.en || address
        : localizedAddress || address;
    const propertyPrice = parseFloat(price.replace(/,/g, ""));

    // Find all admin users to send notification
    const { data: adminUsers, error: adminError } = await supabase
      .from("users")
      .select("id")
      .eq("role", "admin");

    if (!adminError && adminUsers && adminUsers.length > 0) {
      // Create notifications for all admin users
      const notifications = adminUsers.map(admin => ({
        sender_id: agent_id,
        receiver_id: admin.id,
        message: `มีการ์ดอสังหาฯใหม่รออนุมัติ: ${propertyName} - ราคา ${propertyPrice.toLocaleString("th-TH")} บาท - ${propertyAddress}`,
        headder: "การ์ดใหม่รออนุมัติ",
        is_read: false,
        role: "admin",
        metadata: {
          property_id: propertyData.id,
          property_name: propertyName,
          property_price: propertyPrice,
          property_address: propertyAddress,
        },
      }));

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notificationError) {
        console.error("Failed to create notifications:", notificationError);
        // Don't fail the request if notification fails
      } else {
        console.log(
          `Created ${notifications.length} notification(s) for admin users`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "บันทึกข้อมูลอสังหาริมทรัพย์เรียบร้อยแล้ว",
      data: {
        property: propertyData,
        details: detailsData,
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์: " + (error as Error).message },
      { status: 500 }
    );
  }
}
