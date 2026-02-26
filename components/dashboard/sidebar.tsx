"use client";

import type React from "react";

import { LogoutConfirmationModal } from "@/components/auth/logout-confirmation-modal";
import { useAuth } from "@/contexts/auth-context";
import { useDashboardLayout } from "@/contexts/dashboard-layout-context";
import { useLanguage } from "@/contexts/language-context";
import {
  Bell,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface MenuItem {
  title: string;
  icon: React.ElementType;
  href: string;
  onClick?: () => void;
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { t } = useLanguage();
  const { isSidebarOpen, toggleSidebar, isCollapsed, toggleCollapsed } =
    useDashboardLayout();
  const { userRole } = useAuth();

  const menuItems: MenuItem[] = [
    {
      title: t("toggle_sidebar") || "Toggle Menu",
      icon: Menu,
      href: "#",
      onClick: toggleCollapsed,
    },
    {
      title: t("sidebar_dashboard"),
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      title: t("sidebar_my_account"),
      icon: User,
      href: "/dashboard/account",
    },
    {
      title: t("sidebar_my_listings"),
      icon: FileText,
      href: "/dashboard/listings",
    },
    {
      title: t("sidebar_favorites"),
      icon: Heart,
      href: "/dashboard/favorites",
    },
    {
      title: t("sidebar_packages"),
      icon: Package,
      href: "/dashboard/packages",
    },
    {
      title: t("sidebar_notifications"),
      icon: Bell,
      href: "/dashboard/notifications",
    },
    {
      title: t("sidebar_logout"),
      icon: LogOut,
      href: "#",
      onClick: () => setIsLogoutModalOpen(true),
    },
  ];

  // Filter out dashboard menu item for customers
  const filteredMenuItems = menuItems.filter(item => {
    if (userRole === "customer" && item.href === "/dashboard") {
      return false;
    }
    // Filter out favorites menu item for agents
    if (userRole === "agent" && item.href === "/dashboard/favorites") {
      return false;
    }
    // Filter out packages menu item for customers
    if (userRole === "customer" && item.href === "/dashboard/packages") {
      return false;
    }
    return true;
  });

  return (
    <>
      <aside
        className={`bg-[#006ce3] dark:bg-blue-950 text-white flex-shrink-0 lg:block lg:relative ${isCollapsed ? "w-[70px]" : "w-[250px] lg:w-[200px]"
          } ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } absolute h-full z-40 lg:translate-x-0 transition-[width,transform] duration-300 ease-in-out overflow-hidden`}
        style={{
          willChange: "transform, width",
        }}
      >
        <nav className="py-4">
          <ul className="space-y-1">
            {filteredMenuItems.map((item, index) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              const isHamburgerItem = index === 0 && item.icon === Menu;

              return (
                <li key={`${item.href}-${item.title}`}>
                  {item.onClick ? (
                    <button
                      onClick={item.onClick}
                      className={`flex items-center ${isCollapsed ? "justify-center px-4" : "px-4"} py-3 text-sm w-full text-left ${isActive
                          ? "bg-blue-700 font-medium"
                          : "hover:bg-blue-700"
                        }`}
                      title={
                        isCollapsed && !isHamburgerItem ? item.title : undefined
                      }
                    >
                      <item.icon
                        className={`h-5 w-5 ${isCollapsed ? "" : "mr-3"
                          } transition-transform duration-200`}
                      />
                      {!isHamburgerItem && (
                        <div
                          className={`overflow-hidden transition-opacity duration-150 ease-in ${isCollapsed
                              ? "max-w-0 opacity-0"
                              : "max-w-[180px] opacity-100"
                            }`}
                        >
                          <span className="block truncate">{item.title}</span>
                        </div>
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={toggleSidebar} // Close sidebar on navigation
                      className={`flex items-center ${isCollapsed ? "justify-center px-4" : "px-4"} py-3 text-sm ${isActive
                          ? "bg-blue-700 font-medium"
                          : "hover:bg-blue-700"
                        }`}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <item.icon
                        className={`h-5 w-5 ${isCollapsed ? "" : "mr-3"
                          } transition-transform duration-200`}
                      />
                      <div
                        className={`overflow-hidden transition-opacity duration-150 ease-in ${isCollapsed
                            ? "max-w-0 opacity-0"
                            : "max-w-[180px] opacity-100"
                          }`}
                      >
                        <span className="block truncate">{item.title}</span>
                      </div>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <div
        className={`fixed inset-0 bg-black z-30 lg:hidden ${isSidebarOpen
            ? "opacity-50 pointer-events-auto"
            : "opacity-0 pointer-events-none"
          }`}
        style={{
          transition: "opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: "opacity",
        }}
        onClick={toggleSidebar}
      ></div>
      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </>
  );
}
