"use client";

import { Button } from "@/components/ui/button";
import {
  normalizeLocalizedValue,
  pickLocalizedValue,
  type LocalizedValue,
} from "@/lib/localization";
import React, { useEffect, useState, useCallback } from "react";
import { MapPin, CheckCircle, XCircle, Pencil } from "lucide-react";
import Image from "next/image";
import DrawBoundaryModal from "@/components/super-admin/draw-boundary-modal";
import ConfirmApproveModal from "@/components/super-admin/confirm-approve-modal";
import { toast } from "sonner";

interface PropertyDetail {
  project_name?: string | LocalizedValue<string> | null;
  address?: string | LocalizedValue<string> | null;
  price?: number | null;
  images?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface PendingProperty {
  id: string;
  agent_id?: string | null;
  listing_type?: string[] | null;
  property_category?: string | null;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  created_at: string;
  status: string;
  boundary_coordinates?: {
    type: string;
    coordinates: number[][][];
  } | null;
  property_details?: PropertyDetail | PropertyDetail[];
  users?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null;
}

const getDisplayValue = (
  value: string | LocalizedValue<string> | null | undefined,
  locale: "th" | "en" = "th"
): string => {
  if (!value) return "-";
  if (typeof value === "string") return value;
  const normalized = normalizeLocalizedValue<string>(value);
  return pickLocalizedValue(normalized, locale, "th") || "-";
};

const getPrimaryDetail = (
  details: PropertyDetail | PropertyDetail[] | null | undefined
): PropertyDetail | null => {
  if (!details) return null;
  if (Array.isArray(details)) return details[0] ?? null;
  return details;
};

export default function PendingPropertiesPage() {
  const [properties, setProperties] = useState<PendingProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [savingBoundaryId, setSavingBoundaryId] = useState<string | null>(null);
  const [drawBoundaryModalOpen, setDrawBoundaryModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] =
    useState<PendingProperty | null>(null);
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null);

  const fetchPendingProperties = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/properties/pending?page=${page}&limit=20`,
        {
          credentials: "include", // ส่ง cookies ไปกับ request
        }
      );
      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties || []);
        setTotalPages(data.totalPages || 1);
      } else {
        setProperties([]);
      }
    } catch (error) {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchPendingProperties();
  }, [fetchPendingProperties]);

  const handleApproveClick = (propertyId: string) => {
    setConfirmApproveId(propertyId);
  };

  const executeApprove = async () => {
    if (!confirmApproveId) return;

    setApprovingId(confirmApproveId);
    try {
      const response = await fetch(
        `/api/admin/properties/${confirmApproveId}/approve`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("อนุมัติการ์ดสำเร็จ");
        fetchPendingProperties();
        setConfirmApproveId(null); // Close modal on success
      } else {
        if (data.requiresBoundary) {
          toast.error("กรุณาวาดเส้นกรอบที่ดินก่อนอนุมัติ");
          setConfirmApproveId(null); // Close modal on error
        } else {
          toast.error(`เกิดข้อผิดพลาด: ${data.error || "Unknown error"}`);
        }
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการอนุมัติ");
    } finally {
      setApprovingId(null);
    }
  };

  const handleDrawBoundary = useCallback((property: PendingProperty) => {
    setSelectedProperty(property);
    setDrawBoundaryModalOpen(true);
  }, []);

  const handleSaveBoundary = useCallback(
    async (propertyId: string, coordinates: number[][]) => {
      setSavingBoundaryId(propertyId);
      try {
        const response = await fetch(
          `/api/admin/properties/${propertyId}/boundary`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ coordinates }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          toast.success("บันทึกเส้นกรอบที่ดินสำเร็จ");
          fetchPendingProperties(); // Refresh the list
        } else {
          throw new Error(data.error || "Failed to save boundary");
        }
      } catch (error: any) {
        toast.error(`เกิดข้อผิดพลาด: ${error.message || "Unknown error"}`);
        throw error;
      } finally {
        setSavingBoundaryId(null);
      }
    },
    []
  );

  const handleCloseModal = useCallback(() => {
    setDrawBoundaryModalOpen(false);
    setSelectedProperty(null);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            การ์ดรออนุมัติ
          </h1>
          <p className="text-gray-600">
            รายการการ์ดอสังหาฯ ที่รอการอนุมัติ ({properties.length} รายการ)
          </p>
        </div>

        {properties.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">ไม่มีการ์ดรออนุมัติ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(property => {
              const detail = getPrimaryDetail(property.property_details);
              const propertyName = getDisplayValue(detail?.project_name);
              const propertyAddress = getDisplayValue(detail?.address);
              const propertyPrice = detail?.price || 0;
              const images = detail?.images || [];
              const hasBoundary = !!property.boundary_coordinates;

              return (
                <div
                  key={property.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Property Image */}
                  <div className="relative h-48 w-full bg-gray-200">
                    {images.length > 0 && images[0] ? (
                      <Image
                        src={images[0]}
                        alt={propertyName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        ไม่มีรูปภาพ
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold">
                        รออนุมัติ
                      </span>
                    </div>
                  </div>

                  {/* Property Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                      {propertyName}
                    </h3>
                    <div className="flex items-start text-sm text-gray-600 mb-2">
                      <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{propertyAddress}</span>
                    </div>
                    <div className="text-lg font-bold text-blue-600 mb-4">
                      {propertyPrice.toLocaleString("th-TH")} บาท
                    </div>

                    {/* Agent Info */}
                    {property.users && (
                      <div className="text-xs text-gray-500 mb-4 pb-4 border-b">
                        <p>
                          เอเจนท์: {property.users.first_name || ""}{" "}
                          {property.users.last_name || ""}
                        </p>
                        <p className="text-gray-400">{property.users.email}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleDrawBoundary(property)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        variant="default"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        {hasBoundary ? "แก้ไขเส้นกรอบ" : "วาดเส้นกรอบ"}
                      </Button>
                      <Button
                        onClick={() => handleApproveClick(property.id)}
                        disabled={
                          !hasBoundary ||
                          approvingId === property.id ||
                          savingBoundaryId === property.id
                        }
                        className={`w-full ${
                          hasBoundary
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-gray-300 cursor-not-allowed"
                        } text-white`}
                      >
                        {approvingId === property.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            กำลังอนุมัติ...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            อนุมัติการ์ด
                          </>
                        )}
                      </Button>
                      {!hasBoundary && (
                        <p className="text-xs text-red-500 text-center mt-1">
                          ต้องวาดเส้นกรอบก่อนอนุมัติ
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <Button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="outline"
            >
              ก่อนหน้า
            </Button>
            <span className="flex items-center px-4">
              หน้า {page} จาก {totalPages}
            </span>
            <Button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              variant="outline"
            >
              ถัดไป
            </Button>
          </div>
        )}
      </div>

      {/* Draw Boundary Modal */}
      <DrawBoundaryModal
        property={selectedProperty}
        isOpen={drawBoundaryModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveBoundary}
      />

      {/* Confirm Approve Modal */}
      <ConfirmApproveModal
        isOpen={!!confirmApproveId}
        onClose={() => setConfirmApproveId(null)}
        onConfirm={executeApprove}
        isConfirming={!!approvingId}
      />
    </div>
  );
}
