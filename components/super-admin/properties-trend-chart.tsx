"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Download } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TooltipProps } from "recharts";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PropertiesTrendChartProps {
  className?: string;
}

interface TrendApiItem {
  date: string;
  count: number;
}

interface TrendDatum extends TrendApiItem {
  month: string;
  displayDate: string;
  percentage: number;
}

type TooltipValueType = number;
type TooltipNameType = string;

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

export function PropertiesTrendChart({ className }: PropertiesTrendChartProps) {
  const [data, setData] = useState<TrendDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedYear = useMemo(() => new Date().getFullYear(), []);
  const [selectedMonth, setSelectedMonth] = useState(-1); // เปลี่ยนให้เริ่มต้นแสดงทั้งหมด

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/dashboard/properties-trend?period=month&year=${selectedYear}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = (await response.json()) as TrendApiItem[];
      if (!result || !Array.isArray(result) || result.length === 0) {
        setData([]);
        return;
      }

      // แปลงข้อมูลเดือนให้แสดงชื่อเดือนภาษาไทย และคำนวณเปอร์เซ็นต์
      const totalCount = result.reduce((sum, item) => sum + item.count, 0);

      const formattedData: TrendDatum[] = result.map(item => {
        const [year, month] = item.date.split("-");
        const monthIndex = parseInt(month) - 1;
        const percentage =
          totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
        const monthLabel = MONTH_LABELS[monthIndex] ?? month;

        return {
          date: item.date,
          count: item.count,
          month: monthLabel,
          displayDate: `${monthLabel} ${year.slice(-2)}`,
          percentage,
        };
      });

      setData(formattedData);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "เกิดข้อผิดพลาด"
      );

      // แทนที่จะใช้ fallback data ให้แสดงข้อมูลว่างแทน
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const CustomTooltip = ({
    active,
    payload,
  }: TooltipProps<TooltipValueType, TooltipNameType>) => {
    if (active && payload && Array.isArray(payload) && payload.length) {
      const datum = payload[0]?.payload as TrendDatum | undefined;
      if (!datum) {
        return null;
      }

      return (
        <div className="bg-blue-600 text-white p-2 rounded-md shadow-lg text-sm">
          <span className="font-semibold">{datum.count.toLocaleString()}</span>
        </div>
      );
    }
    return null;
  };

  // ฟังก์ชันส่งออกข้อมูล
  const handleExport = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return;

    const csvRows = [
      "วันที่,จำนวนประกาศ",
      ...data.map(row => `${row.displayDate},${row.count}`),
    ];
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const fileName = `แนวโน้มประกาศใหม่_${selectedYear}.csv`;

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // กรองข้อมูลตามเดือนที่เลือก
  const filteredData =
    selectedMonth === -1
      ? data
      : data.filter(
          item => item.month === MONTH_LABELS[selectedMonth] ?? item.month
        );

  return (
    <Card className={`bg-white border-gray-200 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            แนวโน้มประกาศใหม่
          </h2>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {selectedMonth === -1
                  ? "ทั้งหมด"
                  : (MONTH_LABELS[selectedMonth] ?? "ทั้งหมด")}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-white border-gray-200"
            >
              <DropdownMenuItem
                onClick={() => setSelectedMonth(-1)}
                className={`text-gray-700 hover:bg-gray-100 ${
                  selectedMonth === -1 ? "bg-gray-100" : ""
                }`}
              >
                {selectedMonth === -1 && "✓ "}
                ทั้งหมด (12 เดือน)
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200" />
              {MONTH_LABELS.map((month, index) => (
                <DropdownMenuItem
                  key={month}
                  onClick={() => setSelectedMonth(index)}
                  className={`text-gray-700 hover:bg-gray-100 ${
                    selectedMonth === index ? "bg-gray-100" : ""
                  }`}
                >
                  {selectedMonth === index && "✓ "}
                  {month}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem
                onClick={handleExport}
                className="text-gray-700 hover:bg-gray-100"
              >
                <Download className="mr-2 h-4 w-4" />
                ส่งออกข้อมูล
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 relative border border-gray-200">
          <div className="w-full h-80">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <p className="text-red-600 text-sm">
                  เกิดข้อผิดพลาดในการโหลดข้อมูล
                </p>
                <Button size="sm" variant="outline" onClick={fetchData}>
                  ลองอีกครั้ง
                </Button>
              </div>
            ) : !filteredData || filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <p className="text-gray-500">ไม่มีข้อมูลในช่วงที่เลือก</p>
                <Button size="sm" variant="outline" onClick={fetchData}>
                  รีเฟรชข้อมูล
                </Button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <defs>
                    <linearGradient
                      id="blueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.8} />
                      <stop
                        offset="100%"
                        stopColor="#60A5FA"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="none"
                    stroke="#F3F4F6"
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="count"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                    tickMargin={10}
                    label={{
                      value: "จำนวนโพสต์",
                      position: "insideBottom",
                      offset: -10,
                      style: { textAnchor: "middle", fill: "#9CA3AF" },
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                    tickFormatter={value => `${value}%`}
                    label={{
                      value: "เปอร์เซ็นต์",
                      angle: -90,
                      position: "insideLeft",
                      style: { textAnchor: "middle", fill: "#9CA3AF" },
                    }}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: "#60A5FA", strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#60A5FA"
                    strokeWidth={2}
                    fill="url(#blueGradient)"
                    dot={{
                      fill: "#60A5FA",
                      strokeWidth: 0,
                      r: 4,
                    }}
                    activeDot={{
                      r: 6,
                      fill: "#60A5FA",
                      stroke: "white",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
