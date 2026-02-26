"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  Building2,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";

// สร้าง wrapper สำหรับ icons เพื่อป้องกัน hydration mismatch
const IconWrapper = ({ children }: { children: React.ReactNode }) => (
  <span suppressHydrationWarning>{children}</span>
);

interface StatsOverview {
  totalUsers: number;
  totalProperties: number;
  totalAgents: number;
  pendingProperties: number;
  activeProperties: number;
  soldProperties: number;
  newUsersThisMonth: number;
  newPropertiesThisMonth: number;
}

interface RecentActivity {
  [key: string]: unknown;
}

interface TopAgent {
  [key: string]: unknown;
}

interface RecentUser {
  [key: string]: unknown;
}

interface RecentProperty {
  [key: string]: unknown;
}

interface StatsResponse {
  overview: StatsOverview;
  recentActivities: RecentActivity[];
  topAgents: TopAgent[];
  recentUsers: RecentUser[];
  recentProperties: RecentProperty[];
}

// Lightweight in-file cache to dedupe and cache stats for a short TTL
const statsCache: {
  value: StatsResponse | null;
  timestamp: number;
  pending: Promise<StatsResponse> | null;
} = {
  value: null,
  timestamp: 0,
  pending: null,
};

const STATS_TTL_MS = 30_000; // align with API Cache-Control: 30s

async function fetchStatsWithCache(): Promise<StatsResponse> {
  const now = Date.now();
  if (statsCache.value && now - statsCache.timestamp < STATS_TTL_MS) {
    return statsCache.value;
  }
  if (statsCache.pending) {
    return statsCache.pending;
  }
  const pending = (async () => {
    const response = await fetch("/api/admin/stats", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: StatsResponse = await response.json();
    statsCache.value = data;
    statsCache.timestamp = Date.now();
    return data;
  })();
  statsCache.pending = pending;
  try {
    return await pending;
  } finally {
    statsCache.pending = null;
  }
}

export function DashboardStats() {
  const [stats, setStats] = useState<StatsOverview>({
    totalUsers: 0,
    totalProperties: 0,
    totalAgents: 0,
    pendingProperties: 0,
    activeProperties: 0,
    soldProperties: 0,
    newUsersThisMonth: 0,
    newPropertiesThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ฟังก์ชันดึงข้อมูลจาก API
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchStatsWithCache();
      setStats((data as StatsResponse).overview);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการดึงข้อมูล"
      );
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลครั้งแรกเมื่อ component mount
  useEffect(() => {
    fetchStats();
  }, []);

  // ลบ auto-refresh - ไม่ต้องตั้งเวลารีเฟรช
  // useEffect(() => {
  //   const interval = setInterval(fetchStats, 120000); // 2 นาที
  //   return () => clearInterval(interval);
  // }, []);

  // แสดง loading state
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">ภาพรวมข้อมูลระบบ</p>
        </div>

        <div className="grid grid-cols-2 gap-6 max-w-2xl">
          {[1, 2].map(i => (
            <Card
              key={i}
              className="bg-white shadow-md border-2 border-blue-300"
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // แสดง error state
  if (error) {
    return (
      <div className="space-y-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">ภาพรวมข้อมูลระบบ</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">เกิดข้อผิดพลาด: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">ภาพรวมข้อมูลระบบ</p>
      </div>

      {/* Main Stats Cards - Two Separate Cards */}
      <div className="grid grid-cols-2 gap-6 max-w-2xl">
        {/* Left Card - ผู้ใช้งาน */}
        <Card className="bg-white shadow-md border-2 border-blue-300 hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-5">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center">
                <IconWrapper>
                  <Users className="h-5 w-5 text-blue-600" />
                </IconWrapper>
              </div>
              <p className="text-sm font-medium text-gray-600">ผู้ใช้งาน</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-2">
              {stats.totalUsers.toLocaleString()}
            </p>
            <div className="flex items-center text-green-600">
              <IconWrapper>
                <TrendingUp className="h-3 w-3 mr-1" />
              </IconWrapper>
              <span className="text-xs font-medium">
                เพิ่มขึ้น {stats.newUsersThisMonth} คน ในเดือนนี้
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Right Card - ประกาศทั้งหมด */}
        <Card className="bg-white shadow-md border-2 border-blue-300 hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-5">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center">
                <IconWrapper>
                  <Building2 className="h-5 w-5 text-blue-600" />
                </IconWrapper>
              </div>
              <p className="text-sm font-medium text-gray-600">ประกาศทั้งหมด</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-2">
              {stats.totalProperties.toLocaleString()}
            </p>
            <div className="flex items-center text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span className="text-xs font-medium">
                เพิ่มขึ้น {stats.newPropertiesThisMonth} ประกาศ ในเดือนนี้
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
