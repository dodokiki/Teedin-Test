"use client";

import { RoleSwitchAlert } from "@/app/add-property/components/RoleSwitchAlert";
import LoginSuccessModal from "@/app/components/LoginSuccessModal";
import { AgentRegisterModal } from "@/components/auth/agent-register-modal";
import { LoginDrawer } from "@/components/auth/login-drawer";
import { RegisterDrawer } from "@/components/auth/register-drawer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { Bell, ChevronDown, Menu, User, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ComingSoonPage() {
  const router = useRouter();
  const { isLoggedIn, userRole, baseRole, loading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [showRoleSwitchAlert, setShowRoleSwitchAlert] = useState(false);
  const [isLoginSuccessOpen, setIsLoginSuccessOpen] = useState(false);
  const [showAgentRegister, setShowAgentRegister] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle listing click - require login or navigate to add-property
  const handleListingClick = () => {
    if (!isLoggedIn) {
      // ถ้ายังไม่ได้ล็อกอิน ให้เปิด login drawer
      setIsLoginOpen(true);
      return;
    }

    if (userRole === "customer") {
      setShowRoleSwitchAlert(true);
      return;
    }

    // ถ้าล็อกอินแล้ว ให้ไปหน้า add-property
    router.push("/add-property");
  };

  // Handle login success for listing
  const handleLoginSuccessForListing = () => {
    setIsLoginOpen(false);
    setIsLoginSuccessOpen(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Background with Topbar - Same as homepage */}
      <div className="relative w-full">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-background.jpg"
            alt="Bangkok skyline"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-teal-900/60"></div>
        </div>

        {/* Top Navigation - Same as homepage */}
        <div className="relative z-10 shadow-md border-b border-white/20">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-white font-bold text-lg">
                TEEDIN EASY
              </Link>
              <nav className="hidden md:flex items-center space-x-6">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="text-white hover:text-blue-200 text-sm"
                  suppressHydrationWarning={true}
                >
                  {t("buy")}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="text-white hover:text-blue-200 text-sm"
                  suppressHydrationWarning={true}
                >
                  {t("rent")}
                </button>
                <Link
                  href="/real-estate"
                  className="text-white hover:text-blue-200 text-sm"
                >
                  {t("real_estate")}
                </Link>
                <Link
                  href="/new-real-estate"
                  className="text-white hover:text-blue-200 text-sm"
                >
                  {t("new_real_estate")}
                </Link>
                <Link
                  href="/new-projects"
                  className="text-white hover:text-blue-200 text-sm"
                >
                  {t("new_projects")}
                </Link>
                <button
                  type="button"
                  onClick={handleListingClick}
                  className="text-white hover:text-blue-200 text-sm"
                  suppressHydrationWarning={true}
                >
                  {t("post_listing")}
                </button>
              </nav>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              {isLoggedIn && (
                <button
                  type="button"
                  aria-label="Notifications"
                  className="text-white"
                >
                  <Bell size={20} />
                </button>
              )}
              <div className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Language selector"
                      className="flex items-center text-white bg-transparent border border-white/30 rounded-md px-3 py-1 focus:outline-none focus:ring-0"
                      suppressHydrationWarning
                    >
                      <span className="mr-1">
                        {language === "th"
                          ? t("language_th")
                          : t("language_en")}
                      </span>
                      <ChevronDown size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setLanguage("th")}
                      className={
                        language === "th"
                          ? "bg-blue-600 text-white font-bold"
                          : ""
                      }
                    >
                      {t("language_th")} - TH
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setLanguage("en")}
                      className={
                        language === "en"
                          ? "bg-blue-600 text-white font-bold"
                          : ""
                      }
                    >
                      {t("language_en")} - EN
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {isLoggedIn ? (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                  onClick={() => router.push("/dashboard")}
                  suppressHydrationWarning
                >
                  <User size={18} />
                  {t("profile")}
                </Button>
              ) : (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  onClick={() => setIsLoginOpen(true)}
                  suppressHydrationWarning
                >
                  {t("login")}
                </Button>
              )}
            </div>
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="text-white"
                aria-label="Open menu"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content - GitHub style with "กำลังพัฒนา" */}
      <main className="flex items-center justify-center min-h-[calc(100vh-200px)] px-4 bg-white">
        <div className="text-center max-w-md w-full">
          <div className="mb-8">
            <h1 className="text-8xl font-bold text-gray-300 mb-2">404</h1>
            <p className="text-gray-600 text-lg md:text-xl font-medium mb-4">
              {language === "th"
                ? "หน้านี้ยังอยู่ในขั้นตอนการพัฒนา"
                : "This page is still under development"}
            </p>
          </div>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md">
              {language === "th" ? "กลับหน้าหลัก" : "Back to Home"}
            </Button>
          </Link>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/90 backdrop-blur-sm md:hidden">
          <div className="container mx-auto flex shrink-0 items-center justify-between px-4 py-3">
            <Link href="/" className="text-white font-bold text-lg">
              TEEDIN EASY
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>
          <div className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-8 space-y-6 text-center">
            <button
              type="button"
              onClick={() => {
                router.push("/");
                setIsMobileMenuOpen(false);
              }}
              className="block text-white hover:text-blue-200 text-lg"
            >
              {t("buy")}
            </button>
            <button
              type="button"
              onClick={() => {
                router.push("/");
                setIsMobileMenuOpen(false);
              }}
              className="block text-white hover:text-blue-200 text-lg"
            >
              {t("rent")}
            </button>
            <Link
              href="/real-estate"
              className="block text-white hover:text-blue-200 text-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t("real_estate")}
            </Link>
            <Link
              href="/new-real-estate"
              className="block text-white hover:text-blue-200 text-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t("new_real_estate")}
            </Link>
            <Link
              href="/new-projects"
              className="block text-white hover:text-blue-200 text-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t("new_projects")}
            </Link>
            <button
              type="button"
              onClick={() => {
                handleListingClick();
                setIsMobileMenuOpen(false);
              }}
              className="block text-white hover:text-blue-200 text-lg"
            >
              {t("post_listing")}
            </button>

            {isLoggedIn && (
              <button
                type="button"
                onClick={() => {
                  router.push("/dashboard/notifications");
                  setIsMobileMenuOpen(false);
                }}
                className="block text-white hover:text-blue-200 text-lg"
              >
                {t("notifications")}
              </button>
            )}

            <div className="pt-4 border-t border-white/20">
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  className={`border-white/40 bg-transparent text-white hover:bg-white/10 ${language === "th" ? "ring-2 ring-white/50" : ""}`}
                  onClick={() => setLanguage("th")}
                  suppressHydrationWarning
                >
                  {t("language_th")}
                </Button>
                <Button
                  variant="outline"
                  className={`border-white/40 bg-transparent text-white hover:bg-white/10 ${language === "en" ? "ring-2 ring-white/50" : ""}`}
                  onClick={() => setLanguage("en")}
                  suppressHydrationWarning
                >
                  {t("language_en")}
                </Button>
              </div>

              {isLoggedIn ? (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    router.push("/dashboard");
                    setIsMobileMenuOpen(false);
                  }}
                  suppressHydrationWarning
                >
                  <User size={18} className="mr-2" />
                  {t("profile")}
                </Button>
              ) : (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    setIsLoginOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  suppressHydrationWarning
                >
                  {t("login")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Drawer */}
      <LoginDrawer
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccessForListing}
        showSuccessModal={true}
        onSwitchToRegister={() => {
          setIsLoginOpen(false);
          setIsRegisterOpen(true);
        }}
      />
      <RegisterDrawer
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={() => {
          setIsRegisterOpen(false);
          setIsLoginOpen(true);
        }}
      />
      {/* Role Switch Alert */}
      <RoleSwitchAlert
        isOpen={showRoleSwitchAlert}
        onOpenChange={setShowRoleSwitchAlert}
        showAgentRegister={showAgentRegister}
        setShowAgentRegister={setShowAgentRegister}
      />
      {/* Agent Register Modal */}
      <AgentRegisterModal
        isOpen={showAgentRegister}
        onClose={() => setShowAgentRegister(false)}
      />
      {/* Login Success Modal */}
      <LoginSuccessModal
        isOpen={isLoginSuccessOpen}
        onClose={() => setIsLoginSuccessOpen(false)}
      />
    </div>
  );
}
