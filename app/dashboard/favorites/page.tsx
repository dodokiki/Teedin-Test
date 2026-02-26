"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { extractErrorMessage } from "@/lib/error-utils";
import {
  mapPropertyDetailRow,
  type PropertyData,
  type PropertyDetailRow,
} from "@/lib/property-helpers";
import { createClient } from "@supabase/supabase-js";
import { Check, Heart, Search, Share2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://your-supabase-url.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-supabase-anon-key"
);

export default function FavoritesPage() {
  const [favoriteListings, setFavoriteListings] = useState<PropertyData[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [showCompareTable, setShowCompareTable] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [nudgeBubble, setNudgeBubble] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  const formatHighlight = (text?: string | null) => {
    if (!text) return "";
    return text
      .replace(/<br\s*\/?>/gi, "\n")
      .split("\n")
      .map(part => part.trim())
      .filter(Boolean)
      .join(" • ");
  };

  // Function to remove property from favorites list
  const handleRemoveFromFavorites = (propertyId: string) => {
    setFavoriteListings(prev =>
      prev.filter(property => property.id !== propertyId)
    );
    setSelectedProperties(prev => prev.filter(id => id !== propertyId));
  };

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        let query = supabase.from("property_details").select(`
            view_count,
            created_at,
            status,
            property_id,
            project_name,
            address,
            usable_area,
            bedrooms,
            bathrooms,
            parking_spaces,
            latitude,
            longitude,
            house_condition,
            highlight,
            area_around,
            description,
            facilities,
            project_facilities,
            images,
            price,
            properties(listing_type)
          `);

        if (user?.id) {
          const { data: favorites, error: favoritesError } = await supabase
            .from("favorites")
            .select("property_id")
            .eq("customer_id", user.id);

          if (favoritesError) {
            console.error("Error fetching favorites:", favoritesError.message);
            setFavoriteListings([]); // Clear listings on error or no favorites
            setIsLoading(false); // หยุดโหลดเมื่อเกิด error
            return;
          }

          if (favorites && favorites.length > 0) {
            const propertyIds = favorites.map(
              (fav: { property_id: string }) => fav.property_id
            );
            query = query.in("property_id", propertyIds);
          } else {
            // ไม่มี favorites - หยุดโหลดทันที
            setFavoriteListings([]);
            setIsLoading(false);
            return;
          }
        } else {
          // If no user, no favorites to show - หยุดโหลดทันที
          setFavoriteListings([]);
          setIsLoading(false);
          return;
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching data:", extractErrorMessage(error));
          setFavoriteListings([]); // Clear listings on error
          setIsLoading(false); // หยุดโหลดเมื่อเกิด error
          return;
        }

        if (!data || data.length === 0) {
          // ไม่มีข้อมูล - หยุดโหลดทันที
          setFavoriteListings([]);
          setIsLoading(false);
          return;
        }

        const mappedData = (data as PropertyDetailRow[]).map(
          mapPropertyDetailRow
        );
        setFavoriteListings(mappedData);
      } catch (err) {
        console.error(
          "Unexpected error fetching favorites data:",
          extractErrorMessage(err)
        );
        setFavoriteListings([]); // Clear listings on unexpected error
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user?.id]); // Depend on user.id to refetch when user state changes

  const handlePropertySelect = (id: string) => {
    if (selectedProperties.includes(id)) {
      setSelectedProperties(selectedProperties.filter(propId => propId !== id));
    } else {
      setSelectedProperties([...selectedProperties, id]);
    }
  };

  const handleCompare = () => {
    if (selectedProperties.length < 2) {
      alert(t("favorites_compare_alert"));
      return;
    }
    if (showCompareTable && isMinimized) {
      setNudgeBubble(true);
      setTimeout(() => setNudgeBubble(false), 800);
    } else {
      setIsMinimized(false);
      setShowCompareTable(true);
    }
  };

  const closeCompareTable = () => {
    setShowCompareTable(false);
    setIsMinimized(false);
    setSelectedProperties([]);
  };

  const minimizeCompareTable = () => {
    setIsMinimized(true);
  };

  const maximizeCompareTable = () => {
    setShouldAnimate(false);
    setIsMinimized(false);
    // Re-enable animation after maximizing
    setTimeout(() => {
      setShouldAnimate(true);
    }, 50);
  };

  // Handle ESC key and click outside to minimize comparison table
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showCompareTable && !isMinimized) {
        minimizeCompareTable();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (showCompareTable && !isMinimized) {
        const target = event.target as Element;
        const compareModal = document.querySelector("[data-compare-modal]");
        if (compareModal && !compareModal.contains(target)) {
          minimizeCompareTable();
        }
      }
    };

    // Add event listeners when comparison table is open and not minimized
    if (showCompareTable && !isMinimized) {
      document.addEventListener("keydown", handleEscKey);
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Cleanup event listeners
    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCompareTable, isMinimized]);

  const selectedListings = favoriteListings.filter(listing =>
    selectedProperties.includes(listing.id)
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gray-50 h-screen flex flex-col px-4 sm:px-6 lg:px-8 py-4 overflow-auto">
        <h1 className="text-3xl font-bold mb-6 flex-shrink-0">
          {t("favorites_title")}
        </h1>

        {/* Loading skeleton */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 flex-shrink-0">
          <div className="relative flex-grow">
            <div className="w-full h-12 bg-gray-200 rounded-md animate-pulse"></div>
          </div>
          <div className="h-12 w-40 bg-gray-200 rounded-md animate-pulse"></div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 flex-shrink-0">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="w-24 h-10 bg-gray-200 rounded-md animate-pulse"
            ></div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pb-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100"
              >
                <div className="w-full h-56 bg-gray-200 animate-pulse"></div>
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(j => (
                      <div
                        key={j}
                        className="h-12 bg-gray-200 rounded animate-pulse"
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 h-screen flex flex-col px-4 sm:px-6 lg:px-8 py-4 overflow-auto font-sans text-[15px] text-[#222]">
      <h1 className="text-[24px] font-semibold mb-4 flex-shrink-0 text-[#222]">
        {t("favorites_page_title")}
      </h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6 flex-shrink-0">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder={t("search_placeholder_favorites")}
            className="w-full h-12 pl-4 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-[15px] font-sans text-[#222]"
          />
          <button className="absolute right-0 top-0 h-full w-16 bg-blue-600 text-white rounded-r-md flex items-center justify-center text-[15px] font-sans">
            <Search className="text-white" />
          </button>
        </div>
        <Button
          className={`h-12 ${selectedProperties.length >= 2 ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400"}`}
          onClick={handleCompare}
          disabled={selectedProperties.length < 2}
        >
          {t("compare_price")}{" "}
          {selectedProperties.length > 0 && `(${selectedProperties.length})`}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 flex-shrink-0">
        {["all", "rent", "sale"].map(filter => (
          <button
            key={filter}
            className={`px-4 py-2 rounded-md text-[15px] font-sans ${
              activeFilter === filter
                ? "bg-blue-600 text-white"
                : "bg-blue-100 text-blue-800"
            }`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter === "all"
              ? t("all_properties")
              : filter === "rent"
                ? t("rent")
                : t("sale")}
          </button>
        ))}
      </div>

      {favoriteListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <Heart className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-[18px] font-semibold text-[#222] mb-2">
            {t("no_favorites_title")}
          </h3>
          <p className="text-[#888] mb-6">{t("no_favorites_desc")}</p>
          <Button
            onClick={() => router.push("/")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-[15px] font-sans"
          >
            {t("start_search")}
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pb-4">
            {favoriteListings
              .filter(listing => {
                const types = listing.listingTypes ?? [];
                if (activeFilter !== "all") {
                  console.log("FILTER:", {
                    id: listing.id,
                    types,
                    isForSale: listing.isForSale,
                    isForRent: listing.isForRent,
                    status: listing.status,
                    activeFilter,
                  });
                }
                if (activeFilter === "all") return true;
                if (activeFilter === "rent") {
                  if (types.length > 0) {
                    return types.some(
                      t => t.includes("rent") || t.includes("เช่า")
                    );
                  }
                  // fallback: use isForRent or status
                  return (
                    listing.isForRent === true ||
                    (listing.status &&
                      ["for_rent", "เช่า", "rent"].includes(
                        String(listing.status).toLowerCase()
                      ))
                  );
                }
                if (activeFilter === "sale") {
                  if (types.length > 0) {
                    // ต้องมี "ขาย" หรือ "sale" และต้องไม่มี "เช่า" หรือ "rent" เลย (ถ้ามี "เช่า" หรือ "rent" แม้แต่ตัวเดียวจะไม่แสดง)
                    if (
                      types.some(t => t.includes("rent") || t.includes("เช่า"))
                    ) {
                      return false;
                    }
                    return types.some(
                      t => t.includes("sale") || t.includes("ขาย")
                    );
                  }
                  // fallback: use isForSale หรือ status (และต้องไม่มี isForRent หรือ status เป็นเช่า)
                  const isSale =
                    listing.isForSale === true ||
                    (listing.status &&
                      ["for_sale", "ขาย", "sale"].includes(
                        String(listing.status).toLowerCase()
                      ));
                  const isRent =
                    listing.isForRent === true ||
                    (listing.status &&
                      ["for_rent", "เช่า", "rent"].includes(
                        String(listing.status).toLowerCase()
                      ));
                  return isSale && !isRent;
                }
                return true;
              })
              .map(listing => (
                <PropertyCard
                  key={listing.id}
                  property={listing}
                  isSelected={selectedProperties.includes(listing.id)}
                  onSelect={() => handlePropertySelect(listing.id)}
                  onRemoveFromFavorites={handleRemoveFromFavorites}
                  activeFilter={activeFilter}
                />
              ))}
          </div>
        </div>
      )}

      {showCompareTable && (
        <div
          className={`fixed ${
            isMinimized
              ? "bottom-4 right-4 z-50"
              : "inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          }`}
        >
          <div
            data-compare-modal
            className={`bg-white shadow-2xl flex flex-col relative ${
              shouldAnimate
                ? "transition-[opacity,transform] duration-250 ease-in-out"
                : ""
            } ${
              isMinimized
                ? "h-16 w-16 rounded-full"
                : "max-w-7xl w-full h-[90vh] rounded-xl"
            }`}
          >
            {/* Action Buttons */}
            {isMinimized ? (
              // Minimized mode buttons - only show when shouldAnimate is true (not during transition)
              shouldAnimate && (
                <div className="absolute -top-1 -right-1 z-20">
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-md shadow-lg transition-colors duration-150"
                    onClick={closeCompareTable}
                    title={t("favorites_table_close")}
                  >
                    <svg
                      className="w-2.5 h-2.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="3"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              )
            ) : (
              // Full mode buttons
              <div className="absolute top-2 right-2 z-20">
                <button
                  className="bg-red-500 text-white hover:bg-red-600 h-8 w-8 flex items-center justify-center rounded-md shadow-lg transition-colors duration-150 border border-red-600"
                  onClick={closeCompareTable}
                  title={t("favorites_table_close")}
                >
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}

            {isMinimized ? (
              // Minimized header - compact pill
              <div
                className={`relative flex items-center justify-center h-full cursor-pointer rounded-full bg-white border border-blue-100 shadow-lg hover:shadow-xl transition-[transform,box-shadow] duration-200 ${
                  nudgeBubble ? "animate-bounce" : ""
                }`}
                onClick={maximizeCompareTable}
                title={t("favorites_table_minimize")}
              >
                <div className="flex flex-col items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                  <span className="mt-1 text-[11px] font-semibold text-blue-700 leading-none">
                    {selectedListings.length}
                  </span>
                </div>
              </div>
            ) : (
              // Full header
              <div className="flex justify-between items-center p-6 pr-12 border-b border-neutral-200 bg-gradient-to-r from-neutral-50 to-slate-50 flex-shrink-0">
                <h2 className="text-2xl font-bold text-neutral-800 flex items-center">
                  <svg
                    className="w-6 h-6 mr-2 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  {t("favorites_compare_selected")}
                </h2>
                <div className="text-sm text-neutral-600 bg-white px-3 py-1 rounded-full border border-neutral-200 shadow-sm">
                  {selectedListings.length} {t("favorites_items_count")}
                </div>
              </div>
            )}
            {!isMinimized && (
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-[15px] font-sans text-center">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-[#222] min-w-[140px] sticky left-0 z-20 bg-[#f6f7fa] text-[15px] font-sans text-center border-b border-gray-200">
                        รายการ
                      </th>
                      {selectedListings.map((listing, index) => (
                        <th
                          key={index}
                          className="px-6 py-3 font-semibold text-[#222] min-w-[180px] bg-white text-[15px] font-sans text-center border-b border-gray-200"
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-[15px] font-semibold text-[#222] mb-0.5 font-sans text-center">
                              {listing.title}
                            </span>
                            <span className="text-[13px] text-[#888] font-normal font-sans text-center">
                              {listing.location}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Example row: Price */}
                    {/* Row: ราคา */}
                    <tr className="bg-white border-b border-gray-200">
                      <td className="px-6 py-3 font-normal text-[#222] sticky left-0 z-10 bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200">
                        ราคา
                      </td>
                      {selectedListings.map((listing, index) => (
                        <td
                          key={index}
                          className="px-6 py-3 font-normal text-[#222] bg-white font-sans text-center align-middle border-b border-gray-200"
                        >
                          {listing.price}
                        </td>
                      ))}
                    </tr>
                    {/* Row: ขนาดพื้นที่ */}
                    <tr className="bg-[#f6f7fa] border-b border-gray-200">
                      <td className="px-6 py-3 font-normal text-[#222] sticky left-0 z-10 bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200">
                        ขนาดพื้นที่
                      </td>
                      {selectedListings.map((listing, index) => (
                        <td
                          key={index}
                          className="px-6 py-3 font-normal text-[#222] bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200"
                        >
                          {listing.usable_area} ตร.ม.
                        </td>
                      ))}
                    </tr>
                    {/* Row: พื้นที่ใช้สอย (mock, can remove if not needed) */}
                    <tr className="bg-white border-b border-gray-200">
                      <td className="px-6 py-3 font-normal text-[#222] bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200">
                        พื้นที่ใช้สอย
                      </td>
                      {selectedListings.map((listing, index) => (
                        <td
                          key={index}
                          className="px-6 py-3 font-normal text-[#222] bg-white font-sans text-center align-middle border-b border-gray-200"
                        >
                          {listing.usable_area} ตร.ม.
                        </td>
                      ))}
                    </tr>
                    {/* Row: ห้องนอน */}
                    <tr className="bg-[#f6f7fa] border-b border-gray-200">
                      <td className="px-6 py-3 font-normal text-[#222] bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200">
                        ห้องนอน
                      </td>
                      {selectedListings.map((listing, index) => (
                        <td
                          key={index}
                          className="px-6 py-3 font-normal text-[#222] bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200"
                        >
                          {listing.details.bedrooms}
                        </td>
                      ))}
                    </tr>
                    {/* Row: ห้องน้ำ */}
                    <tr className="bg-white border-b border-gray-200">
                      <td className="px-6 py-3 font-normal text-[#222] bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200">
                        ห้องน้ำ
                      </td>
                      {selectedListings.map((listing, index) => (
                        <td
                          key={index}
                          className="px-6 py-3 font-normal text-[#222] bg-white font-sans text-center align-middle border-b border-gray-200"
                        >
                          {listing.details.bathrooms}
                        </td>
                      ))}
                    </tr>
                    {/* Row: จอดรถ */}
                    <tr className="bg-[#f6f7fa] border-b border-gray-200">
                      <td className="px-6 py-3 font-normal text-[#222] bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200">
                        จอดรถ
                      </td>
                      {selectedListings.map((listing, index) => (
                        <td
                          key={index}
                          className="px-6 py-3 font-normal text-[#222] bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200"
                        >
                          {listing.parking_spaces || "0"}
                        </td>
                      ))}
                    </tr>
                    {/* ...add more rows here as needed, following the same pattern for alternating backgrounds and left-aligned text... */}
                    <tr className="bg-white border-b border-gray-200">
                      <td className="px-6 py-3 font-normal text-[#222] sticky left-0 z-10 bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200">
                        สภาพบ้าน
                      </td>
                      {selectedListings.map((listing, index) => (
                        <td
                          key={index}
                          className="px-6 py-3 font-normal text-[#222] bg-white font-sans text-center align-middle border-b border-gray-200"
                        >
                          {listing.houseCondition || t("unspecified")}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-[#f6f7fa] border-b border-gray-200">
                      <td className="px-6 py-3 font-normal text-[#222] sticky left-0 z-10 bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200">
                        ไฮไลท์
                      </td>
                      {selectedListings.map((listing, index) => (
                        <td
                          key={index}
                          className="px-6 py-3 font-normal text-[#222] bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200"
                        >
                          {formatHighlight(listing.highlight) ||
                            t("favorites_no_data")}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-white border-b border-gray-200">
                      <td className="px-6 py-3 font-normal text-[#222] sticky left-0 z-10 bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200">
                        สถานที่ใกล้เคียง
                      </td>
                      {selectedListings.map((listing, index) => (
                        <td
                          key={index}
                          className="px-6 py-3 font-normal text-[#222] bg-white font-sans text-center align-middle border-b border-gray-200"
                        >
                          {listing.area_around || t("favorites_no_data")}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-[#f6f7fa] border-b border-gray-200">
                      <td className="px-6 py-3 font-normal text-[#222] sticky left-0 z-10 bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200">
                        คำอธิบาย
                      </td>
                      {selectedListings.map((listing, index) => (
                        <td
                          key={index}
                          className="px-6 py-3 font-normal text-[#222] bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200"
                        >
                          {listing.description || t("favorites_no_data")}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-white border-b border-gray-200">
                      <td className="px-6 py-3 font-normal text-[#222] sticky left-0 z-10 bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200">
                        สิ่งอำนวยความสะดวกโครงการ
                      </td>
                      {selectedListings.map((listing, index) => (
                        <td
                          key={index}
                          className="px-6 py-3 font-normal text-[#222] bg-white font-sans text-center align-middle border-b border-gray-200"
                        >
                          {listing.facilities &&
                          listing.facilities.length > 0 ? (
                            listing.facilities
                              .slice(0, 3)
                              .map((facility, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs text-neutral-700 mr-1"
                                >
                                  {facility}
                                </span>
                              ))
                          ) : (
                            <span className="text-xs text-neutral-600">
                              {t("favorites_no_data")}
                            </span>
                          )}
                          {listing.facilities &&
                            listing.facilities.length > 3 && (
                              <span className="text-xs text-neutral-500">
                                +{listing.facilities.length - 3}{" "}
                                {t("favorites_others")}
                              </span>
                            )}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-[#f6f7fa] border-b border-gray-200">
                      <td className="px-6 py-3 font-normal text-[#222] sticky left-0 z-10 bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200">
                        สิ่งอำนวยความสะดวกโครงการ
                      </td>
                      {selectedListings.map((listing, index) => (
                        <td
                          key={index}
                          className="px-6 py-3 font-normal text-[#222] bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200"
                        >
                          {listing.projectFacilities &&
                          listing.projectFacilities.length > 0 ? (
                            listing.projectFacilities
                              .slice(0, 3)
                              .map((facility, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs text-neutral-700 mr-1"
                                >
                                  {facility}
                                </span>
                              ))
                          ) : (
                            <span className="text-xs text-neutral-600">
                              {t("favorites_no_data")}
                            </span>
                          )}
                          {listing.projectFacilities &&
                            listing.projectFacilities.length > 3 && (
                              <span className="text-xs text-neutral-500">
                                +{listing.projectFacilities.length - 3}{" "}
                                {t("favorites_others")}
                              </span>
                            )}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-white border-b border-gray-200">
                      <td className="px-6 py-3 font-normal text-[#222] sticky left-0 z-10 bg-[#f6f7fa] font-sans text-center align-middle border-b border-gray-200">
                        วันที่สร้าง
                      </td>
                      {selectedListings.map((listing, index) => (
                        <td
                          key={index}
                          className="px-6 py-3 font-normal text-[#222] bg-white font-sans text-center align-middle border-b border-gray-200"
                        >
                          {listing.createdAt
                            ? new Date(listing.createdAt).toLocaleDateString(
                                "th-TH"
                              )
                            : t("unspecified")}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Updated PropertyCardProps
interface PropertyCardProps {
  property: PropertyData;
  isSelected: boolean;
  onSelect: () => void;
  onRemoveFromFavorites: (propertyId: string) => void;
  activeFilter: string;
}

function PropertyCard({
  property,
  isSelected,
  onSelect,
  onRemoveFromFavorites,
  activeFilter,
}: PropertyCardProps) {
  const {
    id,
    title,
    location,
    price,
    isPricePerMonth,
    details,
    image,
    images,
    isForRent,
    isForSale,
    isTopPick,
    viewCount = 0,
    status,
  } = property; // Destructure only necessary properties for display

  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [currentViewCount, setCurrentViewCount] = useState(viewCount);
  const { user } = useAuth();
  const { t } = useLanguage();

  const isRecommended = currentViewCount >= 50;

  const showToastMessage = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user?.id) return;
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data, error } = await supabase
          .from("favorites")
          .select("id")
          .eq("customer_id", user.id)
          .eq("property_id", id)
          .maybeSingle();
        if (!error && data) {
          setIsLiked(true);
        }
      } catch (error) {
        console.error("Error checking like status:", error);
      }
    };
    checkLikeStatus();
  }, [user?.id, id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToastMessage(t("favorites_login_required"), "error");
      return;
    }
    if (isLoading) return;
    setIsLoading(true);
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      if (isLiked) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("customer_id", user.id)
          .eq("property_id", id);
        if (!error) {
          setIsLiked(false);
          showToastMessage(t("favorites_remove_success"), "success");
          // Remove from parent's favorites list immediately
          onRemoveFromFavorites(id);
        } else throw error;
      } else {
        const { data: existingFavorite, error: checkError } = await supabase
          .from("favorites")
          .select("id")
          .eq("customer_id", user.id)
          .eq("property_id", id)
          .maybeSingle();
        if (checkError && checkError.code !== "PGRST116") throw checkError;
        if (existingFavorite) {
          setIsLiked(true);
          showToastMessage(t("favorites_add_success"), "success");
        } else {
          const { error: insertError } = await supabase
            .from("favorites")
            .insert({ customer_id: user.id, property_id: id });
          if (!insertError) {
            setIsLiked(true);
            showToastMessage(t("favorites_add_success"), "success");
          } else if (insertError.code === "23505") {
            setIsLiked(true);
            showToastMessage(t("favorites_add_success"), "success");
          } else throw insertError;
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
      ) {
        setIsLiked(true);
        showToastMessage(t("favorites_add_success"), "success");
      } else {
        showToastMessage(t("favorites_remove_error"), "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareData = {
      title: title,
      text: `${title} - ${location} ${t("price")}: ${price}${
        isPricePerMonth
          ? ` ${t("property_card_price_per_month_suffix")}`
          : ` ${t("property_card_price_suffix")}`
      }`,
      url: `${window.location.origin}/property/${id}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showToastMessage(t("favorites_share_success"), "success");
      } else {
        await navigator.clipboard.writeText(shareData.url);
        showToastMessage(t("favorites_copy_success"), "success");
      }
    } catch (error) {
      console.error("Error sharing property:", extractErrorMessage(error));
      try {
        await navigator.clipboard.writeText(shareData.url);
        showToastMessage(t("favorites_copy_success"), "success");
      } catch (clipboardError) {
        console.error(
          "Error copying property link:",
          extractErrorMessage(clipboardError)
        );
        showToastMessage(t("favorites_share_error"), "error");
      }
    }
  };

  const handleCardClick = async () => {
    try {
      const response = await fetch("/api/track-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: id }),
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentViewCount(data.view_count || currentViewCount + 1);
      }
    } catch (error) {
      console.error("Error tracking view:", error);
    }
  };

  const handleCheckboxClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect();
  };

  // Determine if we should show the 'for rent' badge (only on rent page)
  const showRentBadge = isForRent && activeFilter === "rent";
  const buttonText = showRentBadge
    ? t("favorites_rent")
    : isForSale
      ? t("favorites_sale")
      : "";

  // Show the primary image with fallback to storage placeholder
  const firstImage =
    image && image.trim() !== ""
      ? image
      : (images?.find(img => typeof img === "string" && img.trim() !== "") ??
        "/placeholder.svg");

  // Supabase Storage public URL helper
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  function getImageUrl(imgPath: string) {
    if (!imgPath) return "/placeholder.svg";
    if (imgPath.startsWith("https://") || imgPath.startsWith("http://")) {
      return imgPath;
    }
    // Assume path in storage bucket property_images
    return `${supabaseUrl}/storage/v1/object/public/property_images/${imgPath}`;
  }

  return (
    <>
      <Link
        href={`/property/${id}`}
        className="block font-thai"
        onClick={handleCardClick}
      >
        <div
          className={`bg-white rounded-xl overflow-hidden shadow-sm border ${
            isSelected ? "border-blue-500 bg-blue-50" : "border-gray-100"
          } hover:shadow-md transition-shadow duration-300 relative flex flex-col`}
        >
          {/* Selection Checkbox */}
          <div
            className="absolute top-3 left-3 z-20"
            onClick={e => e.stopPropagation()}
          >
            <label
              className="relative inline-flex items-center cursor-pointer group"
              title={
                isSelected
                  ? `${t("favorites_deselect")} ${title}`
                  : `${t("favorites_select_for_compare")} ${title}`
              }
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleCheckboxClick}
                className="sr-only peer"
                aria-label={`${t("favorites_select_for_compare")} ${title}`}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect();
                  }
                }}
              />
              <div
                className={`
                relative w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 transition-all duration-200 ease-in-out
                ${
                  isSelected
                    ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/25"
                    : "bg-white/95 border-gray-300 hover:border-blue-400 hover:bg-white shadow-md backdrop-blur-sm"
                }
                group-hover:scale-110 group-active:scale-95
                peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-focus:ring-offset-white/50
                peer-focus:border-blue-500
              `}
              >
                {isSelected && (
                  <svg
                    className="absolute inset-0 w-full h-full text-white p-1 animate-in zoom-in-50 duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </label>
          </div>
          {/* Single Image - fit to card */}
          <div className="relative w-full aspect-[4/3] flex-shrink-0">
            {/* Sold/Rented Badge Overlay */}
            {status === "sold" && (
              <div className="absolute inset-0 bg-gray-700/80 flex items-center justify-center z-30">
                <div className="text-white font-bold text-2xl transform -rotate-12">
                  ขายแล้ว
                </div>
              </div>
            )}
            {status === "rented" && (
              <div className="absolute inset-0 bg-gray-700/80 flex items-center justify-center z-30">
                <div className="text-white font-bold text-2xl transform -rotate-12">
                  ให้เช่าแล้ว
                </div>
              </div>
            )}
            <Image
              src={getImageUrl(firstImage)}
              alt={title}
              fill
              className="object-cover w-full h-full"
              sizes="(max-width: 768px) 100vw, 33vw"
              priority={true}
            />
          </div>
          <div className="absolute top-3 left-12 sm:left-14 flex flex-wrap gap-1">
            {showRentBadge && (
              <span className="text-white px-2 py-0.5 text-xs font-bold rounded-md shadow-sm bg-green-600">
                {buttonText}
              </span>
            )}
            {isForSale && !showRentBadge && (
              <span className="text-white px-2 py-0.5 text-xs font-bold rounded-md shadow-sm bg-blue-600">
                {t("favorites_sale")}
              </span>
            )}
            {isRecommended && (
              <span className="bg-orange-600 text-white px-2 py-0.5 text-xs font-bold rounded-md shadow-sm flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                {t("favorites_popular")}
              </span>
            )}
            {isTopPick && (
              <span className="bg-amber-600 text-white px-2 py-0.5 text-xs font-bold rounded-md shadow-sm flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {t("favorites_featured")}
              </span>
            )}
          </div>
          <div className="absolute top-3 right-3 flex space-x-1">
            <button
              className={`bg-white/90 backdrop-blur-sm p-1 rounded-full hover:bg-white transition-colors shadow-sm ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={handleLike}
              disabled={isLoading}
              title={
                isLiked
                  ? t("favorites_remove_from_favorites")
                  : t("favorites_add_to_favorites")
              }
              aria-label={
                isLiked
                  ? t("favorites_remove_from_favorites")
                  : t("favorites_add_to_favorites")
              }
            >
              <Heart
                className={`h-4 w-4 ${isLiked ? "text-red-500 fill-red-500" : "text-gray-600"}`}
              />
            </button>
            <button
              className="bg-white/90 backdrop-blur-sm p-1 rounded-full hover:bg-white transition-colors shadow-sm"
              onClick={handleShare}
              title={t("favorites_share_property")}
              aria-label={t("favorites_share_property")}
            >
              <Share2 className="h-4 w-4 text-gray-600" />
            </button>
          </div>
          <div className="p-3 flex flex-col flex-grow justify-between overflow-hidden">
            <div>
              <h3 className="text-[17px] font-bold mb-1 text-[#222] font-sans truncate">
                {title}
              </h3>
              <p className="text-[15px] text-[#888] mb-2 font-semibold font-sans truncate">
                {location}
              </p>
              <p className="text-[#006ce3] font-bold text-[17px] mb-3 font-sans">
                {price} {isPricePerMonth ? "บาท / เดือน" : "บาท"}
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="grid grid-cols-4 gap-2 text-[13px] text-[#888] mb-3 font-sans">
                <PropertyDetail
                  icon={
                    <Image
                      src="/Icon (1).png"
                      alt="area icon"
                      width={16}
                      height={16}
                      className="h-4 w-4 mr-1"
                    />
                  }
                  value={details.area}
                  label="ตร.ม."
                />
                <PropertyDetail
                  icon={
                    <Image
                      src="/Icon.png"
                      alt="bedroom icon"
                      width={16}
                      height={16}
                      className="h-4 w-4 mr-1"
                    />
                  }
                  value={details.bedrooms}
                  label={t("bedrooms")}
                />
                <PropertyDetail
                  icon={<BathIcon className="h-4 w-4 mr-1 text-gray-500" />}
                  value={details.bathrooms}
                  label={t("bathrooms")}
                />
                <PropertyDetail
                  icon={<CarIcon className="h-4 w-4 mr-1 text-gray-500" />}
                  value={details.parking}
                  label={t("parking_spaces")}
                />
              </div>
              <div className="flex items-center justify-center text-[#888] text-[13px] font-sans">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span className="font-medium font-sans">
                  {t("favorites_views")} {currentViewCount.toLocaleString()}{" "}
                  {t("favorites_times")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right-2 fade-in duration-300">
          <div
            className={`relative px-4 py-3 rounded-md shadow-lg flex items-center space-x-3 max-w-xs font-sukhumvit border-l-4 transition-all duration-200 ${
              toastType === "success"
                ? "bg-white text-gray-900 border-l-[#006ce3] shadow-xl"
                : "bg-white text-gray-900 border-l-red-500 shadow-xl"
            }`}
          >
            {/* Icon */}
            <div
              className={`flex-shrink-0 ${
                toastType === "success" ? "text-[#006ce3]" : "text-red-500"
              }`}
            >
              {toastType === "success" ? (
                <Check className="h-5 w-5" />
              ) : (
                <X className="h-5 w-5" />
              )}
            </div>

            {/* Message */}
            <div className="flex-1">
              <span className="text-[15px] font-medium text-[#222] font-sans">
                {toastMessage}
              </span>
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowToast(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface PropertyDetailProps {
  icon: ReactNode;
  value: number | string;
  label: string;
}

function PropertyDetail({ icon, value, label }: PropertyDetailProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center mb-1">
        {icon}
        <span className="font-bold">{value}</span>
      </div>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function BathIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z" />
      <path d="M6 12V5a2 2 0 0 1 2-2h3v2.25" />
      <path d="M4 21 1-1.5" />
      <path d="M20 21 19 19.5" />
    </svg>
  );
}

function CarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}
