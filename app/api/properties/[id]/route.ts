import {
  makeLocalizedValue,
  normalizeLocalizedValue,
  pickLocalizedValue,
  type LocalizedValue,
} from "@/lib/localization";
import { toCleanStringArray } from "@/lib/property-helpers";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

const sanitizeText = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseLocalizedString = (
  input: unknown,
  fallback: string
): { text: string; localized: LocalizedValue<string> } => {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const normalized = normalizeLocalizedValue<string>(
      input as LocalizedValue<string>
    );
    const text = pickLocalizedValue(normalized, "th", "th") ?? fallback;
    return { text, localized: normalized };
  }

  const resolved =
    sanitizeText(typeof input === "string" ? input : null) || fallback;
  return {
    text: resolved,
    localized: makeLocalizedValue(resolved, null, {
      detectedLanguage: "th",
      confidence: null,
      source: { th: "user" },
    }),
  };
};

const parseLocalizedList = (
  input: unknown,
  fallback: string[] = []
): { list: string[]; localized: LocalizedValue<string[]> } => {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const normalized = normalizeLocalizedValue<string[] | string>(
      input as LocalizedValue<string[] | string>
    );
    const thList = Array.isArray(normalized.th)
      ? normalized.th
      : typeof normalized.th === "string"
        ? toCleanStringArray(normalized.th)
        : [];
    const enList = Array.isArray(normalized.en)
      ? normalized.en
      : typeof normalized.en === "string"
        ? toCleanStringArray(normalized.en)
        : [];
    return {
      list: thList.length ? thList : fallback,
      localized: {
        th: thList.length ? thList : fallback.length ? fallback : null,
        en: enList.length ? enList : null,
        meta: normalized.meta,
      },
    };
  }

  const list =
    typeof input === "string"
      ? toCleanStringArray(input)
      : Array.isArray(input)
        ? input
            .filter((item): item is string => typeof item === "string")
            .map(item => item.trim())
            .filter(Boolean)
        : [];

  const resolved = list.length ? list : fallback;
  return {
    list: resolved,
    localized: makeLocalizedValue(resolved.length ? resolved : null, null, {
      detectedLanguage: "th",
      confidence: null,
      source: { th: "user" },
    }),
  };
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Await params in NextJS 15
    const { id } = await params;

    // Use admin client for better performance
    const supabase = createSupabaseAdmin();

    // Fetch property details with related data
    const { data: property, error } = await supabase
      .from("properties")
      .select(
        `
                *,
                property_details (
                    project_name,
                    address,
                    usable_area,
                    bedrooms,
                    bathrooms,
                    parking_spaces,
                    house_condition,
                    highlight,
                    area_around,
                    facilities,
                    project_facilities,
                    description,
                    price,
                    images,
                    status,
                    latitude,
                    longitude
                ),
                users!properties_agent_id_fkey (
                    id,
                    first_name,
                    last_name,
                    email,
                    phone
                )            `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching property:", error);
      return NextResponse.json(
        { error: "Failed to fetch property details" },
        { status: 500 }
      );
    }

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    const detail = property.property_details;

    const projectNameField = parseLocalizedString(
      detail?.project_name,
      property.property_category || "Untitled Property"
    );
    const addressField = parseLocalizedString(
      detail?.address,
      sanitizeText(
        typeof detail?.address === "string" ? detail.address : null
      ) || ""
    );
    const descriptionField = parseLocalizedString(detail?.description, "");
    const highlightField = parseLocalizedString(detail?.highlight, "");
    const areaAroundField = parseLocalizedString(detail?.area_around, "");
    const houseConditionField = parseLocalizedString(
      detail?.house_condition,
      ""
    );
    const facilitiesField = parseLocalizedList(detail?.facilities, []);
    const projectFacilitiesField = parseLocalizedList(
      detail?.project_facilities,
      []
    );

    const imagesList =
      Array.isArray(detail?.images) && detail.images.length > 0
        ? (detail.images as string[])
        : ["/placeholder.svg"];

    const priceString =
      typeof detail?.price === "number"
        ? detail.price.toString()
        : (detail?.price as string) || "0";

    // Transform the data to match the expected format
    // Derive listing types and sale/rent flags from available fields
    const listingSource =
      property.listing_type ?? detail?.properties?.listing_type ?? [];
    const listingTypes = toCleanStringArray(listingSource).map(s =>
      String(s).trim()
    );
    const statusLower = (detail?.status ?? property.status ?? "")
      .toString()
      .toLowerCase();

    const isForRent =
      listingTypes.some(type => /(rent|for_rent|เช่า)/i.test(type)) ||
      ["for_rent", "rent", "เช่า"].includes(statusLower);
    const isForSale =
      listingTypes.some(type => /(sale|for_sale|ขาย)/i.test(type)) ||
      ["for_sale", "sale", "ขาย"].includes(statusLower);
    const isSold =
      /sold|ขายแล้ว|ขาย/i.test(statusLower) ||
      (property.status &&
        /sold|ขายแล้ว|ขาย/i.test(property.status.toString().toLowerCase()));
    const isRented =
      /rented|เช่าแล้ว|เช่า/i.test(statusLower) ||
      (property.status &&
        /rented|เช่าแล้ว|เช่า/i.test(property.status.toString().toLowerCase()));

    const transformedProperty = {
      property_id: property.id,
      project_name: projectNameField.text,
      address: addressField.text,
      usable_area: detail?.usable_area || 0,
      bedrooms: detail?.bedrooms || 0,
      bathrooms: detail?.bathrooms || 0,
      parking_spaces: detail?.parking_spaces || 0,
      house_condition: houseConditionField.text,
      highlight: highlightField.text,
      area_around: areaAroundField.text,
      facilities: facilitiesField.list,
      project_facilities: projectFacilitiesField.list,
      description: descriptionField.text,
      price: priceString,
      images: imagesList,
      listing_type: listingTypes,
      isForRent,
      isForSale,
      is_promoted: property.is_promoted,
      status: detail?.status ?? property.status ?? null,
      isSold,
      isRented,
      latitude: detail?.latitude,
      longitude: detail?.longitude,
      localized: {
        project_name: projectNameField.localized,
        address: addressField.localized,
        description: descriptionField.localized,
        highlight: highlightField.localized,
        areaAround: areaAroundField.localized,
        houseCondition: houseConditionField.localized,
        facilities: facilitiesField.localized,
        projectFacilities: projectFacilitiesField.localized,
      },
      agent: property.users
        ? {
            id: property.users.id,
            first_name: property.users.first_name,
            last_name: property.users.last_name,
            email: property.users.email,
            phone: property.users.phone,
            profile_picture: undefined, // Set to undefined since column doesn't exist
          }
        : null,
    };

    return NextResponse.json(
      { success: true, data: transformedProperty },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          "CDN-Cache-Control": "public, s-maxage=300",
          "Vercel-CDN-Cache-Control": "public, s-maxage=300",
        },
      }
    );
  } catch (error) {
    console.error("Error in property API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
