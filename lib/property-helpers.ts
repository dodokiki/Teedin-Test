import {
  makeLocalizedValue,
  normalizeLocalizedValue,
  pickLocalizedValue,
  type LocalizedValue,
  type SupportedLocale,
} from "@/lib/localization";
import type { ReactNode } from "react";

export type NullableString = string | null | undefined;
export type NullableLocalizedString =
  | LocalizedValue<string>
  | string
  | null
  | undefined;
export type StringArrayInput = string[] | string | null | undefined;
export type LocalizedStringArrayInput =
  | LocalizedValue<string[]>
  | string[]
  | string
  | null
  | undefined;

const sanitizeText = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const ensureLocalizedStringValue = (
  input: NullableLocalizedString,
  fallback: string | null = null
): LocalizedValue<string> => {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const normalized = normalizeLocalizedValue<string>(
      input as LocalizedValue<string>
    );
    if (!normalized.th && fallback) {
      normalized.th = fallback;
    }
    return normalized;
  }

  const base = sanitizeText(
    typeof input === "string" ? (input as string) : fallback
  );

  if (base) {
    return makeLocalizedValue(base, null, {
      detectedLanguage: "th",
      confidence: null,
      source: { th: "user" },
    });
  }

  return makeLocalizedValue<string>(null, null, {
    detectedLanguage: "unknown",
    confidence: null,
    source: { th: "user" },
  });
};

const ensureLocalizedListValue = (
  input: LocalizedStringArrayInput,
  fallback: string[] = []
): LocalizedValue<string[]> => {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const normalized = normalizeLocalizedValue<string[] | string>(
      input as LocalizedValue<string[] | string>
    );
    const thValue = Array.isArray(normalized.th)
      ? normalized.th
      : typeof normalized.th === "string"
        ? toCleanStringArray(normalized.th)
        : undefined;
    const enValue = Array.isArray(normalized.en)
      ? normalized.en
      : typeof normalized.en === "string"
        ? toCleanStringArray(normalized.en)
        : undefined;
    return {
      th:
        thValue && thValue.length ? thValue : fallback.length ? fallback : null,
      en: enValue && enValue.length ? enValue : null,
      meta: normalized.meta,
    };
  }

  if (Array.isArray(input)) {
    const cleaned = input
      .filter((item): item is string => typeof item === "string")
      .map(item => item.trim())
      .filter(Boolean);
    return makeLocalizedValue(cleaned.length ? cleaned : null, null, {
      detectedLanguage: "th",
      confidence: null,
      source: { th: "user" },
    });
  }

  if (typeof input === "string") {
    const parsed = toCleanStringArray(input);
    return makeLocalizedValue(parsed.length ? parsed : null, null, {
      detectedLanguage: "th",
      confidence: null,
      source: { th: "user" },
    });
  }

  return makeLocalizedValue(fallback.length ? fallback : null, null, {
    detectedLanguage: "th",
    confidence: null,
    source: { th: "user" },
  });
};

const pickLocalizedString = (
  value: LocalizedValue<string>,
  locale: SupportedLocale = "th"
): string => {
  const selected = pickLocalizedValue(value, locale, "th");
  return selected ?? "";
};

export interface PropertyDetailRow {
  property_id: string;
  project_name: NullableLocalizedString;
  address: NullableLocalizedString;
  usable_area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  latitude: number | null;
  longitude: number | null;
  house_condition: NullableLocalizedString;
  highlight: NullableLocalizedString;
  area_around: NullableLocalizedString;
  description: NullableLocalizedString;
  facilities: LocalizedStringArrayInput;
  project_facilities: LocalizedStringArrayInput;
  images: StringArrayInput;
  price: number | null;
  view_count: number | null;
  status: NullableString;
  created_at: NullableString;
  properties?: {
    listing_type: StringArrayInput;
  } | null;
}

export interface PropertyAgentRow {
  id: string;
  first_name?: NullableString;
  last_name?: NullableString;
  email?: NullableString;
  profile_picture?: NullableString;
}

export interface PropertyWithRelations {
  id: string;
  property_category: NullableString;
  rent_duration: NullableString;
  view_count: number | null;
  listing_type?: string[] | null;
  property_details: PropertyDetailRow[] | PropertyDetailRow | null;
  users?: PropertyAgentRow | PropertyAgentRow[] | null;
}

export interface PropertyDetails {
  area: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
}

export interface PropertyData {
  id: string;
  property_id: string;
  title: string;
  location: string;
  price: string;
  numericPrice: number;
  isPricePerMonth: boolean;
  details: PropertyDetails;
  image: string;
  images: string[];
  listingTypes: string[];
  isForRent: boolean;
  isForSale: boolean;
  isTopPick: boolean;
  description: string;
  highlight: string;
  facilities: string[];
  projectFacilities: string[];
  viewCount: number;
  houseCondition: string;
  createdAt?: string;
  status?: string;
  usable_area: number;
  parking_spaces: number;
  latitude?: number;
  longitude?: number;
  area_around: string;
  agent?: {
    id: string;
    first_name?: NullableString;
    last_name?: NullableString;
    profile_picture?: NullableString;
    email?: NullableString;
  } | null;
  localized?: {
    title: LocalizedValue<string>;
    address: LocalizedValue<string>;
    description: LocalizedValue<string>;
    highlight: LocalizedValue<string>;
    areaAround: LocalizedValue<string>;
    facilities: LocalizedValue<string[]>;
    projectFacilities: LocalizedValue<string[]>;
    houseCondition: LocalizedValue<string>;
  };
}

const PLACEHOLDER_IMAGE = "/placeholder.svg";

// ✅ เพิ่ม memoization cache สำหรับ string parsing
const stringArrayCache = new Map<string, string[]>();
const MAX_CACHE_SIZE = 1000;

export const toCleanStringArray = (
  value: LocalizedStringArrayInput
): string[] => {
  if (!value) {
    return [];
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const normalized = normalizeLocalizedValue<string[] | string>(
      value as LocalizedValue<string[] | string>
    );
    if (Array.isArray(normalized.th)) {
      return normalized.th.filter(item => typeof item === "string");
    }
    if (typeof normalized.th === "string") {
      return toCleanStringArray(normalized.th);
    }
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map(item => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    // ✅ Check cache ก่อน
    if (stringArrayCache.has(trimmed)) {
      return stringArrayCache.get(trimmed)!;
    }

    let result: string[];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        result = toCleanStringArray(parsed);
      } else {
        result = [trimmed];
      }
    } catch {
      // fall through to manual parsing
      const stripped = trimmed.replace(/[\{\}\[\]"]/g, "");
      const parts = stripped
        .split(",")
        .map(part => part.trim())
        .filter(Boolean);
      result = parts && parts.length > 0 ? parts : [trimmed];
    }

    // ✅ เก็บใน cache (ถ้ายังไม่เต็ม)
    if (stringArrayCache.size < MAX_CACHE_SIZE) {
      stringArrayCache.set(trimmed, result);
    }

    return result;
  }

  return [];
};

export const getPrimaryDetail = (
  details: PropertyDetailRow[] | PropertyDetailRow | null | undefined
): PropertyDetailRow | undefined => {
  if (!details) {
    return undefined;
  }

  if (Array.isArray(details)) {
    return details[0];
  }

  return details;
};

const deriveListingTypes = (
  listingTypeSource: StringArrayInput,
  status: NullableString
) => {
  const listingTypes = toCleanStringArray(listingTypeSource).map(type =>
    type.toLowerCase()
  );

  const statusLower = (status ?? "").toLowerCase();

  const isForRent =
    listingTypes.some(type => type.includes("rent") || type.includes("เช่า")) ||
    ["for_rent", "rent", "เช่า"].includes(statusLower);

  const isForSale =
    listingTypes.some(type => type.includes("sale") || type.includes("ขาย")) ||
    ["for_sale", "sale", "ขาย"].includes(statusLower);

  let derivedStatus: string | undefined;
  if (
    listingTypes.some(type => type.includes("sold") || type.includes("ขายแล้ว"))
  ) {
    derivedStatus = "sold";
  } else if (
    listingTypes.some(
      type => type.includes("rented") || type.includes("เช่าแล้ว")
    )
  ) {
    derivedStatus = "rented";
  }

  return {
    listingTypes,
    isForRent,
    isForSale,
    derivedStatus,
  } as const;
};

const ensureImages = (images: StringArrayInput): string[] => {
  const list = toCleanStringArray(images);
  return list && list.length > 0 ? list : [PLACEHOLDER_IMAGE];
};

const formatPriceTHB = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0 ฿";
  }
  return `${value.toLocaleString("th-TH")} ฿`;
};

const extractAgent = (
  agentInput: PropertyAgentRow | PropertyAgentRow[] | null | undefined
) => {
  if (!agentInput) {
    return null;
  }
  if (Array.isArray(agentInput)) {
    return extractAgent(agentInput[0]);
  }
  return {
    id: agentInput.id,
    first_name: agentInput.first_name,
    last_name: agentInput.last_name,
    profile_picture: agentInput.profile_picture,
    email: agentInput.email,
  };
};

const buildPropertyData = (
  id: string,
  detail: PropertyDetailRow,
  listingSource: StringArrayInput,
  status: NullableString,
  overrides?: Partial<Pick<PropertyData, "viewCount" | "agent">>,
  locale: SupportedLocale = "th"
): PropertyData => {
  const listingMeta = deriveListingTypes(listingSource, status);
  const images = ensureImages(detail.images);
  const numericPrice = typeof detail.price === "number" ? detail.price : 0;

  const localizedTitle = ensureLocalizedStringValue(detail.project_name);
  const localizedAddress = ensureLocalizedStringValue(detail.address);
  const localizedDescription = ensureLocalizedStringValue(detail.description);
  const localizedHighlight = ensureLocalizedStringValue(detail.highlight);
  const localizedAreaAround = ensureLocalizedStringValue(detail.area_around);
  const localizedHouseCondition = ensureLocalizedStringValue(
    detail.house_condition
  );
  const localizedFacilities = ensureLocalizedListValue(detail.facilities);
  const localizedProjectFacilities = ensureLocalizedListValue(
    detail.project_facilities
  );

  const titleFallback =
    pickLocalizedString(localizedTitle, locale) ||
    pickLocalizedString(localizedDescription, locale) ||
    "ไม่ระบุชื่อโครงการ";
  const addressFallback =
    pickLocalizedString(localizedAddress, locale) || "ไม่ระบุที่อยู่";
  const descriptionFallback =
    pickLocalizedString(localizedDescription, locale) || "ไม่มีคำอธิบาย";
  const highlightFallback =
    pickLocalizedString(localizedHighlight, locale) || "ไม่มีข้อมูลไฮไลท์";
  const areaAroundFallback =
    pickLocalizedString(localizedAreaAround, locale) ||
    "ไม่มีข้อมูลพื้นที่ใกล้เคียง";
  const houseConditionFallback =
    pickLocalizedString(localizedHouseCondition, locale) || "ไม่ระบุ";

  return {
    id,
    property_id: detail.property_id || id,
    title: titleFallback,
    location: addressFallback,
    price: formatPriceTHB(numericPrice),
    numericPrice,
    isPricePerMonth: listingMeta.isForRent,
    details: {
      area: detail.usable_area ?? 0,
      bedrooms: detail.bedrooms ?? 0,
      bathrooms: detail.bathrooms ?? 0,
      parking: detail.parking_spaces ?? 0,
    },
    image: images[0] ?? PLACEHOLDER_IMAGE,
    images,
    listingTypes: listingMeta.listingTypes,
    isForRent: listingMeta.isForRent,
    isForSale: listingMeta.isForSale,
    isTopPick: false,
    description: descriptionFallback,
    highlight: highlightFallback,
    facilities: localizedFacilities.th ?? [],
    projectFacilities: localizedProjectFacilities.th ?? [],
    viewCount: overrides?.viewCount ?? detail.view_count ?? 0,
    houseCondition: houseConditionFallback,
    createdAt: detail.created_at ?? undefined,
    status: listingMeta.derivedStatus ?? status ?? undefined,
    usable_area: detail.usable_area ?? 0,
    parking_spaces: detail.parking_spaces ?? 0,
    latitude: detail.latitude ?? undefined,
    longitude: detail.longitude ?? undefined,
    area_around: areaAroundFallback,
    agent: overrides?.agent ?? null,
    localized: {
      title: localizedTitle,
      address: localizedAddress,
      description: localizedDescription,
      highlight: localizedHighlight,
      areaAround: localizedAreaAround,
      facilities: localizedFacilities,
      projectFacilities: localizedProjectFacilities,
      houseCondition: localizedHouseCondition,
    },
  };
};

export const mapPropertyDetailRow = (row: PropertyDetailRow): PropertyData => {
  const detail = row;
  const propertiesListing = row.properties?.listing_type;
  return buildPropertyData(
    row.property_id,
    detail,
    propertiesListing,
    row.status
  );
};

export const transformPropertyWithRelations = (
  property: PropertyWithRelations
): PropertyData => {
  const detail =
    getPrimaryDetail(property.property_details) ??
    ({
      property_id: property.id,
      project_name: property.property_category,
      address: null,
      usable_area: null,
      bedrooms: null,
      bathrooms: null,
      parking_spaces: null,
      latitude: null,
      longitude: null,
      house_condition: null,
      highlight: null,
      area_around: null,
      description: null,
      facilities: null,
      project_facilities: null,
      images: null,
      price: null,
      view_count: property.view_count,
      status: null,
      created_at: null,
      properties: null,
    } as PropertyDetailRow);

  const listingSource =
    property.listing_type ?? detail.properties?.listing_type;

  return buildPropertyData(property.id, detail, listingSource, detail.status, {
    viewCount: property.view_count ?? detail.view_count ?? 0,
    agent: extractAgent(property.users),
  });
};

export type PropertyMapMarker = Pick<
  PropertyData,
  | "id"
  | "title"
  | "location"
  | "price"
  | "isPricePerMonth"
  | "details"
  | "images"
  | "viewCount"
  | "isForRent"
  | "isForSale"
  | "listingTypes"
  | "latitude"
  | "longitude"
> & {
  listing_type?: string[];
};

export interface MarkerEvent {
  latLng: { lat: () => number; lng: () => number };
  domEvent?: Pick<Event, "stopPropagation" | "preventDefault"> & {
    stop?: () => void;
  };
}

export interface GoogleMapLike {
  setCenter: (latLng: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
  addListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

export type MarkerFactory = (options: {
  position: { lat: number; lng: number };
  map: GoogleMapLike;
  icon?: unknown;
}) => unknown;

export type MapClickHandler = (property: PropertyData) => void;

export type PopupRenderer = (property: PropertyData) => ReactNode;
