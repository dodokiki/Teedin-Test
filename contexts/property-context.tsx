"use client";

import type { PropertyData } from "@/components/property/property-card";

import {
  makeLocalizedValue,
  normalizeLocalizedValue,
  pickLocalizedValue,
  type LocalizedValue,
  type SupportedLocale,
} from "@/lib/localization";
import { toCleanStringArray } from "@/lib/property-helpers";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

// Define a more specific type for the data expected from Supabase
// Define a more specific type for the data expected from Supabase
type SupabasePropertyRaw = {
  id: string;
  agent_id: string;
  listing_type: string[];
  property_category: string;
  in_project: boolean;
  rental_duration: string | null;
  location: { address?: string; lat?: number; lng?: number } | null;
  created_at: string;
  is_promoted?: boolean;
  boundary_coordinates?: any; // GeoJSON format
  property_details: Array<{
    project_name: string;
    address: string;
    usable_area: number;
    bedrooms: number;
    bathrooms: number;
    parking_spaces: number;
    house_condition: string;
    highlight: string;
    area_around: string;
    facilities: string[];
    project_facilities: string[];
    description: string;
    price: number;
    images: string[];
    view_count?: number;
    created_at: string;
    latitude?: number;
    longitude?: number;
    status?: string;
  }>;
  agent_info: {
    company_name: string;
    license_number: string;
    property_types: string[];
    service_areas: {
      province: string;
      district: string;
    }[];
  };
  user_info?: {
    id: string;
    first_name: string;
    last_name?: string;
    profile_picture?: string;
  };
};

// Helper to parse GeoJSON to Google Maps path
const parseBoundary = (
  boundary: any
): { lat: number; lng: number }[] | undefined => {
  if (!boundary || !boundary.coordinates) return undefined;

  // Log raw boundary for debugging
  if (process.env.NODE_ENV === "development") {
    // console.log("Parsing boundary:", JSON.stringify(boundary).substring(0, 200) + "...");
  }

  let coords: any[] | undefined = undefined;
  const rawCoords = boundary.coordinates;

  try {
    if (!Array.isArray(rawCoords) || rawCoords.length === 0) return undefined;

    // Determine depth and extract the outer ring
    // Depth 2: [[lng, lat], ...] -> It's already the path (LineString or simple Polygon ring)
    if (Array.isArray(rawCoords[0]) && typeof rawCoords[0][0] === "number") {
      coords = rawCoords;
    }
    // Depth 3: [[[lng, lat], ...], ...] -> Polygon (Array of Rings)
    else if (
      Array.isArray(rawCoords[0]) &&
      Array.isArray(rawCoords[0][0]) &&
      typeof rawCoords[0][0][0] === "number"
    ) {
      coords = rawCoords[0];
    }
    // Depth 4: [[[[lng, lat], ...], ...], ...] -> MultiPolygon (Array of Polygons)
    else if (
      Array.isArray(rawCoords[0]) &&
      Array.isArray(rawCoords[0][0]) &&
      Array.isArray(rawCoords[0][0][0]) &&
      typeof rawCoords[0][0][0][0] === "number"
    ) {
      coords = rawCoords[0][0];
    }

    // Safety check: coords should be an array of points (arrays)
    if (!Array.isArray(coords) || coords.length === 0) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "Boundary parsing failed: could not extract coords",
          JSON.stringify(rawCoords).substring(0, 100)
        );
      }
      return undefined;
    }

    // Check if the first element is an array (Point)
    if (!Array.isArray(coords[0])) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "Boundary parsing failed: first coord is not an array",
          coords[0]
        );
      }
      return undefined;
    }

    // GeoJSON is [lng, lat], Google Maps is { lat, lng }
    const path = coords
      .map((c: any) => {
        if (!Array.isArray(c) || c.length < 2) return null;
        const lng = Number(c[0]);
        const lat = Number(c[1]);
        if (isNaN(lat) || isNaN(lng)) return null;
        return { lat, lng };
      })
      .filter((p): p is { lat: number; lng: number } => p !== null);

    if (process.env.NODE_ENV === "development") {
      // console.log("Parsed path length:", path.length);
    }

    return path.length >= 3 ? path : undefined; // A polygon needs at least 3 points
  } catch (e) {
    console.error("Error parsing boundary:", e);
    return undefined;
  }
};

interface PropertyContextType {
  // All properties (ข้อมูลทั้งหมด)
  allNewProperties: PropertyData[];
  allRentalProperties: PropertyData[];
  allSaleProperties: PropertyData[];
  allProperties: PropertyData[]; // เพิ่มข้อมูลรวมทั้งหมด

  // Limited properties for homepage (ข้อมูลจำกัดสำหรับหน้า home)
  homeNewProperties: PropertyData[];
  homeRentalProperties: PropertyData[];
  homeSaleProperties: PropertyData[];

  isLoading: boolean;
  dataSource: "supabase" | "static";
  debugLogs: string[];

  // Functions
  refreshData: () => Promise<void>;
  clearCache: () => void;
  forceRefresh: () => Promise<void>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(
  undefined
);

export function PropertyProvider({ children }: { children: ReactNode }) {
  // ข้อมูลทั้งหมด (สำหรับหน้า all-properties)
  const [allNewProperties, setAllNewProperties] = useState<PropertyData[]>([]);
  const [allRentalProperties, setAllRentalProperties] = useState<
    PropertyData[]
  >([]);
  const [allSaleProperties, setAllSaleProperties] = useState<PropertyData[]>(
    []
  );
  const [allProperties, setAllProperties] = useState<PropertyData[]>([]); // เพิ่มข้อมูลรวมทั้งหมด

  // ข้อมูลจำกัดสำหรับหน้า home
  const [homeNewProperties, setHomeNewProperties] = useState<PropertyData[]>(
    []
  );
  const [homeRentalProperties, setHomeRentalProperties] = useState<
    PropertyData[]
  >([]);
  const [homeSaleProperties, setHomeSaleProperties] = useState<PropertyData[]>(
    []
  );

  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"supabase" | "static">(
    "supabase"
  );
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false); // เพิ่มตัวแปรเพื่อตรวจสอบว่าโหลดแล้วหรือยัง

  // ✅ เพิ่ม cache management และเพิ่ม cache duration
  const CACHE_KEY = "property-data-cache";
  const CACHE_EXPIRY_KEY = "property-data-cache-expiry";
  const CACHE_DURATION = 30 * 60 * 1000; // ✅ เพิ่มเป็น 30 นาทีเพื่อลด API calls

  const addDebugLog = (log: string) => {
    // ✅ ลด overhead จากการเก็บ logs เยอะเกินไป
    if (process.env.NODE_ENV === "development") {
      setDebugLogs(prev => {
        const newLogs = [...prev, `${new Date().toISOString()}: ${log}`];
        // เก็บแค่ 10 logs ล่าสุด
        return newLogs.slice(-10);
      });
    }
  };

  const DEFAULT_LOCALE: SupportedLocale = "th";

  const sanitizeText = (value?: string | null): string | null => {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const parseLocalizedStringField = (
    input: unknown,
    fallback: string
  ): { text: string; localized: LocalizedValue<string> } => {
    if (input && typeof input === "object" && !Array.isArray(input)) {
      const normalized = normalizeLocalizedValue<string>(
        input as LocalizedValue<string>
      );
      const text =
        pickLocalizedValue(normalized, DEFAULT_LOCALE, "th") ?? fallback;
      return { text, localized: normalized };
    }

    const sanitized = sanitizeText(typeof input === "string" ? input : null);
    const resolved = sanitized ?? fallback;
    return {
      text: resolved,
      localized: makeLocalizedValue(resolved, null, {
        detectedLanguage: "th",
        confidence: null,
        source: { th: "user" },
      }),
    };
  };

  const parseLocalizedListField = (
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

  // ฟังก์ชันสำหรับจัดการ cache
  const getCachedData = () => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);

      if (!cachedData || !cacheExpiry) {
        return null;
      }

      const now = Date.now();
      const expiryTime = parseInt(cacheExpiry);

      if (now > expiryTime) {
        // Cache หมดอายุ
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_EXPIRY_KEY);
        return null;
      }

      return JSON.parse(cachedData);
    } catch (error) {
      addDebugLog(`Error reading cache: ${error}`);
      return null;
    }
  };

  const setCachedData = (data: any) => {
    try {
      const expiryTime = Date.now() + CACHE_DURATION;
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_EXPIRY_KEY, expiryTime.toString());
      addDebugLog(
        `บันทึกข้อมูลลง cache สำเร็จ (หมดอายุใน ${CACHE_DURATION / 60000} นาที)`
      );
    } catch (error) {
      addDebugLog(`Error saving cache: ${error}`);
    }
  };

  const clearCache = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_EXPIRY_KEY);
      addDebugLog("ล้าง cache สำเร็จ");
    } catch (error) {
      addDebugLog(`Error clearing cache: ${error}`);
    }
  };

  const fetchProperties = async () => {
    // ตรวจสอบ cache ก่อน
    const cachedData = getCachedData();
    if (cachedData && hasLoadedOnce) {
      addDebugLog("ใช้ข้อมูลจาก cache");

      const allFromCache = cachedData.allProperties || [];
      const homeNewCached = cachedData.homeNewProperties || [];
      const homeNewResolved =
        homeNewCached.length > 0
          ? homeNewCached
          : [...allFromCache]
              .sort((a, b) => {
                const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return tB - tA;
              })
              .slice(0, 5);

      setAllNewProperties(cachedData.allNewProperties || []);
      setAllRentalProperties(cachedData.allRentalProperties || []);
      setAllSaleProperties(cachedData.allSaleProperties || []);
      setAllProperties(allFromCache);
      setHomeNewProperties(homeNewResolved);
      setHomeRentalProperties(cachedData.homeRentalProperties || []);
      setHomeSaleProperties(cachedData.homeSaleProperties || []);
      setDataSource(cachedData.dataSource || "supabase");

      setIsLoading(false);
      return;
    }

    // ถ้าโหลดแล้วและไม่มี cache ให้ข้ามการโหลดซ้ำ
    if (hasLoadedOnce && !cachedData) {
      addDebugLog("ข้อมูลถูกโหลดแล้ว ข้ามการโหลดซ้ำ");
      setIsLoading(false);
      return;
    }

    try {
      addDebugLog("เริ่มต้นการเชื่อมต่อกับ Supabase...");

      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        addDebugLog(`SUPABASE_URL มีค่าหรือไม่: ${!!supabaseUrl}`);
        addDebugLog(`SUPABASE_ANON_KEY มีค่าหรือไม่: ${!!supabaseKey}`);

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Supabase configuration is missing.");
        }
        // ใช้ shared Supabase client แทนการสร้างใหม่
        addDebugLog("สร้าง Supabase client สำเร็จ");
      } catch (configError: any) {
        addDebugLog(
          `เกิดข้อผิดพลาดในการตรวจสอบ config: ${configError.message}`
        );
        throw configError;
      }

      addDebugLog("กำลังดึงข้อมูลอสังหาริมทรัพย์ผ่าน API endpoint...");
      const response = await fetch("/api/get-properties");

      if (!response.ok) {
        const errorData = await response.json();
        addDebugLog(
          `API ส่งค่า error: ${errorData.error || response.statusText}`
        );
        throw new Error(errorData.error || "Failed to fetch data from API");
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        addDebugLog(`API ไม่สำเร็จ: ${result.error || "ไม่มีข้อมูล"}`);
        return await fallbackAndFetchSeparately();
      }

      const data = result.data;
      addDebugLog(
        `ดึงข้อมูลผ่าน API สำเร็จ จำนวน: ${data?.length || 0} รายการ`
      );

      if (!data || !Array.isArray(data) || data.length === 0) {
        addDebugLog(
          "ไม่พบข้อมูลจาก API endpoint กำลังลองดึงข้อมูลจากแต่ละตารางแยกกัน..."
        );
        return await fallbackAndFetchSeparately();
      }

      const rawProperties = data as SupabasePropertyRaw[];

      // ✅ ใช้ useMemo pattern สำหรับ transform ข้อมูล
      const transformedData = rawProperties
        .map(item => {
          if (
            !item.property_details ||
            !Array.isArray(item.property_details) ||
            item.property_details.length === 0
          ) {
            return null;
          }

          const detailsObject = item.property_details[0];
          const agentObject = item.agent_info;
          const userObject = item.user_info;

          // Fix listing type detection for both Thai and English
          const listingType = item.listing_type || [];
          const isForRent =
            listingType &&
            listingType.some(
              type =>
                type.toLowerCase().includes("rent") ||
                type.toLowerCase().includes("เช่า") ||
                type.toLowerCase().includes("lease")
            );
          const isForSale =
            listingType &&
            listingType.some(
              type =>
                type.toLowerCase().includes("sale") ||
                type.toLowerCase().includes("ขาย") ||
                type.toLowerCase().includes("sell")
            );
          // ✅ Fix price formatting (ลด overhead)
          const priceValue = detailsObject.price || 0;
          const formattedPrice =
            typeof priceValue === "number"
              ? priceValue.toLocaleString()
              : String(priceValue || 0);

          const fallbackTitle =
            sanitizeText(
              typeof detailsObject.project_name === "string"
                ? detailsObject.project_name
                : undefined
            ) ||
            sanitizeText(item.property_category) ||
            "Untitled Property";
          const titleField = parseLocalizedStringField(
            detailsObject.project_name,
            fallbackTitle
          );

          const fallbackAddress =
            sanitizeText(
              typeof item.location?.address === "string"
                ? item.location.address
                : undefined
            ) ||
            sanitizeText(
              typeof detailsObject.address === "string"
                ? detailsObject.address
                : undefined
            ) ||
            "Unknown Location";
          const addressField = parseLocalizedStringField(
            detailsObject.address ?? item.location?.address,
            fallbackAddress
          );

          const descriptionField = parseLocalizedStringField(
            detailsObject.description,
            "ไม่มีคำอธิบาย"
          );
          const highlightField = parseLocalizedStringField(
            detailsObject.highlight,
            "ไม่มีข้อมูลไฮไลท์"
          );
          const areaAroundField = parseLocalizedStringField(
            detailsObject.area_around,
            "ไม่มีข้อมูลพื้นที่ใกล้เคียง"
          );
          const houseConditionField = parseLocalizedStringField(
            detailsObject.house_condition,
            "ไม่ระบุ"
          );
          const facilitiesField = parseLocalizedListField(
            detailsObject.facilities,
            []
          );
          const projectFacilitiesField = parseLocalizedListField(
            detailsObject.project_facilities,
            []
          );

          const imagesList =
            Array.isArray(detailsObject.images) &&
            detailsObject.images.length > 0
              ? detailsObject.images
              : ["/placeholder.svg"];

          return {
            id: item.id,
            title: titleField.text,
            location: addressField.text,
            price: formattedPrice,
            isPricePerMonth: isForRent,
            details: {
              area: detailsObject.usable_area || 0,
              bedrooms: detailsObject.bedrooms || 0,
              bathrooms: detailsObject.bathrooms || 0,
              parking: detailsObject.parking_spaces || 0,
            },
            image: imagesList[0],
            images: imagesList,
            listing_type: listingType,
            property_category: item.property_category,
            isForRent,
            isForSale,
            isTopPick: item.is_promoted || false,
            description: descriptionField.text,
            highlight: highlightField.text,
            facilities: facilitiesField.list,
            projectFacilities: projectFacilitiesField.list,
            viewCount: detailsObject.view_count || 0,
            latitude: detailsObject.latitude || null,
            longitude: detailsObject.longitude || null,
            boundary_coordinates: parseBoundary(item.boundary_coordinates),
            status: detailsObject.status || undefined,
            houseCondition: houseConditionField.text,
            area_around: areaAroundField.text,
            localized: {
              title: titleField.localized,
              address: addressField.localized,
              description: descriptionField.localized,
              highlight: highlightField.localized,
              areaAround: areaAroundField.localized,
              facilities: facilitiesField.localized,
              projectFacilities: projectFacilitiesField.localized,
              houseCondition: houseConditionField.localized,
            },
            agent: userObject
              ? {
                  id: userObject.id,
                  first_name: userObject.first_name ?? undefined,
                  last_name: userObject.last_name ?? undefined,
                  profile_picture: userObject.profile_picture,
                  company_name: agentObject?.company_name,
                }
              : null,
            agentInfo: agentObject
              ? {
                  companyName: agentObject.company_name || "",
                  licenseNumber: agentObject.license_number || "",
                  propertyTypes: agentObject.property_types || [],
                  serviceAreas: Array.isArray(agentObject.service_areas)
                    ? agentObject.service_areas
                        ?.map((sa: any) =>
                          [sa.district, sa.province].filter(Boolean).join(", ")
                        )
                        .filter(Boolean)
                    : [],
                }
              : null,
            createdAt: detailsObject.created_at,
            in_project: item.in_project,
          } as PropertyData;
        })
        .filter(Boolean) as PropertyData[];

      addDebugLog(`แปลงข้อมูลแล้ว ${transformedData?.length || 0} รายการ`);
      if (transformedData && transformedData.length > 0) {
        // คำนวณวันที่ 2 เดือนที่ผ่านมา
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

        // กรองอสังหาใหม่ (2 เดือนล่าสุด) โดยใช้ created_at จาก property_details
        const newProperties = transformedData
          .filter(property => {
            const rawProperty = rawProperties.find(p => p.id === property.id);
            if (!rawProperty?.property_details?.[0]?.created_at) return false;

            const createdDate = new Date(
              rawProperty.property_details[0].created_at
            );
            return createdDate >= twoMonthsAgo;
          })
          .sort((a, b) => {
            const itemA = rawProperties.find(p => p.id === a.id);
            const itemB = rawProperties.find(p => p.id === b.id);
            const dateA = itemA?.property_details?.[0]?.created_at;
            const dateB = itemB?.property_details?.[0]?.created_at;
            return (
              new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime()
            );
          });

        const allRentProps = transformedData.filter(p => p.isForRent);
        const allSalesProps = transformedData.filter(p => p.isForSale);

        addDebugLog(
          `กรองอสังหาใหม่แล้ว: ${newProperties?.length || 0} รายการ จากทั้งหมด ${transformedData?.length || 0} รายการ`
        ); // ตั้งค่าข้อมูลทั้งหมด
        setAllNewProperties(newProperties); // ใช้ข้อมูลที่กรองแล้วสำหรับอสังหาใหม่
        setAllRentalProperties(allRentProps);
        setAllSaleProperties(allSalesProps);

        // ตั้งค่าข้อมูลรวมทั้งหมด (เรียงตาม viewCount จากมากไปน้อย, แล้วตาม created_at จากใหม่ไปเก่า)
        const allCombinedProperties = transformedData.sort((a, b) => {
          const viewCountA = a.viewCount || 0;
          const viewCountB = b.viewCount || 0;

          // เรียงตาม viewCount ก่อน
          if (viewCountB !== viewCountA) {
            return viewCountB - viewCountA;
          }

          // ถ้า viewCount เท่ากัน ให้เรียงตาม created_at (ใหม่ไปเก่า)
          const itemA = rawProperties.find(p => p.id === a.id);
          const itemB = rawProperties.find(p => p.id === b.id);
          const dateA = itemA?.property_details?.[0]?.created_at;
          const dateB = itemB?.property_details?.[0]?.created_at;

          return (
            new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime()
          );
        });
        setAllProperties(allCombinedProperties);

        // ตั้งค่าข้อมูลจำกัดสำหรับหน้า home (5 รายการ) — ถ้าไม่มีอสังหาใหม่ 2 เดือน ให้ใช้รายการล่าสุดจากทั้งหมด
        const homeNew =
          newProperties.length > 0
            ? newProperties.slice(0, 5)
            : [...allCombinedProperties]
                .sort((a, b) => {
                  const tA = a.createdAt
                    ? new Date(a.createdAt).getTime()
                    : 0;
                  const tB = b.createdAt
                    ? new Date(b.createdAt).getTime()
                    : 0;
                  return tB - tA;
                })
                .slice(0, 5);
        setHomeNewProperties(homeNew);
        setHomeRentalProperties(allRentProps.slice(0, 5));
        setHomeSaleProperties(allSalesProps.slice(0, 5));

        setDataSource("supabase");
        setHasLoadedOnce(true); // ทำเครื่องหมายว่าโหลดแล้ว

        // บันทึกข้อมูลลง cache
        const cacheData = {
          allNewProperties: newProperties,
          allRentalProperties: allRentProps,
          allSaleProperties: allSalesProps,
          allProperties: allCombinedProperties,
          homeNewProperties: homeNew,
          homeRentalProperties: allRentProps.slice(0, 5),
          homeSaleProperties: allSalesProps.slice(0, 5),
          dataSource: "supabase",
        };
        setCachedData(cacheData);
      } else {
        addDebugLog("ไม่มีข้อมูลหลังจากแปลงข้อมูล จะใช้ข้อมูลแบบ static แทน");
        fallbackToStaticData();
      }
    } catch (error: any) {
      addDebugLog(
        `เกิดข้อผิดพลาดที่ไม่คาดคิดใน fetchProperties: ${error.message}`
      );
      if (dataSource !== "static") fallbackToStaticData();
    } finally {
      setIsLoading(false);
    }
  };

  const fallbackAndFetchSeparately = async () => {
    addDebugLog("เริ่มต้นการดึงข้อมูลแบบ fallback (แยกตาราง)...");

    try {
      const response = await fetch("/api/get-properties?mode=fallback");

      if (!response.ok) {
        addDebugLog(`API fallback ไม่สำเร็จ: ${response.statusText}`);
        fallbackToStaticData();
        return;
      }

      const result = await response.json();

      if (
        !result.success ||
        !result.data ||
        !Array.isArray(result.data) ||
        result.data.length === 0
      ) {
        addDebugLog(
          `API fallback ไม่มีข้อมูล: ${result.error || "ไม่มีข้อมูล"}`
        );
        fallbackToStaticData();
        return;
      }

      const transformedData = result.data as PropertyData[];
      if (
        transformedData &&
        Array.isArray(transformedData) &&
        transformedData.length > 0
      ) {
        // คำนวณวันที่ 2 เดือนที่ผ่านมา สำหรับ fallback mode
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

        // สำหรับ fallback mode ให้ใช้ข้อมูลทั้งหมดเป็นอสังหาใหม่ (เนื่องจากไม่มี created_at)
        const newProperties = transformedData.slice(0, 10); // เอา 10 รายการแรกเป็นอสังหาใหม่
        const allRentProps = transformedData.filter(p => p.isForRent);
        const allSalesProps = transformedData.filter(p => p.isForSale);

        addDebugLog(
          `Fallback: ใช้ ${newProperties?.length || 0} รายการเป็นอสังหาใหม่`
        ); // ตั้งค่าข้อมูลทั้งหมด
        setAllNewProperties(newProperties);
        setAllRentalProperties(allRentProps);
        setAllSaleProperties(allSalesProps);

        // ตั้งค่าข้อมูลรวมทั้งหมด (เรียงตาม viewCount จากมากไปน้อย, แล้วตาม created_at จากใหม่ไปเก่า)
        const allCombinedProperties = transformedData.sort((a, b) => {
          const viewCountA = a.viewCount || 0;
          const viewCountB = b.viewCount || 0;

          // เรียงตาม viewCount ก่อน
          if (viewCountB !== viewCountA) {
            return viewCountB - viewCountA;
          }

          // ถ้า viewCount เท่ากัน ให้เรียงตาม created_at (ใหม่ไปเก่า)
          // Note: fallback mode อาจไม่มี created_at ใน rawProperties
          const dateA = (a as any).created_at;
          const dateB = (b as any).created_at;

          return (
            new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime()
          );
        });
        setAllProperties(allCombinedProperties);

        // ตั้งค่าข้อมูลจำกัดสำหรับหน้า home (5 รายการ)
        setHomeNewProperties(newProperties.slice(0, 5));
        setHomeRentalProperties(allRentProps.slice(0, 5));
        setHomeSaleProperties(allSalesProps.slice(0, 5));

        setDataSource("supabase");
        setHasLoadedOnce(true); // ทำเครื่องหมายว่าโหลดแล้ว

        // บันทึกข้อมูลลง cache สำหรับ fallback mode
        const cacheData = {
          allNewProperties: newProperties,
          allRentalProperties: allRentProps,
          allSaleProperties: allSalesProps,
          allProperties: allCombinedProperties,
          homeNewProperties: newProperties.slice(0, 5),
          homeRentalProperties: allRentProps.slice(0, 5),
          homeSaleProperties: allSalesProps.slice(0, 5),
          dataSource: "supabase",
        };
        setCachedData(cacheData);

        addDebugLog(
          "Fallback API: อัปเดต state ด้วยข้อมูลที่ดึงแบบแยกตารางแล้ว"
        );
      } else {
        addDebugLog(
          "Fallback API: ไม่มีข้อมูลหลังแปลงข้อมูล จะใช้ข้อมูล static"
        );
        fallbackToStaticData();
      }
    } catch (error: any) {
      addDebugLog(`Fallback API: เกิดข้อผิดพลาด: ${error.message}`);
      fallbackToStaticData();
    }
  };
  const fallbackToStaticData = () => {
    addDebugLog("ไม่พบข้อมูลจาก API และปิดการใช้งานข้อมูลจำลอง");

    // ตั้งค่าข้อมูลทั้งหมดเป็นอาเรย์ว่าง
    setAllNewProperties([]);
    setAllRentalProperties([]);
    setAllSaleProperties([]);
    setAllProperties([]);

    // ตั้งค่าข้อมูลจำกัดสำหรับหน้า home เป็นอาเรย์ว่าง
    setHomeNewProperties([]);
    setHomeRentalProperties([]);
    setHomeSaleProperties([]);

    setDataSource("static"); // หรืออาจจะเปลี่ยนเป็น "empty" หรือ "supabase" ก็ได้ แต่ "static" เดิมใช้สื่อถึง fallback
    setHasLoadedOnce(true); // ทำเครื่องหมายว่าโหลดแล้ว
  };

  const forceRefresh = async () => {
    addDebugLog("Force refresh - ล้าง cache ทันทีและดึงข้อมูลใหม่");

    // ล้าง cache ทันที
    clearCache();

    setHasLoadedOnce(false);
    setIsLoading(true);

    // ดึงข้อมูลใหม่ทันที
    await fetchProperties();
  };

  const refreshData = async () => {
    addDebugLog("รีเฟรชข้อมูล - ล้าง cache และดึงข้อมูลใหม่");

    // ล้าง cache
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_EXPIRY_KEY);
      addDebugLog("ล้าง cache สำเร็จ");
    } catch (error) {
      addDebugLog(`Error clearing cache: ${error}`);
    }

    setHasLoadedOnce(false); // รีเซ็ตการโหลด
    setIsLoading(true);
    await fetchProperties();
  };

  useEffect(() => {
    // ✅ ลดเวลาในการโหลดครั้งแรก - ใช้ requestIdleCallback หากรองรับ
    if (!hasLoadedOnce) {
      addDebugLog("เรียก API เพื่อดึงข้อมูลใหม่ (ตาม TTL cache)");

      // ✅ ใช้ requestIdleCallback เพื่อไม่ block UI
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        const idleCallback = window.requestIdleCallback(() => {
          fetchProperties();
        });
        return () => window.cancelIdleCallback(idleCallback);
      } else {
        // Fallback สำหรับ browser ที่ไม่รองรับ
        const timer = setTimeout(() => {
          fetchProperties();
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, []);
  const value: PropertyContextType = {
    allNewProperties,
    allRentalProperties,
    allSaleProperties,
    allProperties,
    homeNewProperties,
    homeRentalProperties,
    homeSaleProperties,
    isLoading,
    dataSource,
    debugLogs,
    refreshData,
    clearCache,
    forceRefresh,
  };

  return (
    <PropertyContext.Provider value={value}>
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error("useProperty must be used within a PropertyProvider");
  }
  return context;
}
