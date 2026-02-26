"use client";

import { LogoutConfirmationModal } from "@/components/auth/logout-confirmation-modal";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";

interface MenuItem {
  title: string;
  icon: React.ElementType;
  href: string;
  onClick?: () => void;
}

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const menuItems: MenuItem[] = [
    {
      title: "แดชบอร์ด",
      icon: LayoutDashboard,
      href: "/dashboard/super-admin",
    },
    {
      title: "จัดการผู้ใช้งาน",
      icon: Users,
      href: "/dashboard/super-admin/users",
    },
    {
      title: "จัดการประกาศ",
      icon: FileText,
      href: "/dashboard/super-admin/listings",
    },
    {
      title: "จัดการประกาศใหม่",
      icon: Megaphone,
      href: "/dashboard/super-admin/announcements",
    },
    {
      title: "รายงานระบบ",
      icon: BarChart3,
      href: "/dashboard/super-admin/reports",
    },
    {
      title: "การอนุมัติเอเจนท์",
      icon: UserCheck,
      href: "/dashboard/super-admin/agent-approval",
    },
    {
      title: "ตั้งค่าระบบ",
      icon: Settings,
      href: "/dashboard/super-admin/settings",
    },
    {
      title: "ออกจากระบบ",
      icon: LogOut,
      href: "#",
      onClick: () => setIsLogoutModalOpen(true),
    },
  ];

  return (
    <div className="text-white h-[calc(100vh-56px)] w-full">
      {/* Super Admin Badge */}
      <div className="px-4 py-3 border-b border-blue-700">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-yellow-400" />
          <span className="text-sm font-medium text-yellow-400">
            Super Admin
          </span>
        </div>
      </div>

      <nav className="py-4">
        <ul className="space-y-1">
          {menuItems.map(item => {
            const isActive =
              item.href === "/dashboard/super-admin"
                ? pathname === "/dashboard/super-admin"
                : pathname.startsWith(item.href) && item.href !== "#";

            return (
              <li key={item.href}>
                {item.onClick ? (
                  <button
                    onClick={item.onClick}
                    className={`flex items-center px-4 py-3 text-sm w-full text-left ${
                      isActive ? "bg-blue-700 font-medium" : "hover:bg-blue-700"
                    }`}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span>{item.title}</span>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center px-4 py-3 text-sm ${
                      isActive ? "bg-blue-700 font-medium" : "hover:bg-blue-700"
                    }`}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span>{item.title}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
}
