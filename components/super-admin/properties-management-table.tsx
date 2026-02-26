"use client";

import { getSuperAdminBrowserClient } from "@/lib/super-admin-supabase";
import { Phone, X } from "lucide-react";
import Image from "next/image";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";

import PropertyMap from "@/components/property/property-map-new";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import {
  normalizeLocalizedValue,
  pickLocalizedValue,
  type LocalizedValue,
} from "@/lib/localization";

// ใช้ Supabase client กลางจาก lib/supabase

// Custom Pagination Component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  showSearchInfo?: boolean;
  searchQuery?: string;
}

type Nullable<T> = T | null | undefined;

interface PropertyDetailRecord {
  project_name?: string | LocalizedValue<string> | null;
  address?: string | LocalizedValue<string> | null;
  usable_area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking_spaces?: number | null;
  house_condition?: string | LocalizedValue<string> | null;
  highlight?: string | LocalizedValue<string> | null;
  area_around?: string | LocalizedValue<string> | null;
  facilities?: string[] | LocalizedValue<string[]> | null;
  project_facilities?: string[] | LocalizedValue<string[]> | null;
  description?: string | LocalizedValue<string> | null;
  price?: number | null;
  images?: string[] | null;
  view_count?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface AgentUser {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  company_name?: string | null;
  license_number?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

interface SuperAdminUser extends AgentUser {
  status?: string | null;
  updated_at?: string | null;
}

interface PropertyRecord {
  id: string;
  status?: string | null;
  property_category?: string | null;
  agent_id?: string | null;
  created_at?: string | null;
  listing_type?: string[] | null;
  property_details?: Nullable<PropertyDetailRecord | PropertyDetailRecord[]>;
  agent?: Nullable<AgentUser>;
  [key: string]: unknown;
}

const getPrimaryDetail = (
  details: PropertyRecord["property_details"]
): PropertyDetailRecord | null => {
  if (!details) {
    return null;
  }
  if (Array.isArray(details)) {
    return details[0] ?? null;
  }
  return details;
};

// Helper function to extract display value from localized or plain string
const getDisplayValue = (
  value: string | LocalizedValue<string> | null | undefined,
  locale: "th" | "en" = "th"
): string => {
  if (!value) return "-";
  if (typeof value === "string") return value;
  const normalized = normalizeLocalizedValue<string>(value);
  const result = pickLocalizedValue(normalized, locale);
  return typeof result === "string" ? result : "-";
};

// Helper function to extract display value from localized or plain string array
const getDisplayArray = (
  value: string[] | LocalizedValue<string[]> | null | undefined,
  locale: "th" | "en" = "th"
): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  const normalized = normalizeLocalizedValue<string[]>(value);
  return pickLocalizedValue(normalized, locale) || [];
};

const CustomPagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  startIndex,
  endIndex,
  totalItems,
  showSearchInfo = false,
  searchQuery = "",
}) => {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter((v, i, a) => a.indexOf(v) === i);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
      <div className="text-sm text-gray-700">
        แสดง <span className="font-medium">{startIndex + 1}</span> ถึง{" "}
        <span className="font-medium">{Math.min(endIndex, totalItems)}</span>{" "}
        จากทั้งหมด <span className="font-medium">{totalItems}</span> คน
        {showSearchInfo && searchQuery && (
          <span className="text-blue-600">
            {" "}
            (ค้นหา: &quot;{searchQuery}&quot;)
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          ก่อนหน้า
        </button>

        {/* Page Numbers */}
        <div className="flex items-center space-x-1">
          {getVisiblePages().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === "number" && onPageChange(page)}
              disabled={page === "..."}
              className={`
                px-3 py-2 text-sm font-medium rounded-lg transition-colors
                ${
                  page === currentPage
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                    : page === "..."
                      ? "text-gray-400 cursor-default"
                      : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                }
              `}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ถัดไป
          <svg
            className="w-4 h-4 ml-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  icon?: React.ReactNode;
}
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  icon,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-[1200px] w-full transition-all relative">
        <button
          onClick={onClose}
          className="absolute -top-5 -right-5 z-50 bg-white rounded-full shadow-lg border border-gray-200 p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-700 focus:outline-none transition"
          aria-label="ปิด"
        >
          <svg
            className="w-7 h-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div className="p-0">
          {/* Custom header for property modal */}
          {icon || title ? (
            <div className="flex items-center gap-3 px-8 pt-7 pb-3 border-b border-gray-100">
              {icon && (
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-pink-100">
                  {icon}
                </div>
              )}
              <span className="font-bold text-lg text-gray-800">{title}</span>
            </div>
          ) : null}
          <div className="px-8 pb-8 pt-4">{children}</div>
        </div>
      </div>
    </div>
  );
};

// Confirmation Modal
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userEmail: string;
  loading: boolean;
}
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userEmail,
  loading,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ยืนยันการลบผู้ใช้งาน"
      icon={null}
    >
      <div className="space-y-4">
        <p className="text-gray-700">
          คุณต้องการลบผู้ใช้งาน{" "}
          <span className="font-semibold text-red-600">{userEmail}</span>{" "}
          ใช่หรือไม่?
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">
            <strong>คำเตือน:</strong> การลบผู้ใช้งานนี้จะส่งผลให้:
          </p>
          <ul className="text-sm text-red-700 mt-2 space-y-1">
            <li>• ข้อมูลส่วนตัวทั้งหมดจะถูกลบถาวร</li>
            <li>• ข้อมูลการประกาศอสังหาริมทรัพย์ที่เกี่ยวข้องจะหายไป</li>
            <li>• ประวัติการทำรายการทั้งหมดจะถูกลบ</li>
            <li>• ไม่สามารถกู้คืนข้อมูลได้หลังจากลบแล้ว</li>
          </ul>
        </div>
        <div className="flex space-x-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            disabled={loading}
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                กำลังลบ...
              </>
            ) : (
              "ยืนยันลบ"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Success Modal
interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}
const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ลบผู้ใช้งานเสร็จสิ้น"
      icon={null}
    >
      <div className="text-center">
        <p className="text-gray-700 mb-4">ลบผู้ใช้งานออกจากระบบเรียบร้อยแล้ว</p>
        <button
          onClick={onClose}
          className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all"
        >
          ปิดหน้าต่าง
        </button>
      </div>
    </Modal>
  );
};

// PropertyContent (คัดลอกจาก app/property/[id]/page.tsx, ตัด header/footer ออก)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface PropertyContentProps {
  id: string;
}
export function PropertyContent({ id }: PropertyContentProps) {
  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const superAdminSupabase = getSuperAdminBrowserClient();
        const { data, error } = await superAdminSupabase
          .from("properties")
          .select(`*, property_details(*)`)
          .eq("id", id)
          .single();

        if (error) {
          throw error;
        }

        setProperty((data as PropertyRecord) ?? null);
      } catch (fetchError) {
        setError(String(fetchError));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-60 bg-gray-200 rounded-lg"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center">{String(error)}</div>;
  }

  if (!property) {
    return null;
  }

  const detail = getPrimaryDetail(property.property_details);
  const img = detail?.images?.[0] || "/placeholder-property.jpg";

  return (
    <div className="flex flex-col gap-4">
      {/* Property Images */}
      <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
        <Image
          src={img}
          alt={getDisplayValue(detail?.project_name) || "property"}
          fill
          className="object-cover rounded-lg"
          sizes="(max-width: 768px) 100vw, 66vw"
        />
      </div>

      {/* Property Details */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">
            {getDisplayValue(detail?.project_name)}
          </h2>
          <div className="text-sm text-gray-500 mt-1">
            {getDisplayValue(detail?.address)}
          </div>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-blue-600">
              {detail?.price
                ? Number(detail.price).toLocaleString() + " บาท"
                : "-"}
            </span>
            {property.status === "sold" && (
              <span className="text-xs font-semibold text-white bg-red-600 rounded-full px-3 py-1">
                ขายแล้ว
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-200 my-4"></div>

      {/* Property Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          <span className="text-gray-700">{detail?.bedrooms ?? "-"} นอน</span>
        </div>
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12a9 9 0 0118 0 9 9 0 01-18 0z"
            />
          </svg>
          <span className="text-gray-700">
            {detail?.usable_area ?? "-"} ตร.ม.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6l4 2"
            />
          </svg>
          <span className="text-gray-700">
            {property.property_category ?? "-"}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-200 my-4"></div>

      {/* Description */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          รายละเอียดเพิ่มเติม
        </h3>
        <p className="text-gray-700 whitespace-pre-line">
          {getDisplayValue(detail?.description)}
        </p>
      </div>

      {/* Map */}
      <div className="mt-4">
        <PropertyMap
          properties={
            property && property.id
              ? [
                  {
                    id: property.id,
                    title: getDisplayValue(detail?.project_name) || "ทรัพย์สิน",
                    location:
                      getDisplayValue(detail?.address) || "ไม่ระบุที่อยู่",
                    price: String(detail?.price ?? 0),
                    isPricePerMonth: false,
                    details: {
                      area: detail?.usable_area || 0,
                      bedrooms: detail?.bedrooms || 0,
                      bathrooms: detail?.bathrooms || 0,
                      parking: detail?.parking_spaces || 0,
                    },
                    image:
                      detail?.images && detail.images.length > 0
                        ? detail.images
                        : ["/placeholder-property.jpg"],
                    listing_type: [property.listing_type?.[0] || "Sale"],
                    viewCount: 0,
                    latitude: detail?.latitude ?? 0,
                    longitude: detail?.longitude ?? 0,
                  },
                ]
              : []
          }
          center={
            detail?.latitude && detail?.longitude
              ? [detail.latitude, detail.longitude]
              : [13.7563, 100.5018]
          }
          zoom={16}
          activePropertyId={property?.id}
        />
      </div>

      {/* Contact Agent */}
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          ติดต่อเอเจนต์
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {property.agent?.first_name?.charAt(0) || "U"}
              {property.agent?.last_name?.charAt(0) || ""}
            </div>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">
              {property.agent?.first_name} {property.agent?.last_name}
            </div>
            <div className="text-sm text-gray-500">{property.agent?.email}</div>
            <div className="text-sm text-gray-500">{property.agent?.phone}</div>
          </div>
          <div>
            <Button
              className="flex items-center gap-2"
              onClick={() => {
                /* open chat or call agent */
              }}
            >
              <Phone className="w-5 h-5" />
              ติดต่อเอเจนต์
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// แจ้งเตือน User ให้แก้ไขประกาศ Modal
interface NotifyEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  detailUser: AgentUser | null;
}
const NotifyEditModal: React.FC<NotifyEditModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  detailUser,
}) => {
  const [reason, setReason] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, userRole } = useAuth();

  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
      setReason("");
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!reason || !detailUser?.id || !user?.id) return;
    setLoading(true);
    try {
      const superAdminSupabase = getSuperAdminBrowserClient();
      await superAdminSupabase.from("notifications").insert([
        {
          sender_id: user.id,
          receiver_id: detailUser.id,
          message: reason,
          is_read: false,
          role: userRole,
          headder: "แจ้งเตือนให้แก้ไขประกาศ",
        },
      ]);
      setIsSuccess(true);
    } catch (error) {
      console.error("❌ Notification error:", error);
      alert("เกิดข้อผิดพลาดในการแจ้งเตือน");
    } finally {
      setLoading(false);
    }
    // ไม่ต้องเรียก onConfirm ที่นี่ ให้ไปเรียกหลัง user กดปุ่มใน success popup
  };

  if (!isOpen) return null;

  if (isSuccess) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-[500px] py-8 px-5 sm:px-8 relative transform transition-all duration-300 ease-in-out"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex flex-col items-center">
            <div className="mb-5">
              <svg
                className="w-16 h-16 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4"
                />
              </svg>
            </div>
            <div className="text-center w-full">
              <div className="font-semibold text-2xl text-blue-600 mb-6">
                แจ้งเตือน User ให้แก้ไขประกาศ สำเร็จ!
              </div>
              <div className="text-base text-gray-600 mb-6">
                ระบบได้ทำการแจ้งเตือนไปยังผู้ใช้เรียบร้อยแล้ว
              </div>
              <button
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-blue-200 transform hover:-translate-y-0.5"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[500px] py-8 px-5 sm:px-8 relative transform transition-all duration-300 ease-in-out"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center">
          <div className="mb-5">
            <svg
              className="w-16 h-16 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.734-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="text-center w-full">
            <div className="font-semibold text-2xl text-red-600 mb-6">
              แจ้งเตือน User ให้แก้ไขประกาศ
            </div>
            <div className="relative w-full">
              <select
                value={reason || ""}
                onChange={e => setReason(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-red-50 text-red-600 text-base rounded-lg focus:outline-none cursor-pointer border-2 border-red-200 hover:border-red-300 transition-all duration-200 custom-select"
                aria-label="Reason for notifying user"
                disabled={loading}
              >
                <option value="" disabled>
                  โปรดเลือกหัวข้อให้ User แก้ไข
                </option>
                <option value="กรุณาระบุเหตุผล">กรุณาระบุเหตุผล</option>
                <option value="ราคาต่ำกว่าปกติ">ราคาต่ำกว่าปกติ</option>
                <option value="รายละเอียดไม่ครบถ้วน">
                  รายละเอียดไม่ครบถ้วน
                </option>
                <option value="รายละเอียดเกินความเป็นจริง">
                  รายละเอียดเกินความเป็นจริง
                </option>
                <option value="ที่ตั้งอสังหาฯไม่ถูกต้อง">
                  ที่ตั้งอสังหาฯไม่ถูกต้อง
                </option>
                <option value="รูปภาพที่ใช้ไม่ถูกต้อง">
                  รูปภาพที่ใช้ไม่ถูกต้อง
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-red-500">
                <svg
                  className="fill-current h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
            <button
              onClick={handleConfirm}
              className="w-full mt-6 py-4 bg-red-600 text-white text-lg font-semibold rounded-xl hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-red-200 transform hover:-translate-y-0.5 disabled:opacity-50"
              disabled={loading || !reason}
            >
              {loading ? "กำลังแจ้งเตือน..." : "ยืนยัน"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// DeletePropertyModal Component
interface DeletePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeletePropertyModal: React.FC<DeletePropertyModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-md w-full max-w-[400px] py-6 px-5 sm:px-6 relative transform transition-all duration-300 ease-in-out"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center">
          <div className="mb-4">
            <svg
              className="w-12 h-12 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.734-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="text-center w-full">
            <div className="font-semibold text-xl text-gray-800 mb-2">
              ต้องการลบประกาศออกจากระบบ?
            </div>
            <div className="text-sm text-gray-600 mb-6">
              เมื่อลบประกาศออกจากระบบแล้ว ประกาศจะไม่แสดงในเว็บไซต์อีกต่อไป
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={onConfirm}
                className="w-full py-2.5 bg-red-500 text-white text-base font-medium rounded-md hover:bg-red-600 transition-colors"
              >
                ยืนยัน
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-gray-100 text-gray-800 text-base font-medium rounded-md border border-gray-300 hover:bg-gray-200 transition-colors"
              >
                ย้อนกลับ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// เพิ่ม DeleteSuccessModal
interface DeleteSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  loading: boolean;
}
const DeleteSuccessModal: React.FC<DeleteSuccessModalProps> = ({
  isOpen,
  onClose,
  onDelete,
  loading,
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-md w-full max-w-[400px] py-8 px-5 sm:px-8 flex flex-col items-center"
        onClick={event => event.stopPropagation()}
      >
        <svg
          className="w-16 h-16 text-blue-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4"
          />
        </svg>
        <div className="font-semibold text-xl text-blue-600 mb-4">
          ลบประกาศสำเร็จ!
        </div>
        <button
          onClick={onDelete}
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 text-white text-base font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "กำลังลบ..." : "ยืนยัน"}
        </button>
      </div>
    </div>
  );
};

// PropertyDetailModal (ใช้ iframe)
interface PropertyDetailModalProps {
  id: string;
  onClose: () => void;
  onShowUserDetail: (user: AgentUser) => void;
  setShowDetailModal?: Dispatch<SetStateAction<boolean>>;
}
const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  id,
  onClose,
  onShowUserDetail,
  setShowDetailModal,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [propertyAgent, setPropertyAgent] = useState<AgentUser | null>(null);

  // ปิดเมนูเมื่อคลิกนอก
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        !document
          .getElementById("property-modal-menu")
          ?.contains(e.target as Node)
      ) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  // ปิดเฉพาะ NotifyEditModal ไม่ต้องปิด PropertyDetailModal
  const handleNotifyModalClose = () => {
    setShowNotifyModal(false);
  };

  // เดิม: handleDeleteProperty จะลบ DB ทันที
  // ใหม่: handleDeleteProperty จะถูกเรียกเมื่อกด 'ยืนยัน' ใน DeleteSuccessModal
  const handleDeleteProperty = async () => {
    setDeleting(true);
    try {
      // ลบ property_details ก่อน (ถ้ามี foreign key constraint)
      const superAdminSupabase = getSuperAdminBrowserClient();
      await superAdminSupabase
        .from("property_details")
        .delete()
        .eq("property_id", id);
      // ลบ properties
      await superAdminSupabase.from("properties").delete().eq("id", id);
      setShowDeleteSuccess(false);
      setShowDeleteModal(false);
      onClose(); // ปิด PropertyDetailModal
      if (typeof setShowDetailModal === "function") {
        setShowDetailModal(true); // กลับไปหน้ารายการประกาศ
      }
    } catch (error) {
      console.error("❌ Delete property error:", error);
      alert("เกิดข้อผิดพลาดในการลบ");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    // ดึง agent เจ้าของ property จาก API
    const fetchAgent = async () => {
      const superAdminSupabase = getSuperAdminBrowserClient();
      const { data, error } = await superAdminSupabase
        .from("properties")
        .select("agent:agent_id(*)")
        .eq("id", id)
        .single();

      if (error) {
        console.error("❌ Error fetching property agent:", error);
        setPropertyAgent(null);
        return;
      }

      setPropertyAgent(data?.agent ?? null);
    };
    if (showNotifyModal) fetchAgent();
  }, [id, showNotifyModal]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
          {/* ปุ่มปิด */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 text-gray-400 hover:text-gray-700"
            title="ปิด"
          >
            <X size={32} />
          </button>
          {/* จุด 3 จุด */}
          <div className="absolute top-4 right-16 z-20">
            <button
              onClick={() => setShowMenu(v => !v)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
              aria-label="more"
              title="เมนูเพิ่มเติม"
            >
              <span className="text-2xl text-gray-500">⋯</span>
            </button>
            {showMenu && (
              <div
                id="property-modal-menu"
                className="absolute right-0 mt-2 w-64 bg-white border border-blue-300 rounded-xl shadow-xl overflow-hidden"
              >
                <button
                  className="w-full text-left px-5 py-3 hover:bg-blue-50 text-gray-800"
                  onClick={() => {
                    setShowMenu(false);
                    setShowNotifyModal(true);
                  }}
                  title="แจ้งเตือน User ให้แก้ไขประกาศ"
                >
                  แจ้งเตือน User ให้แก้ไขประกาศ
                </button>
                <button
                  className="w-full text-left px-5 py-3 hover:bg-red-50 text-red-600"
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteModal(true);
                  }}
                  title="ลบประกาศออกจากระบบ"
                >
                  ลบประกาศออกจากระบบ
                </button>
              </div>
            )}
          </div>
          {/* iframe */}
          <iframe
            src={`/property/${id}`}
            className="w-full h-full rounded-2xl border-0"
            title="รายละเอียดอสังหาฯ"
          />
        </div>
      </div>
      <NotifyEditModal
        isOpen={showNotifyModal}
        onClose={handleNotifyModalClose}
        onConfirm={() => {
          if (propertyAgent && propertyAgent.id) {
            onShowUserDetail(propertyAgent);
          }
        }}
        detailUser={propertyAgent}
      />
      <DeletePropertyModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          setShowDeleteSuccess(true);
        }}
      />
      <DeleteSuccessModal
        isOpen={showDeleteSuccess}
        onClose={() => setShowDeleteSuccess(false)}
        onDelete={handleDeleteProperty}
        loading={deleting}
      />
    </>
  );
};

// เพิ่มฟังก์ชันกลางสำหรับแสดงรายละเอียด user ไว้ด้านบนสุดของ SuperAdminUsers
// เพื่อให้ทุกจุดที่เรียกใช้มองเห็นได้
const SuperAdminUsers: React.FC = () => {
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SuperAdminUser | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailUser, setDetailUser] = useState<AgentUser | null>(null);
  const [userProperties, setUserProperties] = useState<PropertyRecord[]>([]);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null
  );
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10); // แสดง 10 คนต่อหน้า

  // คำนวณข้อมูลสำหรับ pagination
  const filteredUsers = users.filter(
    user =>
      (user.first_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (user.last_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (user.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (user.phone ?? "").includes(search)
  );
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset หน้าเมื่อ search หรือ users เปลี่ยน
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredUsers.length, totalPages, currentPage]);

  // แสดง toast notification เมื่อรีเฟรชสำเร็จ
  useEffect(() => {
    if (showRefreshSuccess) {
      const timer = setTimeout(() => {
        setShowRefreshSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showRefreshSuccess]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // เรียก API route ที่ใช้ service role key เพื่อ bypass RLS
      const response = await fetch("/api/admin/users?role=agent&limit=1000");

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const result = await response.json();
      const data = result.users || [];

      setUsers(data);
      setLastRefreshTime(new Date());
      setShowRefreshSuccess(true);
    } catch (error) {
      console.error("❌ Fetch agents exception:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (user: SuperAdminUser) => {
    setSelectedUser(user);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    setDeletingId(selectedUser.id);

    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: selectedUser.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user");
      }

      // อัพเดท state โดยไม่ต้องเรียก API ใหม่
      setUsers(users.filter(user => user.id !== selectedUser.id));
      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("เกิดข้อผิดพลาดในการลบผู้ใช้");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCloseConfirmModal = () => {
    setShowConfirmModal(false);
    setSelectedUser(null);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSelectedUser(null);
  };

  const getRoleColor = (role: string | null | undefined) => {
    if (!role) return "bg-gray-500";
    switch (role) {
      case "super_admin":
        return "bg-red-500";
      case "admin":
        return "bg-purple-500";
      case "agent":
        return "bg-blue-500";
      case "customer":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getRoleText = (role: string | null | undefined) => {
    if (!role) return "ไม่ระบุ";
    switch (role) {
      case "super_admin":
        return "ซูเปอร์แอดมิน";
      case "admin":
        return "แอดมิน";
      case "agent":
        return "เอเจนต์";
      case "customer":
        return "ลูกค้า";
      default:
        return role;
    }
  };

  // ดึง properties ของ user
  const fetchUserProperties = async (userId: string) => {
    setPropertyLoading(true);
    try {
      // เรียก API route ที่ใช้ service role key เพื่อ bypass RLS
      const response = await fetch(
        `/api/admin/properties?status=all&limit=1000&page=1`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch properties: ${response.statusText}`);
      }

      const result = await response.json();
      const allProperties = result.properties || [];

      // Filter properties ที่เป็นของ user นี้
      const userProps = allProperties.filter(
        (p: PropertyRecord) => p.agent_id === userId
      ) as PropertyRecord[];

      setUserProperties(userProps);
    } catch (error) {
      console.error("❌ Error fetching user properties:", error);
      setUserProperties([]);
    } finally {
      setPropertyLoading(false);
    }
  };

  interface PropertyListModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: AgentUser | null;
    properties: PropertyRecord[];
    loading: boolean;
    search: string;
    setSearch: Dispatch<SetStateAction<string>>;
  }

  // Modal แสดงรายการอสังหาฯ ของ user
  const PropertyListModal = ({
    isOpen,
    onClose,
    user,
    properties,
    loading,
    search,
    setSearch,
  }: PropertyListModalProps) => {
    if (!isOpen || !user) return null;

    const filtered = properties.filter(p => {
      const detail = getPrimaryDetail(p.property_details);
      const text = [
        getDisplayValue(detail?.project_name),
        getDisplayValue(detail?.address),
        getDisplayValue(detail?.description),
        getDisplayValue(detail?.highlight),
      ]
        .filter(v => v !== "-")
        .join(" ")
        .toLowerCase();
      return text.includes(search.toLowerCase());
    });
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <span>
            ประกาศของ{" "}
            <span className="font-bold">
              {user.first_name} {user.last_name}
            </span>
          </span>
        }
        icon={
          <svg
            className="w-6 h-6 text-pink-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.734-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Search box */}
          <div className="flex items-center gap-2 mb-2 bg-gray-100 rounded-xl px-4 py-2">
            <input
              className="flex-1 bg-transparent border-0 focus:ring-0 text-gray-700 placeholder-gray-400"
              placeholder="ค้นหาชื่อโครงการ, ที่อยู่, รายละเอียด..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-3.5-3.5"
              />
            </svg>
          </div>
          {/* Card grid */}
          <div className="overflow-y-auto max-h-[60vh] pr-1">
            {loading ? (
              <div className="flex justify-center items-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                ไม่พบประกาศอสังหาฯ
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filtered
                  .filter(p => !!p.property_details)
                  .map(p => (
                    <PropertyCard
                      key={p.id}
                      property={p}
                      onClose={onClose}
                      setSelectedPropertyId={setSelectedPropertyId}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    );
  };

  const PropertyCard = ({
    property,
    onClose,
    setSelectedPropertyId,
  }: {
    property: PropertyRecord;
    onClose: () => void;
    setSelectedPropertyId: Dispatch<SetStateAction<string | null>>;
  }) => {
    const detail = getPrimaryDetail(property.property_details);
    const cardImage = detail?.images?.[0] || "/placeholder-property.jpg";
    const projectName = getDisplayValue(detail?.project_name);
    const address = getDisplayValue(detail?.address);
    const description = getDisplayValue(detail?.description);

    const handleCardClick = () => {
      // ปิด PropertyListModal ก่อน
      onClose();
      // จากนั้นเปิด PropertyDetailModal
      setSelectedPropertyId(property.id);
    };

    return (
      <div
        className="bg-white rounded-xl shadow-md overflow-hidden border flex flex-col min-h-[220px] max-h-[260px] p-0 transition-all duration-200 ease-in-out cursor-pointer hover:shadow-2xl hover:border-blue-400 hover:-translate-y-1 hover:bg-blue-50 focus:outline-none"
        onClick={handleCardClick}
        tabIndex={0}
      >
        <div className="relative">
          <Image
            src={cardImage}
            alt={projectName || "property"}
            width={320}
            height={80}
            className="h-20 w-full object-cover"
            sizes="(max-width: 1024px) 50vw, 25vw"
          />
          <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full shadow font-semibold">
            {property.status}
          </span>
        </div>
        <div className="p-2 flex-1 flex flex-col gap-0.5">
          <div className="font-bold text-gray-800 text-xs uppercase truncate">
            {projectName}
          </div>
          <div className="text-[10px] text-gray-500 truncate mb-0.5">
            {address}
          </div>
          <div className="mt-0.5 text-sm text-blue-600 font-bold">
            {detail?.price
              ? Number(detail.price).toLocaleString() + " บาท"
              : "-"}
          </div>
          <div className="flex gap-1 text-[10px] text-gray-700 mt-1 flex-wrap font-medium">
            <span className="bg-gray-100 rounded px-1.5 py-0.5 border border-gray-200">
              {property.property_category}
            </span>
            {detail?.bedrooms ? (
              <span className="bg-gray-100 rounded px-1.5 py-0.5 border border-gray-200">
                {detail?.bedrooms} นอน
              </span>
            ) : null}
            {detail?.bathrooms ? (
              <span className="bg-gray-100 rounded px-1.5 py-0.5 border border-gray-200">
                {detail?.bathrooms} น้ำ
              </span>
            ) : null}
            {detail?.usable_area ? (
              <span className="bg-gray-100 rounded px-1.5 py-0.5 border border-gray-200">
                {detail?.usable_area} ตร.ม.
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-[10px] text-gray-400 line-clamp-1">
            {description !== "-" ? description : ""}
          </div>
        </div>
      </div>
    );
  };

  // ประกาศฟังก์ชันนี้ไว้ก่อน
  const handleShowUserDetail = (user: AgentUser) => {
    setDetailUser(user);
    setShowDetailModal(true);
    fetchUserProperties(user.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            จัดการประกาศอสังหาริมทรัพย์
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                รายชื่อผู้ใช้งาน ({users.length} คน) - เฉพาะ Agent
              </h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={fetchUsers}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="รีเฟรชข้อมูล Agent"
                >
                  <svg
                    className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {loading ? "กำลังโหลด..." : "รีเฟรช"}
                </button>
                <div className="text-white/80 text-sm">
                  อัพเดทล่าสุด:{" "}
                  {lastRefreshTime.toLocaleString("th-TH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-4 px-6 text-left font-semibold text-gray-700">
                    ผู้ใช้
                  </th>
                  <th className="py-4 px-6 text-left font-semibold text-gray-700">
                    ข้อมูลติดต่อ
                  </th>
                  <th className="py-4 px-6 text-center font-semibold text-gray-700">
                    บทบาท
                  </th>
                  <th className="py-4 px-6 text-center font-semibold text-gray-700">
                    วันที่สมัคร
                  </th>
                  <th className="py-4 px-6 text-center font-semibold text-gray-700">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="text-gray-500">
                          กำลังโหลดข้อมูล...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                        <span className="text-gray-500 text-lg">
                          ไม่มีผู้ใช้งานในระบบ
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentUsers.map(user => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                      onClick={() => handleShowUserDetail(user)}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {user.first_name?.charAt(0) || "U"}
                            {user.last_name?.charAt(0) || ""}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {user.id?.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                              />
                            </svg>
                            <span className="text-gray-700">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center space-x-2">
                              <svg
                                className="w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
                              </svg>
                              <span className="text-gray-700">
                                {user.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white ${getRoleColor(
                            user.role
                          )}`}
                        >
                          {getRoleText(user.role)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="text-sm text-gray-600">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString(
                                "th-TH",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )
                            : "-"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleTimeString(
                                "th-TH",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : ""}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                          อนุมัติ
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <CustomPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={filteredUsers.length}
            showSearchInfo={true}
            searchQuery={search}
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={handleCloseConfirmModal}
        onConfirm={handleConfirmDelete}
        userEmail={selectedUser?.email || ""}
        loading={deletingId !== null}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
      />

      {/* User Property List Modal */}
      <PropertyListModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setDetailUser(null);
          setUserProperties([]);
          setSearch("");
        }}
        user={detailUser}
        properties={userProperties}
        loading={propertyLoading}
        search={search}
        setSearch={setSearch}
      />

      {/* Property Detail Modal - จะแสดงเฉพาะเมื่อมี selectedPropertyId */}
      {selectedPropertyId && (
        <PropertyDetailModal
          id={selectedPropertyId}
          onClose={() => {
            setSelectedPropertyId(null);
            // ไม่ต้องเปิด PropertyListModal กลับมา
          }}
          onShowUserDetail={handleShowUserDetail}
          setShowDetailModal={setShowDetailModal}
        />
      )}

      {/* Toast Notification */}
      {showRefreshSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in">
          ✓ รีเฟรชข้อมูลสำเร็จ!
        </div>
      )}

      <style jsx>{`
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default SuperAdminUsers;
