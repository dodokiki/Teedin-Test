"use client";

import { LogoutConfirmationModal } from "@/components/auth/logout-confirmation-modal";
import { PropertyListingModal } from "@/components/forms/property-listing-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { useDashboardLayout } from "@/contexts/dashboard-layout-context";
import { useLanguage } from "@/contexts/language-context";
import { Bell, ChevronDown, LogOut, Menu, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function DashboardHeader() {
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const { t, language, setLanguage } = useLanguage();
  const { toggleSidebar } = useDashboardLayout();
  const { userRole, user, accounts, switchAccount, addAccount, removeAccount } =
    useAuth();

  // Helper to check if session is expired
  const isSessionExpired = (expiresAt?: number) => {
    if (!expiresAt) return true;
    const now = Math.floor(Date.now() / 1000);
    // Add a buffer of 60 seconds
    return expiresAt - 60 < now;
  };

  return (
    <>
      <header className="bg-[#006ce3] dark:bg-blue-950 text-white py-2 px-4 flex items-center justify-between h-14 z-30 transition-colors duration-300">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-white"
            aria-label="Toggle sidebar"
          >
            <Menu size={24} />
          </button>
          <Link href="/" className="font-bold text-lg">
            TEEDIN EASY
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            {/* Navigation links are hidden on dashboard for now */}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <Link href="/dashboard/notifications" className="text-white">
            <Bell size={20} />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-white/30 text-white bg-transparent hover:bg-blue-700"
              >
                <span className="mr-1">
                  {language === "th"
                    ? t("header_language_thai")
                    : t("header_language_english")}
                </span>
                <ChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage("th")}>
                {t("header_language_thai")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("en")}>
                {t("header_language_english")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full hover:bg-blue-700 p-0 ml-2"
              >
                <Avatar className="h-8 w-8 border-2 border-white/20">
                  <AvatarImage
                    src={user?.user_metadata?.avatar_url}
                    alt={user?.email || ""}
                  />
                  <AvatarFallback className="bg-blue-800 text-white">
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">
                    {userRole}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Account Switcher Section */}
              {accounts.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Switch Account
                  </DropdownMenuLabel>
                  {accounts
                    .filter(
                      account =>
                        account.user.id !== user?.id &&
                        account.role !== "admin" &&
                        account.role !== "super_admin" &&
                        account.user.email !== "teedineasy.team@gmail.com"
                    )
                    .map(account => {
                      const isExpired = isSessionExpired(
                        account.session.expires_at
                      );

                      return (
                        <DropdownMenuItem
                          key={account.user.id}
                          className="p-0 overflow-hidden group relative focus:bg-transparent cursor-default"
                          onSelect={e => e.preventDefault()}
                        >
                          {accountToDelete === account.user.id ? (
                            <div className="w-full p-2 bg-red-50 flex flex-col gap-2 animate-in slide-in-from-right-5 duration-200">
                              <div className="text-xs text-red-800 break-all">
                                ยืนยันลบ{" "}
                                <span className="font-bold">
                                  {account.user.email}
                                </span>
                                ?
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setAccountToDelete(null);
                                  }}
                                >
                                  ยกเลิก
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 px-2 bg-red-600 hover:bg-red-700 text-white"
                                  onClick={e => {
                                    e.stopPropagation();
                                    removeAccount(account.user.id);
                                    setAccountToDelete(null);
                                  }}
                                >
                                  ลบ
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div
                                className="flex items-center gap-2 w-full p-2 transition-transform duration-300 ease-in-out group-hover:-translate-x-10 cursor-pointer hover:bg-accent"
                                onClick={async e => {
                                  e.stopPropagation();
                                  if (isExpired) {
                                    // If expired, just remove it. User can add it again manually.
                                    await removeAccount(account.user.id);
                                  } else {
                                    switchAccount(account.user.id);
                                  }
                                }}
                              >
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {account.user.email
                                      ?.charAt(0)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col overflow-hidden">
                                  <span className="text-sm font-medium truncate max-w-[140px]">
                                    {account.user.email}
                                  </span>
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {account.role}
                                  </span>
                                  {isExpired && (
                                    <span className="text-[10px] text-red-500 font-medium mt-0.5">
                                      เซสชันหมดอายุ - คลิกเพื่อลบ
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div
                                className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center bg-red-500 text-white translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out cursor-pointer hover:bg-red-600"
                                onClick={e => {
                                  e.stopPropagation();
                                  setAccountToDelete(account.user.id);
                                }}
                              >
                                <Trash2 size={16} />
                              </div>
                            </>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                </>
              )}

              {userRole === "agent" && accounts.length < 5 && (
                <DropdownMenuItem
                  onClick={addAccount}
                  className="cursor-pointer text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Add another account</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={e => {
                  e.preventDefault();
                  setIsLogoutModalOpen(true);
                }}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("sidebar_logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <PropertyListingModal
        isOpen={isListingModalOpen}
        onClose={() => setIsListingModalOpen(false)}
      />
      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </>
  );
}
