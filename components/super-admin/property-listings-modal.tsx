"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSuperAdminBrowserClient } from "@/lib/super-admin-supabase";
import {
  Bath,
  Bed,
  Calendar,
  Car,
  CheckCircle,
  Eye,
  MapPin,
  Search,
  User,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";

// สร้าง wrapper สำหรับ icons เพื่อป้องกัน hydration mismatch
const IconWrapper = ({ children }: { children: React.ReactNode }) => (
  <span suppressHydrationWarning>{children}</span>
);

interface PropertyListing {
  id: string;
  listing_type: string[];
  property_category: string;
  status: "pending" | "approved" | "rejected" | "published";
  created_at: string;
  agent_id: string;
  property_details?: {
    project_name?: string;
    address: string;
    price: number;
    usable_area: number;
    bedrooms: number;
    bathrooms: number;
    parking_spaces: number;
    images: string[];
    description: string;
  };
  users?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

interface PropertyListingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onPropertyUpdate?: () => void;
}

const statusLabels = {
  pending: {
    label: "รอการอนุมัติ",
    color: "bg-yellow-100 text-yellow-800",
    bgColor: "bg-yellow-500",
  },
  approved: {
    label: "อนุมัติแล้ว",
    color: "bg-green-100 text-green-800",
    bgColor: "bg-green-500",
  },
  rejected: {
    label: "ปฏิเสธ",
    color: "bg-red-100 text-red-800",
    bgColor: "bg-red-500",
  },
  published: {
    label: "เผยแพร่แล้ว",
    color: "bg-blue-100 text-blue-800",
    bgColor: "bg-blue-500",
  },
};

const PropertyListingsModal: React.FC<PropertyListingsModalProps> = ({
  isOpen,
  onClose,
  title = "ประกาศอสังหาริมทรัพย์ทั้งหมด",
  onPropertyUpdate,
}) => {
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<
    PropertyListing[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isClient, setIsClient] = useState(false);

  // แก้ปัญหา hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ดึงข้อมูลประกาศ
  const fetchProperties = async () => {
    try {
      setLoading(true);
      const superAdminSupabase = getSuperAdminBrowserClient();
      const { data, error } = await superAdminSupabase
        .from("properties")
        .select(
          `
          *,
          property_details(*),
          users(first_name, last_name, email)
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching properties:", error);
        return;
      }

      setProperties(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // กรองข้อมูล
  useEffect(() => {
    let filtered = properties;

    // กรองตามสถานะ
    if (statusFilter !== "all") {
      filtered = filtered.filter(property => property.status === statusFilter);
    }

    // กรองตามคำค้นหา
    if (searchTerm) {
      filtered = filtered.filter(
        property =>
          property.property_details?.project_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          property.property_details?.address
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          property.property_category
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          property.users?.first_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          property.users?.last_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProperties(filtered);
  }, [properties, searchTerm, statusFilter]);

  // อัปเดตสถานะประกาศ
  const updatePropertyStatus = async (
    propertyId: string,
    newStatus: "approved" | "rejected" | "published"
  ) => {
    try {
      const superAdminSupabase = getSuperAdminBrowserClient();
      const { error } = await superAdminSupabase
        .from("properties")
        .update({
          status: newStatus,
          approved_at:
            newStatus === "approved" ? new Date().toISOString() : null,
        })
        .eq("id", propertyId);

      if (error) {
        console.error("Error updating property status:", error);
        return;
      }

      // อัปเดตข้อมูลในหน้า
      await fetchProperties();
      onPropertyUpdate?.();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // โหลดข้อมูลเมื่อเปิด modal
  useEffect(() => {
    if (isOpen) {
      fetchProperties();
    }
  }, [isOpen]);

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)} ล้าน`;
    }
    return price.toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center mb-4">
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* ฟิลเตอร์และค้นหา */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <IconWrapper>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </IconWrapper>
            <Input
              placeholder="ค้นหาชื่อโครงการ สถานที่ หรือเอเจนท์..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="กรองตามสถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="pending">รอการอนุมัติ</SelectItem>
              <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
              <SelectItem value="rejected">ปฏิเสธ</SelectItem>
              <SelectItem value="published">เผยแพร่แล้ว</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* รายการประกาศ */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">กำลังโหลด...</span>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">ไม่พบข้อมูลประกาศ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProperties.map(property => (
              <Card
                key={property.id}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative">
                  {/* รูปภาพประกาศ */}
                  <div className="aspect-[4/3] bg-gray-200 relative">
                    {property.property_details?.images &&
                    property.property_details.images.length > 0 ? (
                      <Image
                        src={property.property_details.images[0]}
                        alt={
                          property.property_details?.project_name ||
                          "Property Image"
                        }
                        fill
                        className="object-cover"
                        onError={e => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/sale-4.jpg"; // fallback image
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <span className="text-gray-400">ไม่มีรูปภาพ</span>
                      </div>
                    )}
                  </div>

                  {/* สถานะประกาศ */}
                  <div className="absolute top-2 right-2">
                    <Badge className={statusLabels[property.status].color}>
                      {statusLabels[property.status].label}
                    </Badge>
                  </div>

                  {/* ประเภทการขาย/เช่า */}
                  <div className="absolute top-2 left-2">
                    <div className="flex gap-1">
                      {property.listing_type?.map((type, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {type === "sale" ? "ขาย" : "เช่า"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <CardContent className="p-4">
                  {/* ชื่อโครงการ */}
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                    {property.property_details?.project_name ||
                      "ไม่ระบุชื่อโครงการ"}
                  </h3>

                  {/* ราคา */}
                  <p className="text-lg font-bold text-blue-600 mb-2">
                    {property.property_details?.price
                      ? `${formatPrice(property.property_details.price)} บาท`
                      : "ราคาตามสอบถาม"}
                  </p>

                  {/* สถานที่ */}
                  <div className="flex items-center text-gray-600 text-xs mb-2">
                    <IconWrapper>
                      <MapPin className="w-3 h-3 mr-1" />
                    </IconWrapper>
                    <span className="line-clamp-1">
                      {property.property_details?.address || "ไม่ระบุที่อยู่"}
                    </span>
                  </div>

                  {/* รายละเอียดห้อง */}
                  <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
                    {property.property_details?.bedrooms && (
                      <div className="flex items-center">
                        <IconWrapper>
                          <Bed className="w-3 h-3 mr-1" />
                        </IconWrapper>
                        <span>{property.property_details.bedrooms}</span>
                      </div>
                    )}
                    {property.property_details?.bathrooms && (
                      <div className="flex items-center">
                        <IconWrapper>
                          <Bath className="w-3 h-3 mr-1" />
                        </IconWrapper>
                        <span>{property.property_details.bathrooms}</span>
                      </div>
                    )}
                    {property.property_details?.parking_spaces && (
                      <div className="flex items-center">
                        <IconWrapper>
                          <Car className="w-3 h-3 mr-1" />
                        </IconWrapper>
                        <span>{property.property_details.parking_spaces}</span>
                      </div>
                    )}
                  </div>

                  {/* ข้อมูลเอเจนท์ */}
                  <div className="flex items-center text-xs text-gray-500 mb-3">
                    <IconWrapper>
                      <User className="w-3 h-3 mr-1" />
                    </IconWrapper>
                    <span>
                      {property.users?.first_name && property.users?.last_name
                        ? `${property.users.first_name} ${property.users.last_name}`
                        : property.users?.email || "ไม่ระบุเอเจนท์"}
                    </span>
                  </div>

                  {/* วันที่สร้าง */}
                  <div className="flex items-center text-xs text-gray-500 mb-3">
                    <IconWrapper>
                      <Calendar className="w-3 h-3 mr-1" />
                    </IconWrapper>
                    <span suppressHydrationWarning>
                      {isClient
                        ? new Date(property.created_at).toLocaleDateString(
                            "th-TH"
                          )
                        : "กำลังโหลด..."}
                    </span>
                  </div>

                  {/* ปุ่มการจัดการ */}
                  <div className="flex gap-2 mt-4">
                    {property.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            updatePropertyStatus(property.id, "approved")
                          }
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                        >
                          <IconWrapper>
                            <CheckCircle className="w-3 h-3 mr-1" />
                          </IconWrapper>
                          อนุมัติ
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            updatePropertyStatus(property.id, "rejected")
                          }
                          className="flex-1 text-xs"
                        >
                          <IconWrapper>
                            <XCircle className="w-3 h-3 mr-1" />
                          </IconWrapper>
                          ปฏิเสธ
                        </Button>
                      </>
                    )}
                    {property.status === "approved" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updatePropertyStatus(property.id, "published")
                        }
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      >
                        <IconWrapper>
                          <Eye className="w-3 h-3 mr-1" />
                        </IconWrapper>
                        เผยแพร่
                      </Button>
                    )}
                    {(property.status === "rejected" ||
                      property.status === "published") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        disabled
                      >
                        {property.status === "rejected"
                          ? "ถูกปฏิเสธ"
                          : "เผยแพร่แล้ว"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* สถิติ */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold">{filteredProperties.length}</p>
              <p className="text-xs text-gray-600">ทั้งหมด</p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-600">
                {filteredProperties.filter(p => p.status === "pending").length}
              </p>
              <p className="text-xs text-gray-600">รอการอนุมัติ</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">
                {filteredProperties.filter(p => p.status === "approved").length}
              </p>
              <p className="text-xs text-gray-600">อนุมัติแล้ว</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">
                {
                  filteredProperties.filter(p => p.status === "published")
                    .length
                }
              </p>
              <p className="text-xs text-gray-600">เผยแพร่แล้ว</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyListingsModal;
