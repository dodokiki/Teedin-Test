"use client";

import type { PropertyData } from "@/components/property/property-card";
import { useLanguage } from "@/contexts/language-context";
import { pickLocalizedValue } from "@/lib/localization";
import {
  AdvancedMarker,
  APIProvider,
  Map as GoogleMap,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import { getGoogleMapsApiKey } from "@/lib/google-maps";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Map ID ต้องใช้เสมอเมื่อมี AdvancedMarker (ป้ายราคา) — ถ้าไม่ส่งจะเกิด error "map was initialized without a valid map ID"
// หมายเหตุ: บางเครื่องอาจเห็น console "Attempted to load Vector Map, but failed. Falling back to Raster" — เป็นการ fallback ปกติ แผนที่ยังใช้ได้
const DEFAULT_VECTOR_MAP_ID = "d1884df1414e340e6b3a90fd";
function getMapId(): string {
  if (typeof process === "undefined") return DEFAULT_VECTOR_MAP_ID;
  const envMapId =
    process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  return (envMapId && envMapId.trim()) || DEFAULT_VECTOR_MAP_ID;
}

function isWebGLSupported(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    return !!(gl && typeof gl.getParameter === "function");
  } catch {
    return false;
  }
}

interface PropertyMapProps {
  properties: PropertyData[];
  activePropertyId?: string | null; // For sidebar scrolling
  hoveredPropertyId?: string | null; // For map info window
  onMarkerClickForSidebar?: (property: PropertyData) => void;
  onMarkerHover?: (property: PropertyData) => void;
  onMarkerLeave?: () => void;
  center?: [number, number];
  zoom?: number;
  targetPosition?: { lat: number; lng: number; zoom: number } | null;
  focusProperty?: PropertyData | null;
  onBoundsChange?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
  showPopup?: boolean;
  expandUrl?: string; // URL to navigate when clicking expand button
}

// Helper function to format price with commas
const formatPrice = (price: string): string => {
  const numPrice = parseInt(price?.replace(/,/g, "") || "0");
  return numPrice.toLocaleString();
};

// Helper function to get image URL from property.image
const getImageUrl = (image: string | string[]): string => {
  let imageUrl = "";
  try {
    if (Array.isArray(image)) {
      if (image && image.length > 0) {
        const firstImage = image[0];
        if (typeof firstImage === "string") {
          if (firstImage.startsWith("{")) {
            const parsedImage = JSON.parse(firstImage);
            imageUrl = parsedImage.url || "";
          } else {
            imageUrl = firstImage;
          }
        }
      }
    } else if (typeof image === "string") {
      if (image.startsWith("{")) {
        const parsedImage = JSON.parse(image);
        imageUrl = parsedImage.url || "";
      } else {
        imageUrl = image;
      }
    }
  } catch (err) {
    console.error(`Failed to parse image data:`, err);
  }
  return imageUrl || "/placeholder.svg";
};

// Property info window component
function PropertyInfoWindow({
  property,
  anchor,
  isActive,
  onMouseEnter,
  onMouseLeave,
}: {
  property: PropertyData;
  anchor: google.maps.marker.AdvancedMarkerElement;
  isActive: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const { language } = useLanguage();
  const locale = language ?? "th";

  const displayTitle = property.localized?.title
    ? (pickLocalizedValue(property.localized.title, locale, "th") ??
      property.title)
    : property.title;

  const baseLocation =
    typeof property.location === "string"
      ? property.location
      : property.location?.address || property.location?.["ที่อยู่"] || "";

  const displayLocation = property.localized?.address
    ? (pickLocalizedValue(property.localized.address, locale, "th") ??
      baseLocation)
    : baseLocation;

  const imageUrl = getImageUrl(property.image);
  const priceDisplay = property.isPricePerMonth
    ? `${formatPrice(property.price)} บาท / เดือน`
    : `${formatPrice(property.price)} บาท`;

  const hasRent =
    (property.listing_type &&
      (property.listing_type.includes("เช่า") ||
        property.listing_type.includes("Rent"))) ||
    property.isForRent;
  const hasSale =
    (property.listing_type &&
      (property.listing_type.includes("ขาย") ||
        property.listing_type.includes("Sale"))) ||
    property.isForSale;

  let typeLabel = "";
  let typeBgColor = "";
  if (hasRent && hasSale) {
    typeLabel = "ขาย/เช่า";
    typeBgColor = "#8B5CF6";
  } else if (hasRent) {
    typeLabel = "ให้เช่า";
    typeBgColor = "#10B981";
  } else if (hasSale) {
    typeLabel = "ขาย";
    typeBgColor = "#3B82F6";
  }

  return (
    <InfoWindow anchor={anchor} headerDisabled={true} maxWidth={200}>
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`w-44 sm:w-48 font-sans leading-tight rounded-lg overflow-hidden shadow-lg ${isActive ? "ring-2 ring-blue-500" : "ring-1 ring-gray-300"
          }`}
      >
        <div className="relative h-24 sm:h-[110px] overflow-hidden bg-gray-100">
          <img
            src={imageUrl}
            alt={displayTitle}
            className="w-full h-full object-cover"
          />
          <div
            className="absolute top-[5px] left-[5px] text-white px-[5px] py-[1px] rounded-[3px] text-[9px] font-bold"
            style={{
              background: typeBgColor,
            }}
          >
            {typeLabel}
          </div>
          <div className="absolute top-[5px] right-[5px] flex gap-[3px]">
            <div className="bg-white/80 backdrop-blur-[2px] p-[2px] rounded-full flex items-center justify-center w-[22px] h-[22px]">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#666"
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div className="bg-white/80 backdrop-blur-[2px] p-[2px] rounded-full flex items-center justify-center w-[22px] h-[22px]">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#666"
                strokeWidth="2"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </div>
            <div className="bg-white/80 backdrop-blur-[2px] p-[2px] rounded-full flex items-center justify-center w-[22px] h-[22px]">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#666"
                strokeWidth="2"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
          </div>
        </div>
        <div className="p-2 bg-white rounded-b-lg">
          <h3 className="text-xs sm:text-[13px] font-bold mb-0 m-0">
            {displayTitle}
          </h3>
          <p className="text-[9px] sm:text-[10px] text-gray-600 mb-[2px] m-0 line-clamp-2">
            {displayLocation}
          </p>
          <p className="text-sm sm:text-[15px] font-bold text-primary mb-1 m-0">
            {priceDisplay}
          </p>
          {/* Property details - display based on property type */}
          {(() => {
            const category = (property?.property_category ?? "").toString().toLowerCase();
            const isLand = category.includes("ที่ดิน") || category.includes("land");
            const isOffice = category.includes("สำนักงาน") || category.includes("office");

            if (isLand) {
              // ที่ดิน: แสดงเฉพาะขนาดที่ดิน
              return (
                <div className="flex justify-center gap-2 text-[9px] sm:text-[10px] text-gray-500">
                  <div className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                    <span>{property.details?.area || (property.details as any)?.landArea || "-"} ตร.ว.</span>
                  </div>
                </div>
              );
            } else if (isOffice) {
              // สำนักงาน: พื้นที่ ห้องน้ำ จำนวนชั้น
              return (
                <div className="flex justify-center gap-3 text-[9px] sm:text-[10px] text-gray-500">
                  <div className="flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                    <span>{property.details?.area || "-"} ตร.ม.</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z" />
                      <path d="M6 12V5a2 2 0 0 1 2-2h3v2.25" />
                    </svg>
                    <span>{property.details?.bathrooms || "-"} น้ำ</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M3 15h18" />
                    </svg>
                    <span>{(property.details as any)?.floors || "-"} ชั้น</span>
                  </div>
                </div>
              );
            } else {
              // บ้าน/คอนโด/อาคารพาณิชย์: พื้นที่ ห้องน้ำ ห้องนอน
              return (
                <div className="flex justify-center gap-3 text-[9px] sm:text-[10px] text-gray-500">
                  <div className="flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                    <span>{property.details?.area || "-"} ตร.ม.</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 4v16M22 4v16M2 8h20M2 16h20M12 4v4M12 16v4" />
                    </svg>
                    <span>{property.details?.bedrooms || "-"} นอน</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z" />
                      <path d="M6 12V5a2 2 0 0 1 2-2h3v2.25" />
                    </svg>
                    <span>{property.details?.bathrooms || "-"} น้ำ</span>
                  </div>
                </div>
              );
            }
          })()}
        </div>
      </div>
    </InfoWindow>
  );
}

// Custom marker component
function PropertyMarker({
  property,
  isActive,
  onClick,
  onMarkerRef,
  onMouseEnter,
  onMouseLeave,
}: {
  property: PropertyData;
  isActive: boolean;
  showBalloon: boolean; // This is kept for prop compatibility but not used in the new design
  onClick: () => void;
  onMarkerRef: (ref: google.maps.marker.AdvancedMarkerElement | null) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null
  );

  useEffect(() => {
    if (markerRef.current) {
      onMarkerRef(markerRef.current);
    }
  }, [onMarkerRef]);

  const formatPriceForMarker = (priceStr: string): string => {
    try {
      const price = parseInt(priceStr.replace(/,/g, ""));
      if (isNaN(price)) return "";
      if (price >= 1000000) {
        const millions = price / 1000000;
        return (
          (Math.floor(millions * 10) / 10).toFixed(1).replace(/\.0$/, "") + "M"
        );
      }
      if (price >= 1000) {
        return Math.round(price / 1000) + "K";
      }
      return price.toString();
    } catch {
      return "";
    }
  };

  const formattedPrice = formatPriceForMarker(property.price);

  // ตรวจสอบว่าเป็น Rent และ Sale หรือไม่
  const hasRent =
    (property.listing_type &&
      (property.listing_type.includes("Rent") ||
        property.listing_type.includes("เช่า"))) ||
    property.isForRent;
  const hasSale =
    (property.listing_type &&
      (property.listing_type.includes("Sale") ||
        property.listing_type.includes("ขาย"))) ||
    property.isForSale;

  let pinColor = "bg-gray-400"; // Default

  // ถ้าเป็นทั้ง Rent และ Sale → สีม่วง
  if (hasRent && hasSale) {
    pinColor = "bg-purple-600";
  }
  // ถ้าเป็น Rent อย่างเดียว → สีเขียว
  else if (hasRent) {
    pinColor = "bg-green-500";
  }
  // ถ้าเป็น Sale อย่างเดียว → สีน้ำเงิน
  else if (hasSale) {
    pinColor = "bg-blue-500";
  }

  // ถ้ากำลังถูกเลือก → สีแดง (Override ทุกอย่าง)
  if (isActive) {
    pinColor = "bg-red-600";
  }

  const textColor = "text-white";
  const ringClass = isActive ? "ring-2 ring-offset-1 ring-yellow-400" : "";

  return (
    <AdvancedMarker
      position={{ lat: property.latitude!, lng: property.longitude! }}
      onClick={onClick}
      ref={markerRef}
    >
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="flex items-center justify-center cursor-pointer group"
      >
        <div
          className={`relative transition-transform duration-200 ease-in-out group-hover:scale-110 ${ringClass} rounded-full`}
        >
          <div
            className={`px-2 py-1 ${pinColor} ${textColor} rounded-full text-xs font-bold shadow-md z-10 relative border-2 border-white flex items-center gap-1`}
          >
            {/* ธงสำหรับ Top Pick - อยู่ภายในป้ายราคา */}
            {property.isTopPick && (
              <img
                src="/property-detail/finish.png"
                alt="Top Pick"
                className="w-3 h-3 object-contain"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
              />
            )}
            {formattedPrice}
          </div>
          <div
            className={`absolute left-1/2 -translate-x-1/2 -bottom-1 w-3 h-3 ${pinColor} transform rotate-45 z-0`}
          ></div>
        </div>
      </div>
    </AdvancedMarker>
  );
}

// Map controller component
function MapController({
  targetPosition,
  onBoundsChange,
  onZoomChange,
}: {
  targetPosition: { lat: number; lng: number; zoom: number } | null;
  onBoundsChange?: (bounds: any) => void;
  onZoomChange?: (zoom: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (map && targetPosition) {
      map.setCenter({ lat: targetPosition.lat, lng: targetPosition.lng });
      map.setZoom(targetPosition.zoom);
    }
  }, [map, targetPosition]);

  useEffect(() => {
    if (!map) return;

    const updateBounds = () => {
      const bounds = map.getBounds();
      if (bounds && onBoundsChange) {
        onBoundsChange({
          north: bounds.getNorthEast().lat(),
          south: bounds.getSouthWest().lat(),
          east: bounds.getNorthEast().lng(),
          west: bounds.getSouthWest().lng(),
        });
      }
    };

    const updateZoom = () => {
      const zoom = map.getZoom();
      if (zoom !== undefined && onZoomChange) {
        onZoomChange(zoom);
      }
    };

    const boundsListener = map.addListener("bounds_changed", updateBounds);
    const zoomListener = map.addListener("zoom_changed", updateZoom);

    updateBounds();
    updateZoom();

    return () => {
      if (boundsListener) boundsListener.remove();
      if (zoomListener) zoomListener.remove();
    };
  }, [map, onBoundsChange, onZoomChange]);

  return null;
}

function Polygon({
  paths,
  options,
}: {
  paths: { lat: number; lng: number }[];
  options: google.maps.PolygonOptions;
}) {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!polygonRef.current) {
      polygonRef.current = new google.maps.Polygon({
        ...options,
        paths,
      });
    }

    polygonRef.current.setMap(map);

    return () => {
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
      }
    };
  }, [map]);

  useEffect(() => {
    if (polygonRef.current) {
      polygonRef.current.setOptions(options);
      polygonRef.current.setPaths(paths);
    }
  }, [options, paths]);

  return null;
}

// Helper to determine property color (returning Hex for Google Maps)
const getPropertyColor = (
  property: PropertyData,
  isActive: boolean
): string => {
  if (isActive) return "#DC2626"; // red-600

  const hasRent =
    (property.listing_type &&
      (property.listing_type.includes("Rent") ||
        property.listing_type.includes("เช่า"))) ||
    property.isForRent;
  const hasSale =
    (property.listing_type &&
      (property.listing_type.includes("Sale") ||
        property.listing_type.includes("ขาย"))) ||
    property.isForSale;

  if (hasRent && hasSale) return "#9333EA"; // purple-600
  if (hasRent) return "#22C55E"; // green-500
  if (hasSale) return "#3B82F6"; // blue-500

  return "#9CA3AF"; // gray-400
};

export default function PropertyMapNew({
  properties,
  activePropertyId, // Still used for sidebar scrolling
  hoveredPropertyId, // No longer used for info window, but kept for other potential uses
  onMarkerClickForSidebar,
  onMarkerHover,
  onMarkerLeave,
  center = [13.7563, 100.5018],
  zoom = 11,
  targetPosition = null,
  focusProperty = null,
  onBoundsChange,
  showPopup = true,
  expandUrl,
}: PropertyMapProps) {
  const [mapStyle, setMapStyle] = useState<"standard" | "satellite">(
    "standard"
  );
  const [showBalloon, setShowBalloon] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<Map<string, any>>(new Map());

  const [internalHoveredId, setInternalHoveredId] = useState<string | null>(
    null
  );
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (property: PropertyData) => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
    setInternalHoveredId(property.id);
    onMarkerHover?.(property);
  };

  const handleMouseLeave = () => {
    hideTimer.current = setTimeout(() => {
      setInternalHoveredId(null);
      onMarkerLeave?.();
    }, 500);
  };

  const handleInfoWindowMouseEnter = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
  };

  const initialCenter = targetPosition
    ? { lat: targetPosition.lat, lng: targetPosition.lng }
    : { lat: center[0], lng: center[1] };
  const initialZoom = targetPosition ? targetPosition.zoom : zoom;

  const googleMapsApiKey = getGoogleMapsApiKey();
  const mapId = getMapId();
  const validProperties = properties.filter(
    prop => prop.latitude && prop.longitude
  );

  const handleZoomChange = useCallback(
    (zoom: number) => {
      setCurrentZoom(zoom);
      setShowBalloon(zoom >= 13);
      // Debug logs
      if (process.env.NODE_ENV === "development") {
        const propsWithBoundaries = properties.filter(
          p => p.boundary_coordinates && p.boundary_coordinates.length > 0
        );
        console.log(
          `Zoom: ${zoom}, Properties with boundaries: ${propsWithBoundaries.length}`
        );
        if (propsWithBoundaries.length > 0) {
          console.log(
            "Sample boundary:",
            propsWithBoundaries[0].boundary_coordinates
          );
        }
      }
    },
    [properties]
  );

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.setCenter(initialCenter);
      mapRef.current.setZoom(initialZoom);
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom() || 11;
      mapRef.current.setZoom(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom() || 11;
      mapRef.current.setZoom(currentZoom - 1);
    }
  };

  const handleToggleFullScreen = async () => {
    try {
      const isFs = document.fullscreenElement != null;
      if (!isFs) {
        if (rootRef.current && rootRef.current.requestFullscreen) {
          await rootRef.current.requestFullscreen();
        }
        setIsFullScreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullScreen(false);
      }
    } catch (_e) {
      setIsFullScreen(prev => !prev);
    }
  };

  useEffect(() => {
    setShowBalloon(currentZoom >= 13);
  }, [currentZoom]);

  if (!googleMapsApiKey) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-700 p-6 text-center">
        <p className="font-medium mb-2">ไม่สามารถโหลดแผนที่ได้</p>
        <p className="text-sm max-w-md">
          กรุณาตั้งค่า Google Maps API Key (NEXT_PUBLIC_GOOGLE_API_KEY หรือ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) ใน .env.local หรือใน Vercel Environment Variables และเปิดใช้ Maps JavaScript API รวมถึง Map Tiles API (สำหรับป้ายราคาบนแผนที่)
        </p>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`w-full h-full relative ${isFullScreen ? "fixed inset-0 z-[2000] bg-white" : ""}`}
    >
      <style jsx global>{`
        .gm-style .gm-style-iw-c {
          padding: 0 !important;
          border-radius: 0.5rem !important; /* 8px */
          box-shadow: none !important;
          background-color: transparent !important;
        }
        .gm-style .gm-style-iw-d {
          overflow: hidden !important;
        }
        .gm-style .gm-style-iw-t::after {
          display: none !important; /* Hide the default google maps tail */
        }
      `}</style>
      <APIProvider apiKey={googleMapsApiKey}>
        <GoogleMap
          mapId={mapId}
          defaultCenter={initialCenter}
          defaultZoom={initialZoom}
          gestureHandling="greedy"
          disableDefaultUI
          mapTypeId={mapStyle === "satellite" ? "hybrid" : "roadmap"}
          style={{ width: "100%", height: "100%" }}
        >
          <MapController
            targetPosition={targetPosition}
            onBoundsChange={onBoundsChange}
            onZoomChange={handleZoomChange}
          />

          {validProperties.map(property => {
            const propertyId =
              property.id ||
              `property-${property.latitude}-${property.longitude}`;
            const isActive = activePropertyId === property.id;
            const boundaryColor = getPropertyColor(property, isActive);

            return (
              <React.Fragment key={propertyId}>
                <PropertyMarker
                  property={property}
                  isActive={isActive}
                  showBalloon={showBalloon}
                  onClick={() => onMarkerClickForSidebar?.(property)}
                  onMouseEnter={() => handleMouseEnter(property)}
                  onMouseLeave={handleMouseLeave}
                  onMarkerRef={ref => {
                    if (ref) {
                      markerRefs.current.set(propertyId, ref);
                    } else {
                      markerRefs.current.delete(propertyId);
                    }
                  }}
                />
                {Array.isArray(property.boundary_coordinates) &&
                  property.boundary_coordinates.length > 0 &&
                  currentZoom >= 12 && (
                    <Polygon
                      paths={property.boundary_coordinates}
                      options={{
                        fillColor: boundaryColor,
                        fillOpacity: 0.2,
                        strokeColor: boundaryColor,
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                      }}
                    />
                  )}
              </React.Fragment>
            );
          })}

          {(() => {
            if (!showPopup || !internalHoveredId) return null;

            const hoveredProperty = validProperties.find(
              p => p.id === internalHoveredId
            );
            const hoveredMarkerElement =
              markerRefs.current.get(internalHoveredId);

            if (!hoveredProperty || !hoveredMarkerElement) return null;

            return (
              <PropertyInfoWindow
                property={hoveredProperty}
                anchor={hoveredMarkerElement}
                isActive={activePropertyId === hoveredProperty.id}
                onMouseEnter={handleInfoWindowMouseEnter}
                onMouseLeave={handleMouseLeave}
              />
            );
          })()}
        </GoogleMap>
      </APIProvider>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-1 flex flex-col gap-1">
        <div className="flex">
          <button
            onClick={() => setMapStyle("standard")}
            className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-md transition-all ${mapStyle === "standard"
              ? "bg-blue-500 text-white"
              : "text-gray-600 hover:bg-gray-100"
              }`}
            title="แผนที่"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
          </button>
          <button
            onClick={() => setMapStyle("satellite")}
            className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-md transition-all ${mapStyle === "satellite"
              ? "bg-blue-500 text-white"
              : "text-gray-600 hover:bg-gray-100"
              }`}
            title="ดาวเทียม"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 12c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4c0 2.21 1.79 4 4 4s4-1.79 4-4c2.21 0 4-1.79 4-4s-1.79-4-4-4c0-2.21-1.79-4-4-4s-4 1.79-4 4" />
              <path d="M12 16v6" />
              <circle cx="12" cy="12" r="1" />
            </svg>
          </button>
          {/* Expand Button */}
          {expandUrl && (
            <Link
              href={expandUrl}
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-md transition-all text-gray-600 hover:bg-gray-100 hover:text-blue-600"
              title="แสดงบนหน้าแผนที่"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </Link>
          )}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col shadow-lg rounded-lg">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 sm:w-10 sm:h-10 bg-white text-gray-700 hover:bg-gray-100 flex items-center justify-center text-lg sm:text-xl font-semibold rounded-t-lg border-b border-gray-200"
          title="ซูมเข้า"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 sm:w-10 sm:h-10 bg-white text-gray-700 hover:bg-gray-100 flex items-center justify-center text-lg sm:text-xl font-semibold rounded-b-lg"
          title="ซูมออก"
        >
          −
        </button>
      </div>
    </div>
  );
}
