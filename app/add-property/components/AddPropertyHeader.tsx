"use client";

import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AddPropertyHeaderProps {
  onNavigateAway: () => void;
  langDropdownRef: React.RefObject<HTMLDivElement | null>;
  langDropdownOpen: boolean;
  selectedLang: string;
  onLangSelect: (lang: string) => void;
  onToggleDropdown: () => void;
}

export function AddPropertyHeader({
  onNavigateAway,
  langDropdownRef,
  langDropdownOpen,
  selectedLang,
  onLangSelect,
  onToggleDropdown,
}: AddPropertyHeaderProps) {
  const { userRole, loading } = useAuth();
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const currentLanguageLabel =
    selectedLang || (language === "en" ? t("language_en") : t("language_th"));

  const handleProfileClick = () => {
    onNavigateAway();
    router.push("/dashboard/agent");
  };

  return (
    <header className="bg-blue-600 text-white py-3">
      <div className="px-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link
            href="/"
            onClick={onNavigateAway}
            className="text-xl font-bold hover:opacity-90 transition-opacity"
          >
            TEEDIN EASY
          </Link>
          <nav className="hidden md:flex ml-8 space-x-6">
            <Link
              href="/"
              onClick={onNavigateAway}
              className="transition-all duration-300 hover:text-shadow-glow font-medium hover:scale-105"
            >
              {t("buy")}
            </Link>
            <Link
              href="/"
              onClick={onNavigateAway}
              className="transition-all duration-300 hover:text-shadow-glow font-medium hover:scale-105"
            >
              {t("rent")}
            </Link>
            <Link
              href="/real-estate"
              onClick={onNavigateAway}
              className="transition-all duration-300 hover:text-shadow-glow font-medium hover:scale-105"
            >
              {t("real_estate")}
            </Link>
            <Link
              href="/new-real-estate"
              onClick={onNavigateAway}
              className="transition-all duration-300 hover:text-shadow-glow font-medium hover:scale-105"
            >
              {t("new_real_estate")}
            </Link>
            <Link
              href="/new-projects"
              onClick={onNavigateAway}
              className="transition-all duration-300 hover:text-shadow-glow font-medium hover:scale-105"
            >
              {t("new_projects")}
            </Link>
            <Link
              href="/add-property"
              className="transition-all duration-300 hover:text-shadow-glow font-medium hover:scale-105"
            >
              {t("post_listing")}
            </Link>
            {/* Reserved space for Agent button to prevent layout shift */}
            <div className="relative min-w-[80px] h-6 flex items-center justify-center">
              {userRole === "customer" && (
                <Link
                  href="/"
                  className={`
                    transition-all duration-300 hover:text-shadow-glow font-medium hover:scale-105 whitespace-nowrap
                    ${loading ? "opacity-50 pointer-events-none select-none" : ""}
                  `}
                  tabIndex={loading ? -1 : 0}
                  {...(loading ? { "aria-disabled": "true" } : {})}
                >
                  {t("agent")}
                </Link>
              )}
            </div>
          </nav>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <button className="text-white">
            <span className="sr-only">{t("notifications")}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>
          <div className="relative" ref={langDropdownRef}>
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
              onClick={onToggleDropdown}
            >
              {currentLanguageLabel}
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-10">
                <button
                  className={`block w-full text-left px-4 py-2 ${
                    language === "en"
                      ? "bg-blue-600 text-white font-bold"
                      : "bg-white text-black"
                  }`}
                  onClick={() => {
                    setLanguage("en");
                    onLangSelect("English");
                    onToggleDropdown();
                  }}
                >
                  {t("language_en")} - EN
                </button>
                <button
                  className={`block w-full text-left px-4 py-2 ${
                    language === "th"
                      ? "bg-blue-600 text-white font-bold"
                      : "bg-white text-black"
                  }`}
                  onClick={() => {
                    setLanguage("th");
                    onLangSelect("ภาษาไทย");
                    onToggleDropdown();
                  }}
                >
                  {t("language_th")} - TH
                </button>
              </div>
            )}
          </div>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
            onClick={handleProfileClick}
          >
            {t("profile")}
          </button>
        </div>
        <div className="md:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-white"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-blue-900/95 backdrop-blur-sm md:hidden">
          <div className="px-4 py-3 flex shrink-0 items-center justify-between border-b border-white/20">
            <span className="text-white font-bold text-lg">TEEDIN EASY</span>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 space-y-5 text-center">
            <Link
              href="/real-estate"
              onClick={() => {
                onNavigateAway();
                setIsMobileMenuOpen(false);
              }}
              className="block text-white text-lg"
            >
              {t("buy")}
            </Link>
            <Link
              href="/new-real-estate"
              onClick={() => {
                onNavigateAway();
                setIsMobileMenuOpen(false);
              }}
              className="block text-white text-lg"
            >
              {t("rent")}
            </Link>
            <Link
              href="/new-projects"
              onClick={() => {
                onNavigateAway();
                setIsMobileMenuOpen(false);
              }}
              className="block text-white text-lg"
            >
              {t("real_estate")}
            </Link>
            <Link
              href="/"
              onClick={() => {
                onNavigateAway();
                setIsMobileMenuOpen(false);
              }}
              className="block text-white text-lg"
            >
              {t("new_real_estate")}
            </Link>
            <Link
              href="/"
              onClick={() => {
                onNavigateAway();
                setIsMobileMenuOpen(false);
              }}
              className="block text-white text-lg"
            >
              {t("new_projects")}
            </Link>
            <Link
              href="/add-property"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-white text-lg"
            >
              {t("post_listing")}
            </Link>
            {userRole === "customer" && (
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block text-white text-lg ${loading ? "opacity-50 pointer-events-none" : ""}`}
                tabIndex={loading ? -1 : 0}
                {...(loading ? { "aria-disabled": "true" } : {})}
              >
                {t("agent")}
              </Link>
            )}
            <div className="pt-4 border-t border-white/20 flex gap-2">
              <button
                type="button"
                className={`px-3 py-2 rounded border border-white/40 text-white ${language === "th" ? "bg-white/20" : ""}`}
                onClick={() => {
                  setLanguage("th");
                  onLangSelect("ภาษาไทย");
                }}
              >
                {t("language_th")}
              </button>
              <button
                type="button"
                className={`px-3 py-2 rounded border border-white/40 text-white ${language === "en" ? "bg-white/20" : ""}`}
                onClick={() => {
                  setLanguage("en");
                  onLangSelect("English");
                }}
              >
                {t("language_en")}
              </button>
            </div>
            <button
              className="w-full bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
              onClick={() => {
                handleProfileClick();
                setIsMobileMenuOpen(false);
              }}
            >
              {t("profile")}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
