"use client";

import type { PropertyData } from "@/components/property/property-card";
import { PropertyCard } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/contexts/language-context";
import { useProperty } from "@/contexts/property-context";
import { ArrowLeft, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useRef, useState } from "react";

// Hoist dynamic import to avoid remounting on each render
const PropertyMapNew = dynamic(
  () => import("@/components/property/property-map-new"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-200">
        <div className="text-gray-500">กำลังโหลดแผนที่...</div>
      </div>
    ),
  }
);

function PropertySearchContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  // const [priceRange, setPriceRange] = useState("all");
  const [propertyType, setPropertyType] = useState("all");
  const [bedrooms, setBedrooms] = useState("all");
  const [listingType, setListingType] = useState("all");
  const [showSidebar, setShowSidebar] = useState(true);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(
    null
  );
  const [mapTarget, setMapTarget] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);
  const [focusProperty, setFocusProperty] = useState<PropertyData | null>(null);
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  const [initialMapState, setInitialMapState] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);
  // const mapRef = useRef<HTMLDivElement>(null);

  // New states for price range slider - using array format like all-properties page
  const [priceRange, setPriceRange] = useState([0, 100000000]); // 0 to 100 million
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // New state for Filters Popover and sorting
  const [showFilterPopover, setShowFilterPopover] = useState<boolean>(false);
  const filterPopoverRef = useRef<HTMLDivElement>(null); // Ref for detecting clicks outside
  const [sortBy, setSortBy] = useState<string>("default"); // default, new-old, price-asc, price-desc
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Fix for TypeScript ref callback error
  const setDropdownRef = (key: string) => (el: HTMLDivElement | null) => {
    dropdownRefs.current[key] = el;
    return undefined;
  };

  // Property type matching function (same as all-properties page)
  type PropertyTypeCode =
    | "condo"
    | "house"
    | "land"
    | "office"
    | "townhouse"
    | "commercial";

  const propertyMatchesType = (
    property: any,
    code: PropertyTypeCode
  ): boolean => {
    const raw = (property?.property_category ?? "").toString().toLowerCase();
    if (!raw) return true; // หากไม่มีหมวดหมู่ ให้ผ่านไป (กันข้อมูล legacy)

    const hasAny = (candidates: string[]): boolean =>
      candidates.some(k => raw.includes(k));

    switch (code) {
      case "condo":
        return hasAny(["คอนโด", "condo"]);
      case "house":
        return hasAny(["บ้าน", "house"]);
      case "land":
        return hasAny(["ที่ดิน", "land"]);
      case "office":
        return hasAny(["สำนักงาน", "office"]);
      case "townhouse":
        return hasAny(["ทาวน์โฮม", "ทาวน์เฮาส์", "townhome", "townhouse"]);
      case "commercial":
        return hasAny([
          "อาคารพาณิชย์",
          "ช้อปเฮาส์",
          "ช็อปเฮาส์",
          "shophouse",
          "commercial",
        ]);
      default:
        return true;
    }
  };

  // Effect to close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        openDropdown &&
        !dropdownRefs.current[openDropdown]?.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);

  // Effect to read URL parameters and set initial filters
  useEffect(() => {
    const urlListingType = searchParams.get("listingType");
    if (
      urlListingType &&
      (urlListingType === "sale" || urlListingType === "rent")
    ) {
      setListingType(urlListingType);
    }

    // อ่านพารามิเตอร์สำหรับตำแหน่งแผนที่
    const location = searchParams.get("location");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const zoom = searchParams.get("zoom");
    const searchParam = searchParams.get("search");

    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const zoomLevel = zoom ? parseInt(zoom) : 13;

      // ตั้งค่าแผนที่ให้ไปยังตำแหน่งที่กำหนด
      setMapTarget({ lat: latitude, lng: longitude, zoom: zoomLevel });

      // หากมี location name ให้ใส่ใน search query ด้วย
      if (location) {
        setSearchQuery(location);
      }
    }

    // หากมีพารามิเตอร์ search ให้ใส่ใน search query
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [searchParams]);

  // Handler สำหรับรับ bounds จาก map component
  const handleMapBoundsChange = React.useCallback(
    (newBounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    }) => {
      setMapBounds(currentBounds => {
        // Prevent update if bounds are the same to avoid loop
        if (
          currentBounds &&
          currentBounds.north === newBounds.north &&
          currentBounds.south === newBounds.south &&
          currentBounds.east === newBounds.east &&
          currentBounds.west === newBounds.west
        ) {
          return currentBounds;
        }
        return newBounds;
      });
    },
    []
  );

  // Handler สำหรับคลิกที่ marker บนแผนที่ (เพื่อ scroll sidebar)
  const handleMarkerClickForSidebar = React.useCallback(
    (property: PropertyData) => {
      setActivePropertyId(property.id);
      // สามารถเพิ่ม scroll ไปยัง property card ใน sidebar ได้
      const cardElement = document.getElementById(`property-${property.id}`);
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    []
  );

  // Handler สำหรับ hover ที่ marker บนแผนที่ (เพื่อแสดง popup)
  const handleMarkerHover = React.useCallback((property: PropertyData) => {
    setHoveredPropertyId(property.id);
  }, []);

  // Handler สำหรับ mouse leave จาก marker บนแผนที่ (เพื่อซ่อน popup)
  const handleMarkerLeave = React.useCallback(() => {
    setHoveredPropertyId(null);
  }, []);

  // Handler สำหรับปุ่ม "ดูบนแผนที่" ใน property card
  const handleViewOnMap = React.useCallback(
    (property: PropertyData) => {
      // ถ้า property นี้ถูก focus อยู่แล้ว และ activePropertyId ตรงกับ property.id
      // ให้ reset กลับไปตำแหน่งเริ่มต้น
      if (
        focusProperty?.id === property.id &&
        activePropertyId === property.id &&
        initialMapState
      ) {
        // ย้อนกลับไปตำแหน่งเริ่มต้น
        setMapTarget(initialMapState);
        setFocusProperty(null);
        setActivePropertyId(null);
      } else {
        // เก็บตำแหน่งเริ่มต้นก่อน focus (ถ้ายังไม่มีการ focus property มาก่อน)
        if (!focusProperty && !initialMapState) {
          // เก็บตำแหน่งปัจจุบันก่อนจะ focus
          if (mapTarget) {
            setInitialMapState(mapTarget);
          } else {
            // ถ้ายังไม่มี mapTarget ให้ใช้ initialCenter และ initialZoom
            const lat = searchParams.get("lat");
            const lng = searchParams.get("lng");
            const zoom = searchParams.get("zoom");
            if (lat && lng) {
              setInitialMapState({
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                zoom: zoom ? parseInt(zoom) : 11,
              });
            } else {
              setInitialMapState({
                lat: 13.7563,
                lng: 100.5018,
                zoom: 11,
              });
            }
          }
        }

        // Focus ไปที่ property
        setActivePropertyId(property.id);
        if (property.latitude && property.longitude) {
          setMapTarget({
            lat: property.latitude,
            lng: property.longitude,
            zoom: 19,
          }); // ซูมเข้าใกล้สุด
          setFocusProperty(property);
        }
      }
    },
    [focusProperty, activePropertyId, initialMapState, mapTarget, searchParams]
  );

  // ใช้ข้อมูลจาก Property Context เหมือนกับหน้าอื่นๆ
  const { allProperties, isLoading } = useProperty();
  // รวมข้อมูลทั้งหมดจาก context และกรองข้อมูลซ้ำ
  const propertiesWithLocation = allProperties.filter(
    property => property.latitude && property.longitude
  );

  // คำนวณ center และ zoom เริ่มต้นจาก URL หรือใช้ค่าเริ่มต้น
  const initialCenter: [number, number] = React.useMemo(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    if (lat && lng) {
      return [parseFloat(lat), parseFloat(lng)];
    }
    return [13.7563, 100.5018]; // ค่าเริ่มต้น (กรุงเทพฯ)
  }, [searchParams]);

  const initialZoom = React.useMemo(() => {
    const zoom = searchParams.get("zoom");
    return zoom ? parseInt(zoom) : 11;
  }, [searchParams]);

  // ตั้งค่า initialMapState เมื่อ component mount (เก็บตำแหน่งเริ่มต้นของแผนที่)
  React.useEffect(() => {
    if (!initialMapState) {
      const lat = searchParams.get("lat");
      const lng = searchParams.get("lng");
      const zoom = searchParams.get("zoom");
      if (lat && lng) {
        setInitialMapState({
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          zoom: zoom ? parseInt(zoom) : 11,
        });
      } else {
        setInitialMapState({
          lat: 13.7563,
          lng: 100.5018,
          zoom: 11,
        });
      }
    }
  }, [searchParams, initialMapState]);
  const displayProperties = React.useMemo(() => {
    const currentFiltered = propertiesWithLocation.filter(property => {
      // Map bounds filter - เฉพาะอสังหาฯ ที่อยู่ในกรอบแผนที่
      if (mapBounds && property.latitude && property.longitude) {
        const lat = property.latitude;
        const lng = property.longitude;
        if (
          lat < mapBounds.south ||
          lat > mapBounds.north ||
          lng < mapBounds.west ||
          lng > mapBounds.east
        ) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const locationText =
          typeof property.location === "string"
            ? property.location
            : property.location?.address ||
            (property.location as any)?.["ที่อยู่"] ||
            "";
        const matchesSearch =
          property.title?.toLowerCase().includes(searchLower) ||
          locationText.toLowerCase().includes(searchLower) ||
          property.description?.toLowerCase().includes(searchLower) ||
          property.localized?.title?.th?.toLowerCase().includes(searchLower) ||
          property.localized?.title?.en?.toLowerCase().includes(searchLower) ||
          property.localized?.address?.th
            ?.toLowerCase()
            .includes(searchLower) ||
          property.localized?.address?.en
            ?.toLowerCase()
            .includes(searchLower) ||
          property.localized?.description?.th
            ?.toLowerCase()
            .includes(searchLower) ||
          property.localized?.description?.en
            ?.toLowerCase()
            .includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Property type filter
      if (propertyType !== "all") {
        if (!propertyMatchesType(property, propertyType as PropertyTypeCode)) {
          return false;
        }
      }

      // Listing type filter (rent/sale/sold/rented)
      if (listingType !== "all") {
        const isSold =
          property.status === "sold" ||
          (property as any).is_sold === true ||
          (property as any).isSold === true ||
          (property as any).sold === true ||
          (typeof property.status === "string" && /sold/i.test(property.status));

        const isRented =
          property.status === "rented" ||
          (property as any).is_rented === true ||
          (property as any).isRented === true ||
          (property as any).rented === true ||
          (typeof property.status === "string" &&
            /rented/i.test(property.status));

        if (listingType === "rent") {
          if (property.isForRent !== true || isRented || isSold) return false;
        } else if (listingType === "sale") {
          if (property.isForSale !== true || isSold || isRented) return false;
        } else if (listingType === "sold") {
          if (!isSold) return false;
        } else if (listingType === "rented") {
          if (!isRented) return false;
        }
      }

      // Bedrooms filter
      if (bedrooms !== "all") {
        if (bedrooms === "4") {
          // "4+ ห้องนอน" means 4 or more
          if ((property.details?.bedrooms ?? 0) < 4) return false;
        } else {
          const bedroomNum = parseInt(bedrooms);
          if ((property.details?.bedrooms ?? 0) !== bedroomNum) return false;
        }
      }

      // Price filter (using priceRange array)
      const price = parseInt(property.price.replace(/[^0-9]/g, "") || "0");
      if (
        !isNaN(price) &&
        price > 0 &&
        (price < priceRange[0] || price > priceRange[1])
      ) {
        return false;
      }

      return true;
    });

    // Apply sorting after filtering
    if (sortBy === "new-old") {
      // Assuming property.id can be parsed as a number and represents creation order
      currentFiltered.sort((a, b) => parseInt(b.id) - parseInt(a.id));
    } else if (sortBy === "price-asc") {
      currentFiltered.sort(
        (a, b) =>
          parseFloat(a.price.replace(/,/g, "")) -
          parseFloat(b.price.replace(/,/g, ""))
      );
    } else if (sortBy === "price-desc") {
      currentFiltered.sort(
        (a, b) =>
          parseFloat(b.price.replace(/,/g, "")) -
          parseFloat(a.price.replace(/,/g, ""))
      );
    }

    return currentFiltered;
  }, [
    propertiesWithLocation,
    searchQuery,
    propertyType,
    listingType,
    bedrooms,
    priceRange,
    sortBy,
    mapBounds,
  ]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header - Re-added as per image */}
      <div className="bg-blue-600 text-white p-4 flex-shrink-0">
        <div className="flex items-center justify-between w-full">
          {/* Back Button */}
          <button
            onClick={() => window.history.back()}
            className="text-white hover:text-blue-200 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            {t("back_label")}
          </button>

          {/* Search Input - now takes flex-1 and is centered relative to filters */}
          <div className="relative flex-1 mx-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              suppressHydrationWarning
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder={t("map_search_placeholder")}
            />
          </div>

          {/* Filter Dropdowns and Filters Button - pushed to the right */}
          <div className="hidden md:flex items-center gap-4">
            {/* Property Type Dropdown (ทุกประเภทอสังหาฯ) */}
            <select
              suppressHydrationWarning
              value={propertyType}
              onChange={e => setPropertyType(e.target.value)}
              className="w-40 bg-white border border-gray-300 rounded px-3 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              title="เลือกประเภทอสังหาริมทรัพย์"
              aria-label="เลือกประเภทอสังหาริมทรัพย์"
            >
              <option value="all">{t("property_type_all")}</option>
              <option value="condo">{t("property_type_condo")}</option>
              <option value="house">{t("property_type_house")}</option>
              <option value="townhouse">{t("property_type_townhouse")}</option>
              <option value="land">{t("property_type_land")}</option>
              <option value="commercial">
                {t("property_type_commercial")}
              </option>
            </select>

            {/* Listing Type Dropdown (ประกาศเช่า) */}
            <select
              suppressHydrationWarning
              value={listingType}
              onChange={e => setListingType(e.target.value)}
              className="w-40 bg-white border border-gray-300 rounded px-3 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              title="เลือกประเภทประกาศ"
              aria-label="เลือกประเภทประกาศ"
            >
              <option value="all">{t("listing_type_all")}</option>
              <option value="rent">{t("listing_type_rent")}</option>
              <option value="sale">{t("listing_type_sale")}</option>
              <option value="sold">ขายแล้ว</option>
              <option value="rented">เช่าแล้ว</option>
            </select>

            {/* Bedrooms Dropdown (ประเภทห้อง / จำนวนห้องนอน) */}
            <select
              suppressHydrationWarning
              value={bedrooms}
              onChange={e => setBedrooms(e.target.value)}
              className="w-40 bg-white border border-gray-300 rounded px-3 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              title="เลือกจำนวนห้องนอน"
              aria-label="เลือกจำนวนห้องนอน"
            >
              <option value="all">{t("filter_rooms_label")}</option>
              <option value="1">1 ห้องนอน</option>
              <option value="2">2 ห้องนอน</option>
              <option value="3">3 ห้องนอน</option>
              <option value="4">4+ ห้องนอน</option>
            </select>

            {/* Price Range Filter */}
            <div className="relative" ref={setDropdownRef("price")}>
              <div
                className="w-40 bg-white border border-gray-300 rounded px-3 py-1 text-sm text-gray-700 flex items-center justify-between cursor-pointer shadow-sm"
                onClick={() =>
                  setOpenDropdown(openDropdown === "price" ? null : "price")
                }
              >
                <span>{t("price_label")}</span>
                <ChevronDown className="w-4 h-4" />
              </div>
              {openDropdown === "price" && (
                <div className="absolute top-full mt-2 z-20 bg-white shadow-lg rounded-md border border-gray-200 w-64 sm:w-80 p-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-600">
                      {t("price_range_label")}
                    </h4>
                    <Slider
                      value={[priceRange[0]]}
                      max={100000000}
                      step={1000000}
                      onValueChange={value => {
                        const newMinRaw = Array.isArray(value)
                          ? value[0]
                          : Number(value);
                        const newMin = Math.min(
                          Math.max(0, newMinRaw),
                          100000000
                        );
                        setPriceRange([newMin, 100000000]);
                      }}
                      className="mb-6 [&_[role=slider]]:bg-blue-600 [&_[role=slider]]:border-blue-600"
                    />
                    <div className="flex flex-col sm:flex-row sm:justify-between mt-2 gap-4 sm:gap-0">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500">
                          {t("min_price_label")}
                        </span>
                        <input
                          type="text"
                          value={priceRange[0].toLocaleString()}
                          className="bg-white border border-gray-300 rounded px-2 py-1 text-sm w-32 mt-1 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          title={t("min_price_label")}
                          placeholder={t("min_price_label")}
                          onChange={e => {
                            const value = parseInt(
                              e.target.value.replace(/,/g, "")
                            );
                            if (!isNaN(value)) {
                              const newMin = Math.min(
                                Math.max(0, value),
                                100000000
                              );
                              setPriceRange([newMin, 100000000]);
                            }
                          }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500">
                          {t("max_price_label")}
                        </span>
                        <input
                          type="text"
                          value={(100000000).toLocaleString()}
                          className="bg-white border border-gray-300 rounded px-2 py-1 text-sm w-32 mt-1 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          title={t("max_price_label")}
                          placeholder={t("max_price_label")}
                          readOnly
                          disabled
                        />
                      </div>
                    </div>
                    <div className="flex justify-between mt-5">
                      <Button
                        variant="outline"
                        className="text-sm px-4 py-2 bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        onClick={() => setPriceRange([0, 100000000])}
                      >
                        {t("reset_button")}
                      </Button>
                      <Button
                        className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setOpenDropdown(null)}
                      >
                        {t("apply_button")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Filters Button (Replaced select with a clickable div and popover) */}
            <div
              id="filter-trigger"
              className="w-40 bg-white border border-gray-300 rounded px-3 py-1 text-sm text-gray-700 flex items-center justify-between cursor-pointer shadow-sm relative"
              onClick={() => setShowFilterPopover(!showFilterPopover)}
            >
              <span>เรียงตาม</span>
              <ChevronDown className="w-4 h-4" />

              {/* Filters Popover (conditionally rendered) */}
              {showFilterPopover && (
                <div
                  ref={filterPopoverRef}
                  className="absolute bg-white border border-gray-300 rounded-lg p-1 text-sm text-gray-700 w-48 flex flex-col items-start shadow-lg z-50 top-full left-0 mt-2"
                >
                  <div
                    className="w-full px-2 py-1 hover:bg-gray-100 cursor-pointer rounded-md"
                    onClick={() => {
                      setSortBy("new-old");
                      setShowFilterPopover(false);
                    }}
                  >
                    {t("sort_new_old")}
                  </div>
                  <div
                    className="w-full px-2 py-1 hover:bg-gray-100 cursor-pointer rounded-md"
                    onClick={() => {
                      setSortBy("price-asc");
                      setShowFilterPopover(false);
                    }}
                  >
                    {t("sort_price_asc")}
                  </div>
                  <div
                    className="w-full px-2 py-1 hover:bg-gray-100 cursor-pointer rounded-md"
                    onClick={() => {
                      setSortBy("price-desc");
                      setShowFilterPopover(false);
                    }}
                  >
                    {t("sort_price_desc")}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="md:hidden">
            <button
              onClick={() => setShowFilterModal(true)}
              className="bg-white text-blue-600 px-3 py-1 rounded-md text-sm font-medium"
            >
              กรอง
            </button>
          </div>
        </div>
      </div>

      {/* Filter Modal (Mobile) */}
      {showFilterModal && (
        <div className="md:hidden fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 w-11/12 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">กรอง</h3>
              <button onClick={() => setShowFilterModal(false)}>
                <X size={24} className="text-gray-600" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {/* Property Type Dropdown */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  ประเภทอสังหาฯ
                </label>
                <select
                  value={propertyType}
                  onChange={e => setPropertyType(e.target.value)}
                  className="w-full mt-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="all">{t("property_type_all")}</option>
                  <option value="condo">{t("property_type_condo")}</option>
                  <option value="house">{t("property_type_house")}</option>
                  <option value="townhouse">
                    {t("property_type_townhouse")}
                  </option>
                  <option value="land">{t("property_type_land")}</option>
                  <option value="commercial">
                    {t("property_type_commercial")}
                  </option>
                </select>
              </div>

              {/* Listing Type Dropdown */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  ประเภทประกาศ
                </label>
                <select
                  value={listingType}
                  onChange={e => setListingType(e.target.value)}
                  className="w-full mt-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="all">{t("listing_type_all")}</option>
                  <option value="rent">{t("listing_type_rent")}</option>
                  <option value="sale">{t("listing_type_sale")}</option>
                  <option value="sold">ขายแล้ว</option>
                  <option value="rented">เช่าแล้ว</option>
                </select>
              </div>

              {/* Bedrooms Dropdown */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  จำนวนห้องนอน
                </label>
                <select
                  value={bedrooms}
                  onChange={e => setBedrooms(e.target.value)}
                  className="w-full mt-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="all">{t("filter_rooms_label")}</option>
                  <option value="1">1 ห้องนอน</option>
                  <option value="2">2 ห้องนอน</option>
                  <option value="3">3 ห้องนอน</option>
                  <option value="4">4+ ห้องนอน</option>
                </select>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  ราคา
                </label>
                <div className="mt-1 bg-white border border-gray-300 rounded p-3 text-sm text-gray-700">
                  <Slider
                    value={[priceRange[0]]}
                    max={100000000}
                    step={1000000}
                    onValueChange={value => {
                      const newMinRaw = Array.isArray(value)
                        ? value[0]
                        : Number(value);
                      const newMin = Math.min(
                        Math.max(0, newMinRaw),
                        100000000
                      );
                      setPriceRange([newMin, 100000000]);
                    }}
                    className="mb-6 [&_[role=slider]]:bg-blue-600 [&_[role=slider]]:border-blue-600"
                  />
                  <div className="flex justify-between w-full text-xs font-medium text-gray-800 mb-2">
                    <span>{priceRange[0].toLocaleString()}</span>
                    <span>{(100000000).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">
                        {t("min_price_label")}
                      </span>
                      <input
                        type="text"
                        value={priceRange[0].toLocaleString()}
                        className="bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        title={t("min_price_label")}
                        placeholder={t("min_price_label")}
                        onChange={e => {
                          const value = parseInt(
                            e.target.value.replace(/,/g, "")
                          );
                          if (!isNaN(value)) {
                            const newMin = Math.min(
                              Math.max(0, value),
                              100000000
                            );
                            setPriceRange([newMin, 100000000]);
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">
                        {t("max_price_label")}
                      </span>
                      <input
                        type="text"
                        value={(100000000).toLocaleString()}
                        className="bg-white border border-gray-300 rounded px-2 py-1 text-sm mt-1 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        title={t("max_price_label")}
                        placeholder={t("max_price_label")}
                        readOnly
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sort by Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  เรียงตาม
                </label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full mt-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="default">{t("sort_default")}</option>
                  <option value="new-old">{t("sort_new_old")}</option>
                  <option value="price-asc">{t("sort_price_asc")}</option>
                  <option value="price-desc">{t("sort_price_desc")}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 relative w-full h-full">
        {/* Map always full width/height, อยู่ล่างสุด */}
        <div className="w-full h-full absolute inset-0 z-0">
          <PropertyMapNew
            properties={displayProperties}
            activePropertyId={activePropertyId}
            hoveredPropertyId={hoveredPropertyId}
            onMarkerClickForSidebar={handleMarkerClickForSidebar}
            onMarkerHover={handleMarkerHover}
            onMarkerLeave={handleMarkerLeave}
            center={initialCenter}
            zoom={initialZoom}
            targetPosition={mapTarget}
            focusProperty={focusProperty}
            onBoundsChange={handleMapBoundsChange}
          />
        </div>

        {/* Sidebar Overlay อยู่บน map เสมอ - ลดความกว้างในมือถือ */}
        <div
          className={`absolute top-0 left-0 h-full w-[85%] sm:w-[90%] md:w-[650px] z-20 bg-blue-600 border-r shadow-lg transform transition-all duration-300 ease-in-out ${showSidebar
            ? "translate-x-0 opacity-100"
            : "-translate-x-full opacity-0"
            }`}
        >
          {/* รายการการ์ด - มี scroll แต่ซ่อน scrollbar - ลด padding ในมือถือ */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 scrollbar-hide max-h-screen-minus-70">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-white">{t("loading")}</div>
              </div>
            ) : (
              <div>
                {/* รายการ Property แบบ 2 คอลัมน์ในมือถือและแท็บเล็ต */}
                <div className="grid grid-cols-2 gap-1.5 md:gap-3">
                  {displayProperties.map(property => (
                    <div
                      key={property.id}
                      id={`property-${property.id}`}
                      className="map-property-card-wrapper"
                    >
                      <PropertyCard
                        property={property}
                        showMapButton={true}
                        onMapClick={handleViewOnMap}
                        isActive={property.id === activePropertyId}
                      />
                    </div>
                  ))}
                </div>
                {displayProperties.length === 0 && !isLoading && (
                  <div className="text-center text-white py-8">
                    {t("not_found_list")}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* ปุ่มปิด sidebar - แบบแถบสีน้ำเงินตามภาพ - อยู่กลางแนวนอน ข้างนอกแถบ */}
          <button
            className="absolute top-1/2 -right-8 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 rounded-r-lg shadow-lg transition-all duration-300 hover:scale-105 z-50 flex items-center justify-center w-10 h-20"
            onClick={() => setShowSidebar(false)}
            aria-label="ปิดรายการ"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
      {/* ปุ่มเปิด sidebar (fixed overlay) */}
      {!showSidebar && (
        <button
          className="fixed top-[55%] left-0 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 rounded-r-lg shadow-lg transition-all duration-300 hover:scale-105 z-50 flex items-center justify-center w-10 h-20"
          onClick={() => setShowSidebar(true)}
          aria-label="แสดงรายการ"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Custom CSS to hide scrollbar และลดขนาดการ์ดในมือถือ */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none; /* Internet Explorer 10+ */
          scrollbar-width: none; /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none; /* Safari and Chrome */
        }
        .max-h-screen-minus-70 {
          max-height: calc(100vh - 70px);
        }
        /* ลดขนาดการ์ดในมือถือ - ทำให้เล็กลงมาก */
        @media (max-width: 767px) {
          .map-property-card-wrapper {
            max-width: 100% !important;
          }
          .map-property-card-wrapper > div {
            border-radius: 0.5rem !important;
          }
          .map-property-card-wrapper .property-card-image {
            height: 6rem !important; /* h-24 - สูงขึ้นเล็กน้อย */
          }
          .map-property-card-wrapper .property-card-content {
            padding: 0.375rem !important; /* p-1.5 */
          }
          .map-property-card-wrapper .property-card-title {
            font-size: 0.6875rem !important; /* text-xs เล็ก */
            line-height: 0.875rem !important;
            margin-bottom: 0.125rem !important;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .map-property-card-wrapper .property-card-content > div:first-child {
            margin-top: 0 !important;
            margin-bottom: 0.125rem !important;
            gap: 0.125rem !important;
          }
          .map-property-card-wrapper
            .property-card-content
            > div:first-child
            > div:last-child {
            font-size: 0.5625rem !important; /* text-xs เล็กมาก */
            margin-top: 0 !important;
            line-height: 0.75rem !important;
          }
          .map-property-card-wrapper .property-card-content > div:nth-child(2) {
            margin-top: 0.125rem !important;
            padding-bottom: 0.375rem !important;
            margin-bottom: 0.375rem !important;
            border-bottom-width: 1px !important;
          }
          .map-property-card-wrapper .property-card-price {
            font-size: 0.75rem !important; /* text-xs */
            line-height: 1rem !important;
          }
          .map-property-card-wrapper .property-card-price-suffix {
            font-size: 0.625rem !important; /* text-xs เล็ก */
            line-height: 0.875rem !important;
          }
          /* PropertyDetailsGrid - เรียงแนวยาว (1 แถว 4 คอลัมน์) และลดขนาด */
          .map-property-card-wrapper
            .property-card-content
            > div[class*="grid"] {
            gap: 0.125rem !important;
            margin-top: 0.25rem !important;
            margin-bottom: 0.25rem !important;
            grid-template-columns: repeat(
              4,
              minmax(0, 1fr)
            ) !important; /* 4 คอลัมน์ใน 1 แถว */
          }
          .map-property-card-wrapper
            .property-card-content
            > div[class*="grid"]
            > div {
            font-size: 0.5rem !important;
            padding: 0.125rem 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 0.0625rem !important;
          }
          .map-property-card-wrapper
            .property-card-content
            > div[class*="grid"]
            > div
            > div:first-child {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 0.0625rem !important;
          }
          .map-property-card-wrapper
            .property-card-content
            > div[class*="grid"]
            svg,
          .map-property-card-wrapper
            .property-card-content
            > div[class*="grid"]
            img {
            width: 0.625rem !important;
            height: 0.625rem !important;
          }
          .map-property-card-wrapper
            .property-card-content
            > div[class*="grid"]
            > div
            > div:first-child
            > span {
            font-size: 0.5rem !important;
            font-weight: 600 !important;
          }
          .map-property-card-wrapper
            .property-card-content
            > div[class*="grid"]
            > div
            > span:last-child {
            font-size: 0.4375rem !important; /* 7px - เล็กมาก */
            line-height: 0.625rem !important;
            text-align: center !important;
            margin-top: 0.0625rem !important;
          }
          /* ลดขนาด view count */
          .map-property-card-wrapper
            .property-card-content
            > div:last-child:not([class*="grid"]) {
            margin-top: 0.125rem !important;
            margin-bottom: 0 !important;
            font-size: 0.5rem !important;
            padding: 0 !important;
          }
          .map-property-card-wrapper
            .property-card-content
            > div:last-child:not([class*="grid"])
            svg {
            width: 0.625rem !important;
            height: 0.625rem !important;
          }
          /* ลดขนาด badges และ actions */
          .map-property-card-wrapper .absolute.top-3 {
            top: 0.375rem !important;
          }
          .map-property-card-wrapper .absolute.top-3.left-3 {
            left: 0.375rem !important;
          }
          .map-property-card-wrapper .absolute.top-3.left-3 span {
            font-size: 0.5rem !important;
            padding: 0.125rem 0.25rem !important;
            line-height: 0.75rem !important;
          }
          .map-property-card-wrapper .absolute.top-3.left-3 svg {
            width: 0.5rem !important;
            height: 0.5rem !important;
            margin-right: 0.125rem !important;
          }
          .map-property-card-wrapper .absolute.top-3.right-3 {
            right: 0.375rem !important;
          }
          .map-property-card-wrapper .absolute.top-3.right-3 button {
            padding: 0.125rem !important;
            width: 1.25rem !important;
            height: 1.25rem !important;
          }
          .map-property-card-wrapper .absolute.top-3.right-3 svg {
            width: 0.75rem !important;
            height: 0.75rem !important;
          }
        }
        @keyframes card-shake {
          10%,
          90% {
            transform: translate3d(-1px, 0, 0);
          }
          20%,
          80% {
            transform: translate3d(2px, 0, 0);
          }
          30%,
          50%,
          70% {
            transform: translate3d(-4px, 0, 0);
          }
          40%,
          60% {
            transform: translate3d(4px, 0, 0);
          }
        }
        .shake-effect {
          animation: card-shake 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
      `}</style>
    </div>
  );
}

export default function PropertySearchPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">กำลังโหลดแผนที่...</p>
          </div>
        </div>
      }
    >
      <PropertySearchContent />
    </Suspense>
  );
}
