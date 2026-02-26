import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const search = searchParams.get("search");

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("properties")
      .select(
        `
        id,
        listing_type,
        property_category,
        in_project,
        rental_duration,
        location,
        created_at,
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
          latitude,
          longitude,
          view_count
        )
      `
      )
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });

    // Filter by search term if provided
    if (search) {
      query = query.or(
        `property_details.project_name.ilike.%${search}%,property_details.address.ilike.%${search}%`
      );
    }

    const { data: properties, error } = await query;

    if (error) {
      console.error("Error fetching properties:", error);
      return NextResponse.json(
        { error: "Failed to fetch properties" },
        { status: 500 }
      );
    } // Transform data to match frontend expectations
    const transformedProperties = properties
      ?.map(property => {
        const details = property.property_details;
        if (!details) return null;

        return {
          id: property.id,
          listing_type: property.listing_type || [],
          property_category: property.property_category || "ไม่ระบุ",
          project_name: details.project_name || "ไม่ระบุชื่อโครงการ",
          address: details.address || "ไม่ระบุที่อยู่",
          usable_area: details.usable_area || 0,
          bedrooms: details.bedrooms || 0,
          bathrooms: details.bathrooms || 0,
          parking_spaces: details.parking_spaces || 0,
          price: details.price || 0,
          house_condition: details.house_condition || "",
          highlight: details.highlight || "",
          description: details.description || "",
          images: Array.isArray(details.images)
            ? details.images
            : details.images
              ? [details.images]
              : [],
          created_at: property.created_at,
          agent_id: property.agent_id,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      data: transformedProperties,
    });
  } catch (error) {
    console.error("Error in my-listings API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const agentId = searchParams.get("agentId");

    if (!propertyId || !agentId) {
      return NextResponse.json(
        { error: "Property ID and Agent ID are required" },
        { status: 400 }
      );
    }

    // Verify that the property belongs to the agent
    const { data: property, error: fetchError } = await supabase
      .from("properties")
      .select("agent_id")
      .eq("id", propertyId)
      .single();

    if (fetchError || !property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    if (property.agent_id !== agentId) {
      return NextResponse.json(
        { error: "Unauthorized to edit this property" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { updates, details } = body;

    // Handle customer lookup if customer_email and customer_phone are provided
    let customerId: string | null = null;
    if (details?.customer_email || details?.customer_phone) {
      const customerEmail = details.customer_email?.trim().toLowerCase();
      const customerPhone = details.customer_phone?.trim();

      if (customerEmail || customerPhone) {
        // Search for user by email or phone (either one is sufficient)
        let matchedUser: any = null;
        let userError: any = null;

        // Try email first if provided (case-insensitive search)
        if (customerEmail) {
          const { data: usersByEmail, error: emailError } = await supabase
            .from("users")
            .select("id, role, first_name, last_name, email, phone")
            .ilike("email", customerEmail)
            .eq("role", "customer")
            .limit(1);

          if (emailError) {
            console.error("Error searching by email:", emailError);
            userError = emailError;
          } else if (usersByEmail && usersByEmail.length > 0) {
            matchedUser = usersByEmail[0];
          }
        }

        // If not found by email and phone is provided, try phone
        if (!matchedUser && customerPhone) {
          const { data: usersByPhone, error: phoneError } = await supabase
            .from("users")
            .select("id, role, first_name, last_name, email, phone")
            .eq("phone", customerPhone)
            .eq("role", "customer")
            .limit(1);

          if (phoneError) {
            console.error("Error searching by phone:", phoneError);
            userError = phoneError;
          } else if (usersByPhone && usersByPhone.length > 0) {
            matchedUser = usersByPhone[0];
          }
        }

        // If both email and phone are provided and we found a user, verify it matches both
        if (matchedUser && customerEmail && customerPhone) {
          if (
            matchedUser.email?.toLowerCase() !== customerEmail ||
            matchedUser.phone !== customerPhone
          ) {
            // If the found user doesn't match both, try to find one that matches both
            const { data: usersByBoth, error: bothError } = await supabase
              .from("users")
              .select("id, role, first_name, last_name, email, phone")
              .ilike("email", customerEmail)
              .eq("phone", customerPhone)
              .eq("role", "customer")
              .limit(1);

            if (!bothError && usersByBoth && usersByBoth.length > 0) {
              matchedUser = usersByBoth[0];
            }
          }
        }

        if (matchedUser) {
          // Check if customer record exists
          const { data: existingCustomer, error: customerCheckError } =
            await supabase
              .from("customers")
              .select("user_id")
              .eq("user_id", matchedUser.id)
              .maybeSingle();

          if (customerCheckError) {
            console.error(
              "Error checking customer record:",
              customerCheckError
            );
          } else if (existingCustomer) {
            customerId = existingCustomer.user_id;
          } else {
            // Create customer record if it doesn't exist
            const fullName =
              `${matchedUser.first_name || ""} ${matchedUser.last_name || ""}`.trim() ||
              "Customer";
            const { data: newCustomer, error: createCustomerError } =
              await supabase
                .from("customers")
                .insert({
                  user_id: matchedUser.id,
                  full_name: fullName,
                })
                .select("user_id")
                .single();

            if (createCustomerError) {
              console.error(
                "Error creating customer record:",
                createCustomerError
              );
            } else if (newCustomer) {
              customerId = newCustomer.user_id;
            }
          }
        }
      }
    }

    // Update properties table if updates provided
    if (updates && Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("properties")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", propertyId);

      if (updateError) {
        console.error("Error updating property:", updateError);
        return NextResponse.json(
          { error: "Failed to update property" },
          { status: 500 }
        );
      }
    }

    // Update property_details table if details provided
    if (details && Object.keys(details).length > 0) {
      // Remove customer_email and customer_phone from details as they're not columns
      const { customer_email, customer_phone, ...detailsToUpdate } = details;

      // Add customer_id if found
      const finalDetails = customerId
        ? { ...detailsToUpdate, customer_id: customerId }
        : detailsToUpdate;

      const { error: detailsError } = await supabase
        .from("property_details")
        .update(finalDetails)
        .eq("property_id", propertyId);

      if (detailsError) {
        console.error("Error updating property details:", detailsError);
        return NextResponse.json(
          { error: "Failed to update property details" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Property updated successfully",
    });
  } catch (error) {
    console.error("Error in PATCH my-listings API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const agentId = searchParams.get("agentId");

    if (!propertyId || !agentId) {
      return NextResponse.json(
        { error: "Property ID and Agent ID are required" },
        { status: 400 }
      );
    }

    // Verify that the property belongs to the agent
    const { data: property, error: fetchError } = await supabase
      .from("properties")
      .select("agent_id")
      .eq("id", propertyId)
      .single();

    if (fetchError || !property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    if (property.agent_id !== agentId) {
      return NextResponse.json(
        { error: "Unauthorized to delete this property" },
        { status: 403 }
      );
    }

    // Delete related records manually to avoid FK violations if CASCADE is missing
    // 1. Delete price_negotiations
    const { error: negotiationError } = await supabase
      .from("price_negotiations")
      .delete()
      .eq("property_id", propertyId);

    if (negotiationError) {
      console.error("Error deleting price_negotiations:", negotiationError);
    }

    // 2. Delete favorites
    const { error: favoritesError } = await supabase
      .from("favorites")
      .delete()
      .eq("property_id", propertyId);

    if (favoritesError) {
      console.error("Error deleting favorites:", favoritesError);
    }

    // 3. Delete property_details (explicitly, just in case)
    const { error: detailsError } = await supabase
      .from("property_details")
      .delete()
      .eq("property_id", propertyId);

    if (detailsError) {
      console.error("Error deleting property_details:", detailsError);
    }

    // Delete property (property_details will be deleted automatically due to foreign key constraint)
    const { error: deleteError } = await supabase
      .from("properties")
      .delete()
      .eq("id", propertyId);

    if (deleteError) {
      console.error("Error deleting property:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete property" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE my-listings API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
