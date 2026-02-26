"use client";

import { HeroSection } from "@/components/layout/hero-section";
import { GradientButton } from "@/components/lightswind/gradient-button";
import { ImageExpansionModal } from "@/components/property/ImageExpansionModal";
import {
  PropertyCard,
  type PropertyData as PropertyCardData,
} from "@/components/property/property-card";
import PropertyMap from "@/components/property/property-map-new";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ShaderBackground from "@/components/ui/shader-background";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { useProperty } from "@/contexts/property-context";
import { mockProperties } from "@/data/mock-properties";
import { pickLocalizedValue, type LocalizedValue } from "@/lib/localization";
import { toCleanStringArray } from "@/lib/property-helpers";
import { supabase } from "@/lib/supabase";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Heart,
  Mail,
  Phone,
  Share2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    OmiseCard?: any;
  }
}

const CONTACT_REVEAL_PRICE = Number(
  process.env.NEXT_PUBLIC_CONTACT_REVEAL_PRICE ?? "10"
);
const PROMPTPAY_MINIMUM_THB = Number(
  process.env.NEXT_PUBLIC_PROMPTPAY_MINIMUM ?? "20"
);
function addCustomStyle() {
  if (typeof window !== "undefined") {
    const style = document.createElement("style");
    style.innerHTML = `
      .hide-scrollbar {
        -ms-overflow-style: none;  /* IE and Edge */
        scrollbar-width: none;  /* Firefox */
      }
      .hide-scrollbar::-webkit-scrollbar {
        display: none;  /* Chrome, Safari and Opera */
      }
      
      /* Sparkle Effects */
      .sparkle-overlay {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        overflow: hidden;
        pointer-events: none;
      }
      
      .sparkle {
        position: absolute;
        background: white;
        border-radius: 50%;
        opacity: 0.8;
        box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
      }
      
      .sparkle-1 {
        top: 15%;
        left: 20%;
      }
      
      .sparkle-3 {
        top: 45%;
        left: 15%;
      }
      
      .sparkle-5 {
        top: 75%;
        left: 30%;
      }
      
      .sparkle-small {
        width: 2px;
        height: 2px;
      }
      
      .sparkle-medium {
        width: 3px;
        height: 3px;
      }
      
      .sparkle-star {
        width: 6px;
        height: 6px;
        background: transparent;
        position: relative;
      }
      
      .sparkle-star::before,
      .sparkle-star::after {
        content: '';
        position: absolute;
        background: white;
        border-radius: 1px;
      }
      
      .sparkle-star::before {
        width: 6px;
        height: 1px;
        top: 50%;
        left: 0;
        transform: translateY(-50%);
        box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
      }
      
      .sparkle-star::after {
        width: 1px;
        height: 6px;
        left: 50%;
        top: 0;
        transform: translateX(-50%);
        box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
      }

      .obscured-phone {
        filter: blur(6px);
        -webkit-filter: blur(6px);
        user-select: none;
      }
    `;
    document.head.appendChild(style);
  }
}

// ฟังก์ชันสำหรับสร้างสีที่แตกต่างกันสำหรับแต่ละผู้ใช้
function getUserColor(userId: string, fallbackName?: string) {
  const colors = [
    "bg-blue-600",
    "bg-green-600",
    "bg-purple-600",
    "bg-red-600",
    "bg-yellow-600",
    "bg-pink-600",
    "bg-indigo-600",
    "bg-teal-600",
    "bg-orange-600",
    "bg-cyan-600",
    "bg-lime-600",
    "bg-emerald-600",
    "bg-violet-600",
    "bg-fuchsia-600",
    "bg-rose-600",
    "bg-sky-600",
    "bg-amber-600",
    "bg-slate-600",
  ];

  // ใช้ userId เป็นหลัก ถ้าไม่มีจึงใช้ชื่อ
  const identifier = userId || fallbackName || "anonymous";

  // สร้าง hash จาก identifier เพื่อให้ได้สีที่เหมือนกันเสมอสำหรับ user เดียวกัน
  let hash = 0;
  for (let i = 0; i < (identifier?.length || 0); i++) {
    const char = identifier.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return colors[Math.abs(hash) % colors.length];
}

// ฟังก์ชันสำหรับสร้างตัวอักษรที่แสดงในโปรไฟล์
function getUserInitials(
  firstName?: string,
  lastName?: string,
  userId?: string
) {
  if (firstName || lastName) {
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "";
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";
    return firstInitial + lastInitial || firstInitial;
  }

  // ถ้าไม่มีชื่อ ใช้ 2 ตัวแรกจาก userId
  if (userId && userId.length >= 2) {
    return userId.substring(0, 2).toUpperCase();
  }

  // fallback
  return "AN"; // Anonymous
}

// แปลงเบอร์โทรให้เป็นตัวเลขล้วน เช่น 0900000000 (ใช้สำหรับแสดงแบบเบลอ)
function formatPhone(raw?: string | null) {
  if (!raw) return "";
  const digits = String(raw).replace(/[^0-9]/g, "");
  return digits || String(raw);
}

// ฟังก์ชันแปลงสี Tailwind เป็น hex values สำหรับ 3D effect
function getColorHex(colorClass: string): { light: string; dark: string } {
  const colorMap: { [key: string]: { light: string; dark: string } } = {
    "bg-blue-600": { light: "#60a5fa", dark: "#2563eb" },
    "bg-green-600": { light: "#4ade80", dark: "#16a34a" },
    "bg-purple-600": { light: "#a855f7", dark: "#9333ea" },
    "bg-red-600": { light: "#f87171", dark: "#dc2626" },
    "bg-yellow-600": { light: "#fbbf24", dark: "#ca8a04" },
    "bg-pink-600": { light: "#f472b6", dark: "#db2777" },
    "bg-indigo-600": { light: "#818cf8", dark: "#4f46e5" },
    "bg-teal-600": { light: "#2dd4bf", dark: "#0d9488" },
    "bg-orange-600": { light: "#fb923c", dark: "#ea580c" },
    "bg-cyan-600": { light: "#22d3ee", dark: "#0891b2" },
    "bg-lime-600": { light: "#84cc16", dark: "#65a30d" },
    "bg-emerald-600": { light: "#34d399", dark: "#059669" },
    "bg-violet-600": { light: "#c084fc", dark: "#7c3aed" },
    "bg-fuchsia-600": { light: "#e879f9", dark: "#c026d3" },
    "bg-rose-600": { light: "#fb7185", dark: "#e11d48" },
    "bg-sky-600": { light: "#38bdf8", dark: "#0284c7" },
    "bg-amber-600": { light: "#fbbf24", dark: "#d97706" },
    "bg-slate-600": { light: "#64748b", dark: "#475569" },
  };

  return colorMap[colorClass] || { light: "#60a5fa", dark: "#2563eb" }; // default blue
}

// Helper type for property data
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
  is_promoted?: boolean;
  created_at?: string;
  updated_at?: string;
  latitude?: number;
  longitude?: number;
  agent?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    profile_picture?: string;
  } | null;
  localized?: {
    project_name?: LocalizedValue<string>;
    address?: LocalizedValue<string>;
    description?: LocalizedValue<string>;
    highlight?: LocalizedValue<string>;
    areaAround?: LocalizedValue<string>;
    houseCondition?: LocalizedValue<string>;
    facilities?: LocalizedValue<string[]>;
    projectFacilities?: LocalizedValue<string[]>;
  };
}

type PromptPayCharge = {
  id: string;
  source?: {
    scannable_code?: {
      image?: {
        uri?: string | null;
        download_uri?: string | null;
      } | null;
    } | null;
    references?: {
      barcode?: string | null;
    } | null;
  } | null;
};

const extractQrCodeFromCharge = (
  charge?: PromptPayCharge | null
): string | null => {
  if (!charge?.source) {
    return null;
  }

  const image = charge.source.scannable_code?.image;
  if (image?.download_uri) {
    return image.download_uri;
  }

  if (image?.uri) {
    return image.uri;
  }

  if (charge.source.references?.barcode) {
    return charge.source.references.barcode;
  }

  return null;
};

type PromptPaySourceResponse = {
  success: boolean;
  sourceId?: string;
  qrCode?: string | null;
  error?: string;
};

type PromptPayChargeResponse = {
  success: boolean;
  charge?: PromptPayCharge | null;
  error?: string;
  omiseCode?: string;
};

// แยกส่วนที่ต้องเข้าถึง params ออกมาเป็น client component ต่างหาก
function PropertyContent({
  id,
  onLoadingChange,
}: {
  id: string;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [expandedImageIndex, setExpandedImageIndex] = useState(0);
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [similarProperties, setSimilarProperties] = useState<
    PropertyCardData[]
  >([]);
  const [loadingSimilar, setLoadingSimilar] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [isHighlightExpanded, setIsHighlightExpanded] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const { allProperties, isLoading: isPropertyContextLoading } = useProperty();
  const { user, userRole, session } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState("");
  const [hasContactAccess, setHasContactAccess] = useState(true); // Temporarily unlocked for launch
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);
  const [isContactSheetOpen, setIsContactSheetOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "qr">("qr");
  const [qrCodeData, setQrCodeData] = useState<{
    sourceId: string;
    qrCode: string | null;
    chargeId?: string;
  } | null>(null);
  const [isPollingPayment, setIsPollingPayment] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { language, t } = useLanguage();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const locale = language ?? "th";
  const contactPrice = Math.max(CONTACT_REVEAL_PRICE, PROMPTPAY_MINIMUM_THB);
  const contactCardRef = useRef<HTMLDivElement | null>(null);

  // Notify parent when loading state changes
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  useEffect(() => {
    if (typeof window === "undefined" || window.OmiseCard) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.omise.co/omise.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.OmiseCard?.configure({
        publicKey: process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY,
        currency: "thb",
        defaultPaymentMethod: "credit_card",
        frameLabel: "TEDIN EASY",
        submitLabel: "ชำระเงิน",
        buttonLabel: "ชำระเงิน",
      });
    };
  }, []);

  const handleViewPhoneNumber = async () => {
    if (!property?.agent?.id) return;

    const propertyId = property?.property_id || property?.id || id;

    try {
      await fetch("/api/notify-phone-view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          propertyId: propertyId,
          agentId: property.agent.id,
          buyerId: user?.id, // Can be null
        }),
      });
    } catch (error) {
      console.error("Failed to send notification", error);
    }

    setShowPhoneNumber(true);
  };

  // Track mouse position and dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  // เรียกใช้ function เพิ่ม custom style สำหรับซ่อน scrollbar
  useEffect(() => {
    addCustomStyle();
  }, []);

  // Fetch property data from API
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);

        // Check for mock data first
        const mockProperty = mockProperties.find(p => p.id === id);
        if (mockProperty) {
          setProperty(mockProperty as unknown as PropertyDetail);
          setLoading(false);
          onLoadingChange?.(false);
          return;
        }

        const response = await fetch(`/api/properties/${id}`);
        const result = await response.json();

        if (result.success) {
          // Filter out empty strings from images to prevent display errors
          const cleanData = {
            ...result.data,
            images:
              result.data.images?.filter(
                (img: string) => img && img.trim() !== ""
              ) || [],
          };
          setProperty(cleanData);
        } else {
          setError(result.error || "Failed to fetch property");
        }
      } catch (err) {
        setError("Network error occurred");
        console.error("Error fetching property:", err);
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    if (id) {
      fetchProperty();
    }
  }, [id]);

  // Temporarily disabled: Always allow contact access for launch
  // useEffect(() => {
  //   const checkContactAccess = async () => {
  //     const propertyId = property?.property_id || property?.id || id;

  //     if (!user?.id || !propertyId) {
  //       setHasContactAccess(false);
  //       setShowPhoneNumber(false);
  //       return;
  //     }

  //     setIsCheckingAccess(true);
  //     try {
  //       // Get access token from Supabase session
  //       const accessToken = await getAccessToken();

  //       const headers: HeadersInit = {};

  //       // Add Authorization header if we have access token
  //       if (accessToken) {
  //         headers["Authorization"] = `Bearer ${accessToken}`;
  //       }

  //       const response = await fetch(
  //         `/api/property-payments/access?propertyId=${propertyId}`,
  //         {
  //           headers,
  //           credentials: "include",
  //         }
  //       );
  //       if (response.ok) {
  //         const result = await response.json();
  //         const hasAccess = Boolean(result.hasAccess);
  //         setHasContactAccess(hasAccess);
  //         setShowPhoneNumber(prev => (hasAccess ? prev : false));
  //       } else {
  //         setHasContactAccess(false);
  //       }
  //     } catch (error) {
  //       console.error("Failed to check contact access:", error);
  //       setHasContactAccess(false);
  //     } finally {
  //       setIsCheckingAccess(false);
  //     }
  //   };

  //   checkContactAccess();
  // }, [user?.id, property?.id]);
  // Compute similar properties using shared context data with fallback ordering
  useEffect(() => {
    if (!property) {
      return;
    }

    if (
      isPropertyContextLoading &&
      (!allProperties || allProperties.length === 0)
    ) {
      setLoadingSimilar(true);
      return;
    }

    const currentPropertyId = property.property_id || property.id || id;

    const baseList = allProperties.filter(
      candidate => candidate.id !== currentPropertyId
    );

    if (!baseList || baseList.length === 0) {
      setSimilarProperties([]);
      setLoadingSimilar(false);
      return;
    }

    const locationString = (resolvedAddress || "").toLowerCase();
    const locationTokens = Array.from(
      new Set(
        locationString
          .split(/[\s,]+/)
          .map(token => token.trim())
          .filter(token => token && token.length > 2)
      )
    );

    const currentContextProperty = allProperties.find(
      candidate => candidate.id === currentPropertyId
    );

    const resolveLocationString = (item: PropertyCardData) => {
      if (typeof item.location === "string") {
        return item.location.toLowerCase();
      }

      if (item.location && typeof item.location === "object") {
        const maybeAddress = (item.location as { address?: unknown }).address;
        if (typeof maybeAddress === "string") {
          return maybeAddress.toLowerCase();
        }

        const maybeThaiAddress = (
          item.location as {
            [key: string]: unknown;
          }
        )["ที่อยู่"];
        if (typeof maybeThaiAddress === "string") {
          return maybeThaiAddress.toLowerCase();
        }
      }

      return "";
    };

    const tokenMatches =
      locationTokens && locationTokens.length
        ? baseList.filter(item => {
          const itemLocation = resolveLocationString(item);
          return locationTokens.some(token => itemLocation.includes(token));
        })
        : [];

    const listingMatches = currentContextProperty
      ? baseList.filter(item => {
        const rentMatch = currentContextProperty.isForRent && item.isForRent;
        const saleMatch = currentContextProperty.isForSale && item.isForSale;
        return rentMatch || saleMatch;
      })
      : [];

    const popularityMatches = [...baseList].sort(
      (a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0)
    );

    const merged: PropertyCardData[] = [];
    const seen = new Set<string>();

    const addUnique = (list: PropertyCardData[]) => {
      list.forEach(item => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      });
    };

    addUnique(tokenMatches);
    addUnique(listingMatches);
    addUnique(popularityMatches);

    setSimilarProperties(merged.slice(0, 8));
    setLoadingSimilar(false);
  }, [property, allProperties, isPropertyContextLoading, id]);

  // ตรวจสอบว่าผู้ใช้ถูกใจอสังหาริมทรัพย์นี้หรือไม่
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("favorites")
          .select("id")
          .eq("customer_id", user.id)
          .eq("property_id", id)
          .maybeSingle();

        if (!error && data) {
          setIsFavorite(true);
        }
      } catch (error) {
        console.error("Error checking like status:", error);
      }
    };

    checkLikeStatus();
  }, [user?.id, id]);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  // Mouse down event - start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;

    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);

    // Change cursor style
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = "grabbing";
      scrollContainerRef.current.style.userSelect = "none";
    }
  };

  // Mouse leave event - stop dragging
  const handleMouseLeave = () => {
    setIsDragging(false);

    // Reset cursor style
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = "grab";
      scrollContainerRef.current.style.userSelect = "";
    }
  };

  // Mouse up event - stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);

    // Reset cursor style
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = "grab";
      scrollContainerRef.current.style.userSelect = "";
    }
  };
  // Mouse move event - calculate scroll position
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;

    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  // ฟังก์ชันแสดง Toast
  const showToastMessage = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Helper function to get access token from Supabase session
  const getAccessToken = async (): Promise<string | null> => {
    if (session?.access_token) {
      return session.access_token;
    }

    try {
      const {
        data: { session: supabaseSession },
      } = await supabase.auth.getSession();
      return supabaseSession?.access_token || null;
    } catch (error) {
      console.error("Failed to get access token:", error);
      return null;
    }
  };

  const handleStartQRPayment = async () => {
    const propertyId = property?.property_id || property?.id || id;

    if (!propertyId) {
      setPaymentError("ไม่พบรหัสประกาศ กรุณาลองใหม่อีกครั้ง");
      return;
    }

    setPaymentError(null);
    setIsPaymentProcessing(true);

    try {
      // Get access token from Supabase session
      const accessToken = await getAccessToken();

      // Create source for QR code
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add Authorization header if we have access token
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const sourceResponse = await fetch("/api/omise-source", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          amount: contactPrice,
          type: "promptpay",
          name: user?.email || "Customer",
          email: user?.email,
        }),
      });

      const sourceResult =
        (await sourceResponse.json()) as PromptPaySourceResponse;

      if (
        !sourceResponse.ok ||
        !sourceResult.success ||
        !sourceResult.sourceId
      ) {
        throw new Error(sourceResult.error || "ไม่สามารถสร้าง QR code ได้");
      }
      const sourceId = sourceResult.sourceId;

      setQrCodeData({
        sourceId: sourceId,
        qrCode: sourceResult.qrCode ?? null,
      });

      // Get access token again (in case it changed)
      const accessTokenForCharge = await getAccessToken();

      // Create charge with source
      const chargeHeaders: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add Authorization header if we have access token
      if (accessTokenForCharge) {
        chargeHeaders["Authorization"] = `Bearer ${accessTokenForCharge}`;
      }

      const chargeResponse = await fetch("/api/omise-charge", {
        method: "POST",
        headers: chargeHeaders,
        credentials: "include",
        body: JSON.stringify({
          amount: contactPrice,
          source: sourceId,
          propertyId: propertyId,
        }),
      });

      const chargeResult =
        (await chargeResponse.json()) as PromptPayChargeResponse;

      if (!chargeResponse.ok || !chargeResult.success) {
        throw new Error(chargeResult.error || "ไม่สามารถสร้าง charge ได้");
      }

      if (chargeResult.charge) {
        const qrFromCharge = extractQrCodeFromCharge(chargeResult.charge);

        setQrCodeData(prev => {
          if (!prev) {
            return {
              sourceId,
              qrCode: qrFromCharge,
              chargeId: chargeResult.charge?.id,
            };
          }
          return {
            ...prev,
            sourceId: prev.sourceId || sourceId,
            qrCode: qrFromCharge ?? prev.qrCode,
            chargeId: chargeResult.charge?.id || prev.chargeId,
          };
        });

        // Start polling for payment status
        startPollingPayment(chargeResult.charge.id);
      }

      setIsPaymentProcessing(false);
    } catch (error) {
      console.error("QR Payment error:", error);
      setPaymentError(
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการสร้าง QR code"
      );
      showToastMessage("ไม่สามารถสร้าง QR code ได้", "error");
      setIsPaymentProcessing(false);
    }
  };

  const startPollingPayment = (chargeId: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    const propertyId = property?.property_id || property?.id || id;

    setIsPollingPayment(true);
    let pollCount = 0;
    const maxPolls = 60; // 5 minutes (5 seconds * 60)

    const pollInterval = setInterval(async () => {
      pollCount++;

      try {
        const accessToken = await getAccessToken();
        const headers: HeadersInit = {};

        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }

        const response = await fetch(
          `/api/property-payments/access?propertyId=${propertyId}`,
          {
            credentials: "include",
            headers,
          }
        );
        const result = await response.json();

        if (response.status === 401) {
          setPaymentError("ต้องเข้าสู่ระบบก่อนตรวจสอบสถานะการชำระเงิน");
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          setIsPollingPayment(false);
          return;
        }

        if (result.hasAccess) {
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          setIsPollingPayment(false);
          setHasContactAccess(true);
          setShowPhoneNumber(true);
          setIsPaymentDialogOpen(false);
          setQrCodeData(null);
          showToastMessage("ชำระเงินสำเร็จ ปลดล็อกข้อมูลติดต่อแล้ว", "success");
          await handleViewPhoneNumber();
        } else if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          setIsPollingPayment(false);
          setPaymentError("หมดเวลารอการชำระเงิน กรุณาลองใหม่อีกครั้ง");
        }
      } catch (error) {
        console.error("Polling error:", error);
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          setIsPollingPayment(false);
        }
      }
    }, 5000); // Poll every 5 seconds

    pollingIntervalRef.current = pollInterval;
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleStartCardPayment = () => {
    const propertyId = property?.property_id || property?.id || id;

    if (!propertyId) {
      setPaymentError("ไม่พบรหัสประกาศ กรุณาลองใหม่อีกครั้ง");
      return;
    }

    if (typeof window === "undefined" || !window.OmiseCard) {
      setPaymentError("ระบบยังโหลดฟอร์มชำระเงินไม่เสร็จ กรุณาลองใหม่อีกครั้ง");
      return;
    }

    setPaymentError(null);
    setIsPaymentProcessing(true);

    window.OmiseCard.configure({
      amount: Math.round(contactPrice * 100),
      currency: "thb",
      defaultPaymentMethod: "credit_card",
      frameLabel: "TEDIN EASY",
      submitLabel: "ชำระเงิน",
      buttonLabel: "ชำระเงิน",
    });

    window.OmiseCard.open({
      amount: Math.round(contactPrice * 100),
      onCreateTokenSuccess: async (token: { id: string }) => {
        try {
          // Get access token from Supabase session
          const accessToken = await getAccessToken();

          const headers: HeadersInit = {
            "Content-Type": "application/json",
          };

          // Add Authorization header if we have access token
          if (accessToken) {
            headers["Authorization"] = `Bearer ${accessToken}`;
          }

          const response = await fetch("/api/omise-charge", {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify({
              amount: contactPrice,
              token: token.id,
              propertyId: propertyId,
            }),
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || "การชำระเงินล้มเหลว");
          }

          setHasContactAccess(true);
          setShowPhoneNumber(true);
          setIsPaymentDialogOpen(false);
          showToastMessage("ชำระเงินสำเร็จ ปลดล็อกข้อมูลติดต่อแล้ว", "success");
          await handleViewPhoneNumber();
        } catch (error) {
          console.error("Payment error:", error);
          setPaymentError(
            error instanceof Error
              ? error.message
              : "เกิดข้อผิดพลาดในการชำระเงิน"
          );
          showToastMessage("การชำระเงินไม่สำเร็จ", "error");
        } finally {
          setIsPaymentProcessing(false);
        }
      },
      onFormClosed: () => {
        setIsPaymentProcessing(false);
      },
    });
  };

  const handleStartPayment = () => {
    if (paymentMethod === "qr") {
      handleStartQRPayment();
    } else {
      handleStartCardPayment();
    }
  };

  const handleRefundUnavailable = async () => {
    try {
      const res = await fetch("/api/refund-request", { method: "POST" });
      if (res.status === 404) {
        showToastMessage(
          "ฟีเจอร์คำร้องขอคืนเงินยังไม่พร้อมใช้งาน (404)",
          "error"
        );
      } else {
        showToastMessage("ฟีเจอร์คำร้องขอคืนเงินยังไม่พร้อมใช้งาน", "error");
      }
    } catch {
      showToastMessage("ฟีเจอร์คำร้องขอคืนเงินยังไม่พร้อมใช้งาน", "error");
    }
  };

  // ฟังก์ชันจัดการการคลิกที่ส่วนสอบถาม
  const handleContactClick = () => {
    if (!user) {
      setAuthModalMessage(
        "กรุณาเข้าสู่ระบบเป็นลูกค้าก่อนชำระเงินเพื่อดูข้อมูลติดต่อ"
      );
      setShowAuthModal(true);
      return;
    }

    // Check if user is agent/admin
    if (
      userRole === "agent" ||
      userRole === "admin" ||
      userRole === "super_admin"
    ) {
      setAuthModalMessage(
        "คุณเป็น Agent/Admin ไม่สามารถชำระเงินเพื่อดูรายละเอียด Agent คนอื่นได้"
      );
      setShowAuthModal(true);
      return;
    }

    if (!hasContactAccess) {
      setIsPaymentDialogOpen(true);
      return;
    }

    handleViewPhoneNumber();
  };

  // ฟังก์ชันจัดการการกดถูกใจ - แก้ไขเพื่อจัดการ 409 error
  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      showToastMessage(t("favorites_login_required"), "error");
      return;
    }

    if (isLoading) {
      return; // ป้องกันการกดหลายครั้ง
    }

    setIsLoading(true);

    try {
      if (isFavorite) {
        // ลบออกจากรายการโปรด
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("customer_id", user.id)
          .eq("property_id", id);
        if (!error) {
          setIsFavorite(false);
          showToastMessage(
            t("property_detail_toast_success_removed"),
            "success"
          );
        } else {
          throw error;
        }
      } else {
        // ตรวจสอบก่อนว่ามีอยู่แล้วหรือไม่
        const { data: existingFavorite, error: checkError } = await supabase
          .from("favorites")
          .select("id")
          .eq("customer_id", user.id)
          .eq("property_id", id)
          .maybeSingle();

        if (checkError && checkError.code !== "PGRST116") {
          // PGRST116 หมายถึง "not found" ซึ่งเป็นสิ่งที่เราต้องการ
          throw checkError;
        }
        if (existingFavorite) {
          // ถ้ามีอยู่แล้ว แค่อัพเดท state
          setIsFavorite(true);
          showToastMessage(t("property_detail_toast_success_added"), "success");
        } else {
          // เพิ่มเข้ารายการโปรด
          const { error: insertError } = await supabase
            .from("favorites")
            .insert({
              customer_id: user.id,
              property_id: id,
            });
          if (!insertError) {
            setIsFavorite(true);
            showToastMessage(
              t("property_detail_toast_success_added"),
              "success"
            );
          } else if (insertError.code === "23505") {
            // 23505 คือ unique_violation - หมายถึงข้อมูลซ้ำ
            // แค่อัพเดท state เป็น liked
            setIsFavorite(true);
            showToastMessage(
              t("property_detail_toast_success_added"),
              "success"
            );
          } else {
            throw insertError;
          }
        }
      }
    } catch (error: unknown) {
      console.error("Error toggling like:", error);
      // จัดการข้อผิดพลาดตามประเภท
      const errorCode =
        error && typeof error === "object" && "code" in error
          ? error.code
          : null;
      if (errorCode === "23505") {
        // Unique constraint violation - แค่อัพเดท state
        setIsFavorite(true);
        showToastMessage(t("property_detail_toast_success_added"), "success");
      } else {
        showToastMessage(t("property_detail_toast_error"), "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Image expansion handlers
  const handleImageDoubleClick = (imageIndex: number) => {
    setExpandedImageIndex(imageIndex);
    setIsImageExpanded(true);
  };

  const handlePrevImage = () => {
    setExpandedImageIndex(prev =>
      prev === 0 ? (property?.images?.length ?? 1) - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setExpandedImageIndex(prev =>
      prev === (property?.images?.length ?? 1) - 1 ? 0 : prev + 1
    );
  };

  const handleCloseExpanded = () => {
    setIsImageExpanded(false);
  };

  // If loading, show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-4">
            {t("property_detail_loading_title")}
          </h1>
          <p className="text-gray-600">
            {t("property_detail_loading_description")}
          </p>
        </div>
      </div>
    );
  }

  // If error occurred during loading
  if (error) {
    return (
      <div className="min-h-screen bg-white text-gray-800">
        <header className="border-b border-gray-200 bg-white">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-blue-600 font-bold text-lg">
                TEDIN EASY
              </Link>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4 text-red-600">
              {t("property_detail_error_title")}
            </h1>
            <p className="text-gray-600 mb-6">
              {error ?? t("property_detail_error_description")}
            </p>
            <Link href="/" className="text-blue-600 hover:underline">
              {t("property_detail_error_back_home")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If no property data, show not found
  if (!property) {
    return (
      <div className="min-h-screen bg-white text-gray-800">
        <header className="border-b border-gray-200 bg-white">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-blue-600 font-bold text-lg">
                TEDIN EASY
              </Link>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">
              {t("property_detail_not_found_title")}
            </h1>
            <p className="text-gray-600 mb-6">
              {t("property_detail_not_found_description")}
            </p>
            <Link href="/" className="text-blue-600 hover:underline">
              {t("property_detail_error_back_home")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const resolvedProjectName = property
    ? property.localized?.project_name
      ? (pickLocalizedValue(property.localized.project_name, locale, "th") ??
        property.project_name ??
        t("property_detail_project_name_unavailable"))
      : (property.project_name ?? t("property_detail_project_name_unavailable"))
    : t("property_detail_project_name_unavailable");

  const resolvedAddress = property
    ? property.localized?.address
      ? (pickLocalizedValue(property.localized.address, locale, "th") ??
        property.address ??
        t("property_detail_address_unavailable"))
      : (property.address ?? t("property_detail_address_unavailable"))
    : t("property_detail_address_unavailable");

  const resolvedDescription = property
    ? property.localized?.description
      ? (pickLocalizedValue(property.localized.description, locale, "th") ??
        property.description ??
        "")
      : (property.description ?? "")
    : "";

  const resolvedHighlight = property
    ? property.localized?.highlight
      ? (pickLocalizedValue(property.localized.highlight, locale, "th") ??
        property.highlight ??
        "")
      : (property.highlight ?? "")
    : "";

  const resolvedAreaAround = property
    ? property.localized?.areaAround
      ? (pickLocalizedValue(property.localized.areaAround, locale, "th") ??
        property.area_around ??
        "")
      : (property.area_around ?? "")
    : "";

  const resolvedHouseCondition = property
    ? property.localized?.houseCondition
      ? (pickLocalizedValue(property.localized.houseCondition, locale, "th") ??
        property.house_condition ??
        "")
      : (property.house_condition ?? "")
    : "";

  const resolvedFacilitiesRaw = property
    ? property.localized?.facilities
      ? (pickLocalizedValue(property.localized.facilities, locale, "th") ??
        property.facilities ??
        [])
      : (property.facilities ?? [])
    : [];
  const resolvedFacilities = Array.isArray(resolvedFacilitiesRaw)
    ? resolvedFacilitiesRaw
    : toCleanStringArray(resolvedFacilitiesRaw);

  const resolvedProjectFacilitiesRaw = property
    ? property.localized?.projectFacilities
      ? (pickLocalizedValue(
        property.localized.projectFacilities,
        locale,
        "th"
      ) ??
        property.project_facilities ??
        [])
      : (property.project_facilities ?? [])
    : [];
  const resolvedProjectFacilities = Array.isArray(resolvedProjectFacilitiesRaw)
    ? resolvedProjectFacilitiesRaw
    : toCleanStringArray(resolvedProjectFacilitiesRaw);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Rented / Sold overlay: full-screen blur with centered semi-transparent message box */}
      {property &&
        (() => {
          const p: any = property as any;
          const isSold =
            p.is_sold === true ||
            p.isSold === true ||
            (typeof p.status === "string" && /sold/i.test(p.status)) ||
            p.sold === true;
          const isRented =
            p.is_rented === true ||
            p.isRented === true ||
            (typeof p.status === "string" && /rented/i.test(p.status)) ||
            p.rented === true;

          if (!isSold && !isRented) return null;

          const message = isSold
            ? "ทรัพย์สินนี้ถูกขายแล้ว"
            : "บ้านหลังนี้ถูกเช่าแล้ว";

          return (
            <div className="fixed inset-0 z-[12000] flex items-center justify-center">
              <div
                className="absolute inset-0"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                  backgroundColor: "rgba(0,0,0,0.18)",
                }}
              />

              <div className="relative w-full max-w-lg mx-4">
                <div
                  className="rounded-xl shadow-lg p-8 text-center"
                  style={{ backgroundColor: "#FFFFFF90" }}
                >
                  <h2
                    className="text-2xl md:text-3xl font-semibold"
                    style={{ color: "#333333" }}
                  >
                    {message}
                  </h2>
                  <p className="mt-2 text-sm md:text-base text-[#444444]">
                    ขณะนี้ประกาศนี้ไม่สามารถติดต่อได้ กรุณาดูทรัพย์อื่น ๆ
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/all-properties"
                      className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium shadow-sm"
                    >
                      ดูทรัพย์อื่น ๆ
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      {/* Back Button - positioned above the gallery */}
      <div className="container mx-auto px-4 pt-4 pb-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => window.history.back()}
            className="flex items-center text-gray-800 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="mr-2" size={20} />
            <span>{t("property_detail_back_button")}</span>
          </button>
        </div>
      </div>
      {/* Property Gallery */}
      <div className="container mx-auto px-4 mb-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
            {" "}
            <div className="col-span-12 md:col-span-6">
              <div
                className="relative h-64 md:h-[420px] lg:h-[520px] rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setActiveImage(0)}
                onDoubleClick={() => handleImageDoubleClick(activeImage)}
                title={t("property_detail_reset_gallery_tooltip")}
              >
                <Image
                  src={
                    property.images && property.images.length > 0
                      ? property.images[activeImage]
                      : "/placeholder.svg"
                  }
                  alt={resolvedProjectName || "Property"}
                  fill
                  className="object-cover"
                />
                {/* Overlay with reset icon */}
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center pointer-events-none">
                  <div className="bg-white bg-opacity-80 rounded-full p-2 opacity-0 hover:opacity-100 transition-opacity">
                    <svg
                      className="w-6 h-6 text-gray-800"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-6">
              <div className="grid grid-cols-4 md:grid-cols-2 md:grid-rows-2 gap-2 h-64 md:h-[420px] lg:h-[520px]">
                {property.images &&
                  property.images
                    .slice(1, 5)
                    .map((image: string, index: number) => (
                      <div
                        key={index}
                        className="relative rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => setActiveImage(index + 1)}
                        onDoubleClick={() => handleImageDoubleClick(index + 1)}
                      >
                        <Image
                          src={image || "/placeholder.svg"}
                          alt={`${resolvedProjectName || "Property"} image ${index + 2
                            }`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content Area */}
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto pb-20">
          {" "}
          {/* Property Title and Actions */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-1 flex items-center gap-2 flex-wrap">
                {resolvedProjectName}
                {property.is_promoted && (
                  <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-2 py-0.5 text-xs font-bold rounded-md shadow-sm flex items-center border border-amber-400/50">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1 text-white"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {t("favorites_featured")}
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-500">
                {resolvedAddress || t("property_detail_address_unavailable")}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                className={`rounded-full p-3 flex items-center justify-center ${isFavorite ? "bg-red-600" : "bg-black"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={handleLike}
                disabled={isLoading}
                aria-label={t(
                  isFavorite
                    ? "favorites_remove_from_favorites"
                    : "favorites_add_to_favorites"
                )}
                title={t(
                  isFavorite
                    ? "favorites_remove_from_favorites"
                    : "favorites_add_to_favorites"
                )}
              >
                <Heart
                  size={20}
                  className={
                    isFavorite ? "text-white fill-white" : "text-white"
                  }
                />
              </button>
              <button
                className="rounded-full bg-black p-3 flex items-center justify-center"
                title={t("favorites_share_property")}
                aria-label={t("favorites_share_property")}
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title:
                          resolvedProjectName ||
                          t("property_detail_default_share_title"),
                        text:
                          resolvedAddress ||
                          t("property_detail_address_unavailable"),
                        url: window.location.href,
                      });
                    } catch (_err) {
                      // ผู้ใช้ยกเลิกหรือเกิดข้อผิดพลาด
                    }
                  } else {
                    try {
                      await navigator.clipboard.writeText(window.location.href);
                      showToastMessage(
                        t("property_detail_toast_clipboard_success"),
                        "success"
                      );
                    } catch {
                      alert(t("property_detail_share_not_supported"));
                    }
                  }
                }}
              >
                <Share2 size={20} className="text-white" />
              </button>
            </div>
          </div>
          {/* Price */}
          <div className="mb-6">
            <p className="text-xl font-semibold">
              {t("property_detail_price_label")}{" "}
              <span className="text-xl font-semibold">
                {property.price
                  ? `${Number(property.price).toLocaleString()} ${t("property_card_price_suffix")}`
                  : t("property_detail_price_not_available")}
              </span>
            </p>
          </div>
          {/* Property Area */}
          <div className="mb-6">
            <h3 className="text-xl-700 mb-1 font-medium">
              {t("property_detail_area_title")}
            </h3>
          </div>
          {/* Property Features Table */}
          <div className="mb-8">
            <div className="overflow-x-auto rounded-lg border border-gray-200 font-sans">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("property_detail_features_area")}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("property_detail_features_bedrooms")}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("property_detail_features_bathrooms")}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("property_detail_features_parking")}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("property_detail_features_condition")}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("property_detail_features_type")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="w-full text-center">
                        {property.usable_area
                          ? `${Number(property.usable_area).toLocaleString()} ${t(
                            "property_detail_area_unit"
                          )}`
                          : t("property_detail_unavailable")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {property.bedrooms || t("property_detail_unavailable")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {property.bathrooms || t("property_detail_unavailable")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {property.parking_spaces ||
                        t("property_detail_unavailable")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {resolvedHouseCondition ||
                        t("property_detail_unavailable")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {(() => {
                        // Prefer boolean flags if available
                        const isForSale = (property as any).isForSale;
                        const isForRent = (property as any).isForRent;

                        if (isForSale && isForRent) {
                          return (
                            <span>
                              {/* Show both */}
                              {"ขาย"} • {"เช่า"}
                            </span>
                          );
                        }

                        if (isForSale) return <span>{"ขาย"}</span>;
                        if (isForRent) return <span>{"เช่า"}</span>;

                        // Fallback: check listing_type array if present
                        const listing = (property as any).listing_type;
                        if (Array.isArray(listing) && listing.length > 0) {
                          // Normalize to Thai if values are english words
                          const mapped = listing
                            .map((v: string) =>
                              /ขาย|sale|for_sale/i.test(v)
                                ? "ขาย"
                                : /เช่า|rent|for_rent/i.test(v)
                                  ? "เช่า"
                                  : v
                            )
                            .join(", ");
                          return <span>{mapped}</span>;
                        }

                        return (
                          <span className="text-gray-500">
                            {t("property_detail_unavailable")}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          {/* Property Highlights */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium">
                {t("property_detail_highlight_title")}
              </h3>
            </div>
            {resolvedHighlight ? (
              <div
                className={`text-sm text-gray-600 transition-all duration-300 ${isHighlightExpanded ? "" : "line-clamp-3"
                  }`}
                dangerouslySetInnerHTML={{ __html: resolvedHighlight }}
              />
            ) : (
              <p className="text-sm text-gray-500">
                {t("property_detail_highlight_empty")}
              </p>
            )}
            {resolvedHighlight && (
              <div className="mt-4">
                <button
                  onClick={() => setIsHighlightExpanded(!isHighlightExpanded)}
                  className="rounded-full border border-blue-500 text-blue-500 flex items-center px-4 py-2 text-sm hover:bg-blue-50 transition-colors"
                >
                  {isHighlightExpanded
                    ? t("property_detail_read_less")
                    : t("property_detail_read_more")}
                  <div className="ml-2 bg-blue-500 rounded-full flex items-center justify-center w-5 h-5">
                    <ChevronRight
                      size={14}
                      className={`text-white transition-transform duration-300 ${isHighlightExpanded ? "rotate-90" : ""
                        }`}
                    />
                  </div>
                </button>
              </div>
            )}
          </div>
          {/* About Property */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium">
                {t("property_detail_description_title")}
              </h3>
            </div>
            {resolvedDescription ? (
              <div
                className={`text-sm text-gray-600 transition-all duration-300 ${isDescriptionExpanded ? "" : "line-clamp-3"
                  }`}
              >
                {resolvedDescription}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {t("property_detail_description_empty")}
              </p>
            )}
            {resolvedDescription && (
              <div className="mt-4">
                <button
                  onClick={() =>
                    setIsDescriptionExpanded(!isDescriptionExpanded)
                  }
                  className="rounded-full border border-blue-500 text-blue-500 flex items-center px-4 py-2 text-sm hover:bg-blue-50 transition-colors"
                >
                  {isDescriptionExpanded
                    ? t("property_detail_read_less")
                    : t("property_detail_read_more")}
                  <div className="ml-2 bg-blue-500 rounded-full flex items-center justify-center w-5 h-5">
                    <ChevronRight
                      size={14}
                      className={`text-white transition-transform duration-300 ${isDescriptionExpanded ? "rotate-90" : ""
                        }`}
                    />
                  </div>
                </button>
              </div>
            )}
          </div>
          {/* Property Location */}
          <div className="mb-8">
            <h3 className="text-xl font-medium mb-4">
              {t("property_detail_location_title")}
            </h3>
            <div className="relative h-[300px] rounded-lg overflow-hidden bg-gray-100">
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <PropertyMap
                  properties={[
                    {
                      id: property.id || "",
                      title: String(
                        resolvedProjectName ||
                        t("property_detail_default_property_title")
                      ),
                      location: String(
                        resolvedAddress ||
                        t("property_detail_address_unavailable")
                      ),
                      price: String(property.price || "0"),
                      isPricePerMonth: false,
                      details: {
                        area: Number(property.usable_area || 0),
                        bedrooms: Number(property.bedrooms || 0),
                        bathrooms: Number(property.bathrooms || 0),
                        parking: Number(property.parking_spaces || 0),
                      },
                      image:
                        property.images && property.images.length > 0
                          ? property.images
                          : ["/placeholder.svg"],
                      listing_type: ["Sale"],
                      viewCount: 0,
                      latitude: property.latitude,
                      longitude: property.longitude,
                    },
                  ]}
                  center={
                    property.latitude && property.longitude
                      ? [property.latitude, property.longitude]
                      : [13.7563, 100.5018]
                  }
                  zoom={16}
                  activePropertyId={property.id}
                  showPopup={false}
                  expandUrl={property.latitude && property.longitude ? `/map?lat=${property.latitude}&lng=${property.longitude}&zoom=16` : undefined}
                />
              </Suspense>
            </div>
            <div className="mt-2 text-right"></div>
          </div>
          {/* Divider */}
          <hr className="my-4 border-gray-300" />
          {/* Similar Properties Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium">
                {t("property_detail_similar_title")}
              </h3>
              <Link href="/all-properties">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-blue-500 text-blue-500 flex items-center"
                >
                  {t("property_detail_read_more")}
                  <div className="ml-2 bg-blue-500 rounded-full flex items-center justify-center w-5 h-5">
                    <ChevronRight size={14} className="text-white" />
                  </div>
                </Button>
              </Link>
            </div>

            {/* Scrollable container for similar properties */}
            <div className="relative w-full">
              {/* Left scroll button */}
              <button
                onClick={handleScrollLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
                style={{ transform: "translate(-50%, -50%)" }}
                title={t("property_detail_scroll_left")}
                aria-label={t("property_detail_scroll_left")}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 19L8 12L15 5"
                    stroke="#4B5563"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Right scroll button */}
              <button
                onClick={handleScrollRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
                style={{ transform: "translate(50%, -50%)" }}
                title={t("property_detail_scroll_right")}
                aria-label={t("property_detail_scroll_right")}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 5L16 12L9 19"
                    stroke="#4B5563"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <div
                ref={scrollContainerRef}
                className="overflow-x-auto pb-4 hide-scrollbar"
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
              >
                {" "}
                <div className="flex space-x-4 px-4 min-w-max">
                  {loadingSimilar ? (
                    // Loading skeletons
                    Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex-shrink-0 w-72 bg-white rounded-lg overflow-hidden shadow-sm"
                      >
                        <Skeleton className="h-44 w-full" />
                        <div className="p-4">
                          <Skeleton className="h-6 w-3/4 mb-2" />
                          <Skeleton className="h-4 w-1/2 mb-1" />
                          <Skeleton className="h-6 w-2/3 mb-3" />
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                              <div
                                key={i}
                                className="flex flex-col items-center"
                              >
                                <Skeleton className="h-4 w-8 mb-1" />
                                <Skeleton className="h-3 w-12" />
                              </div>
                            ))}
                          </div>
                          <Skeleton className="h-6 w-20" />
                        </div>
                      </div>
                    ))
                  ) : similarProperties && similarProperties.length > 0 ? (
                    // Use PropertyCard component
                    similarProperties.map(similarProperty => (
                      <div
                        key={similarProperty.id}
                        className="flex-shrink-0 w-64"
                      >
                        <PropertyCard
                          property={similarProperty}
                          showViewCount={false}
                        />
                      </div>
                    ))
                  ) : (
                    // Empty state
                    <div className="flex-shrink-0 w-full text-center py-8">
                      <p className="text-gray-500">
                        {t("property_detail_no_similar")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="bg-[#006CE3] text-white p-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Teedin</h3>
              <p className="text-sm text-gray-300">
                แพลตฟอร์มอสังหาริมทรัพย์ที่ช่วยให้คุณค้นหาบ้าน คอนโด
                และที่ดินได้ง่ายขึ้น
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-3">เกี่ยวกับเรา</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <a href="#" className="hover:text-white">
                    เกี่ยวกับ Teedin
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    ติดต่อเรา
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    ร่วมงานกับเรา
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">บริการของเรา</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <a href="#" className="hover:text-white">
                    ซื้อบ้าน
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    เช่าบ้าน
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    ขายบ้าน
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    ประเมินราคา
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">ติดตามเรา</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-white hover:text-gray-300">
                  <span className="sr-only">Facebook</span>
                  <svg
                    className="h-6 w-6"
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
                <a href="#" className="text-white hover:text-gray-300">
                  <span className="sr-only">Instagram</span>
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416 1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353-.3.882-.344 1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a href="#" className="text-white hover:text-gray-300">
                  <span className="sr-only">Twitter</span>
                  <svg
                    className="h-6 w-6"
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
            <p> 2023 Teedin. </p>
          </div>
        </div>
      </footer>
      {/* Contact Agent Sidebar - Fixed on desktop, bottom sheet on mobile */}
      <>
        <div
          ref={contactCardRef}
          className="contact-cta-panel fixed hidden md:flex flex-col items-center overflow-hidden rounded-[20px] border border-white/10 bg-gradient-to-br from-[#0B1F2F] via-[#0E3047] to-[#0F2438] text-white shadow-[0_16px_48px_rgba(5,26,47,0.55)] backdrop-blur"
          style={{
            top: "200px",
            right: "32px",
            transform: "none",
            padding: "18px 16px",
            zIndex: 40,
            maxHeight: "90vh",
            overflowY: "auto",
            width: "270px",
          }}
        >
          {/* Previously there was a blur overlay here for unauthenticated/unpaid users.
              Removed so the contact/inquiry panel is no longer blurred or blocked. */}
          <ShaderBackground
            color="#0B72E7"
            backdropBlurAmount="md"
            className="absolute inset-0 pointer-events-none opacity-80"
          />

          <div className="relative w-[240px] h-auto space-y-3.5">
            <div className="flex flex-col items-center gap-3">
              <h3 className="text-center text-xl font-semibold leading-tight">
                {t("property_detail_contact_title")}
              </h3>
              <p className="text-center text-[13px] text-white/75">
                กดปลดล็อกเพื่อรับอีเมลและเบอร์โทร พร้อมคุยเรื่องราคาได้ทันที
              </p>
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gray-300 mb-3 overflow-hidden relative">
                  {property.agent?.profile_picture ? (
                    <Image
                      src={property.agent.profile_picture}
                      alt={t("property_detail_agent_label")}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center rounded-full transform hover:scale-105 transition-transform duration-200"
                      style={{
                        background: `linear-gradient(145deg, ${getColorHex(
                          getUserColor(
                            property.agent?.id || "",
                            `${property.agent?.first_name || ""} ${property.agent?.last_name || ""}`.trim()
                          )
                        ).light
                          }, ${getColorHex(
                            getUserColor(
                              property.agent?.id || "",
                              `${property.agent?.first_name || ""} ${property.agent?.last_name || ""}`.trim()
                            )
                          ).dark
                          })`,
                        boxShadow: `0 10px 25px ${getColorHex(
                          getUserColor(
                            property.agent?.id || "",
                            `${property.agent?.first_name || ""} ${property.agent?.last_name || ""}`.trim()
                          )
                        ).dark
                          }66, inset 0 1px 0 rgba(255, 255, 255, 0.2), 8px 8px 16px rgba(0,0,0,0.3), -8px -8px 16px rgba(255,255,255,0.1)`,
                      }}
                    >
                      <span className="text-white font-bold text-2xl drop-shadow-lg relative z-10">
                        {getUserInitials(
                          property.agent?.first_name,
                          property.agent?.last_name,
                          property.agent?.id
                        )}
                      </span>
                      <div className="sparkle-overlay">
                        <div className="sparkle sparkle-small sparkle-1"></div>
                        <div className="sparkle sparkle-medium sparkle-3"></div>
                        <div className="sparkle sparkle-small sparkle-5"></div>
                        <div
                          className="sparkle-star"
                          style={{ top: "25%", right: "25%" }}
                        ></div>
                        <div
                          className="sparkle-star"
                          style={{ top: "65%", right: "35%" }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-base text-center font-medium mt-2">
                  {property.agent?.first_name && property.agent?.last_name
                    ? `${property.agent.first_name} ${property.agent.last_name}`
                    : property.agent?.first_name ||
                    property.agent?.last_name ||
                    t("property_detail_agent_label")}
                </p>
                <p className="text-sm text-center text-gray-100">
                  {t("property_detail_agent_label")}
                </p>
              </div>
            </div>

            <div className="w-full space-y-2">
              {hasContactAccess ? (
                <>
                  {property.agent?.email && (
                    <button
                      onClick={() => setIsEmailDialogOpen(true)}
                      className="flex items-center justify-center space-x-3 py-3 px-4 bg-white text-blue-600 rounded-full border border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer w-full"
                    >
                      <Mail size={18} />
                      <span className="text-sm font-medium">
                        {property.agent.email}
                      </span>
                    </button>
                  )}
                  {property.agent?.phone && !showPhoneNumber && (
                    <button
                      onClick={handleViewPhoneNumber}
                      className="flex items-center justify-center space-x-3 py-3 px-4 bg-white text-blue-600 rounded-full border border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer w-full"
                    >
                      <Phone size={18} />
                      <span className="text-sm font-medium">ดูเบอร์โทร</span>
                    </button>
                  )}
                  {property.agent?.phone && showPhoneNumber && (
                    <div className="flex items-center justify-center space-x-3 py-3 px-4 bg-white text-blue-600 rounded-full border border-blue-200">
                      <Phone size={18} />
                      <span className="text-sm font-medium">
                        {property.agent.phone}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/8 via-white/10 to-slate-200/10 p-3.5 text-center text-sm text-white shadow-inner shadow-white/10">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-amber-100/12" />
                  <div className="relative space-y-3">
                    {property.agent?.phone && (
                      <div className="mb-2 flex items-center justify-center gap-2 select-none rounded-full bg-black/20 px-3 py-2 text-sm font-semibold tracking-wide backdrop-blur">
                        <Phone size={16} className="text-amber-200" />
                        <span className="obscured-phone font-medium tracking-wider">
                          {formatPhone(property.agent.phone)}
                        </span>
                      </div>
                    )}
                    <p className="text-[16px] font-semibold">
                      ปลดล็อกข้อมูลติดต่อเอเจนต์
                    </p>
                    <p className="text-[24px] font-bold text-amber-200 leading-tight">
                      {contactPrice.toLocaleString()} บาท
                    </p>
                    <p className="text-white/80 text-[12px] leading-tight">
                      ชำระครั้งเดียวต่อประกาศเพื่อดูอีเมลและเบอร์โทรของเอเจนต์
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="relative w-full mt-1.5">
              <GradientButton
                onClick={handleContactClick}
                disabled={isCheckingAccess || userRole === "agent"}
                className="cta-button relative w-full font-semibold shadow-lg transition-transform disabled:opacity-60 bg-gradient-to-br from-black via-neutral-900 to-black px-4 py-3 text-[15px] rounded-2xl"
                size="md"
              >
                <span className="flex items-center justify-center gap-2">
                  {userRole === "agent"
                    ? "สำหรับลูกค้าทั่วไปเท่านั้น"
                    : hasContactAccess
                      ? "ดูช่องทางการติดต่อ"
                      : `ติดต่อ Agent (${contactPrice.toLocaleString()} บาท)`}
                  {!hasContactAccess && userRole !== "agent" && (
                    <ChevronRight size={18} />
                  )}
                </span>
              </GradientButton>
            </div>
          </div>
        </div>
      </>
      {/* FAB to open contact sheet on mobile */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsContactSheetOpen(true)}
          className="bg-blue-600 text-white rounded-full p-4 shadow-lg flex items-center justify-center"
        >
          <Mail size={24} />
        </button>
      </div>
      {/* Contact Agent Bottom Sheet (Mobile) */}
      {isContactSheetOpen && (
        <div className="md:hidden fixed inset-0 z-[10000] flex items-end">
          {/* พื้นหลังเบลอ */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsContactSheetOpen(false)}
          ></div>
          <div className="relative bg-white rounded-t-2xl p-4 w-full">
            {/* Close button */}
            <button
              onClick={() => setIsContactSheetOpen(false)}
              className="absolute top-4 right-4 text-gray-500"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center gap-4">
              <h3 className="text-center text-lg font-medium">
                {t("property_detail_mobile_contact_title")}
              </h3>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-300 mb-3 overflow-hidden relative">
                  {property.agent?.profile_picture ? (
                    <Image
                      src={property.agent.profile_picture}
                      alt={t("property_detail_agent_label")}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center rounded-full ${getUserColor(property.agent?.id || "")}`}
                    >
                      <span className="text-white font-bold text-xl">
                        {getUserInitials(
                          property.agent?.first_name,
                          property.agent?.last_name,
                          property.agent?.id
                        )}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-base text-center font-medium">
                  {property.agent?.first_name && property.agent?.last_name
                    ? `${property.agent.first_name} ${property.agent.last_name}`
                    : property.agent?.first_name ||
                    property.agent?.last_name ||
                    t("property_detail_agent_label")}
                </p>
                <p className="text-sm text-center text-gray-500">
                  {t("property_detail_agent_label")}
                </p>
              </div>
              <div className="w-full space-y-3">
                {hasContactAccess ? (
                  <>
                    {property.agent?.email && (
                      <button
                        onClick={() => setIsEmailDialogOpen(true)}
                        className="flex items-center justify-center space-x-3 py-3 px-4 bg-gray-100 text-gray-800 rounded-full border border-gray-200 hover:bg-gray-200 transition-colors cursor-pointer w-full"
                      >
                        <Mail size={18} />
                        <span className="text-sm font-medium">
                          {property.agent.email}
                        </span>
                      </button>
                    )}
                    {property.agent?.phone && !showPhoneNumber && (
                      <button
                        onClick={handleViewPhoneNumber}
                        className="flex items-center justify-center space-x-3 py-3 px-4 bg-gray-100 text-gray-800 rounded-full border border-gray-200 hover:bg-gray-200 transition-colors cursor-pointer w-full"
                      >
                        <Phone size={18} />
                        <span className="text-sm font-medium">ดูเบอร์โทร</span>
                      </button>
                    )}
                    {property.agent?.phone && showPhoneNumber && (
                      <div className="flex items-center justify-center space-x-3 py-3 px-4 bg-gray-100 text-gray-800 rounded-full border border-gray-200">
                        <Phone size={18} />
                        <span className="text-sm font-medium">
                          {property.agent.phone}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-gray-100 text-gray-800 rounded-2xl p-4 text-center text-sm">
                    {property.agent?.phone && (
                      <div className="mb-3 flex items-center justify-center gap-2 select-none">
                        <Phone size={18} />
                        <span className="obscured-phone font-medium tracking-wider">
                          {formatPhone(property.agent.phone)}
                        </span>
                      </div>
                    )}
                    <p className="font-medium">
                      ปลดล็อกข้อมูลติดต่อในราคา {contactPrice.toLocaleString()}{" "}
                      บาท
                    </p>
                    <p className="text-gray-500 mt-1">
                      ชำระครั้งเดียวต่อประกาศ
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={handleContactClick}
                disabled={isCheckingAccess || userRole === "agent"}
                className="w-full rounded-full bg-blue-600 text-white font-semibold py-3 shadow-md hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {userRole === "agent"
                  ? "สำหรับลูกค้าทั่วไปเท่านั้น"
                  : hasContactAccess
                    ? "ดูช่องทางการติดต่อ"
                    : `ดูเบอร์โทร (${contactPrice.toLocaleString()} บาท)`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Payment Modal */}
      {isPaymentDialogOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              if (!isPaymentProcessing && !isPollingPayment) {
                setIsPaymentDialogOpen(false);
                setPaymentError(null);
                setQrCodeData(null);
              }
            }}
          ></div>
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 w-full max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                if (!isPaymentProcessing && !isPollingPayment) {
                  setIsPaymentDialogOpen(false);
                  setPaymentError(null);
                  setQrCodeData(null);
                }
              }}
              className="absolute top-4 right-4 text-gray-500"
              disabled={isPaymentProcessing || isPollingPayment}
            >
              <X size={24} />
            </button>
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                ปลดล็อกข้อมูลติดต่อ
              </h3>
              <p className="text-gray-600 mb-6">
                ชำระครั้งเดียวต่อประกาศเพื่อดูอีเมลและเบอร์โทรของเอเจนต์
              </p>
              <div className="bg-blue-50 rounded-2xl py-6 mb-6">
                <p className="text-sm text-blue-600 uppercase tracking-wide">
                  ยอดชำระ
                </p>
                <p className="text-3xl font-bold text-blue-700 mt-2">
                  {contactPrice.toLocaleString()} บาท
                </p>
              </div>

              {!qrCodeData ? (
                <>
                  {/* Payment Method Selection */}
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      เลือกวิธีการชำระเงิน
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentMethod("qr")}
                        className={`rounded-xl border-2 p-4 transition-all ${paymentMethod === "qr"
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                          }`}
                        disabled={isPaymentProcessing}
                      >
                        <div className="text-2xl mb-2">📱</div>
                        <div className="text-sm font-medium">PromptPay</div>
                        <div className="text-xs text-gray-500 mt-1">
                          QR Code
                        </div>
                      </button>
                      <button
                        onClick={() => setPaymentMethod("card")}
                        className={`rounded-xl border-2 p-4 transition-all ${paymentMethod === "card"
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                          }`}
                        disabled={isPaymentProcessing}
                      >
                        <div className="text-2xl mb-2">💳</div>
                        <div className="text-sm font-medium">บัตรเครดิต</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Credit Card
                        </div>
                      </button>
                    </div>
                  </div>

                  {paymentError && (
                    <div className="mb-4 rounded-xl bg-red-50 text-red-600 px-4 py-3 text-sm">
                      {paymentError}
                    </div>
                  )}

                  <button
                    onClick={handleStartPayment}
                    disabled={isPaymentProcessing}
                    className="w-full rounded-full bg-blue-600 text-white font-semibold py-3 shadow-md hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    {isPaymentProcessing
                      ? "กำลังประมวลผล..."
                      : paymentMethod === "qr"
                        ? "สร้าง QR Code"
                        : "ชำระเงินตอนนี้"}
                  </button>
                </>
              ) : (
                <>
                  {/* QR Code Display */}
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      สแกน QR Code เพื่อชำระเงิน
                    </p>
                    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 inline-block">
                      {qrCodeData.qrCode ? (
                        <img
                          src={qrCodeData.qrCode}
                          alt="QR Code"
                          className="w-64 h-64 mx-auto"
                        />
                      ) : (
                        <div className="w-64 h-64 flex flex-col items-center justify-center text-gray-500">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                          <p className="mt-4 text-sm">กำลังสร้าง QR Code...</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      ใช้แอปธนาคารหรือแอป e-wallet สแกน QR Code นี้
                    </p>
                  </div>

                  {isPollingPayment && (
                    <div className="mb-4 rounded-xl bg-blue-50 text-blue-600 px-4 py-3 text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>กำลังรอการชำระเงิน...</span>
                      </div>
                    </div>
                  )}

                  {paymentError && (
                    <div className="mb-4 rounded-xl bg-red-50 text-red-600 px-4 py-3 text-sm">
                      {paymentError}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                      }
                      setQrCodeData(null);
                      setIsPaymentProcessing(false);
                      setIsPollingPayment(false);
                    }}
                    className="w-full rounded-full bg-gray-200 text-gray-700 font-semibold py-3 shadow-md hover:bg-gray-300 transition-colors"
                  >
                    ยกเลิก
                  </button>
                </>
              )}

              <p className="text-xs text-gray-400 mt-3">
                ระบบชำระเงินโดย Omise • ข้อมูลของคุณปลอดภัย
              </p>
              {!qrCodeData && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleRefundUnavailable}
                    className="w-full text-xs text-gray-500 underline hover:text-gray-700"
                  >
                    คำร้องขอคืนเงิน
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal - แสดงเมื่อยังไม่ได้เข้าสู่ระบบ */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          {/* พื้นหลังเบลอ */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAuthModal(false)}
          ></div>

          {/* Modal content */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-16 max-w-4xl mx-4 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className="w-28 h-28 bg-blue-100 rounded-full flex items-center justify-center mb-8">
                <svg
                  className="w-14 h-14 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>

              {/* Message */}
              <p className="text-gray-800 text-2xl font-medium mb-10 leading-relaxed px-6 text-center">
                {authModalMessage}
              </p>

              {/* Close button */}
              <button
                onClick={() => setShowAuthModal(false)}
                className="px-16 py-4 bg-blue-600 text-white rounded-full text-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {t("property_detail_modal_close")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Image Expansion Modal */}
      <ImageExpansionModal
        isOpen={isImageExpanded}
        images={property?.images || []}
        currentImageIndex={expandedImageIndex}
        onClose={handleCloseExpanded}
        onPrevImage={handlePrevImage}
        onNextImage={handleNextImage}
        propertyName={resolvedProjectName}
      />
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`p-4 rounded-lg shadow-lg flex items-center space-x-3 max-w-sm font-sukhumvit ${toastType === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
              }`}
          >
            {toastType === "success" ? (
              <Check className="h-5 w-5 flex-shrink-0" />
            ) : (
              <X className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>กรอกอีเมล</DialogTitle>
            <DialogDescription>
              กรุณากรอกอีเมลของคุณเพื่อติดต่อเอเจนต์
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                อีเมล
              </label>
              <input
                id="email"
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="example@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEmailDialogOpen(false);
                setEmailInput("");
              }}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                if (emailInput.trim()) {
                  // เปิด mailto link
                  window.location.href = `mailto:${property.agent?.email}?subject=สอบถามเกี่ยวกับทรัพย์สิน&body=อีเมลจาก: ${emailInput}`;
                  setIsEmailDialogOpen(false);
                  setEmailInput("");
                }
              }}
              disabled={!emailInput.trim()}
            >
              ส่งอีเมล
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ฟังก์ชันตรวจสอบว่าอยู่ใน iframe หรือไม่
function isInIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

// สร้างตัวจัดการ params เพื่อหลีกเลี่ยงการเข้าถึง params.id โดยตรง
function ParamsHandler({
  children,
}: {
  children: (id: string) => React.ReactNode;
}) {
  const [id, setId] = useState("");

  // ดึงค่า id จาก URL ด้วย client-side only
  useEffect(() => {
    // ดึงค่า path ปัจจุบันจาก window.location.pathname
    const path = window.location.pathname;
    // ใช้ regular expression ในการแยก id จาก path /property/{id}
    const match = path.match(/\/property\/([^\/]+)/);
    const extractedId = match ? match[1] : "";
    setId(extractedId);
  }, []);

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-[600px] w-full max-w-4xl mx-auto rounded-lg" />
      </div>
    );
  }

  return <>{children(id)}</>;
}

// Main component ที่จะรับ params แต่ไม่เข้าถึง params.id โดยตรง
export default function PropertyDetail() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(true);

  return (
    <>
      {!isContentLoading && (
        <HeroSection
          activeFilter={activeFilter}
          onFilterChangeAction={setActiveFilter}
          showSearchSection={false}
        />
      )}
      <ParamsHandler>
        {id => {
          return (
            <PropertyContent id={id} onLoadingChange={setIsContentLoading} />
          );
        }}
      </ParamsHandler>
    </>
  );
}
