import { NextRequest, NextResponse } from "next/server";

import { extractErrorMessage } from "@/lib/error-utils";
import {
  transformPropertyWithRelations,
  type PropertyWithRelations,
} from "@/lib/property-helpers";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createServerClient } from "@/utils/supabase/server";

const selection = `
  id,
  property_category,
  rent_duration,
  view_count,
  listing_type,
  property_details (
    property_id,
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
    latitude,
    longitude,
    view_count,
    status,
    created_at
  ),
  users:users!properties_agent_id_fkey (
    id,
    first_name,
    last_name,
    email
  )
`;

const isPropertiesWithRelationsArray = (
  value: unknown
): value is PropertyWithRelations[] =>
  Array.isArray(value) &&
  value.every(
    item => typeof item === "object" && item !== null && "id" in item
  );

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");
    const excludeId = searchParams.get("excludeId");
    const limit = parseInt(searchParams.get("limit") || "5");

    let supabase;
    try {
      supabase = createSupabaseAdmin();
    } catch (adminError) {
      console.warn(
        "Similar properties API: service role client unavailable, falling back to anon client",
        adminError
      );
      try {
        supabase = createServerClient();
      } catch (anonError) {
        console.error(
          "Similar properties API: failed to initialize Supabase client",
          anonError
        );
        return NextResponse.json(
          {
            success: false,
            error: "Unable to initialize Supabase client",
          },
          { status: 500 }
        );
      }
    }

    let query = supabase.from("properties").select(selection).limit(limit);

    // Exclude current property
    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    // Try to match by location first
    if (location && location.trim() !== "") {
      const { data: locationData, error: locationError } = await query.eq(
        "property_details.address",
        location
      );

      if (
        !locationError &&
        locationData &&
        Array.isArray(locationData) &&
        locationData.length > 0
      ) {
        const transformedData = isPropertiesWithRelationsArray(locationData)
          ? locationData.map(transformPropertyWithRelations)
          : [];
        return NextResponse.json({
          success: true,
          data: transformedData,
          message: `Found ${transformedData.length} similar properties by location`,
        });
      }

      // If no exact location match, try partial location match
      const { data: partialLocationData, error: partialError } =
        await query.ilike("property_details.address", `%${location}%`);

      if (
        !partialError &&
        partialLocationData &&
        partialLocationData &&
        Array.isArray(partialLocationData) &&
        partialLocationData.length > 0
      ) {
        const transformedData = isPropertiesWithRelationsArray(
          partialLocationData
        )
          ? partialLocationData.map(transformPropertyWithRelations)
          : [];
        return NextResponse.json({
          success: true,
          data: transformedData,
          message: `Found ${transformedData.length} similar properties by partial location match`,
        });
      }
    }

    // Fallback: get any properties except the current one
    const { data: fallbackData, error: fallbackError } = await query;

    if (fallbackError) {
      console.error("Error fetching fallback properties:", fallbackError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch properties",
          details: fallbackError.message,
        },
        { status: 500 }
      );
    }

    const transformedData = isPropertiesWithRelationsArray(fallbackData)
      ? fallbackData.map(transformPropertyWithRelations)
      : [];
    return NextResponse.json({
      success: true,
      data: transformedData,
      message: `Found ${transformedData.length} properties as fallback`,
    });
  } catch (error) {
    console.error("Error in similar properties API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: extractErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
