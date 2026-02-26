"use client";
import { HeroSection } from "@/components/layout/hero-section";
import { PropertyCard } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/contexts/language-context";
import { useProperty } from "@/contexts/property-context";
import { ChevronDown, MapPin, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function AllPropertiesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState([0, 100000000]); // 1,000 ล้านบาท
  type PropertyTypeCode =
    | "condo"
    | "house"
    | "land"
    | "office"
    | "townhouse"
    | "commercial";
  type RentalTypeCode = "rent" | "sale" | "sold" | "rented";
  const [selectedPropertyType, setSelectedPropertyType] =
    useState<PropertyTypeCode | null>(null);
  const [selectedRentalType, setSelectedRentalType] =
    useState<RentalTypeCode | null>(null);
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [showOnlyProjects, setShowOnlyProjects] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<string | null>(null);
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  const router = useRouter();
  const searchParams = useSearchParams();

  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // ใช้ข้อมูลจาก context แทนการโหลดใหม่
  const {
    allProperties,
    allNewProperties,
    isLoading,
    dataSource,
    refreshData,
  } = useProperty();

  // ใช้ข้อมูลทั้งหมดที่เรียงตาม viewCount แล้วจาก context
  const { t } = useLanguage();

  const getPropertyTypeLabel = (code: PropertyTypeCode): string => {
    switch (code) {
      case "condo":
        return t("property_type_condo");
      case "house":
        return t("property_type_house");
      case "land":
        return t("property_type_land");
      case "office":
        return "สำนักงาน";
      case "townhouse":
        return "ทาวน์โฮม";
      case "commercial":
        return "อาคารพาณิชย์";
      default:
        return t("filter_type_label");
    }
  };

  const getRentalTypeLabel = (code: RentalTypeCode): string => {
    switch (code) {
      case "rent":
        return t("rental_type_rent");
      case "sale":
        return t("rental_type_sale");
      case "sold":
        return "ขายแล้ว";
      case "rented":
        return "เช่าแล้ว";
      default:
        return t("filter_rental_label");
    }
  };

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

  // Set initial search query from URL
  useEffect(() => {
    const locationParam = searchParams.get("location");
    if (locationParam) {
      setSearchQuery(locationParam);
    }
    // Support listingType, isNew, isProject filters from topbar
    const listingType = searchParams.get("listingType");
    if (listingType) {
      const lt = listingType.toLowerCase();
      if (lt === "rent" || lt === "rental") {
        setSelectedRentalType("rent");
      } else if (lt === "sale" || lt === "buy") {
        setSelectedRentalType("sale");
      }
    }

    const isNewParam = searchParams.get("isNew");
    if (isNewParam === "true") setShowOnlyNew(true);

    const isProjectParam = searchParams.get("isProject");
    if (isProjectParam === "true") setShowOnlyProjects(true);
  }, [searchParams]);

  // Fix for TypeScript ref callback error
  const setDropdownRef = (key: string) => (el: HTMLDivElement | null) => {
    dropdownRefs.current[key] = el;
    return undefined;
  };

  // Close dropdown when clicking outside
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

  // ใช้ข้อมูลจากฐานข้อมูลจริงเท่านั้นสำหรับหน้า all-properties
  // ถ้า dataSource เป็น "static" แสดงว่าไม่มีข้อมูลจากฐานข้อมูล → ไม่แสดงข้อมูลจำลอง
  const isUsingDatabase = dataSource === "supabase";
  const baseProperties = isUsingDatabase ? allProperties : [];

  // กรองรายการตามตัวกรองที่ผู้ใช้เลือก
  const filteredProperties = baseProperties.filter(property => {
    // Filter by New/Project shortcuts
    if (showOnlyNew) {
      // Only keep properties that are in the "new" list from context
      // Use the context's allNewProperties via useProperty above
      // If property is not among recent new properties, exclude it
      // Compare by id
      const isInNew = (allNewProperties || []).some(p => p.id === property.id);
      if (!isInNew) return false;
    }

    if (showOnlyProjects) {
      const text = (
        (property.title || "") +
        " " +
        (property.description || "")
      ).toLowerCase();
      const listingTypes = (property.listing_type || [])
        .map(String)
        .join(" ")
        .toLowerCase();
      const isProject =
        text.includes("project") ||
        text.includes("โครงการ") ||
        listingTypes.includes("project") ||
        (property as any).in_project === true;
      if (!isProject) return false;
    }
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      let searchableLocationText = "";

      if (typeof property.location === "string") {
        searchableLocationText += property.location + " ";
      } else if (
        typeof property.location === "object" &&
        property.location !== null
      ) {
        if (property.location.address)
          searchableLocationText += property.location.address + " ";
        if (property.location.ที่อยู่)
          searchableLocationText += property.location.ที่อยู่ + " ";
      }
      if (property.localized?.address?.en)
        searchableLocationText += property.localized.address.en + " ";
      if (property.localized?.address?.th)
        searchableLocationText += property.localized.address.th + " ";
      if (property.area_around)
        searchableLocationText += property.area_around + " ";

      const matchesSearch =
        property.title?.toLowerCase().includes(searchLower) ||
        searchableLocationText.toLowerCase().includes(searchLower) ||
        property.description?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Property type filter
    if (selectedPropertyType) {
      if (!propertyMatchesType(property, selectedPropertyType)) return false;
    }

    // Rental type filter
    if (selectedRentalType) {
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

      switch (selectedRentalType) {
        case "rent":
          if (property.isForRent !== true || isRented || isSold) return false;
          break;
        case "sale":
          if (property.isForSale !== true || isSold || isRented) return false;
          break;
        case "sold":
          if (!isSold) return false;
          break;
        case "rented":
          if (!isRented) return false;
          break;
        default:
          break;
      }
    }

    // Room filter
    if (selectedRooms) {
      if (selectedRooms === "5+") {
        if ((property.details?.bedrooms ?? 0) < 5) return false;
      } else {
        const rooms = parseInt(selectedRooms, 10);
        if ((property.details?.bedrooms ?? 0) !== rooms) return false;
      }
    }

    // Price filter
    const price = parseInt(property.price?.replace(/,/g, "") || "0");
    // ถ้าราคาเป็น 0 หรือ NaN ให้ข้ามการกรองราคา
    if (
      !isNaN(price) &&
      price > 0 &&
      (price < priceRange[0] || price > priceRange[1])
    ) {
      return false;
    }

    return true;
  });

  // Pagination logic
  const totalItems = filteredProperties.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProperties = filteredProperties.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedPropertyType,
    selectedRentalType,
    selectedRooms,
    priceRange,
    showOnlyNew,
    showOnlyProjects,
  ]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) return; // Don't interfere with browser shortcuts

      if (event.key === "ArrowLeft" && currentPage > 1) {
        event.preventDefault();
        setCurrentPage(prev => prev - 1);
      } else if (event.key === "ArrowRight" && currentPage < totalPages) {
        event.preventDefault();
        setCurrentPage(prev => prev + 1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <HeroSection
        activeFilter={activeFilter}
        onFilterChangeAction={setActiveFilter}
        showSearchSection={false}
      />

      <div className="container mx-auto px-4 py-8 flex-1">
        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-xl font-sukhumvit text-gray-700">
              {t("loading_properties")}
            </p>
          </div>
        ) : (
          <>
            {/* Search and Filter Bar */}
            <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              {/* Search */}
              <div className="flex-grow min-w-64">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t("all_props_search_placeholder")}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 hover:text-gray-600"
                      title="ล้างคำค้นหา"
                    >
                      <X />
                    </button>
                  )}
                </div>
              </div>
              {/* Property Type Filter */}
              <div className="relative" ref={setDropdownRef("propertyType")}>
                <FilterButton
                  label={
                    selectedPropertyType
                      ? getPropertyTypeLabel(selectedPropertyType)
                      : t("filter_type_label")
                  }
                  isActive={!!selectedPropertyType}
                  onClick={() =>
                    setOpenDropdown(
                      openDropdown === "propertyType" ? null : "propertyType"
                    )
                  }
                  hasDropdown
                />
                {openDropdown === "propertyType" && (
                  <div className="absolute top-full mt-2 z-20 bg-white shadow-lg rounded-md border border-gray-200 w-full sm:w-48 p-4">
                    <div className="space-y-2">
                      <PropertyTypeOption
                        label={t("property_type_condo")}
                        isSelected={selectedPropertyType === "condo"}
                        onClick={() => {
                          setSelectedPropertyType(
                            selectedPropertyType === "condo" ? null : "condo"
                          );
                          setOpenDropdown(null);
                        }}
                      />
                      <PropertyTypeOption
                        label={t("property_type_house")}
                        isSelected={selectedPropertyType === "house"}
                        onClick={() => {
                          setSelectedPropertyType(
                            selectedPropertyType === "house" ? null : "house"
                          );
                          setOpenDropdown(null);
                        }}
                      />
                      <PropertyTypeOption
                        label={t("property_type_land")}
                        isSelected={selectedPropertyType === "land"}
                        onClick={() => {
                          setSelectedPropertyType(
                            selectedPropertyType === "land" ? null : "land"
                          );
                          setOpenDropdown(null);
                        }}
                      />
                      <PropertyTypeOption
                        label="สำนักงาน"
                        isSelected={selectedPropertyType === "office"}
                        onClick={() => {
                          setSelectedPropertyType(
                            selectedPropertyType === "office" ? null : "office"
                          );
                          setOpenDropdown(null);
                        }}
                      />
                      <PropertyTypeOption
                        label="ทาวน์โฮม"
                        isSelected={selectedPropertyType === "townhouse"}
                        onClick={() => {
                          setSelectedPropertyType(
                            selectedPropertyType === "townhouse"
                              ? null
                              : "townhouse"
                          );
                          setOpenDropdown(null);
                        }}
                      />
                      <PropertyTypeOption
                        label="อาคารพาณิชย์"
                        isSelected={selectedPropertyType === "commercial"}
                        onClick={() => {
                          setSelectedPropertyType(
                            selectedPropertyType === "commercial"
                              ? null
                              : "commercial"
                          );
                          setOpenDropdown(null);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* Rental Type Filter */}
              <div className="relative" ref={setDropdownRef("rentalType")}>
                <FilterButton
                  label={
                    selectedRentalType
                      ? getRentalTypeLabel(selectedRentalType)
                      : t("filter_rental_label")
                  }
                  isActive={!!selectedRentalType}
                  onClick={() =>
                    setOpenDropdown(
                      openDropdown === "rentalType" ? null : "rentalType"
                    )
                  }
                  hasDropdown
                />
                {openDropdown === "rentalType" && (
                  <div className="absolute top-full mt-2 z-20 bg-white shadow-lg rounded-md border border-gray-200 w-full sm:w-40 p-4">
                    <div className="space-y-2">
                      <PropertyTypeOption
                        label={t("rental_type_rent")}
                        isSelected={selectedRentalType === "rent"}
                        onClick={() => {
                          setSelectedRentalType(
                            selectedRentalType === "rent" ? null : "rent"
                          );
                          setOpenDropdown(null);
                        }}
                      />
                      <PropertyTypeOption
                        label={t("rental_type_sale")}
                        isSelected={selectedRentalType === "sale"}
                        onClick={() => {
                          setSelectedRentalType(
                            selectedRentalType === "sale" ? null : "sale"
                          );
                          setOpenDropdown(null);
                        }}
                      />
                      <PropertyTypeOption
                        label="ขายแล้ว"
                        isSelected={selectedRentalType === "sold"}
                        onClick={() => {
                          setSelectedRentalType(
                            selectedRentalType === "sold" ? null : "sold"
                          );
                          setOpenDropdown(null);
                        }}
                      />
                      <PropertyTypeOption
                        label="เช่าแล้ว"
                        isSelected={selectedRentalType === "rented"}
                        onClick={() => {
                          setSelectedRentalType(
                            selectedRentalType === "rented" ? null : "rented"
                          );
                          setOpenDropdown(null);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* Rooms Filter */}
              <div className="relative" ref={setDropdownRef("rooms")}>
                <FilterButton
                  label={
                    selectedRooms
                      ? `${selectedRooms} ${t("bedrooms")}`
                      : t("filter_rooms_label")
                  }
                  isActive={!!selectedRooms}
                  onClick={() =>
                    setOpenDropdown(openDropdown === "rooms" ? null : "rooms")
                  }
                  hasDropdown
                />
                {openDropdown === "rooms" && (
                  <div className="absolute top-full mt-2 z-20 bg-white shadow-lg rounded-md border border-gray-200 w-full sm:w-48 p-4">
                    <div className="grid grid-cols-3 gap-2">
                      {["1", "2", "3", "4", "5+"].map(room => (
                        <RoomOption
                          key={room}
                          label={room}
                          isSelected={selectedRooms === room}
                          onClick={() => {
                            setSelectedRooms(
                              selectedRooms === room ? null : room
                            );
                            setOpenDropdown(null);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Price Range Filter */}
              <div className="relative" ref={setDropdownRef("price")}>
                <FilterButton
                  label={t("filter_price_label")}
                  isActive={priceRange[0] !== 0 || priceRange[1] !== 100000000}
                  onClick={() =>
                    setOpenDropdown(openDropdown === "price" ? null : "price")
                  }
                  hasDropdown
                />
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
                        {" "}
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
                        </div>{" "}
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
              <div className="flex-grow"></div>{" "}
              {/* Map View Toggle - Navigate to Map Page */}
              <Link href="/map">
                <Button className="px-4 py-2 rounded-md flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700">
                  <MapPin size={16} />
                  {t("show_map")}
                </Button>
              </Link>
              {/* Clear Filters */}
              {(searchQuery ||
                selectedPropertyType ||
                selectedRentalType ||
                selectedRooms ||
                priceRange[0] !== 0 ||
                priceRange[1] !== 100000000) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedPropertyType(null);
                    setSelectedRentalType(null);
                    setSelectedRooms(null);
                    setPriceRange([0, 100000000]);
                  }}
                  className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                  {t("clear_filters")}
                </Button>
              )}
              {/* Refresh Data */}
              <Button
                variant="outline"
                onClick={() => {
                  // ล้าง localStorage cache
                  localStorage.removeItem("property-data-cache");
                  localStorage.removeItem("property-data-cache-expiry");
                  refreshData();
                }}
                className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                {t("refresh_data")}
              </Button>
            </div>{" "}
            {/* Results / Content */}
            {baseProperties.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-2xl font-sukhumvit text-gray-800 font-semibold">
                  {t("no_properties_from_db_title")}
                </p>
                <p className="text-gray-500 mt-3 font-sukhumvit">
                  {t("no_properties_from_db_desc")}
                </p>
              </div>
            ) : (
              <>
                {/* Results Count and Pagination Info */}
                <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0">
                  <div>
                    <h1 className="text-2xl font-bold mb-2 font-sukhumvit text-gray-900">
                      {t("results_title")}
                    </h1>
                    <div className="flex items-center gap-3">
                      <p className="text-gray-600 font-sukhumvit">
                        {t("results_showing")} {startIndex + 1}-
                        {Math.min(endIndex, totalItems)} {t("results_of")}{" "}
                        {totalItems}
                      </p>
                    </div>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setCurrentPage(prev => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t("previous_page")} {t("prev")}
                      </Button>
                      <span className="px-3 py-1 text-sm text-gray-600 bg-gray-50 rounded">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setCurrentPage(prev => Math.min(totalPages, prev + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t("next")} {t("next_page")}
                      </Button>
                    </div>
                  )}
                </div>
                {/* Main Content */}{" "}
                {filteredProperties.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-xl text-gray-500 font-sukhumvit">
                      {t("no_properties_title")}
                    </p>
                    <p className="text-gray-400 mt-2 font-sukhumvit">
                      {t("try_adjust_filters")}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 xl:gap-8 pb-4">
                      {paginatedProperties.map(property => (
                        <div key={property.id} className="w-full h-full flex">
                          <div className="w-full h-full aspect-[2/3]">
                            <PropertyCard property={property} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Bottom Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-12">
                        <div className="flex flex-col items-center gap-4">
                          {/* Navigation hint */}
                          <p className="text-sm text-gray-500"></p>

                          <div className="flex flex-col sm:flex-row items-center gap-4">
                            <Button
                              variant="outline"
                              onClick={() =>
                                setCurrentPage(prev => Math.max(prev - 1, 1))
                              }
                              disabled={currentPage === 1}
                              className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="หน้าก่อนหน้า (←)"
                            >
                              {t("previous_page")}
                            </Button>

                            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg">
                              <span className="text-sm text-gray-600">
                                {t("page_label")}
                              </span>
                              <span className="px-4 py-1 bg-blue-600 text-white rounded-lg font-medium min-w-[3rem] text-center">
                                {currentPage}
                              </span>
                              <span className="text-sm text-gray-600">
                                {t("of_label")} {totalPages}
                              </span>
                            </div>

                            <Button
                              variant="outline"
                              onClick={() =>
                                setCurrentPage(prev =>
                                  Math.min(prev + 1, totalPages)
                                )
                              }
                              disabled={currentPage === totalPages}
                              className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="หน้าถัดไป (→)"
                            >
                              {t("next_page")}
                            </Button>
                          </div>
                          {/* Performance info */}
                          <div className="text-xs text-gray-400"></div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-[#006CE3] text-white p-6 mt-auto">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">
                {t("footer_company_name")}
              </h3>
              <p className="text-sm text-gray-300">
                {t("footer_company_description")}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-3">{t("footer_about_us")}</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <a href="#" className="hover:text-white">
                    {t("footer_about_teedin")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("footer_contact_us")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("footer_join_us")}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">{t("footer_our_services")}</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <a href="#" className="hover:text-white">
                    {t("footer_buy_house")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("footer_rent_house")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("footer_sell_house")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("footer_appraise_price")}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">{t("footer_follow_us")}</h4>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  <span className="sr-only">Facebook</span>
                  <svg
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  <span className="sr-only">Instagram</span>
                  <svg
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  <span className="sr-only">Twitter</span>
                  <svg
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white-700 text-sm text-white-400">
            <p>{t("footer_copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper Components
interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  hasDropdown?: boolean;
}

function FilterButton({
  label,
  isActive,
  onClick,
  hasDropdown = false,
}: FilterButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded-md flex items-center ${isActive ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-300"}`}
      onClick={onClick}
    >
      <span>{label}</span>
      {hasDropdown && <ChevronDown className="ml-1 h-4 w-4" />}
    </button>
  );
}

interface PropertyTypeOptionProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  hot?: boolean;
}

function PropertyTypeOption({
  label,
  isSelected,
  onClick,
  hot = false,
}: PropertyTypeOptionProps) {
  return (
    <div
      className="flex items-center justify-between cursor-pointer hover:bg-blue-50 p-2 rounded"
      onClick={onClick}
    >
      <span
        className={`${isSelected ? "text-blue-600 font-medium" : "text-gray-800"}`}
      >
        {label}
      </span>
      <div className="flex items-center">
        {hot && (
          <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded mr-2">
            HOT
          </span>
        )}
        {isSelected && (
          <div className="w-4 h-4 flex items-center justify-center bg-blue-600 rounded-full text-white">
            ✓
          </div>
        )}
      </div>
    </div>
  );
}

interface RoomOptionProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

function RoomOption({ label, isSelected, onClick }: RoomOptionProps) {
  return (
    <div
      className={`px-3 py-2 rounded-md cursor-pointer text-center ${isSelected ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-blue-50"}`}
      onClick={onClick}
    >
      {label}
    </div>
  );
}
