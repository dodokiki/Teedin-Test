"use client";

import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { DealFormModal } from "@/components/ui/deal-form-modal";
import { PDFExport } from "@/components/ui/pdf-export";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { pickLocalizedValue, type LocalizedValue } from "@/lib/localization";
import { supabase as sharedSupabase } from "@/lib/supabase";
import { BadgeCheck, Eye, Heart, MapPin, Share2, Crown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { memo, useCallback, useEffect, useState } from "react";
import NegotiationActionPopups from "./property-card-negotiation-popup";

// --- INTERFACES ---

export interface PropertyDetails {
  area: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
}

export interface PropertyData {
  agent_id?: string;
  id: string;
  title: string;
  location:
  | string
  | {
    address?: string;
    ที่อยู่?: string;
    latitude?: number;
    longitude?: number;
  };
  price: string;
  isPricePerMonth?: boolean;
  details: PropertyDetails;
  image: string | string[];
  listing_type?: string[];
  property_category?: string;
  isForRent?: boolean;
  isForSale?: boolean;
  isTopPick?: boolean;
  description?: string;
  highlight?: string;
  facilities?: string[];
  projectFacilities?: string[];
  viewCount?: number;
  isRecommended?: boolean;
  latitude?: number;
  longitude?: number;
  status?: string;
  is_sold?: boolean;
  isSold?: boolean;
  sold?: boolean;
  is_rented?: boolean;
  isRented?: boolean;
  rented?: boolean;
  createdAt?: string;
  in_project?: boolean;
  expiryWarning?: string;
  houseCondition?: string;
  area_around?: string;
  agent?: {
    id: string;
    first_name?: string;
    last_name?: string;
    profile_picture?: string;
    company_name?: string;
  };
  negotiations?: Array<{
    id?: string;
    property_id?: string;
    customer_id?: string;
    agent_id?: string;
    offered_price?: number;
    negotiation_reason?: string;
    created_at?: string;
    status?: string;
    rejection_reason?: string;
  }>;
  customer_user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
  };
  appointments?: Array<{
    id?: string;
    property_id?: string;
    customer_id?: string;
    agent_id?: string;
    appointment_date?: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    status?: string;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    formattedDate?: string;
    buyer?: string;
    seller?: string;
  }>;
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
  boundary_coordinates?: { lat: number; lng: number }[];
}

interface PropertyCardProps {
  property: PropertyData;
  showMapButton?: boolean;
  onMapClick?: (property: PropertyData) => void;
  showViewCount?: boolean;
  priority?: boolean;
  showNegotiationDetails?: boolean;
  showAppointmentDetails?: boolean;
  showContractedDetails?: boolean;
  appointmentStatus?: string;
  showUpdateButton?: boolean;
  onUpdateClick?: (property: PropertyData) => void;
  onAcceptOffer?: (negotiation: any) => void;
  onRejectOffer?: (negotiation: any) => void;
  actionsMenu?: React.ReactNode;
  expiryWarning?: string;
  isActive?: boolean;
}

// --- CUSTOM HOOKS ---

/**
 * Manages the "like" (favorite) state of a property for the current user.
 * @param propertyId - The ID of the property.
 * @param userId - The ID of the current user.
 * @returns {object} - { isLiked, isLoading, handleLike }
 */
const useLikeProperty = (propertyId: string, userId?: string) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId || !propertyId || propertyId.length !== 36) {
      setIsLiked(false);
      return;
    }
    let isMounted = true;
    const checkLikeStatus = async () => {
      try {
        const { data } = await sharedSupabase
          .from("favorites")
          .select("id")
          .eq("customer_id", userId)
          .eq("property_id", propertyId)
          .maybeSingle();
        if (isMounted) {
          setIsLiked(!!data);
        }
      } catch (_error) {
        /* Silent error */
      }
    };
    checkLikeStatus();
    return () => {
      isMounted = false;
    };
  }, [userId, propertyId]);

  const handleLike = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!userId || isLoading || propertyId.length !== 36) return;

      setIsLoading(true);
      try {
        if (isLiked) {
          const { error } = await sharedSupabase
            .from("favorites")
            .delete()
            .match({ customer_id: userId, property_id: propertyId });
          if (!error) setIsLiked(false);
        } else {
          const { error } = await sharedSupabase
            .from("favorites")
            .insert({ customer_id: userId, property_id: propertyId });
          if (!error) setIsLiked(true);
        }
      } catch (error) {
        /* Silent error */
      } finally {
        setIsLoading(false);
      }
    },
    [userId, isLoading, isLiked, propertyId]
  );

  return { isLiked, isLoading, handleLike };
};

/**
 * Tracks when a property card is viewed and updates the view count.
 * @param propertyId - The ID of the property.
 * @param initialViewCount - The initial view count from props.
 * @returns {object} - { viewCount, elementRef }
 */
const useViewTracker = (propertyId: string, initialViewCount: number) => {
  const [viewCount, setViewCount] = useState(initialViewCount);

  const trackView = useCallback(async () => {
    try {
      const response = await fetch(`/api/track-view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ propertyId }),
        keepalive: true,
      });
      if (response.ok) {
        const data = await response.json();
        setViewCount(data.newViewCount || data.viewCount || viewCount + 1);
      }
    } catch (_e) {
      /* Silent error on view tracking */
    }
  }, [propertyId, viewCount]);

  return { viewCount, trackView };
};

// --- HELPER FUNCTIONS & ICONS ---

const formatPrice = (priceString: string | number) => {
  const priceNum =
    typeof priceString === "string"
      ? parseFloat(priceString.replace(/,/g, ""))
      : priceString;
  return isNaN(priceNum) ? "N/A" : priceNum.toLocaleString("th-TH");
};

const getAllImageUrls = (image: string | string[]): string[] => {
  if (!image) {
    return ["/placeholder-property.jpg"];
  }

  const parseImageUrl = (img: string): string => {
    try {
      const parsed = JSON.parse(img);
      return parsed.url || img; // Return url if present, otherwise original string
    } catch {
      return img; // Not a JSON string, return as is
    }
  };

  if (Array.isArray(image)) {
    const urls = image.map(parseImageUrl).filter(Boolean);
    return urls.length > 0 ? urls : ["/placeholder-property.jpg"];
  } else {
    const url = parseImageUrl(image);
    return url ? [url] : ["/placeholder-property.jpg"];
  }
};

const BathIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="m4 21 1-1.5" />
    <path d="M20 21 19 19.5" />
  </svg>
);

const CarIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6 .4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);

import ImageGalleryModal from "./image-gallery-modal";

// --- REFACTORED & EXTRACTED COMPONENTS ---

const OptimizedPropertyImage = memo(
  ({
    src,
    alt,
    priority = false,
    onDoubleClick,
  }: {
    src: string;
    alt: string;
    priority?: boolean;
    onDoubleClick?: (e: React.MouseEvent) => void;
  }) => {
    const [imgSrc, setImgSrc] = useState(src);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
      setImgSrc(src);
      setHasError(false);
    }, [src]);

    const handleError = useCallback(() => {
      if (!hasError) {
        setHasError(true);
        setImgSrc("/placeholder-property.jpg");
      }
    }, [hasError]);

    return (
      <Image
        src={imgSrc}
        alt={alt}
        fill
        priority={priority}
        placeholder="blur"
        blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        onError={handleError}
        loading={priority ? "eager" : "lazy"}
        onDoubleClick={onDoubleClick}
      />
    );
  }
);
OptimizedPropertyImage.displayName = "OptimizedPropertyImage";

const PropertyDetailItem = memo(
  ({
    icon,
    value,
    label,
  }: {
    icon: React.ReactNode;
    value: number;
    label: string;
  }) => (
    <div className="flex flex-col items-center">
      <div className="flex items-center mb-0.5">
        {icon}
        <span className="font-bold text-gray-800">{value}</span>
      </div>
      <span className="font-medium text-gray-600 text-center text-xs">
        {label}
      </span>
    </div>
  )
);
PropertyDetailItem.displayName = "PropertyDetailItem";

const PropertyDetailsGrid = memo(
  ({
    details,
    t,
  }: {
    details: PropertyDetails;
    t: (key: string) => string;
  }) => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs text-gray-600">
      <PropertyDetailItem
        icon={
          <Image
            src="/Icon (1).png"
            alt="area"
            width={16}
            height={16}
            className="h-4 w-4 mr-1"
          />
        }
        value={details.area}
        label={t("property_card_area_unit")}
      />
      <PropertyDetailItem
        icon={
          <Image
            src="/Icon.png"
            alt="bedroom"
            width={16}
            height={16}
            className="h-4 w-4 mr-1"
          />
        }
        value={details.bedrooms}
        label={t("property_card_bedrooms_label")}
      />
      <PropertyDetailItem
        icon={<BathIcon className="h-4 w-4 mr-1 text-gray-500" />}
        value={details.bathrooms}
        label={t("property_card_bathrooms_label")}
      />
      <PropertyDetailItem
        icon={<CarIcon className="h-4 w-4 mr-1 text-gray-500" />}
        value={details.parking}
        label={t("property_card_parking_label")}
      />
    </div>
  )
);
PropertyDetailsGrid.displayName = "PropertyDetailsGrid";

const PropertyActions = memo(
  ({
    property,
    isLiked,
    isLoading,
    onLike,
    onShare,
    onMapClick,
    showMapButton,
    actionsMenu,
    t,
  }: {
    property: PropertyData;
    isLiked: boolean;
    isLoading: boolean;
    onLike: (e: React.MouseEvent) => void;
    onShare: (e: React.MouseEvent) => void;
    onMapClick?: (property: PropertyData) => void;
    showMapButton?: boolean;
    actionsMenu?: React.ReactNode;
    t: (key: string) => string;
  }) => (
    <div className="absolute top-3 right-3 flex space-x-1 z-10">
      <button
        className={`bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors shadow-md ${isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        onClick={onLike}
        disabled={isLoading}
        title={t(
          isLiked
            ? "favorites_remove_from_favorites"
            : "favorites_add_to_favorites"
        )}
        aria-label={t(
          isLiked
            ? "favorites_remove_from_favorites"
            : "favorites_add_to_favorites"
        )}
      >
        <Heart
          className={`h-4 w-4 ${isLiked ? "text-red-500 fill-red-500" : "text-gray-600"
            }`}
        />
      </button>
      <button
        className="bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors shadow-md"
        onClick={onShare}
        title={t("favorites_share_property")}
        aria-label={t("favorites_share_property")}
      >
        <Share2 className="h-4 w-4 text-gray-600" />
      </button>
      {actionsMenu}
      {showMapButton &&
        property.latitude &&
        property.longitude &&
        onMapClick && (
          <button
            className="bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors shadow-md"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onMapClick(property);
            }}
            title={t("property_card_view_on_map")}
            aria-label={t("property_card_view_on_map")}
          >
            <MapPin className="h-4 w-4 text-blue-600" />
          </button>
        )}
    </div>
  )
);
PropertyActions.displayName = "PropertyActions";

const PropertyBadges = memo(
  ({
    buttonText,
    buttonColor,
    isRecommended,
    isTopPick,
    t,
  }: {
    buttonText: string;
    buttonColor: string;
    isRecommended: boolean;
    isTopPick: boolean;
    t: (key: string) => string;
  }) => (
    <div className="absolute top-3 left-3 flex flex-wrap gap-1 z-10">
      <span
        className={`text-white px-2 py-0.5 text-xs font-bold rounded-md shadow-sm ${buttonColor}`}
      >
        {buttonText}
      </span>
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
        <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 text-amber-900 px-2 py-0.5 text-xs font-extrabold rounded-md shadow-md flex items-center border border-yellow-200/50 relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-700 ease-in-out skew-x-12"></div>
          <Crown className="w-3 h-3 mr-1 text-amber-900 fill-amber-100" />
          <span className="tracking-widest font-black text-[10px] uppercase">PREMIUM</span>
        </span>
      )}
    </div>
  )
);
PropertyBadges.displayName = "PropertyBadges";

const NegotiationDetails = memo(
  ({ property, t }: { property: PropertyData; t: (key: string) => string }) => {
    if (!property.negotiations || property.negotiations.length === 0) {
      return null;
    }

    const negotiation = property.negotiations[0];
    const customer = property.customer_user;

    return (
      <div className="mt-2 text-sm text-gray-800 space-y-0.5 border-t border-gray-200 pt-2">
        <div>
          <span className="font-semibold">
            {t("property_card_negotiation_name_label")}
          </span>
          {customer?.first_name || customer?.last_name
            ? ` ${customer?.first_name || ""} ${customer?.last_name || ""}`
            : "-"}
        </div>
        <div>
          <span className="font-semibold">
            {t("property_card_negotiation_price_label")}
          </span>{" "}
          {negotiation.offered_price
            ? `${Number(negotiation.offered_price).toLocaleString()} ${t(
              "property_card_price_suffix"
            )}`
            : "-"}
        </div>
        <div>
          <span className="font-semibold">
            {t("property_card_negotiation_reason_label")}
          </span>{" "}
          {negotiation.negotiation_reason || "-"}
        </div>
        <div>
          <span className="font-semibold">
            {t("property_card_negotiation_phone_label")}
          </span>{" "}
          {customer?.phone || "-"}
        </div>
        <div>
          <span className="font-semibold">
            {t("property_card_negotiation_email_label")}
          </span>{" "}
          {customer?.email || "-"}
        </div>
        <NegotiationActionPopups negotiationId={negotiation.id} />
      </div>
    );
  }
);
NegotiationDetails.displayName = "NegotiationDetails";

// --- Refactored AppointmentDetails Component ---
const AppointmentDetails = memo(
  ({
    property,
    appointmentStatus,
    t,
    language,
    resolvedTitle,
    price,
  }: {
    property: PropertyData;
    appointmentStatus?: string;
    t: (key: string) => string;
    language: string;
    resolvedTitle: string;
    price: string;
  }) => {
    const [modal, setModal] = useState<
      | "idle"
      | "confirming"
      | "confirmed"
      | "cancelling"
      | "cancelled"
      | "dealForm"
      | "pdf"
    >("idle");
    const [dealParties, setDealParties] = useState({ buyer: "", seller: "" });

    if (!property.appointments || property.appointments.length === 0) {
      return null;
    }
    const appointment = property.appointments[0];
    const status = appointmentStatus ?? appointment.status;

    const updateAppointmentStatus = async (newStatus: "confirm" | "cancel") => {
      if (!appointment.id) return;
      try {
        await sharedSupabase
          .from("appointments")
          .update({ status: newStatus })
          .eq("id", appointment.id);
        setModal(newStatus === "confirm" ? "confirmed" : "cancelled");
      } catch (e) {
        console.error(`Error updating appointment to ${newStatus}:`, e);
        setModal("idle"); // Reset on error
      }
    };

    const handleCreateContract = async () => {
      if (
        !appointment.id ||
        !dealParties.buyer.trim() ||
        !dealParties.seller.trim()
      )
        return;
      try {
        await sharedSupabase
          .from("appointments")
          .update({
            buyer: dealParties.buyer,
            seller: dealParties.seller,
          })
          .eq("id", appointment.id);
        // Refresh might be needed here, or optimistically update UI
      } catch (e) {
        console.error("Error creating contract:", e);
      } finally {
        setModal("idle");
      }
    };

    const isContractReady =
      status === "confirm" &&
      appointment.buyer?.trim() &&
      appointment.seller?.trim();

    return (
      <>
        <div className="mt-2 text-sm text-gray-800 space-y-0.5 border-t border-gray-200 pt-2">
          {/* Details remain the same */}
          <div>
            <span className="font-semibold">
              {t("property_card_appointment_name_label")}
            </span>
            {` ${property.customer_user?.first_name || ""} ${property.customer_user?.last_name || ""
              }`.trim() || "-"}
          </div>
          <div>
            <span className="font-semibold">
              {t("property_card_appointment_phone_label")}
            </span>{" "}
            {property.customer_user?.phone || "-"}
          </div>
          <div>
            <span className="font-semibold">
              {t("property_card_appointment_email_label")}
            </span>{" "}
            {property.customer_user?.email || "-"}
          </div>
          <div>
            <span className="font-semibold">
              {t("property_card_appointment_date_label")}
            </span>{" "}
            {appointment.formattedDate || "-"}
          </div>
          <div>
            <span className="font-semibold">
              {t("property_card_appointment_note_label")}
            </span>{" "}
            {appointment.notes || "-"}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-3">
          {isContractReady ? (
            <button
              className="w-full bg-[#006CE3] text-white rounded-[10px] py-2 text-base font-bold hover:bg-blue-700"
              onClick={() => setModal("pdf")}
            >
              {t("property_card_download_document")}
            </button>
          ) : status === "confirm" ? (
            <button
              className="w-full bg-[#006CE3] text-white rounded-[10px] py-2 text-base font-bold hover:bg-blue-700"
              onClick={() => setModal("dealForm")}
            >
              {t("property_card_create_contract")}
            </button>
          ) : (
            <>
              <button
                className="w-full bg-[#006CE3] text-white rounded-[10px] py-2 text-base font-bold hover:bg-blue-700"
                onClick={() => setModal("confirming")}
              >
                {t("property_card_confirm_button")}
              </button>
              <button
                className="w-full border border-[#006CE3] text-[#222] rounded-[10px] py-2 text-base font-bold bg-white hover:bg-gray-100"
                onClick={() => setModal("cancelling")}
              >
                {t("property_card_reject_button")}
              </button>
            </>
          )}
        </div>

        {/* Modals */}
        <ConfirmationModal
          open={modal === "confirming"}
          onConfirm={() => updateAppointmentStatus("confirm")}
          onCancel={() => setModal("idle")}
          title={t("property_card_confirmation_title")}
          message={t("property_card_confirmation_message")}
        />
        <ConfirmationModal
          open={modal === "confirmed"}
          onConfirm={() => setModal("idle")}
          onCancel={() => setModal("idle")}
          title={t("property_card_confirm_success_title")}
          message={t("property_card_confirm_success_message")}
          type="success"
          showCancel={false}
        />
        <ConfirmationModal
          open={modal === "cancelling"}
          onConfirm={() => updateAppointmentStatus("cancel")}
          onCancel={() => setModal("idle")}
          title={t("property_card_cancel_title")}
          message={t("property_card_cancel_message")}
          type="error"
        />
        <ConfirmationModal
          open={modal === "cancelled"}
          onConfirm={() => setModal("idle")}
          onCancel={() => setModal("idle")}
          title={t("property_card_cancel_success_title")}
          message={t("property_card_cancel_success_message")}
          type="success"
          showCancel={false}
        />
        <DealFormModal
          open={modal === "dealForm"}
          onClose={() => setModal("idle")}
          onSubmit={(buyer, seller) => {
            setDealParties({ buyer, seller });
            handleCreateContract();
          }}
        />
        {modal === "pdf" && (
          <PDFExport
            filename={`contract-${property.id}`}
            onExport={() => setModal("idle")}
          >
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {t("property_card_contract_heading")}
              </h2>
              <p>
                <strong>{t("property_card_contract_buyer_label")}</strong>{" "}
                {appointment.buyer}
              </p>
              <p>
                <strong>{t("property_card_contract_seller_label")}</strong>{" "}
                {appointment.seller}
              </p>
              <p>
                <strong>{t("property_card_contract_property_label")}</strong>{" "}
                {resolvedTitle}
              </p>
              <p>
                <strong>{t("property_card_contract_price_label")}</strong>{" "}
                {price} {t("property_card_price_suffix")}
              </p>
              <p>
                <strong>{t("property_card_contract_date_label")}</strong>{" "}
                {new Date().toLocaleDateString(
                  language === "th" ? "th-TH" : "en-US"
                )}
              </p>
            </div>
          </PDFExport>
        )}
      </>
    );
  }
);
AppointmentDetails.displayName = "AppointmentDetails";

// --- MAIN COMPONENT ---

export const PropertyCard = memo(
  ({
    property,
    showMapButton = false,
    onMapClick,
    showViewCount = true,
    priority = false,
    showUpdateButton = false,
    onUpdateClick,
    showNegotiationDetails = false,
    showAppointmentDetails = false,
    appointmentStatus,
    actionsMenu,
    expiryWarning,
    isActive = false,
  }: PropertyCardProps) => {
    const {
      id,
      title,
      location: rawLocation,
      price,
      isPricePerMonth,
      details,
      image,
      listing_type,
      isForRent,
      isForSale,
      isTopPick,
      viewCount = 0,
      status,
    } = property;

    const { language, t } = useLanguage();
    const { user } = useAuth();

    const { viewCount: currentViewCount, trackView } = useViewTracker(
      id,
      viewCount
    );
    const {
      isLiked,
      isLoading: isLikeLoading,
      handleLike,
    } = useLikeProperty(id, user?.id);

    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
    const [isShaking, setIsShaking] = useState(false);

    useEffect(() => {
      if (isActive) {
        setIsShaking(true);
        const timer = setTimeout(() => setIsShaking(false), 820); // Match animation duration
        return () => clearTimeout(timer);
      }
    }, [isActive]);

    // --- Data Resolvers & Formatters ---
    const cardExpiryWarning =
      expiryWarning ?? property.expiryWarning ?? undefined;

    const resolvedTitle =
      pickLocalizedValue(property.localized?.title, language, "th") ?? title;

    const location =
      typeof rawLocation === "string"
        ? rawLocation
        : typeof rawLocation === "object" && rawLocation !== null
          ? rawLocation.address || rawLocation.ที่อยู่ || "ไม่ระบุที่ตั้ง"
          : "ไม่ระบุที่ตั้ง";

    const resolvedLocation =
      pickLocalizedValue(property.localized?.address, language, "th") ??
      location;

    const getShortLocation = (fullAddress: string): string => {
      if (!fullAddress) return "";
      const parts = fullAddress.split(" ");
      const roadKeywords = [
        "ถนน",
        "Road",
        "Rd",
        "Street",
        "St",
        "Avenue",
        "Ave",
      ];
      const roadPart = parts.find(part =>
        roadKeywords.some(keyword =>
          part.toLowerCase().includes(keyword.toLowerCase())
        )
      );
      return roadPart || fullAddress;
    };

    const displayLocation = getShortLocation(resolvedLocation);

    const getButtonTextAndColor = useCallback(() => {
      const types = listing_type || [];
      const hasRent =
        isForRent ||
        types.some(
          type => type.toLowerCase().includes("rent") || type.includes("เช่า")
        );
      const hasSale =
        isForSale ||
        types.some(
          type => type.toLowerCase().includes("sale") || type.includes("ขาย")
        );

      if (hasRent && hasSale)
        return {
          textKey: "property_card_badge_sale_rent",
          color: "bg-purple-600",
        };
      if (hasRent)
        return { textKey: "property_card_badge_rent", color: "bg-green-600" };
      if (hasSale)
        return { textKey: "property_card_badge_sale", color: "bg-blue-600" };
      return { textKey: "property_card_badge_rent", color: "bg-green-600" }; // Default
    }, [listing_type, isForRent, isForSale]);

    // --- Handlers ---
    const handleShare = useCallback(
      async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const shareData = {
          title: resolvedTitle,
          text: `${resolvedTitle} - ${resolvedLocation}`,
          url: `${window.location.origin}/property/${id}`,
        };
        try {
          if (navigator.share) {
            await navigator.share(shareData);
          } else {
            await navigator.clipboard.writeText(shareData.url);
          }
        } catch (error) {
          /* Silent error */
        }
      },
      [resolvedTitle, resolvedLocation, id]
    );

    const handleImageDoubleClick = useCallback((e: React.MouseEvent) => {
      e.preventDefault(); // Prevent default link navigation
      e.stopPropagation(); // Stop event from bubbling up to parent elements
      setIsGalleryOpen(true);
      setCurrentGalleryIndex(0); // Always start with the first image in the gallery
    }, []);

    const { textKey: buttonTextKey, color: buttonColor } =
      getButtonTextAndColor();
    const displayImages = getAllImageUrls(image); // Use the new function to get all image URLs
    const displayMainImage = displayImages[0]; // The first image for the card itself
    const isRecommended = currentViewCount >= 100;

    const CardContent = () => (
      <>
        <div className="relative">
          <Link
            href={`/property/${id}`}
            className="relative flex-shrink-0 block"
            onClick={trackView}
          >
            <div className="property-card-image w-full aspect-[4/3] relative overflow-hidden rounded-t-xl">
              <OptimizedPropertyImage
                src={displayMainImage} // Use the first image for the card
                alt={resolvedTitle}
                priority={priority}
                onDoubleClick={handleImageDoubleClick} // Add double-click handler
              />
              {(() => {
                const isSold =
                  status === "sold" ||
                  (property as any).is_sold === true ||
                  (property as any).isSold === true ||
                  (typeof status === "string" && /sold/i.test(status)) ||
                  (property as any).sold === true;

                const isRented =
                  status === "rented" ||
                  (property as any).is_rented === true ||
                  (property as any).isRented === true ||
                  (typeof status === "string" && /rented/i.test(status)) ||
                  (property as any).rented === true;

                if (!isSold && !isRented) return null;

                const message = isSold
                  ? "property_card_status_sold"
                  : "property_card_status_rented";

                return (
                  <div className="absolute inset-0 bg-gray-700/80 flex items-center justify-center pointer-events-none z-0">
                    <div className="text-white font-bold text-2xl transform -rotate-12 pointer-events-auto">
                      {t(message)}
                    </div>
                  </div>
                );
              })()}
            </div>
            <PropertyBadges
              buttonText={t(buttonTextKey)}
              buttonColor={buttonColor}
              isRecommended={isRecommended}
              isTopPick={isTopPick || false}
              t={t}
            />
          </Link>
          <PropertyActions
            property={property}
            isLiked={isLiked}
            isLoading={isLikeLoading}
            onLike={handleLike}
            onShare={handleShare}
            onMapClick={onMapClick}
            showMapButton={showMapButton}
            actionsMenu={actionsMenu}
            t={t}
          />
        </div>

        <div className="property-card-content p-3 sm:p-4 flex flex-col flex-grow">
          <div className="flex-grow">
            <Link
              href={`/property/${id}`}
              className="flex flex-col gap-0.5 group/text"
              onClick={trackView}
            >
              <h3 className="property-card-title text-lg sm:text-xl font-bold text-gray-900 group-hover/text:text-blue-600 transition-colors flex items-center gap-1.5">
                <span className="line-clamp-1">{resolvedTitle}</span>
                {isTopPick && (
                  <div className="relative w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-full h-full drop-shadow-sm"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <linearGradient
                          id="blue-gradient-card"
                          x1="3.85"
                          y1="3.85"
                          x2="20.15"
                          y2="20.15"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#3b82f6" />
                          <stop offset="1" stopColor="#2563eb" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
                        fill="url(#blue-gradient-card)"
                      />
                      <path
                        d="M10.5 15.5L7.5 12.5L8.2 11.8L10.5 14.1L15.8 8.8L16.5 9.5L10.5 15.5Z"
                        fill="white"
                        stroke="white"
                        strokeWidth="0.5"
                      />
                    </svg>
                  </div>
                )}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                <span className="line-clamp-1">{displayLocation}</span>
              </p>
            </Link>

            <div className="mt-1.5 pb-2 border-b border-gray-200 mb-2">
              <div className="flex items-baseline gap-1 whitespace-nowrap">
                {price ? (
                  <>
                    <span className="property-card-price text-[#006ce3] font-black text-lg sm:text-xl">
                      {formatPrice(price)}
                    </span>
                    <span className="property-card-price-suffix text-[#006ce3] font-black text-base sm:text-lg whitespace-nowrap lowercase">
                      {t("property_card_price_suffix").toLowerCase()}
                      {isPricePerMonth &&
                        ` ${t("property_card_price_per_month_suffix")}`}
                    </span>
                  </>
                ) : (
                  <span className="property-card-price text-[#006ce3] font-black text-lg sm:text-xl">
                    -
                  </span>
                )}
              </div>
            </div>

            <PropertyDetailsGrid details={details} t={t} />
          </div>

          <div className="flex-shrink-0 mt-auto pt-2">
            {cardExpiryWarning && (
              <div className="mt-1.5 text-xs text-red-600 bg-red-100 border border-red-200 rounded-md p-1.5 text-center">
                {cardExpiryWarning}
              </div>
            )}

            {!showUpdateButton && showViewCount && (
              <div className="flex items-center justify-center text-xs text-gray-500 mt-1.5">
                <Eye className="h-3.5 w-3.5 mr-1" />
                <span className="font-medium">
                  {currentViewCount.toLocaleString()}{" "}
                  {t("property_card_view_suffix")}
                </span>
              </div>
            )}

            {showUpdateButton && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => onUpdateClick?.(property)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md"
                >
                  {t("property_card_update_button")}
                </button>
              </div>
            )}

            {showNegotiationDetails && (
              <NegotiationDetails property={property} t={t} />
            )}

            {showAppointmentDetails && (
              <AppointmentDetails
                property={property}
                appointmentStatus={appointmentStatus}
                t={t}
                language={language}
                resolvedTitle={resolvedTitle}
                price={price}
              />
            )}
          </div>
        </div>

        {/* Image Gallery Modal */}
        <ImageGalleryModal
          images={displayImages}
          initialIndex={currentGalleryIndex}
          onClose={() => setIsGalleryOpen(false)}
          isOpen={isGalleryOpen}
        />
      </>
    );

    if (isTopPick) {
      return (
        <div
          className={`group relative rounded-2xl p-[2px] bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 shadow-sm shadow-amber-500/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${isShaking ? "shake-effect" : ""
            }`}
        >
          <div className="bg-white rounded-xl overflow-hidden h-full flex flex-col relative font-ibm-plex-sans-thai">
            <CardContent />
          </div>
        </div>
      );
    }

    return (
      <div
        className={`group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative font-ibm-plex-sans-thai ${isShaking ? "shake-effect" : ""
          }`}
      >
        <CardContent />
      </div>
    );
  }
);
PropertyCard.displayName = "PropertyCard";
