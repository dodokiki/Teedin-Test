"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Users,
  Building2,
  Bell,
  Settings,
  LogOut,
  Menu,
  Clock,
} from "lucide-react";

// สร้าง wrapper สำหรับ icons เพื่อป้องกัน hydration mismatch
const IconWrapper = ({ children }: { children: React.ReactNode }) => (
  <span suppressHydrationWarning>{children}</span>
);

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  active?: boolean;
}

interface SuperAdminSidebarProps {
  activeTab: string;
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
  onItemClick: (itemId: string) => void;
  pendingCount?: number;
}

const getSidebarItems = (pendingCount: number): SidebarItem[] => [
  { id: "dashboard", label: "Dashboard", icon: Home, active: true },
  { id: "users", label: "จัดการผู้ใช้", icon: Users },
  { id: "properties", label: "จัดการประกาศ", icon: Building2 },
  {
    id: "pending-properties",
    label: "รออนุมัติ",
    icon: Clock,
    badge: pendingCount > 0 ? pendingCount : undefined,
  },
  { id: "notifications", label: "แจ้งเตือน", icon: Bell },
  { id: "settings", label: "ตั้งค่า", icon: Settings },
  { id: "logout", label: "ออกจากระบบ", icon: LogOut },
];

export function SuperAdminSidebar({
  activeTab,
  sidebarOpen,
  onSidebarToggle,
  onItemClick,
  pendingCount = 0,
}: SuperAdminSidebarProps) {
  return (
    <>
      <div
        className={`fixed left-0 top-0 h-full bg-gradient-to-b from-blue-600 to-blue-800 text-white z-50 transform transition-[width,transform] duration-300 ${
          sidebarOpen
            ? "w-64 translate-x-0"
            : "w-16 -translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-4">
        <div className="flex items-center justify-between">
          <h2
            className={`font-bold text-xl ${sidebarOpen ? "block" : "hidden"}`}
          >
            TEDIN Admin
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="text-white hover:bg-blue-700"
          >
            <IconWrapper>
              <Menu className="h-5 w-5" />
            </IconWrapper>
          </Button>
        </div>
      </div>

        <nav className="mt-8">
          {getSidebarItems(pendingCount).map(item => (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={`w-full flex items-center px-4 py-3 text-left hover:bg-blue-700 transition-colors group ${
                activeTab === item.id
                  ? "bg-blue-700 border-r-4 border-white"
                  : ""
              } ${item.id === "logout" ? "hover:bg-red-600" : ""}`}
            >
            <IconWrapper>
              <item.icon
                className={`h-5 w-5 min-w-[20px] transition-all duration-200 ${
                  item.id === "notifications"
                    ? "bell-swing group-hover:text-yellow-300"
                    : ""
                }`}
              />
            </IconWrapper>
            {sidebarOpen && (
              <>
                <span className="ml-3 flex-1">{item.label}</span>
                {item.badge && (
                  <div className="relative ml-2">
                    {/* Ping effect background */}
                    <div
                      className="absolute inset-0 w-full h-full bg-red-500 rounded-full animate-ping opacity-75 
                                  [animation-duration:1.5s]"
                    ></div>

                    {/* Pulsing ring */}
                    <div
                      className="absolute inset-0 w-full h-full bg-red-400 rounded-full animate-pulse 
                                  ring-2 ring-red-300 ring-opacity-50 [animation-duration:1s]"
                    ></div>

                    {/* Main badge */}
                    <Badge
                      variant="destructive"
                      className="relative text-xs bg-red-500 hover:bg-red-600 shadow-lg 
                               animate-bounce [animation-duration:2s] [animation-delay:0.5s] [animation-iteration-count:3]
                               notification-glow transform transition-all duration-300 hover:scale-110"
                    >
                      <span className="font-semibold text-white">
                        {item.badge}
                      </span>
                    </Badge>
                  </div>
                )}
              </>
            )}
            {!sidebarOpen && item.badge && (
              <div className="absolute top-2 right-2">
                {/* Ping effect for collapsed sidebar */}
                <div
                  className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75 
                              [animation-duration:1.5s]"
                ></div>

                {/* Main badge for collapsed sidebar */}
                <Badge
                  variant="destructive"
                  className="relative text-xs min-w-[16px] h-4 px-1 bg-red-500 shadow-lg 
                           animate-bounce [animation-duration:2s] [animation-delay:0.5s] [animation-iteration-count:3]
                           notification-glow"
                >
                  <span className="font-semibold text-white text-[10px]">
                    {item.badge}
                  </span>
                </Badge>
              </div>
            )}
            </button>
          ))}
        </nav>
      </div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onSidebarToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
}
