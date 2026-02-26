import type { PropertyData } from "@/components/property/property-card";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createServerClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

const DEBUG = process.env.NODE_ENV !== "production";
const dlog = (...args: unknown[]) => {
  if (DEBUG) console.log(...args);
};

// เพิ่ม interface เพื่อขยาย PropertyData ให้รองรับ agentInfo
interface ExtendedPropertyData extends PropertyData {
  agentInfo?: {
    companyName: string;
    licenseNumber: string;
    propertyTypes: string[];
    serviceAreas: string[];
  } | null;
}

interface PropertyLocation {
  address?: string;
  latitude?: number;
  longitude?: number;
  district?: string;
  province?: string;
  [key: string]: unknown;
}

interface AgentServiceArea {
  district?: string;
  province?: string;
  [key: string]: unknown;
}

interface UserSummary {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
}

type QueryError = { message?: string } | null;

type SupabaseResponse<T> = {
  data: T[] | null;
  error: QueryError;
};

interface SupabaseClientAdapter {
  from<T = Record<string, unknown>>(
    table: string
  ): {
    select(columns: string): Promise<SupabaseResponse<T>>;
  };
}

// กำหนด interface สำหรับข้อมูลที่ได้จาก Supabase
interface SupabaseProperty {
  id: string;
  agent_id?: string | null;
  listing_type: string[];
  property_category: string;
  in_project?: boolean | null;
  rental_duration?: string | null;
  location?: PropertyLocation | null;
  created_at: string;
  status?: string;
  boundary_coordinates?: { lat: number; lng: number }[];
  expiryWarning?: string;
  property_details?: Array<{
    project_name?: string;
    address?: string;
    usable_area?: number;
    bedrooms?: number;
    bathrooms?: number;
    parking_spaces?: number;
    house_condition?: string;
    highlight?: string;
    area_around?: string;
    facilities?: string[];
    project_facilities?: string[];
    description?: string;
    price?: number;
    images?: string[];
  }>;
  agent_info?: {
    company_name?: string;
    license_number?: string;
    property_types?: string[];
    service_areas?: AgentServiceArea[];
  };
  user_info?: UserSummary | null;
}

// เพิ่ม interface สำหรับข้อมูลจาก property_details table
interface PropertyDetail {
  id?: string;
  property_id: string;
  project_name?: string;
  address?: string;
  usable_area?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking_spaces?: number;
  house_condition?: string;
  highlight?: string;
  area_around?: string;
  facilities?: string[];
  project_facilities?: string[];
  description?: string;
  price?: number;
  images?: string[];
  view_count?: number;
  created_at?: string;
  updated_at?: string;
}

// เพิ่ม interface สำหรับข้อมูลจาก agens table
interface Agent {
  id: string;
  user_id: string;
  company_name?: string;
  license_number?: string;
  property_types?: string[];
  service_areas?: Array<{
    district?: string;
    province?: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export async function GET(request: Request) {
  try {
    dlog("API: เริ่มดึงข้อมูลอสังหาริมทรัพย์จาก server-side");

    // ตรวจสอบ query parameters
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");
    const searchTerm = url.searchParams.get("search");

    // สร้าง Supabase client สำหรับการดึงข้อมูลแบบไม่ต้อง auth
    let supabase;
    try {
      supabase = createSupabaseAdmin();
      dlog("API: ใช้ Service Role client สำหรับการดึงข้อมูลหลัก");
    } catch (adminError) {
      console.warn(
        "API: สร้าง Service Role client ไม่สำเร็จ จะลองใช้ anon client แทน:",
        adminError
      );
      try {
        supabase = createServerClient();
        dlog("API: ใช้ anon client แทน Service Role client");
      } catch (anonError) {
        console.error("API: ไม่สามารถสร้าง Supabase client:", anonError);
        dlog("API: ใช้ข้อมูล static แทน");
        return await getStaticFallbackData();
      }
    }

    // ถ้าเป็นโหมด fallback ให้ดึงข้อมูลแบบแยกตาราง
    if (mode === "fallback") {
      return await getFallbackData(supabase);
    }

    // ทดสอบการเชื่อมต่อเบื้องต้น (skip in production for speed)
    if (DEBUG) {
      const connectionTest = await supabase
        .from("properties")
        .select("id")
        .limit(1);

      if ((connectionTest as SupabaseResponse<{ id: string }>).error) {
        console.error(
          "API: ไม่สามารถเชื่อมต่อกับ Supabase:",
          (connectionTest as SupabaseResponse<{ id: string }>).error
        );
        dlog("API: ใช้ข้อมูล static แทน");
        return await getStaticFallbackData();
      }
    }

    // ✅ วิธีใหม่: ดึงข้อมูลทั้งหมดพร้อมกัน
    dlog("API: ดึงข้อมูลทั้งหมดพร้อมกัน...");

    // Include approved, sold and rented statuses so sold/rented listings
    // still surface on listing pages as requested.
    let propertiesQuery = supabase
      .from("properties")
      .select(
        "id, agent_id, listing_type, property_category, in_project, rental_duration, location, created_at, is_promoted, status, boundary_coordinates"
      )
      .in("status", ["approved", "sold", "rented"])
      .order("created_at", { ascending: false })
      .limit(200);

    if (searchTerm) {
      propertiesQuery = propertiesQuery.or(
        `location->>address.ilike.%${searchTerm}%,location->>district.ilike.%${searchTerm}%,location->>province.ilike.%${searchTerm}%`
      );
    }

    const [propertiesResponse, detailsResponse, agentsResponse, usersResponse] =
      (await Promise.all([
        propertiesQuery,
        supabase
          .from("property_details")
          .select(
            "property_id, project_name, address, usable_area, bedrooms, bathrooms, parking_spaces, highlight, description, facilities, project_facilities, price, images, latitude, longitude, view_count, created_at, status, house_condition, area_around"
          )
          .in("status", ["approved", "sold", "rented"]) // include sold/rented details
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("agens")
          .select(
            "user_id, company_name, license_number, property_types, service_areas"
          )
          .limit(100),
        supabase.from("users").select("id, first_name, last_name").limit(100),
      ])) as [
        SupabaseResponse<SupabaseProperty>,
        SupabaseResponse<PropertyDetail>,
        SupabaseResponse<Agent>,
        SupabaseResponse<UserSummary>,
      ];

    const propertiesError = propertiesResponse.error;
    const detailsError = detailsResponse.error;
    const agentsError = agentsResponse.error;
    const usersError = usersResponse.error;

    const propertiesData = propertiesResponse.data ?? [];
    const detailsData = detailsResponse.data ?? [];
    const agentsData = agentsResponse.data ?? [];
    const usersData = usersResponse.data ?? [];

    if (propertiesError || detailsError) {
      console.error(
        "API: เกิดข้อผิดพลาดในการดึงข้อมูล:",
        propertiesError || detailsError
      );
      dlog("API: ใช้ข้อมูล static แทน");
      return await getStaticFallbackData();
    }

    if (agentsError) {
      console.warn("API: ดึงข้อมูล agent มีบางรายการผิดพลาด:", agentsError);
    }
    if (usersError) {
      console.warn("API: ดึงข้อมูลผู้ใช้มีบางรายการผิดพลาด:", usersError);
    }

    dlog(
      `API: ดึงข้อมูลสำเร็จ - Properties: ${propertiesData.length}, Details: ${detailsData.length}, Agents: ${agentsData.length}, Users: ${usersData.length}`
    );

    // ✅ สร้าง lookup maps สำหรับความเร็ว
    const detailsMap = new Map<string, PropertyDetail[]>();
    const agentsMap = new Map<string, Agent>();
    const usersMap = new Map<string, UserSummary>();

    // จัดกลุ่ม property_details ตาม property_id
    detailsData.forEach(detail => {
      if (!detailsMap.has(detail.property_id)) {
        detailsMap.set(detail.property_id, []);
      }
      detailsMap.get(detail.property_id)!.push(detail);
    });

    // จัดกลุ่ม agents ตาม user_id
    agentsData.forEach(agent => {
      agentsMap.set(agent.user_id, agent);
    });

    // จัดกลุ่ม users ตาม id
    usersData.forEach(user => {
      usersMap.set(user.id, user);
    });

    // ✅ รวมข้อมูลโดยใช้ map lookup (O(1) แทนที่จะเป็น O(n))
    const completeData: SupabaseProperty[] = [];

    if (propertiesData.length === 0) {
      console.log("API: ไม่มีข้อมูล properties, ใช้ข้อมูล static แทน");
      return await getStaticFallbackData();
    }

    for (const property of propertiesData) {
      // ดึงข้อมูลรายละเอียดจาก map
      const propertyDetails = detailsMap.get(property.id);

      if (!propertyDetails || propertyDetails.length === 0) {
        dlog(
          `API: ไม่พบข้อมูล property_details สำหรับ property ID ${property.id}`
        );
        continue;
      }

      // ดึงข้อมูล agent และ user จาก map (ถ้ามี)
      let agentInfo: SupabaseProperty["agent_info"] | undefined;
      let userInfo: SupabaseProperty["user_info"] = null;
      if (property.agent_id) {
        const agentData = agentsMap.get(property.agent_id);
        const userData = usersMap.get(property.agent_id);

        if (agentData) {
          agentInfo = {
            company_name: agentData.company_name,
            license_number: agentData.license_number,
            property_types: agentData.property_types,
            service_areas: agentData.service_areas,
          };
        }

        if (userData) {
          userInfo = {
            id: userData.id,
            first_name: userData.first_name ?? undefined,
            last_name: userData.last_name ?? undefined,
            profile_picture: undefined, // Set to undefined since column doesn't exist
          };
        }
      }

      // Determine if property should be hidden when sold/rented for more than 3 days
      const now = Date.now();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

      // Determine most relevant status and its timestamp (prefer detail.updated_at)
      const detailStatuses = propertyDetails
        .map((d: any) => ({
          status: (d.status || "").toString().toLowerCase(),
          updated_at: d.updated_at ? new Date(d.updated_at).getTime() : null,
        }))
        .filter(Boolean);

      // pick a status from details if present, else fall back to property.status
      const detailStatusEntry = detailStatuses.length
        ? detailStatuses[0]
        : null;
      const propStatus = (
        property.status || (detailStatusEntry ? detailStatusEntry.status : "")
      )
        .toString()
        .toLowerCase();

      // find latest updated_at among detail rows for sold/rented
      let latestStatusChangeAt: number | null = null;
      for (const ds of detailStatuses) {
        if ((ds.status === "sold" || ds.status === "rented") && ds.updated_at) {
          latestStatusChangeAt = Math.max(
            latestStatusChangeAt || 0,
            ds.updated_at!
          );
        }
      }

      // fallback to property.updated_at if available
      if (!latestStatusChangeAt && (property as any).updated_at) {
        latestStatusChangeAt = new Date((property as any).updated_at).getTime();
      }

      // If the property is sold/rented and the status change happened more than 3 days ago, skip it (hide from public listings)
      if (
        (propStatus === "sold" || propStatus === "rented") &&
        latestStatusChangeAt
      ) {
        const age = now - latestStatusChangeAt;
        if (age >= threeDaysMs) {
          dlog(
            `API: Hiding property ${property.id} (status ${propStatus}) as it passed 3-day grace period`
          );
          continue; // do not include this property in returned data
        }
      }

      // If sold/rented but within 3 days, attach expiryWarning (days left)
      let expiryWarning: string | undefined = undefined;
      if (
        (propStatus === "sold" || propStatus === "rented") &&
        latestStatusChangeAt
      ) {
        const age = now - latestStatusChangeAt;
        const msLeft = Math.max(0, threeDaysMs - age);
        const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
        const statusLabel = propStatus === "sold" ? "ขายไปแล้ว" : "เช่าไปแล้ว";
        expiryWarning = `ประกาศจะถูกลบในอีก ${daysLeft} วัน เนื่องจากประกาศนี้${statusLabel}`;
      }

      // สร้างข้อมูลที่สมบูรณ์
      completeData.push({
        ...property,
        property_details: propertyDetails,
        agent_info: agentInfo,
        user_info: userInfo,
        expiryWarning: expiryWarning as any,
      });
    }

    dlog(`API: รวบรวมข้อมูลสมบูรณ์แล้ว ${completeData.length} รายการ`);

    return NextResponse.json(
      {
        data: completeData,
        success: true,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          "CDN-Cache-Control": "public, s-maxage=300",
          "Vercel-CDN-Cache-Control": "public, s-maxage=300",
        },
      }
    );
  } catch (error) {
    console.error("API: เกิดข้อผิดพลาดที่ไม่คาดคิด:", error);
    dlog("API: ใช้ข้อมูล static แทน");
    return await getStaticFallbackData();
  }
}

// ✅ ฟังก์ชันสำหรับดึงข้อมูลแบบ fallback (ปรับปรุงแล้ว)
async function getFallbackData(client: unknown) {
  try {
    console.log("API Fallback: กำลังดึงข้อมูลแบบ batch");

    const supabase = client as SupabaseClientAdapter;

    // ดึงข้อมูลทั้งหมดพร้อมกัน
    const [propertiesResponse, detailsResponse, agentsResponse, usersResponse] =
      await Promise.all([
        supabase.from<SupabaseProperty>("properties").select("*"),
        supabase.from<PropertyDetail>("property_details").select("*"),
        supabase.from<Agent>("agens").select("*"),
        supabase.from<UserSummary>("users").select("id, first_name, last_name"),
      ]);

    const propertiesData = propertiesResponse.data ?? [];
    const detailsData = detailsResponse.data ?? [];
    const agentsData = agentsResponse.data ?? [];
    const usersData = usersResponse.data ?? [];

    if (propertiesResponse.error || propertiesData.length === 0) {
      console.error(
        "API Fallback: เกิดข้อผิดพลาดในการดึงข้อมูล properties:",
        propertiesResponse.error
      );
      return NextResponse.json(
        {
          error: propertiesResponse.error?.message || "No properties data",
          success: false,
        },
        { status: 500 }
      );
    }

    console.log(
      `API Fallback: ดึงข้อมูลสำเร็จ ${propertiesData.length} รายการ`
    );

    // สร้าง lookup maps
    const detailsMap = new Map<string, PropertyDetail>();
    const agentsMap = new Map<string, Agent>();
    const usersMap = new Map<string, UserSummary>();

    detailsData.forEach(detail => {
      detailsMap.set(detail.property_id, detail);
    });

    agentsData.forEach(agent => {
      agentsMap.set(agent.user_id, agent);
    });

    usersData.forEach(user => {
      usersMap.set(user.id, user);
    });

    // แปลงข้อมูลเป็น PropertyData
    const transformedData: ExtendedPropertyData[] = [];

    for (const property of propertiesData) {
      const detailData = detailsMap.get(property.id);

      if (!detailData) {
        console.log(
          `API Fallback: ไม่พบข้อมูลรายละเอียดสำหรับ property ID ${property.id}`
        );
        continue;
      }

      // ดึงข้อมูลตัวแทนและผู้ใช้ (ถ้ามี)
      const agentData = property.agent_id
        ? agentsMap.get(property.agent_id)
        : undefined;
      const userData = property.agent_id
        ? usersMap.get(property.agent_id)
        : undefined;

      // สร้าง PropertyData object
      transformedData.push({
        id: property.id,
        title:
          detailData.project_name ||
          property.property_category ||
          "Untitled Property",
        location:
          property.location?.address ||
          detailData.address ||
          "Unknown Location",
        price: detailData.price?.toLocaleString() || "0",
        isPricePerMonth: property.listing_type?.includes("เช่า"),
        details: {
          area: detailData.usable_area || 0,
          bedrooms: detailData.bedrooms || 0,
          bathrooms: detailData.bathrooms || 0,
          parking: detailData.parking_spaces || 0,
        },
        image: detailData.images?.[0] || "/placeholder.svg",
        isForRent: property.listing_type?.includes("เช่า"),
        isForSale: property.listing_type?.includes("ขาย"),
        isTopPick: false,
        description: detailData.description || "",
        highlight: detailData.highlight || "",
        facilities: detailData.facilities || [],
        projectFacilities: detailData.project_facilities || [],
        agent: userData
          ? {
              id: userData.id,
              first_name: userData.first_name ?? undefined,
              last_name: userData.last_name ?? undefined,
              profile_picture: undefined, // Set to undefined since column doesn't exist
              company_name: agentData?.company_name,
            }
          : undefined,
        agentInfo: agentData
          ? {
              companyName: agentData.company_name || "",
              licenseNumber: agentData.license_number || "",
              propertyTypes: agentData.property_types || [],
              serviceAreas:
                agentData.service_areas
                  ?.map((sa: AgentServiceArea) =>
                    [sa.district, sa.province].filter(Boolean).join(", ")
                  )
                  .filter(area => area.length > 0) || [],
            }
          : undefined,
      });
    }

    console.log(
      `API Fallback: แปลงข้อมูลสำเร็จ ${transformedData.length} รายการ`
    );

    return NextResponse.json({
      data: transformedData,
      success: true,
    });
  } catch (error) {
    console.error("API Fallback: เกิดข้อผิดพลาดที่ไม่คาดคิด:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 }
    );
  }
}

// ฟังก์ชันสำหรับส่งข้อมูล static เมื่อไม่สามารถเชื่อมต่อ Supabase ได้
async function getStaticFallbackData() {
  console.log("API: ใช้ข้อมูล static fallback");

  const staticProperties: ExtendedPropertyData[] = [
    {
      id: "static-1",
      title: "LUXURY CONDO",
      location: "สุขุมวิท - กรุงเทพฯ",
      price: "25,000",
      isPricePerMonth: true,
      details: {
        area: 750,
        bedrooms: 2,
        bathrooms: 2,
        parking: 1,
      },
      image: "/properties/new-property-1.jpg",
      isForRent: true,
      isTopPick: true,
      description: "คอนโดหรูในทำเลดี",
      highlight: "ใกล้ BTS อโศก",
      facilities: ["เฟอร์นิเจอร์", "เครื่องปรับอากาศ"],
      projectFacilities: ["สระว่ายน้ำ", "ฟิตเนส"],
      agentInfo: null,
    },
    {
      id: "static-2",
      title: "MODERN HOUSE",
      location: "ลาดพร้าว - กรุงเทพฯ",
      price: "8,500,000",
      isPricePerMonth: false,
      details: {
        area: 1200,
        bedrooms: 3,
        bathrooms: 3,
        parking: 2,
      },
      image: "/properties/sale-1.jpg",
      isForSale: true,
      isTopPick: true,
      description: "บ้านสไตล์โมเดิร์น",
      highlight: "พื้นที่กว้างขวาง",
      facilities: ["เฟอร์นิเจอร์บิวท์อิน"],
      projectFacilities: ["รปภ. 24 ชม."],
      agentInfo: null,
    },
  ];

  return NextResponse.json({
    data: staticProperties,
    success: true,
    source: "static",
  });
}
