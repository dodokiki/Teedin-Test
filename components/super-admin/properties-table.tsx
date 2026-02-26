"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  normalizeLocalizedValue,
  pickLocalizedValue,
  type LocalizedValue,
} from "@/lib/localization";
import { ChevronDown, Download, Loader2, TrendingUp } from "lucide-react";
import { useState } from "react";

interface Property {
  id: string;
  title?: string;
  price?: number;
  status: string;
  created_at: string;
  property_category?: string;
  category?: string;
  users?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
  property_details?: {
    price?: number;
    description?: string;
    project_name?: string | LocalizedValue<string>;
    address?: string | LocalizedValue<string>;
  };
}

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

interface PropertiesTableProps {
  properties: Property[];
  viewPeriod: string;
  loading: boolean;
  lastUpdate: Date | null;
  isClient: boolean;
  onViewPeriodChange: (period: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  serverPaginated?: boolean;
  currentPage?: number;
  totalPages?: number;
  onChangePage?: (page: number) => void;
}

export function PropertiesTable({
  properties,
  viewPeriod,
  loading,
  lastUpdate,
  isClient,
  onViewPeriodChange,
  onRefresh,
  onExport,
  serverPaginated = false,
  currentPage = 1,
  totalPages = 1,
  onChangePage,
}: PropertiesTableProps) {
  const MONTH_LABELS = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ] as const;
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "recent":
        return "ล่าสุด";
      case "daily":
        return "รายวัน";
      case "weekly":
        return "รายสัปดาห์";
      case "monthly":
        return "รายเดือน";
      default:
        return "ล่าสุด";
    }
  };

  const getPeriodButtonLabel = (period: string) => {
    switch (period) {
      case "recent":
        return "ดูล่าสุด";
      case "daily":
        return "ดูรายวัน";
      case "weekly":
        return "ดูรายสัปดาห์";
      case "monthly":
        return "ดูรายเดือน";
      default:
        return "ดูล่าสุด";
    }
  };

  const periodLabel = getPeriodLabel(viewPeriod);
  const periodButtonLabel = getPeriodButtonLabel(viewPeriod);

  // เพิ่ม state สำหรับหน้าปัจจุบัน (ใช้เฉพาะ client paginate)
  const [clientPage, setClientPage] = useState(1);
  const itemsPerPage = 5;
  const currentYear = new Date().getFullYear();
  const filteredProperties = properties.filter(property => {
    const date = new Date(property.created_at);
    return (
      date.getMonth() === selectedMonth && date.getFullYear() === currentYear
    );
  });
  const totalPagesLocal = Math.ceil(filteredProperties.length / itemsPerPage);
  const paginatedProperties = serverPaginated
    ? properties
    : filteredProperties.slice(
        (clientPage - 1) * itemsPerPage,
        clientPage * itemsPerPage
      );

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="bg-white">
        <CardTitle className="flex items-center justify-between">
          <div>
            <span className="text-lg font-semibold text-gray-900">
              ตารางรายการประกาศล่าสุด
            </span>
            <div className="mt-1">
              <Badge variant="outline" className="text-xs text-gray-600">
                ช่วงเวลา: {periodLabel}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                aria-label={`เลือกเดือน (${periodButtonLabel})`}
              >
                {MONTH_LABELS[selectedMonth] ?? "ทั้งหมด"}{" "}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-white border-gray-200"
            >
              {MONTH_LABELS.map((month, index) => (
                <DropdownMenuItem
                  key={month}
                  onClick={() => {
                    setSelectedMonth(index);
                    onViewPeriodChange(month);
                    setClientPage(1);
                  }}
                  className={
                    selectedMonth === index
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                >
                  {selectedMonth === index && "✓ "}
                  {month}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem
                onClick={onRefresh}
                className="text-gray-700 hover:bg-gray-100"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                รีเฟรชข้อมูล
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onExport}
                className="text-gray-700 hover:bg-gray-100"
              >
                <Download className="mr-2 h-4 w-4" />
                ส่งออกข้อมูล
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardTitle>
      </CardHeader>
      <CardContent className="bg-white">
        <div className="overflow-x-auto">
          <div className="max-h-[600px] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-10 text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>กำลังโหลดข้อมูล...</span>
              </div>
            )}
            <Table>
              <TableHeader className="bg-gray-50 sticky top-0 z-10">
                <TableRow className="border-b border-gray-200">
                  <TableHead className="w-32 min-w-[120px] bg-gray-50 text-gray-700 font-medium py-4 text-center">
                    หมวดหมู่
                  </TableHead>
                  <TableHead className="w-40 min-w-[160px] bg-gray-50 text-gray-700 font-medium py-4 text-center">
                    เจ้าของโพสต์
                  </TableHead>
                  <TableHead className="w-32 min-w-[120px] bg-gray-50 text-gray-700 font-medium py-4 text-center">
                    วันเวลาที่โพสต์
                  </TableHead>
                  <TableHead className="w-32 min-w-[120px] bg-gray-50 text-gray-700 font-medium py-4 text-center">
                    ราคา
                  </TableHead>
                  <TableHead className="w-24 min-w-[100px] bg-gray-50 text-gray-700 font-medium py-4 text-center">
                    สถานะ
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProperties.length > 0 ? (
                  paginatedProperties.map((property, index) => (
                    <TableRow
                      key={property.id}
                      className={`border-none hover:bg-gray-100 ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <TableCell className="py-4 text-center align-middle">
                        {/* หมวดหมู่ */}
                        <span className="text-sm text-gray-900">
                          {property.property_category ||
                            property.category ||
                            "-"}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-center align-middle">
                        {/* เจ้าของโพสต์ */}
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {property.users?.first_name &&
                            property.users?.last_name
                              ? `${property.users.first_name} ${property.users.last_name}`
                              : property.users?.email || "ไม่ระบุ"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {getDisplayValue(
                              property.property_details?.project_name
                            ) ||
                              property.title ||
                              "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center align-middle">
                        {/* วันเวลาที่โพสต์ */}
                        <span className="text-sm text-gray-900">
                          {property.created_at}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-center align-middle">
                        {/* ราคา */}
                        <span className="font-medium text-gray-900 text-sm">
                          {property.property_details?.price &&
                          property.property_details.price > 0 ? (
                            `${property.property_details.price.toLocaleString()} บาท`
                          ) : (
                            <span className="text-gray-400">ไม่ระบุราคา</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-center align-middle">
                        {/* สถานะ */}
                        <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 rounded-full px-3 py-1 text-xs font-medium">
                          {property.status === "published" ||
                          property.status === "approved"
                            ? "ประกาศแล้ว"
                            : property.status === "pending"
                              ? "รออนุมัติ"
                              : property.status || "-"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-gray-500 bg-white"
                    >
                      ไม่มีข้อมูลประกาศ
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Additional Info และ Pagination */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-3">
            <span>ดูได้ทั้งหมด {properties.length} รายการ</span>
            <span>
              อัปเดตล่าสุด:{" "}
              {isClient && lastUpdate
                ? lastUpdate.toLocaleString("th-TH")
                : "กำลังโหลด..."}
            </span>
          </div>
          {/* Pagination Controls */}
          {(serverPaginated ? totalPages > 1 : totalPagesLocal > 1) && (
            <div className="flex flex-col items-center gap-2 mt-3">
              <div className="flex justify-center items-center gap-2">
                <Button
                  size="sm"
                  className="bg-white text-gray-700 border-none shadow-md hover:shadow-lg focus:shadow-lg px-2 transition-shadow duration-150"
                  disabled={(serverPaginated ? currentPage : clientPage) === 1}
                  onClick={() =>
                    serverPaginated
                      ? onChangePage && onChangePage(currentPage - 1)
                      : setClientPage(clientPage - 1)
                  }
                >
                  ก่อนหน้า
                </Button>
                <span className="text-xs text-gray-700">
                  หน้า {serverPaginated ? currentPage : clientPage} /{" "}
                  {serverPaginated ? totalPages : totalPagesLocal}
                </span>
                <Button
                  size="sm"
                  className="bg-white text-gray-700 border-none shadow-md hover:shadow-lg focus:shadow-lg px-2 transition-shadow duration-150"
                  disabled={
                    (serverPaginated ? currentPage : clientPage) ===
                    (serverPaginated ? totalPages : totalPagesLocal)
                  }
                  onClick={() =>
                    serverPaginated
                      ? onChangePage && onChangePage(currentPage + 1)
                      : setClientPage(clientPage + 1)
                  }
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
