"use client";

import FilterPanel from "@/components/property/FilterPanel";
import {
  PropertyCard,
  PropertyData,
} from "@/components/property/property-card";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import {
  getPrimaryDetail,
  toCleanStringArray,
  type NullableString,
  type PropertyDetailRow,
  type PropertyWithRelations,
} from "@/lib/property-helpers";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle,
  Edit,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmailCustomerDialog } from "../../../components/popup/email-customer-dialog";
import { Update3MLandForm } from "../../../components/popup/update-3m-land-form";
import { Update3MRentForm } from "../../../components/popup/update-3m-rent-form";
import { View3MLandForm } from "../../../components/popup/view-3m-land-form";
import { View3MRentForm } from "../../../components/popup/view-3m-rent-form";

type FilterState = {
  types: Set<string>;
  actions: Set<string>;
  priceMax: number;
};

interface AgentInfo {
  id: string;
  first_name: NullableString;
  last_name: NullableString;
  profile_picture: NullableString;
}

type PropertyRow = PropertyWithRelations & {
  agent_id?: string | null;
  title?: NullableString;
  address?: NullableString;
  latitude?: number | null;
  longitude?: number | null;
  images?: string[] | null;
  created_at?: string | null;
  property_details: PropertyDetailRow | PropertyDetailRow[] | null;
  users: AgentInfo | null; // Fetched via foreign key relationship
  [key: string]: unknown;
};

interface CustomerUser {
  id: string;
  first_name?: NullableString;
  last_name?: NullableString;
  phone?: NullableString;
  email?: NullableString;
}

interface NegotiationRow {
  id: string;
  property_id: string | null;
  agent_id: string | null;
  customer_id: string | null;
  status?: NullableString;
  card_status?: NullableString;
  created_at?: NullableString;
  negotiation_reason?: NullableString;
  offered_price?: number | null;
  rejection_reason?: NullableString;
  customer_name?: NullableString;
  customer_phone?: NullableString;
  customer_email?: NullableString;
  properties: PropertyRow | null;
  [key: string]: unknown;
}

type NegotiationWithUser = NegotiationRow & {
  customer_user: CustomerUser | null;
};

interface AppointmentRow {
  id: string;
  property_id: string | null;
  agent_id: string | null;
  customer_id: string | null;
  status?: NullableString;
  appointment_date?: NullableString;
  buyer?: NullableString;
  seller?: NullableString;
  notes?: NullableString;
  created_at?: NullableString;
  updated_at?: NullableString;
  customer_name?: NullableString;
  customer_phone?: NullableString;
  customer_email?: NullableString;
  properties: PropertyRow | null;
  [key: string]: unknown;
}

type AppointmentWithUser = AppointmentRow & {
  customer_user: CustomerUser | null;
};

const formatAppointmentDate = (input: NullableString): string => {
  if (!input) {
    return "-";
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  const datePart = date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timePart = date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} ${timePart}`;
};

const resolveLocalizedString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "object" && value !== null) {
    // Prefer Thai, then English
    if (
      "th" in value &&
      typeof (value as any).th === "string" &&
      (value as any).th.trim().length > 0
    ) {
      return (value as any).th.trim();
    }
    if (
      "en" in value &&
      typeof (value as any).en === "string" &&
      (value as any).en.trim().length > 0
    ) {
      return (value as any).en.trim();
    }
  }
  return null;
};

const isTextMatch = (text: unknown, query: string): boolean => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }
  if (text == null) {
    return false;
  }
  const normalizedText = String(text).toLowerCase();
  return normalizedText.includes(normalizedQuery);
};

const matchesSearch = (
  detail: PropertyDetailRow | undefined,
  property: PropertyRow,
  query: string
): boolean => {
  if (!query.trim()) {
    return true;
  }
  const candidates = [
    detail?.project_name,
    detail?.description,
    property.property_category,
    property.title,
  ];
  return candidates.some(candidate => isTextMatch(candidate, query));
};

const ACTION_KEYWORDS = {
  sale: ["sale", "ขาย"],
  rent: ["rent", "เช่า"],
} as const;

const TYPE_KEYWORDS = {
  condo: ["condo", "คอนโด"],
  house: ["house", "บ้าน"],
  office: ["office", "สำนักงาน"],
  land: ["land", "ที่ดิน"],
  townhouse: ["townhouse", "ทาวน์เฮาส์"],
} as const;

const normalizeFilterValues = (values: Set<string>): Set<string> =>
  new Set(
    Array.from(values)
      .map(value => value.trim().toLowerCase())
      .filter(Boolean)
  );

const setHasKeyword = (
  normalizedValues: Set<string>,
  keywords: readonly string[]
): boolean => keywords.some(keyword => normalizedValues.has(keyword));

const includesKeyword = (
  value: string,
  keywords: readonly string[]
): boolean => {
  const normalizedValue = value.toLowerCase();
  return keywords.some(keyword => normalizedValue.includes(keyword));
};

const listIncludesKeyword = (
  list: string[],
  keywords: readonly string[]
): boolean => list.some(entry => includesKeyword(entry, keywords));

const propertyMatchesFilters = (
  property: PropertyRow | null | undefined,
  filterState: FilterState,
  query: string
): boolean => {
  if (!property) {
    return false;
  }

  const detail = getPrimaryDetail(property.property_details);
  const listingTypesRaw = toCleanStringArray(
    property.listing_type ?? detail?.properties?.listing_type ?? null
  );
  const listingTypes = listingTypesRaw.map(type => type.toLowerCase());
  const category = String(property.property_category ?? "").toLowerCase();
  const priceValue = typeof detail?.price === "number" ? detail.price : 0;
  const normalizedActions = normalizeFilterValues(filterState.actions);
  const normalizedTypes = normalizeFilterValues(filterState.types);

  const wantsSale = setHasKeyword(normalizedActions, ACTION_KEYWORDS.sale);
  const wantsRent = setHasKeyword(normalizedActions, ACTION_KEYWORDS.rent);
  const hasSale = listIncludesKeyword(listingTypes, ACTION_KEYWORDS.sale);
  const hasRent = listIncludesKeyword(listingTypes, ACTION_KEYWORDS.rent);
  const actionOk =
    (!wantsSale && !wantsRent) ||
    (wantsSale && hasSale) ||
    (wantsRent && hasRent);

  const wantCondo = setHasKeyword(normalizedTypes, TYPE_KEYWORDS.condo);
  const wantHouse = setHasKeyword(normalizedTypes, TYPE_KEYWORDS.house);
  const wantOffice = setHasKeyword(normalizedTypes, TYPE_KEYWORDS.office);
  const wantLand = setHasKeyword(normalizedTypes, TYPE_KEYWORDS.land);
  const wantTownhouse = setHasKeyword(normalizedTypes, TYPE_KEYWORDS.townhouse);

  const isCondo = includesKeyword(category, TYPE_KEYWORDS.condo);
  const isHouse = includesKeyword(category, TYPE_KEYWORDS.house);
  const isOffice = includesKeyword(category, TYPE_KEYWORDS.office);
  const isLand = includesKeyword(category, TYPE_KEYWORDS.land);
  const isTownhouse = includesKeyword(category, TYPE_KEYWORDS.townhouse);

  const typeOk =
    normalizedTypes.size === 0 ||
    (wantCondo && isCondo) ||
    (wantHouse && isHouse) ||
    (wantOffice && isOffice) ||
    (wantLand && isLand) ||
    (wantTownhouse && isTownhouse);

  const priceOk = priceValue <= filterState.priceMax;
  const searchOk = matchesSearch(detail, property, query);

  const result = actionOk && typeOk && priceOk && searchOk;

  if (!result) {
    console.log("🔍 Property filtered out:", {
      id: property.id,
      category: property.property_category,
      actionOk,
      typeOk,
      priceOk,
      searchOk,
      filterState,
      query,
      listingTypes,
      priceValue,
      priceMax: filterState.priceMax,
      detail: detail
        ? {
            price: detail.price,
            project_name: detail.project_name,
          }
        : null,
    });
  }

  return result;
};

const ensureTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const createPropertyData = (
  property: PropertyRow | null | undefined,
  fallbackId: string,
  agentId: string | null | undefined,
  t: (key: string) => string
): PropertyData => {
  const detail = property
    ? getPrimaryDetail(property.property_details)
    : undefined;
  const listingSource =
    property?.listing_type ?? detail?.properties?.listing_type ?? null;
  const listingTypes = toCleanStringArray(listingSource);
  const listingTypesLower = listingTypes.map(type => type.toLowerCase());
  const images = detail ? toCleanStringArray(detail.images) : [];
  const locationCandidate =
    resolveLocalizedString(detail?.address) ??
    ensureTrimmedString(property?.address) ??
    ensureTrimmedString(property?.property_category);

  const viewCount =
    detail?.view_count ??
    (typeof property?.view_count === "number" ? property.view_count : 0);

  const titleCandidate =
    resolveLocalizedString(detail?.project_name) ??
    ensureTrimmedString(property?.property_category) ??
    resolveLocalizedString(detail?.description) ??
    "-";

  const agentData = property?.users;

  return {
    id: fallbackId,
    title: titleCandidate,
    location: locationCandidate ?? "-",
    price:
      detail?.price != null && detail.price > 0
        ? `${detail.price.toLocaleString("th-TH")} ฿`
        : "-",
    isPricePerMonth: listIncludesKeyword(
      listingTypesLower,
      ACTION_KEYWORDS.rent
    ),
    details: {
      area: detail?.usable_area ?? 0,
      bedrooms: detail?.bedrooms ?? 0,
      bathrooms: detail?.bathrooms ?? 0,
      parking: detail?.parking_spaces ?? 0,
    },
    image: images.length > 0 ? images[0] : "/placeholder.svg",
    listing_type: listingTypes,
    isForRent: listIncludesKeyword(listingTypesLower, ACTION_KEYWORDS.rent),
    isForSale:
      listIncludesKeyword(listingTypesLower, ACTION_KEYWORDS.sale) ||
      listingTypesLower.length === 0,
    isTopPick: false, // This might be another field to add if needed
    description:
      resolveLocalizedString(detail?.description) ??
      t("listing_no_description"),
    highlight:
      resolveLocalizedString(detail?.highlight) ?? t("listing_no_highlight"),
    facilities: detail ? toCleanStringArray(detail.facilities) : [],
    projectFacilities: detail
      ? toCleanStringArray(detail.project_facilities)
      : [],
    viewCount,
    latitude: detail?.latitude ?? property?.latitude ?? undefined,
    longitude: detail?.longitude ?? property?.longitude ?? undefined,
    status: detail?.status ?? undefined,
    createdAt: property?.created_at ?? undefined,
    houseCondition:
      resolveLocalizedString((detail as any)?.house_condition) ??
      t("step4_not_specified"),
    area_around:
      resolveLocalizedString((detail as any)?.area_around) ??
      t("listing_no_nearby_info"),
    agent: agentData
      ? {
          id: agentData.id,
          first_name: agentData.first_name ?? undefined,
          last_name: agentData.last_name ?? undefined,
          profile_picture: agentData.profile_picture ?? undefined,
        }
      : agentId
        ? { id: agentId }
        : undefined,
  };
};

const buildListingsData = (
  properties: PropertyRow[],
  filterState: FilterState,
  query: string,
  t: (key: string) => string
): PropertyData[] => {
  console.log("🔍 Building listings data:", {
    totalProperties: properties.length,
    filterState,
    query,
  });

  const filtered = properties.filter(property => {
    const matches = propertyMatchesFilters(property, filterState, query);
    if (!matches) {
      console.log(
        "❌ Property filtered out:",
        property.id,
        property.property_category
      );
    }
    return matches;
  });

  console.log("✅ Properties after filtering:", filtered.length);

  return filtered.map(property =>
    createPropertyData(property, property.id, property.agent_id, t)
  );
};

const filterNegotiations = (
  items: NegotiationWithUser[],
  filterState: FilterState,
  query: string
): NegotiationWithUser[] =>
  items.filter(item =>
    propertyMatchesFilters(item.properties, filterState, query)
  );

const filterAppointments = (
  items: AppointmentWithUser[],
  filterState: FilterState,
  query: string
): AppointmentWithUser[] =>
  items.filter(item =>
    propertyMatchesFilters(item.properties, filterState, query)
  );

const mapCustomerUser = (
  user: CustomerUser | null
): PropertyData["customer_user"] => {
  if (!user || !user.id) {
    return undefined;
  }
  return {
    id: user.id,
    first_name: user.first_name ?? undefined,
    last_name: user.last_name ?? undefined,
    phone: user.phone ?? undefined,
    email: user.email ?? undefined,
  };
};

const createNegotiationProperty = (
  negotiation: NegotiationWithUser,
  t: (key: string) => string
): PropertyData => {
  const propertyId =
    negotiation.properties?.id ?? negotiation.property_id ?? negotiation.id;
  const propertyData = createPropertyData(
    negotiation.properties,
    propertyId,
    negotiation.agent_id,
    t
  );

  const negotiationEntry = {
    id: negotiation.id,
    property_id: negotiation.property_id ?? undefined,
    customer_id: negotiation.customer_id ?? undefined,
    agent_id: negotiation.agent_id ?? undefined,
    offered_price: negotiation.offered_price ?? undefined,
    negotiation_reason: negotiation.negotiation_reason ?? undefined,
    created_at: negotiation.created_at ?? undefined,
    status: negotiation.status ?? undefined,
    rejection_reason: negotiation.rejection_reason ?? undefined,
    customer_name: negotiation.customer_name ?? undefined,
    customer_phone: negotiation.customer_phone ?? undefined,
    customer_email: negotiation.customer_email ?? undefined,
  };

  return {
    ...propertyData,
    negotiations: [negotiationEntry],
    customer_user: mapCustomerUser(negotiation.customer_user),
  };
};

const createAppointmentProperty = (
  appointment: AppointmentWithUser,
  t: (key: string) => string
): PropertyData => {
  const propertyId =
    appointment.properties?.id ?? appointment.property_id ?? appointment.id;
  const propertyData = createPropertyData(
    appointment.properties,
    propertyId,
    appointment.agent_id,
    t
  );

  const appointmentEntry = {
    id: appointment.id,
    property_id: appointment.property_id ?? undefined,
    customer_id: appointment.customer_id ?? undefined,
    agent_id: appointment.agent_id ?? undefined,
    appointment_date: appointment.appointment_date ?? undefined,
    notes: appointment.notes ?? undefined,
    created_at: appointment.created_at ?? undefined,
    updated_at: appointment.updated_at ?? undefined,
    status: appointment.status ?? undefined,
    customer_name: appointment.customer_name ?? undefined,
    customer_phone: appointment.customer_phone ?? undefined,
    customer_email: appointment.customer_email ?? undefined,
    formattedDate: formatAppointmentDate(appointment.appointment_date ?? null),
    buyer: appointment.buyer ?? undefined,
    seller: appointment.seller ?? undefined,
  };

  return {
    ...propertyData,
    appointments: [appointmentEntry],
    customer_user: mapCustomerUser(appointment.customer_user),
  };
};

const MyAnnouncements = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t, language } = useLanguage();

  const [listings, setListings] = useState<PropertyData[]>([]);
  const [listingsRaw, setListingsRaw] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedListings, setHasLoadedListings] = useState(false); // Track whether listings have already loaded

  const [negotiations, setNegotiations] = useState<NegotiationWithUser[]>([]);
  const [negotiationsRaw, setNegotiationsRaw] = useState<NegotiationWithUser[]>(
    []
  );
  const [negotiationsLoading, setNegotiationsLoading] = useState(false);

  const [appointments, setAppointments] = useState<AppointmentWithUser[]>([]);
  const [appointmentsRaw, setAppointmentsRaw] = useState<AppointmentWithUser[]>(
    []
  );
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState<FilterState>({
    types: new Set(), // Start with empty set to show all types
    actions: new Set(), // Start with empty set to show all actions
    priceMax: 1000000000000, // Increase limit to one trillion baht
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>("update3m");
  const [openUpdateLandForm, setOpenUpdateLandForm] = useState(false);
  const [openUpdateRentForm, setOpenUpdateRentForm] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null
  );

  const [propertyToEdit, setPropertyToEdit] = useState<PropertyRow | null>(
    null
  );
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [propertyToMarkSold, setPropertyToMarkSold] = useState<string | null>(
    null
  );
  const [propertyToMarkRented, setPropertyToMarkRented] = useState<
    string | null
  >(null);

  // State for email customer dialog
  const [openEmailDialog, setOpenEmailDialog] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [selectedPropertyIdForCustomer, setSelectedPropertyIdForCustomer] =
    useState<string | null>(null);
  const [emailDialogLoading, setEmailDialogLoading] = useState(false);

  // Keep track of which properties we've already created expiry notifications for
  const [notifiedExpiry, setNotifiedExpiry] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = window.localStorage.getItem("notifiedExpiry");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "notifiedExpiry",
        JSON.stringify(notifiedExpiry)
      );
    }
  }, [notifiedExpiry]);

  const createExpiryNotification = async (
    propertyId: string,
    message: string
  ) => {
    if (!user || notifiedExpiry.includes(propertyId)) return;

    try {
      await supabase.from("notifications").insert([
        {
          sender_id: user.id, // Or a system ID
          receiver_id: user.id,
          message,
          is_read: false,
          role: "system",
          headder: t("notification_expiring_listing"),
        },
      ]);
      setNotifiedExpiry(prev => [...prev, propertyId]);
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };

  const recomputeFilteredData = useCallback(
    (nextFilter: FilterState, query: string) => {
      setListings(buildListingsData(listingsRaw, nextFilter, query, t));
      setNegotiations(filterNegotiations(negotiationsRaw, nextFilter, query));
      setAppointments(filterAppointments(appointmentsRaw, nextFilter, query));
    },
    [appointmentsRaw, listingsRaw, negotiationsRaw, t]
  );

  // Cache configuration
  const LISTINGS_CACHE_KEY = `listings_${user?.id}`;
  const NEGOTIATIONS_CACHE_KEY = `negotiations_${user?.id}`;
  const APPOINTMENTS_CACHE_KEY = `appointments_${user?.id}`;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Utility function to get cached data
  const getCachedData = (key: string) => {
    if (typeof window === "undefined") return null;
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    try {
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      if (now - timestamp < CACHE_DURATION) {
        return data;
      }
      localStorage.removeItem(key); // Clear expired cache
      return null;
    } catch {
      return null;
    }
  };

  // Utility function to set cached data
  const setCachedData = (key: string, data: any) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      key,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  };

  const fetchListings = useCallback(async () => {
    // Avoid refetching if already loading, user is missing, or data finished loading
    if (loading || !user || hasLoadedListings) {
      return;
    }

    setLoading(true);
    try {
      // Check cache first
      const cachedListings = getCachedData(LISTINGS_CACHE_KEY);
      if (cachedListings) {
        console.log("✅ Using cached listings data");
        setListingsRaw(cachedListings);
        const filteredListings = buildListingsData(
          cachedListings,
          filter,
          searchQuery,
          t
        );
        setListings(filteredListings);
        setHasLoadedListings(true);
        setLoading(false);
        return;
      }

      let query = supabase.from("properties").select("*, property_details(*)");

      // For agents: filter by agent_id
      // For customers: get all properties, then filter by customer_id in property_details
      if (userRole === "customer") {
        console.log("🔍 Fetching properties for customer:", user.id);
        // First get all properties, then filter by customer_id in property_details
        const { data, error } = await query.limit(100);

        if (error) {
          console.error("❌ Error fetching properties:", error);
          setListings([]);
          setListingsRaw([]);
          setHasLoadedListings(true);
          setLoading(false);
          return;
        }

        const rows = (data ?? []) as PropertyRow[];
        // Filter properties where property_details.customer_id matches user.id
        const filteredRows = rows.filter(row => {
          const detail = getPrimaryDetail(row.property_details);
          return (detail as any)?.customer_id === user.id;
        });

        console.log(
          "✅ Properties fetched for customer:",
          filteredRows.length,
          "properties"
        );

        if (filteredRows.length === 0) {
          setListings([]);
          setListingsRaw([]);
          setHasLoadedListings(true);
          setLoading(false);
          return;
        }

        setListingsRaw(filteredRows);
        const filteredListings = buildListingsData(
          filteredRows,
          filter,
          searchQuery,
          t
        );
        console.log(
          "🔍 Filtered listings:",
          filteredListings.length,
          "out of",
          filteredRows.length
        );
        setListings(filteredListings);
        setCachedData(LISTINGS_CACHE_KEY, filteredRows); // Cache the data
        setHasLoadedListings(true);
        setLoading(false);
        return;
      } else {
        // For agents
        console.log("🔍 Fetching properties for agent:", user.id);
        const { data, error } = await query.eq("agent_id", user.id).limit(50);

        if (error) {
          console.error("❌ Error fetching properties:", error);
          setListings([]);
          setListingsRaw([]);
          setHasLoadedListings(true); // Mark as loaded even when errors occur
          setLoading(false); // Stop loading when an error occurs
          return;
        }

        console.log("✅ Properties fetched:", data?.length || 0, "properties");
        const rows = (data ?? []) as PropertyRow[];

        if (rows.length === 0) {
          setListings([]);
          setListingsRaw([]);
          setHasLoadedListings(true); // Mark as loaded even when there is no data
          setLoading(false);
          return;
        }
        console.log(
          "📊 Raw properties data:",
          rows.map(r => ({
            id: r.id,
            property_category: r.property_category,
            agent_id: r.agent_id,
            status: r.status,
          }))
        );
        setListingsRaw(rows);
        const filteredListings = buildListingsData(
          rows,
          filter,
          searchQuery,
          t
        );
        console.log(
          "🔍 Filtered listings:",
          filteredListings.length,
          "out of",
          rows.length
        );
        setListings(filteredListings);
        setCachedData(LISTINGS_CACHE_KEY, rows); // Cache the data
        setHasLoadedListings(true); // Flag as successfully loaded
      }
    } catch (error) {
      console.error("❌ Exception in fetchListings:", error);
      setListings([]);
      setListingsRaw([]);
      setHasLoadedListings(true); // Mark as loaded even when exceptions happen
      setLoading(false); // Stop loading when an exception occurs
    } finally {
      setLoading(false);
    }
  }, [filter, hasLoadedListings, loading, searchQuery, t, user, userRole]);

  const fetchNegotiations = useCallback(async () => {
    if (negotiationsLoading || !user || negotiationsRaw.length > 0) {
      return;
    }

    setNegotiationsLoading(true);
    try {
      // Check cache first
      const cachedNegotiations = getCachedData(NEGOTIATIONS_CACHE_KEY);
      if (cachedNegotiations) {
        console.log("✅ Using cached negotiations data");
        setNegotiationsRaw(cachedNegotiations);
        setNegotiations(
          filterNegotiations(cachedNegotiations, filter, searchQuery)
        );
        setNegotiationsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("negotiations")
        .select("*, properties(*, property_details(*))")
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        setNegotiations([]);
        setNegotiationsRaw([]);
        setNegotiationsLoading(false); // หยุดโหลดเมื่อเกิด error
        return;
      }

      const negotiationRows = (data ?? []) as NegotiationRow[];

      // ถ้าไม่มีข้อมูล - หยุดโหลดทันที
      if (negotiationRows.length === 0) {
        setNegotiations([]);
        setNegotiationsRaw([]);
        setNegotiationsLoading(false);
        return;
      }
      const customerIds = negotiationRows
        .map(row => row.customer_id)
        .filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0
        );

      let usersMap: Record<string, CustomerUser> = {};
      if (customerIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, first_name, last_name, phone, email")
          .in("id", customerIds);

        if (!usersError && usersData) {
          usersMap = Object.fromEntries(
            (usersData as CustomerUser[]).map(customer => [
              customer.id,
              customer,
            ])
          );
        }
      }

      const negotiationsWithUser: NegotiationWithUser[] = negotiationRows.map(
        row => ({
          ...row,
          customer_user: usersMap[row.customer_id ?? ""] ?? null,
        })
      );

      setNegotiationsRaw(negotiationsWithUser);
      setNegotiations(
        filterNegotiations(negotiationsWithUser, filter, searchQuery)
      );
      setCachedData(NEGOTIATIONS_CACHE_KEY, negotiationsWithUser); // Cache the data
    } catch {
      setNegotiations([]);
      setNegotiationsRaw([]);
      setNegotiationsLoading(false); // หยุดโหลดเมื่อเกิด exception
    } finally {
      setNegotiationsLoading(false);
    }
  }, [filter, negotiationsLoading, negotiationsRaw.length, searchQuery, user]);

  const fetchAppointments = useCallback(async () => {
    if (appointmentsLoading || !user || appointmentsRaw.length > 0) {
      return;
    }

    setAppointmentsLoading(true);
    try {
      // Check cache first
      const cachedAppointments = getCachedData(APPOINTMENTS_CACHE_KEY);
      if (cachedAppointments) {
        console.log("✅ Using cached appointments data");
        setAppointmentsRaw(cachedAppointments);
        setAppointments(
          filterAppointments(cachedAppointments, filter, searchQuery)
        );
        setAppointmentsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("appointments")
        .select("*, properties(*, property_details(*))")
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        setAppointments([]);
        setAppointmentsRaw([]);
        setAppointmentsLoading(false); // หยุดโหลดเมื่อเกิด error
        return;
      }

      const appointmentRows = (data ?? []) as AppointmentRow[];

      // ถ้าไม่มีข้อมูล - หยุดโหลดทันที
      if (appointmentRows.length === 0) {
        setAppointments([]);
        setAppointmentsRaw([]);
        setAppointmentsLoading(false);
        return;
      }
      const customerIds = appointmentRows
        .map(row => row.customer_id)
        .filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0
        );

      let usersMap: Record<string, CustomerUser> = {};
      if (customerIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, first_name, last_name, phone, email")
          .in("id", customerIds);

        if (!usersError && usersData) {
          usersMap = Object.fromEntries(
            (usersData as CustomerUser[]).map(entry => [entry.id, entry])
          );
        }
      }

      const appointmentsWithUser: AppointmentWithUser[] = appointmentRows.map(
        row => ({
          ...row,
          customer_user: usersMap[row.customer_id ?? ""] ?? null,
        })
      );

      setAppointmentsRaw(appointmentsWithUser);
      setAppointments(
        filterAppointments(appointmentsWithUser, filter, searchQuery)
      );
      setCachedData(APPOINTMENTS_CACHE_KEY, appointmentsWithUser); // Cache the data
    } catch {
      setAppointments([]);
      setAppointmentsRaw([]);
      setAppointmentsLoading(false); // หยุดโหลดเมื่อเกิด exception
    } finally {
      setAppointmentsLoading(false);
    }
  }, [appointmentsLoading, appointmentsRaw.length, filter, searchQuery, user]);

  // Handler for editing a property
  const handleEditProperty = (propertyId: string) => {
    const property = listingsRaw.find(p => p.id === propertyId);
    if (property) {
      setPropertyToEdit(property);
    }
  };

  // Handler for deleting a property
  const handleDeleteProperty = async () => {
    if (!propertyToDelete || !user) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/my-listings?propertyId=${propertyToDelete}&agentId=${user.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        // Refresh the listings - รีเซ็ต flag เพื่อให้โหลดใหม่
        setListingsRaw([]);
        setListings([]);
        setHasLoadedListings(false); // รีเซ็ต flag เพื่อให้โหลดใหม่
        await fetchListings();
        setPropertyToDelete(null);
      } else {
        toast.error(t("error_delete_listing"));
      }
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error(t("error_delete_listing"));
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler for marking property as sold
  const handleMarkAsSold = async (propertyId: string) => {
    if (!user) return;

    try {
      const response = await fetch(
        `/api/my-listings?propertyId=${propertyId}&agentId=${user.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            details: {
              status: "sold",
            },
          }),
        }
      );

      if (response.ok) {
        // Refresh the listings - รีเซ็ต flag เพื่อให้โหลดใหม่
        setListingsRaw([]);
        setListings([]);
        setHasLoadedListings(false); // รีเซ็ต flag เพื่อให้โหลดใหม่
        await fetchListings();
      } else {
        toast.error(t("error_update_status"));
      }
    } catch (error) {
      console.error("Error marking as sold:", error);
      toast.error(t("error_update_status"));
    }
  };

  // Handler for marking property as rented
  const handleMarkAsRented = async (propertyId: string) => {
    if (!user) return;

    try {
      const response = await fetch(
        `/api/my-listings?propertyId=${propertyId}&agentId=${user.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            details: {
              status: "rented",
            },
          }),
        }
      );

      if (response.ok) {
        // Refresh the listings - รีเซ็ต flag เพื่อให้โหลดใหม่
        setListingsRaw([]);
        setListings([]);
        setHasLoadedListings(false); // รีเซ็ต flag เพื่อให้โหลดใหม่
        await fetchListings();
      } else {
        toast.error(t("error_update_status"));
      }
    } catch (error) {
      console.error("Error marking as rented:", error);
      toast.error(t("error_update_status"));
    }
  };

  const handleUpdateSuccess = useCallback(async () => {
    setOpenUpdateLandForm(false);
    setOpenUpdateRentForm(false);
    setSelectedPropertyId(null);
    setListingsRaw([]);
    setListings([]);
    setHasLoadedListings(false);
    await fetchListings();
  }, [fetchListings]);

  const handleLandFormOpenChange = useCallback((open: boolean) => {
    setOpenUpdateLandForm(open);
    if (!open) {
      setSelectedPropertyId(null);
    }
  }, []);

  const handleRentFormOpenChange = useCallback((open: boolean) => {
    setOpenUpdateRentForm(open);
    if (!open) {
      setSelectedPropertyId(null);
    }
  }, []);

  // Handler for opening email customer dialog
  const handleOpenEmailDialog = (propertyId: string) => {
    setSelectedPropertyIdForCustomer(propertyId);
    setOpenEmailDialog(true);
  };

  // Handler for submitting email
  const handleEmailSubmit = async (email: string) => {
    if (!selectedPropertyIdForCustomer) return;

    setEmailDialogLoading(true);
    try {
      // Find customer by email
      const findResponse = await fetch("/api/find-customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      if (!findResponse.ok) {
        const errorData = await findResponse.json();
        throw new Error(errorData.error || "ไม่พบข้อมูลกรุณากรอกใหม่");
      }

      const { customerId } = await findResponse.json();

      // Update property_details with customer_id
      const updateResponse = await fetch("/api/update-property-customer", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId: selectedPropertyIdForCustomer,
          customerId,
          language, // ส่งภาษาที่เลือกไปให้ API
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        if (updateResponse.status === 409) {
          setOpenEmailDialog(false);
          setShowDuplicateWarning(true);
          return;
        }
        throw new Error(errorData.error || "ไม่สามารถอัปเดตข้อมูลได้");
      }

      toast.success("เพิ่มลูกค้าสำเร็จแล้ว");
      setOpenEmailDialog(false);
      setSelectedPropertyIdForCustomer(null);

      // Refresh listings
      setListingsRaw([]);
      setListings([]);
      setHasLoadedListings(false);
      await fetchListings();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
      toast.error(errorMessage);
      console.error("Error in handleEmailSubmit:", error);
    } finally {
      setEmailDialogLoading(false);
    }
  };

  // Set default activeTag to "all" for agents when userRole is available
  useEffect(() => {
    if (!authLoading && userRole === "agent" && activeTag === "update3m") {
      setActiveTag("all");
    }
  }, [authLoading, userRole]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    // เรียก fetch เฉพาะเมื่อเปลี่ยน tab และยังไม่โหลดข้อมูลของ tab นั้น
    if (
      (activeTag === "all" || activeTag === "update3m") &&
      !hasLoadedListings
    ) {
      fetchListings();
    } else if (
      activeTag === "negotiation" &&
      negotiationsRaw.length === 0 &&
      !negotiationsLoading
    ) {
      fetchNegotiations();
    } else if (
      (activeTag === "appointment" || activeTag === "contracted") &&
      appointmentsRaw.length === 0 &&
      !appointmentsLoading
    ) {
      fetchAppointments();
    }
  }, [
    activeTag,
    authLoading,
    appointmentsLoading,
    appointmentsRaw.length,
    fetchAppointments,
    fetchListings,
    fetchNegotiations,
    hasLoadedListings,
    negotiationsLoading,
    negotiationsRaw.length,
    user,
  ]);

  return (
    <div className="p-5 font-sans bg-white">
      <h2 className="text-[32px] font-medium mb-4">{t("my_listings")}</h2>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <div className="flex items-center border-2 border-[#549DEC] rounded-md overflow-hidden">
            <input
              type="text"
              placeholder={t("search_placeholder_listings")}
              className="flex-1 px-4 py-2 text-sm focus:outline-none text-gray-700"
              style={{ height: 40 }}
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
            />
            <button
              aria-label={t("search")}
              className="bg-[#549DEC] hover:bg-[#006CE3] text-white w-10 h-10 flex items-center justify-center"
              onClick={() => recomputeFilteredData(filter, searchQuery)}
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-[10px] text-sm flex items-center gap-2 shadow-md"
          onClick={() => router.push("/add-property")}
        >
          <span className="inline-flex w-6 h-6 items-center justify-center bg-blue-500/90 rounded-full">
            <Plus className="w-3 h-3" />
          </span>
          {t("add_listing")}
        </button>

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 h-10 rounded-[10px] text-sm flex items-center justify-center"
          onClick={() => setShowFilter(true)}
        >
          {t("filters")}
        </button>

        <button
          className="bg-green-600 hover:bg-green-700 text-white px-4 h-10 rounded-[10px] text-sm flex items-center justify-center"
          onClick={() => {
            // Clear cache and refresh all data
            localStorage.removeItem(LISTINGS_CACHE_KEY);
            localStorage.removeItem(NEGOTIATIONS_CACHE_KEY);
            localStorage.removeItem(APPOINTMENTS_CACHE_KEY);
            setHasLoadedListings(false);
            setListingsRaw([]);
            setListings([]);
            setNegotiationsRaw([]);
            setNegotiations([]);
            setAppointmentsRaw([]);
            setAppointments([]);
            fetchListings();
          }}
        >
          {t("refresh_data")}
        </button>
      </div>

      {showFilter && (
        <FilterPanel
          onClose={() => setShowFilter(false)}
          initialTypes={[...filter.types]}
          initialActions={[...filter.actions]}
          initialPriceMax={filter.priceMax}
          onApply={(next: {
            types: string[];
            actions: string[];
            priceMax: number;
          }) => {
            const nextState: FilterState = {
              types: new Set(next.types),
              actions: new Set(next.actions),
              priceMax: next.priceMax,
            };
            setFilter(nextState);
            recomputeFilteredData(nextState, searchQuery);
            setShowFilter(false);
          }}
        />
      )}

      <div className="flex flex-wrap gap-3">
        {[
          { key: "all", label: t("view_all"), minW: "110px" },
          // { key: "negotiation", label: "ขอต่อรองราคา", minW: "110px" },
          // { key: "appointment", label: "นัดหมาย", minW: "110px" },
          // { key: "contracted", label: "ทำสัญญาแล้ว", minW: "110px" },
          { key: "update3m", label: t("update_every_3_months"), minW: "140px" },
        ]
          .filter(btn => {
            // ซ่อนปุ่ม "ดูทั้งหมด" เมื่อ userRole เป็น customer
            if (userRole === "customer" && btn.key === "all") {
              return false;
            }
            return true;
          })
          .map(btn => {
            const isActive = activeTag === btn.key;
            return (
              <button
                key={btn.key}
                onClick={() => setActiveTag(btn.key)}
                className={`px-3.5 py-2.5 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[${btn.minW}] text-center`}
                style={{
                  backgroundColor: isActive ? "#006CE3" : "#549DEC",
                  color: "#FFFFFF",
                  borderRadius: 10,
                }}
              >
                {btn.label}
              </button>
            );
          })}
      </div>

      <div className="mt-6">
        {(() => {
          if (activeTag === "negotiation") {
            if (negotiationsLoading) {
              return (
                <div className="text-sm text-gray-500">
                  {t("loading_negotiations")}
                </div>
              );
            }
            if (negotiations.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <div className="text-lg font-semibold mb-2">
                    {t("no_data")}
                  </div>
                  <div className="text-sm">{t("no_negotiations_message")}</div>
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-4">
                {negotiations
                  .filter(
                    negotiation =>
                      negotiation.card_status !== "confirm" &&
                      negotiation.card_status !== "cancel"
                  )
                  .map(negotiation => {
                    const property = createNegotiationProperty(negotiation, t);
                    return (
                      <div key={negotiation.id} className="w-full">
                        <div className="w-full h-auto flex">
                          <PropertyCard
                            property={property}
                            showMapButton={false}
                            priority={false}
                            showNegotiationDetails
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          }

          if (activeTag === "appointment") {
            if (appointmentsLoading) {
              return (
                <div className="text-sm text-gray-500">
                  {t("loading_appointments")}
                </div>
              );
            }
            if (appointments.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <div className="text-lg font-semibold mb-2">
                    {t("no_data")}
                  </div>
                  <div className="text-sm">{t("no_appointments_message")}</div>
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-4">
                {appointments
                  .filter(appointment => appointment.status !== "cancel")
                  .filter(
                    appointment =>
                      !(
                        appointment.buyer &&
                        appointment.seller &&
                        appointment.buyer.trim() !== "" &&
                        appointment.seller.trim() !== ""
                      )
                  )
                  .map(appointment => {
                    const property = createAppointmentProperty(appointment, t);
                    return (
                      <div key={appointment.id} className="w-full">
                        <div className="w-full h-auto flex">
                          <PropertyCard
                            property={property}
                            appointmentStatus={appointment.status ?? undefined}
                            showMapButton={false}
                            priority={false}
                            showAppointmentDetails
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          }

          if (activeTag === "contracted") {
            if (appointmentsLoading) {
              return (
                <div className="text-sm text-gray-500">{t("loading")}</div>
              );
            }
            if (appointments.length === 0) {
              return (
                <div className="text-sm text-gray-500 space-y-2">
                  <div>{t("empty_contracted")}</div>
                  {appointmentsRaw.length > 0 && (
                    <div className="text-xs text-gray-400">
                      {t("no_contracts_detail").replace(
                        "{count}",
                        appointmentsRaw.length.toString()
                      )}
                    </div>
                  )}
                </div>
              );
            }
            const contractedAppointments = appointments
              .filter(appointment => appointment.status !== "cancel")
              .filter(
                appointment =>
                  appointment.buyer &&
                  appointment.seller &&
                  appointment.buyer.trim() !== "" &&
                  appointment.seller.trim() !== ""
              );

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-4">
                {contractedAppointments.map(appointment => {
                  const property = createAppointmentProperty(appointment, t);
                  return (
                    <div key={appointment.id} className="w-full">
                      <div className="w-full h-auto flex">
                        <PropertyCard
                          property={property}
                          showMapButton={false}
                          priority={false}
                          showAppointmentDetails
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          if (activeTag === "all") {
            if (loading) {
              return (
                <div className="text-sm text-gray-500">
                  {t("loading_listings")}
                </div>
              );
            }
            if (listings.length === 0) {
              return (
                <div className="text-sm text-gray-500 space-y-2">
                  <div>{t("empty_all")}</div>
                  {listingsRaw.length > 0 && (
                    <div className="text-xs text-gray-400">
                      {t("listings_filtered_out_detail").replace(
                        "{count}",
                        listingsRaw.length.toString()
                      )}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-6">
                {listings.reduce((acc, property) => {
                  const threeDays = 3 * 24 * 60 * 60 * 1000;
                  const now = Date.now();

                  // Find the raw row to inspect detail.updated_at or property.updated_at
                  const rawRow = listingsRaw.find(r => r.id === property.id) as
                    | PropertyRow
                    | undefined;
                  const primaryDetail = rawRow
                    ? getPrimaryDetail(rawRow.property_details)
                    : undefined;

                  const statusRaw = (
                    (primaryDetail?.status as any) ??
                    (rawRow?.status as any) ??
                    (property.status as any) ??
                    ""
                  )
                    .toString()
                    .toLowerCase();

                  // Determine a timestamp for when the status/detail was last updated
                  let latestStatusChangeAt: number | null = null;
                  if (primaryDetail && (primaryDetail as any).updated_at) {
                    const t = new Date(
                      (primaryDetail as any).updated_at
                    ).getTime();
                    if (!Number.isNaN(t)) latestStatusChangeAt = t;
                  }
                  if (
                    !latestStatusChangeAt &&
                    rawRow &&
                    (rawRow as any).updated_at
                  ) {
                    const t = new Date((rawRow as any).updated_at).getTime();
                    if (!Number.isNaN(t)) latestStatusChangeAt = t;
                  }
                  if (!latestStatusChangeAt && property.createdAt) {
                    const t = new Date(property.createdAt).getTime();
                    if (!Number.isNaN(t)) latestStatusChangeAt = t;
                  }

                  // If property is sold/rented, handle the 3-day hide window
                  if (statusRaw === "sold" || statusRaw === "rented") {
                    if (latestStatusChangeAt) {
                      const age = now - latestStatusChangeAt;
                      if (age >= threeDays) {
                        // expired: create notification (if not already) and do not render the card
                        const message = t("listing_hidden_due_status");
                        createExpiryNotification(property.id, message);
                        return acc; // skip rendering this card
                      } else {
                        const msLeft = Math.max(0, threeDays - age);
                        const daysLeft = Math.ceil(
                          msLeft / (1000 * 60 * 60 * 24)
                        );
                        const statusLabel =
                          statusRaw === "sold"
                            ? t("status_sold_label")
                            : t("status_rented_label");
                        const expiryWarning = t("listing_expiry_warning")
                          .replace("{days}", daysLeft.toString())
                          .replace("{status}", statusLabel);
                        const propertyWithWarning = {
                          ...property,
                          expiryWarning,
                        };
                        acc.push(
                          <div
                            key={property.id}
                            className="w-full flex transform transition-transform hover:-translate-y-1 hover:shadow-lg duration-300"
                          >
                            <div className="w-full">
                              <PropertyCard
                                property={propertyWithWarning}
                                showMapButton
                                priority={false}
                                actionsMenu={
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors shadow-md">
                                        <MoreVertical className="h-4 w-4" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleEditProperty(property.id)
                                        }
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>{t("action_edit")}</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          setPropertyToDelete(property.id)
                                        }
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>{t("action_delete")}</span>
                                      </DropdownMenuItem>
                                      {property.isForSale &&
                                        !property.isForRent && (
                                          <DropdownMenuItem
                                            onClick={() =>
                                              handleMarkAsSold(property.id)
                                            }
                                          >
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            <span>
                                              {t("action_mark_as_sold")}
                                            </span>
                                          </DropdownMenuItem>
                                        )}
                                      {property.isForRent &&
                                        !property.isForSale && (
                                          <DropdownMenuItem
                                            onClick={() =>
                                              handleMarkAsRented(property.id)
                                            }
                                          >
                                            <XCircle className="mr-2 h-4 w-4" />
                                            <span>
                                              {t("action_mark_as_rented")}
                                            </span>
                                          </DropdownMenuItem>
                                        )}
                                      {!property.isForSale &&
                                        !statusRaw.includes("sold") &&
                                        !statusRaw.includes("ขาย") && (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleOpenEmailDialog(property.id)
                                          }
                                        >
                                          <Plus className="mr-2 h-4 w-4" />
                                          <span>{t("add_customer")}</span>
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                }
                              />
                            </div>
                          </div>
                        );
                        return acc;
                      }
                    }
                    // If no timestamp available, render conservatively
                  }

                  // Default: render property normally
                  acc.push(
                    <div
                      key={property.id}
                      className="w-full flex transform transition-transform hover:-translate-y-1 hover:shadow-lg duration-300"
                    >
                      <div className="w-full">
                        <PropertyCard
                          property={property}
                          showMapButton
                          priority={false}
                          actionsMenu={
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors shadow-md">
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleEditProperty(property.id)
                                  }
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>{t("action_edit")}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    setPropertyToDelete(property.id)
                                  }
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>{t("action_delete")}</span>
                                </DropdownMenuItem>
                                {property.isForSale && !property.isForRent && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleMarkAsSold(property.id)
                                    }
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    <span>{t("action_mark_as_sold")}</span>
                                  </DropdownMenuItem>
                                )}
                                {property.isForRent && !property.isForSale && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleMarkAsRented(property.id)
                                    }
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    <span>{t("action_mark_as_rented")}</span>
                                  </DropdownMenuItem>
                                )}
                                {!property.isForSale &&
                                  !String(property.status ?? "")
                                    .toLowerCase()
                                    .includes("sold") &&
                                  !String(property.status ?? "")
                                    .includes("ขาย") && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleOpenEmailDialog(property.id)
                                    }
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    <span>{t("add_customer")}</span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          }
                        />
                      </div>
                    </div>
                  );
                  return acc;
                }, [] as React.ReactElement[])}
              </div>
            );
          }

          // show properties based on user role
          if (activeTag === "update3m") {
            if (loading) {
              return (
                <div className="text-sm text-gray-500">
                  {t("loading_listings")}
                </div>
              );
            }

            let filteredRaw: PropertyRow[] = [];

            if (userRole === "customer" && user) {
              // For customers: show properties where property_details.customer_id matches user.id and status is not 'sold'
              filteredRaw = listingsRaw.filter(p => {
                const detail = getPrimaryDetail(p?.property_details);
                const detailStatus = String(detail?.status ?? "").toLowerCase();
                const propertyStatus = String(p.status ?? "").toLowerCase();

                const listingSource =
                  p?.listing_type ??
                  (detail as any)?.properties?.listing_type ??
                  null;
                const listingTypes = toCleanStringArray(listingSource).map(t =>
                  t.toLowerCase()
                );
                const isListingSold = listingTypes.some(
                  t => t.includes("sold") || t.includes("ขายแล้ว")
                );

                // Strict check for sold status
                if (detailStatus.includes("sold") || detailStatus.includes("ขาย")) return false;
                if (propertyStatus.includes("sold") || propertyStatus.includes("ขาย")) return false;
                if (isListingSold) return false;

                return (detail as any)?.customer_id === user.id;
              });
            } else {
              // For agents: show properties whose property_details.status contains 'rented' and property_details.status is not 'sold'
              filteredRaw = listingsRaw.filter(p => {
                const detail = getPrimaryDetail(p?.property_details);
                const detailStatus = String(detail?.status ?? "").toLowerCase();
                const propertyStatus = String(p.status ?? "").toLowerCase();

                const listingSource =
                  p?.listing_type ??
                  (detail as any)?.properties?.listing_type ??
                  null;
                const listingTypes = toCleanStringArray(listingSource).map(t =>
                  t.toLowerCase()
                );
                const isListingSold = listingTypes.some(
                  t => t.includes("sold") || t.includes("ขายแล้ว")
                );

                // Strict check for sold status
                if (detailStatus.includes("sold") || detailStatus.includes("ขาย")) return false;
                if (propertyStatus.includes("sold") || propertyStatus.includes("ขาย")) return false;
                if (isListingSold) return false;

                return detailStatus.includes("rented");
              });
            }

            if (filteredRaw.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <div className="text-lg font-semibold mb-2">
                    {t("no_data")}
                  </div>
                  <div className="text-sm">
                    {userRole === "customer"
                      ? t("no_update_cards_customer")
                      : t("no_update_cards_rented")}
                  </div>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-4">
                {filteredRaw.map(propertyRow => {
                  const property = createPropertyData(
                    propertyRow,
                    propertyRow.id,
                    propertyRow.agent_id,
                    t
                  );

                  // --- AGGRESSIVE FILTERING FOR SOLD PROPERTIES ---
                  const isSoldStatus = (s: string | undefined | null) => {
                    if (!s) return false;
                    const lower = String(s).toLowerCase().trim();
                    return lower === "sold" || lower === "ขายแล้ว" || lower.includes("sold");
                  };

                  if (isSoldStatus(property.status)) return null;
                  if (property.listing_type?.some(t => isSoldStatus(t))) return null;
                  
                  const rawDetail = getPrimaryDetail(propertyRow.property_details);
                  if (isSoldStatus(rawDetail?.status)) return null;
                  if (isSoldStatus(propertyRow.status)) return null;

                  if ((property as any).isSold || (property as any).is_sold || (property as any).sold) return null;

                  // ------------------------------------------------

                  return (
                    <div key={propertyRow.id} className="w-full relative group">
                      <div className="w-full h-auto">
                        <PropertyCard
                          property={property}
                          showMapButton
                          priority={false}
                          showUpdateButton
                          onUpdateClick={() => {
                            setSelectedPropertyId(property.id);
                            // Check property_category to determine which form to open
                            const category = String(
                              propertyRow.property_category ?? ""
                            ).trim();
                            const categoryLower = category.toLowerCase();
                            // Check if it's land (support both Thai "ที่ดิน" and English "land")
                            const isLand =
                              category === "ที่ดิน" ||
                              categoryLower === "land" ||
                              categoryLower.includes("land");

                            if (isLand) {
                              setOpenUpdateLandForm(true);
                            } else {
                              setOpenUpdateRentForm(true);
                            }
                          }}
                          actionsMenu={
                            userRole === "agent" && !property.isForSale ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors shadow-md">
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleOpenEmailDialog(property.id)
                                    }
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    <span>{t("add_customer")}</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : undefined
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          return null;
        })()}
      </div>

      {/* Delete Confirmation Modal */}
      {propertyToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">
              {t("delete_confirmation_title")}
            </h3>
            <p className="text-gray-700 mb-6">
              {t("delete_confirmation_body")}
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setPropertyToDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isDeleting}
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleDeleteProperty}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? t("processing") : t("action_delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Property Modal - Will navigate to add-property page with data */}
      {propertyToEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">
              {t("edit_listing_modal_title")}
            </h3>
            <p className="text-gray-700 mb-6">{t("edit_listing_modal_body")}</p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setPropertyToEdit(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => {
                  // Navigate to add-property page with the property ID
                  router.push(`/add-property?edit=${propertyToEdit.id}`);
                  setPropertyToEdit(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t("action_edit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Land Form Dialog (view for agents, update for others) */}
      {userRole === "agent" ? (
        <View3MLandForm
          open={openUpdateLandForm}
          onOpenChange={handleLandFormOpenChange}
          propertyId={selectedPropertyId}
        />
      ) : (
        <Update3MLandForm
          open={openUpdateLandForm}
          onOpenChange={handleLandFormOpenChange}
          propertyId={selectedPropertyId}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {/* Rent Form Dialog (view for agents, update for others) */}
      {userRole === "agent" ? (
        <View3MRentForm
          open={openUpdateRentForm}
          onOpenChange={handleRentFormOpenChange}
          propertyId={selectedPropertyId}
        />
      ) : (
        <Update3MRentForm
          open={openUpdateRentForm}
          onOpenChange={handleRentFormOpenChange}
          propertyId={selectedPropertyId}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {/* Email Customer Dialog */}
      <EmailCustomerDialog
        open={openEmailDialog}
        onOpenChange={setOpenEmailDialog}
        onSubmit={handleEmailSubmit}
        loading={emailDialogLoading}
        language={language}
      />

      <ConfirmationModal
        open={showDuplicateWarning}
        onConfirm={() => setShowDuplicateWarning(false)}
        onCancel={() => setShowDuplicateWarning(false)}
        title={t("duplicate_customer_title")}
        message={t("duplicate_customer_message")}
        type="warning"
        confirmText={t("confirm")}
        showCancel={false}
      />
    </div>
  );
};

export default MyAnnouncements;
