"use client";

import { Button } from "@/components/ui/button";
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import React, { useEffect, useMemo, useState, useRef } from "react";

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
import { X, Save, Trash2 } from "lucide-react";
import {
  normalizeLocalizedValue,
  pickLocalizedValue,
  type LocalizedValue,
} from "@/lib/localization";
import { toast } from "sonner";

interface PropertyDetail {
  project_name?: string | LocalizedValue<string> | null;
  address?: string | LocalizedValue<string> | null;
  latitude?: number | null;
  longitude?: number | null;
  price?: number | null;
  images?: string[] | null;
}

interface PropertyData {
  id: string;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  property_details?: PropertyDetail | PropertyDetail[];
  boundary_coordinates?: {
    type: string;
    coordinates: number[][][];
  } | null;
}

type LatLng = { lat: number; lng: number };

// Custom Polyline component using useMap hook
function PolylineRenderer({ path }: { path: LatLng[] }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || path.length < 2) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        path: path.map(p => ({ lat: p.lat, lng: p.lng })),
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: map,
      });
    } else {
      polylineRef.current.setPath(path.map(p => ({ lat: p.lat, lng: p.lng })));
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, path]);

  return null;
}

const getDisplayValue = (
  value: string | LocalizedValue<string> | null | undefined
): string => {
  if (!value) return "-";
  if (typeof value === "string") return value;
  const normalized = normalizeLocalizedValue<string>(value);
  return pickLocalizedValue(normalized, "th", "th") || "-";
};

const getPrimaryDetail = (
  details: PropertyDetail | PropertyDetail[] | null | undefined
): PropertyDetail | null => {
  if (!details) return null;
  if (Array.isArray(details)) return details[0] ?? null;
  return details;
};

interface DrawBoundaryModalProps {
  property: PropertyData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (propertyId: string, coordinates: number[][]) => Promise<void>;
}

export default function DrawBoundaryModal({
  property,
  isOpen,
  onClose,
  onSave,
}: DrawBoundaryModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [path, setPath] = useState<LatLng[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Load existing boundary when property changes
  useEffect(() => {
    if (property && isOpen) {
      // Safer check for coordinates structure
      // Expecting MultiPolygon [[[lng, lat], ...]] or Polygon [[lng, lat], ...] depending on backend
      // Based on usage, it seems to be [[[lng, lat]]] (MultiPolygon with 1 polygon)
      const coords = property.boundary_coordinates?.coordinates;

      if (
        Array.isArray(coords) &&
        coords.length > 0 &&
        Array.isArray(coords[0]) &&
        coords[0].length > 0 &&
        Array.isArray(coords[0][0])
      ) {
        try {
          // Assuming coords[0][0] is [lng, lat]
          const existingPath = coords[0][0].map((coord: any) => {
            // Ensure coord is [number, number]
            if (Array.isArray(coord) && coord.length >= 2) {
              return { lat: Number(coord[1]), lng: Number(coord[0]) };
            }
            return null;
          })
          .filter((p): p is LatLng => p !== null); // Filter out invalid points

          setPath(existingPath);
        } catch (e) {
          console.error("Error parsing boundary coordinates:", e);
          setPath([]);
        }
      } else {
        setPath([]);
      }
      setIsDrawing(false);
    }
  }, [property, isOpen]);

  const handleClearPath = () => {
    setPath([]);
    setIsDrawing(false);
  };

  const handleSave = async () => {
    if (!property) return;

    if (path.length < 2) {
      toast.warning("กรุณาวาดเส้นอย่างน้อย 2 จุด");
      return;
    }

    setSaving(true);
    try {
      // Convert to MultiPolygon format: [[[lng, lat], [lng, lat], ...]]
      const coordinates = path.map(point => [point.lng, point.lat]);
      await onSave(property.id, coordinates);
      onClose();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDrawing && path.length > 0) {
      if (
        !confirm("คุณมีเส้นที่ยังไม่ได้บันทึก ต้องการปิดหน้าต่างนี้หรือไม่?")
      ) {
        return;
      }
    }
    onClose();
  };

  if (!isOpen || !property) return null;

  const detail = getPrimaryDetail(property.property_details);
  const propertyName = getDisplayValue(detail?.project_name);
  const propertyAddress = getDisplayValue(detail?.address);
  const centerLat = detail?.latitude || property.location?.latitude || 13.7563;
  const centerLng =
    detail?.longitude || property.location?.longitude || 100.5018;

  // Convert property to PropertyData format for marker
  const propertyForMarker = {
    id: property.id,
    latitude: centerLat,
    longitude: centerLng,
    price: detail?.price?.toLocaleString("th-TH") || "0",
    title: propertyName,
    location: propertyAddress,
    isForRent: false,
    isForSale: true,
    isTopPick: false,
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  วาดเส้นกรอบที่ดิน
                </h2>
                <p className="text-sm text-gray-600">{propertyName}</p>
                <p className="text-xs text-gray-500">{propertyAddress}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleClearPath}
                variant="outline"
                size="sm"
                disabled={path.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                ล้างเส้น
              </Button>
              <Button
                onClick={handleSave}
                disabled={path.length < 2 || saving}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    บันทึก
                  </>
                )}
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border-b px-6 py-2 flex-shrink-0">
          <p className="text-sm text-blue-800">
            <strong>วิธีใช้:</strong> คลิกบนแผนที่เพื่อวาดเส้นกรอบที่ดิน
            (Polyline) ต้องมีอย่างน้อย 2 จุด เมื่อวาดเสร็จแล้วกดปุ่ม "บันทึก"
          </p>
          {path.length > 0 && (
            <p className="text-sm text-blue-700 mt-1">
              จำนวนจุดที่วาด: {path.length} จุด
            </p>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative min-h-0">
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ""}>
            <GoogleMap
              {...(useMemo(
                () =>
                  typeof window !== "undefined" && isWebGLSupported()
                    ? { mapId: "boundary-drawing-map" }
                    : {},
                []
              ))}
              defaultCenter={{ lat: centerLat, lng: centerLng }}
              defaultZoom={18}
              gestureHandling="greedy"
              onClick={(e: any) => {
                if (e.detail?.latLng) {
                  const latLng = e.detail.latLng;
                  const newPoint: LatLng = {
                    lat:
                      typeof latLng.lat === "function"
                        ? latLng.lat()
                        : latLng.lat,
                    lng:
                      typeof latLng.lng === "function"
                        ? latLng.lng()
                        : latLng.lng,
                  };
                  setPath(prev => [...prev, newPoint]);
                  setIsDrawing(true);
                }
              }}
              style={{ width: "100%", height: "100%" }}
            >
              {/* Property Marker - ใช้ style เหมือน PropertyMapNew */}
              <AdvancedMarker position={{ lat: centerLat, lng: centerLng }}>
                <div className="flex flex-col items-center opacity-100 transition-opacity duration-[400ms]">
                  <div
                    className="text-white rounded-[10px] py-1 pr-3 pl-2 text-base font-bold shadow-[0_2px_8px_rgba(0,0,0,0.18)] flex items-center relative"
                    style={{ background: "#3b82f6" }}
                  >
                    <span className="text-lg font-bold">
                      {propertyForMarker.price} บาท
                    </span>
                    <div
                      className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px]"
                      style={{ borderTopColor: "#3b82f6" }}
                    />
                  </div>
                  <div
                    className="rounded-full flex items-center justify-center mt-[2px] shadow-[0_2px_6px_rgba(0,0,0,0.10)] border-[3px] border-white relative z-10"
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#3b82f6",
                    }}
                  >
                    <div className="w-[14px] h-[14px] rounded-full border-[2.5px] border-white bg-transparent" />
                  </div>
                </div>
              </AdvancedMarker>

              {/* Polyline for boundary - using custom component */}
              {path.length > 0 && <PolylineRenderer path={path} />}
            </GoogleMap>
          </APIProvider>
        </div>
      </div>
    </div>
  );
}
