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
import { useProperty } from "@/contexts/property-context";
import { Bell, ChevronDown, Menu, Search, User, X } from "lucide-react"; // Added icons
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface HeroSectionProps {
  activeFilter: string | null;
  onFilterChangeAction: (filter: string | null) => void;
  showSearchSection?: boolean; // เพิ่ม prop สำหรับควบคุมการแสดง Search Section
}

export function HeroSection({
  activeFilter,
  onFilterChangeAction,
  showSearchSection = true,
}: HeroSectionProps) {
  const router = useRouter();
  const { isLoggedIn, userRole, baseRole, logout, loading } = useAuth(); // Added baseRole, logout
  const { allProperties, refreshData, clearCache, forceRefresh } =
    useProperty();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [isAgentRegisterOpen, setIsAgentRegisterOpen] = useState(false);
  const [showRoleSwitchAlert, setShowRoleSwitchAlert] = useState(false);
  const [isLoginSuccessOpen, setIsLoginSuccessOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [portalStyles, setPortalStyles] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const { language, setLanguage, t } = useLanguage();

  // Handle scroll to show/hide sticky navigation
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 100); // Show sticky nav after scrolling 100px
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle refresh data
  const handleRefreshData = async () => {
    try {
      await forceRefresh(); // ใช้ forceRefresh แทน refreshData
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  // Handle listing click - require login or navigate to add-property
  const handleListingClick = () => {
    if (!isLoggedIn) {
      // ถ้ายังไม่ได้ล็อกอิน ให้เปิด login drawer แบบพิเศษสำหรับการลงประกาศ
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

  // Handle navbar filter click - navigate to map page with filter
  const handleNavbarFilterClick = (filterType: "buy" | "rent") => {
    const searchParams = new URLSearchParams();
    searchParams.set("listingType", filterType === "buy" ? "sale" : "rent");

    router.push(`/map?${searchParams.toString()}`);
  };

  // Handle filter click - navigate to map page with filter
  const handleFilterClick = (filterType: string) => {
    // Set the active filter
    onFilterChangeAction(filterType);

    // Navigate to map page with the selected filter
    const searchParams = new URLSearchParams();
    if (filterType === "buy") {
      searchParams.set("listingType", "sale");
    } else if (filterType === "rent") {
      searchParams.set("listingType", "rent");
    }

    router.push(`/map?${searchParams.toString()}`);
  };

  // Handle search functionality
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      // ถ้าไม่มีคำค้นหา ให้ไปหน้าแผนที่ปกติ
      router.push("/map");
      return;
    }

    // ค้นหาอสังหาริมทรัพย์ที่ตรงกับคำค้นหา
    const foundProperty = allProperties.find(property => {
      const titleMatch = property.title
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
      const locationMatch =
        typeof property.location === "string"
          ? property.location.toLowerCase().includes(searchQuery.toLowerCase())
          : property.location?.address
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase());
      const descriptionMatch = property.description
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

      return titleMatch || locationMatch || descriptionMatch;
    });

    if (foundProperty && foundProperty.latitude && foundProperty.longitude) {
      // ถ้าเจออสังหาฯ ที่มีพิกัด ให้ไปยังตำแหน่งนั้นบนแผนที่
      const searchParams = new URLSearchParams();
      searchParams.set("lat", foundProperty.latitude.toString());
      searchParams.set("lng", foundProperty.longitude.toString());
      searchParams.set("zoom", "18"); // ซูมเข้าใกล้
      searchParams.set("location", foundProperty.title || searchQuery);

      router.push(`/map?${searchParams.toString()}`);
    } else {
      // ถ้าไม่เจอ ให้ไปหน้าแผนที่พร้อมคำค้นหา
      const searchParams = new URLSearchParams();
      searchParams.set("search", searchQuery);

      router.push(`/map?${searchParams.toString()}`);
    }
  };

  // Handle Enter key press in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const updateSuggestions = (query: string) => {
    if (!query || !allProperties || allProperties.length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const q = query.toLowerCase();
    const matches = allProperties
      .filter(p => p.title && p.title.toLowerCase().includes(q))
      .map(p => p.title as string);

    // unique and limit
    const unique = Array.from(new Set(matches)).slice(0, 6);
    setSuggestions(unique);
    setActiveSuggestionIndex(0);
    setShowSuggestions(unique.length > 0);
    // update portal position when suggestions appear
    if (unique.length > 0) {
      requestAnimationFrame(() => updatePortalPosition());
    }
  };

  const selectSuggestion = (title: string) => {
    setSearchQuery(title);
    setShowSuggestions(false);

    // If there is a property with that title, navigate to its location on the map
    const foundProperty = allProperties.find(p => p.title === title);
    if (foundProperty && foundProperty.latitude && foundProperty.longitude) {
      const searchParams = new URLSearchParams();
      searchParams.set("lat", foundProperty.latitude.toString());
      searchParams.set("lng", foundProperty.longitude.toString());
      searchParams.set("zoom", "18");
      searchParams.set("location", foundProperty.title || title);

      router.push(`/map?${searchParams.toString()}`);
      return;
    }

    // fallback: search by title
    const searchParams = new URLSearchParams();
    searchParams.set("search", title);
    router.push(`/map?${searchParams.toString()}`);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        handleSearch();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex(i => Math.min(i + 1, suggestions.length - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex(i => Math.max(i - 1, 0));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const selected = suggestions[activeSuggestionIndex];
      if (selected) selectSuggestion(selected);
      return;
    }

    if (e.key === "Escape") {
      setShowSuggestions(false);
      return;
    }
  };

  // hide suggestions when clicking outside
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      const target = ev.target;
      const clickedOutsideInput = !(
        inputRef.current &&
        target instanceof Node &&
        inputRef.current.contains(target)
      );
      const clickedOutsideSuggestions = !(
        suggestionsRef.current &&
        target instanceof Node &&
        suggestionsRef.current.contains(target)
      );
      const clickedOutsidePortal = !(
        portalRef.current &&
        target instanceof Node &&
        portalRef.current.contains(target)
      );

      if (
        clickedOutsideInput &&
        clickedOutsideSuggestions &&
        clickedOutsidePortal
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // compute portal position based on input bounding rect
  const updatePortalPosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setPortalStyles({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  };

  // update portal position on resize/scroll so dropdown stays aligned
  useEffect(() => {
    const onResize = () => updatePortalPosition();
    const onScroll = () => updatePortalPosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, []);
  return (
    <div className="relative">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-background.jpg"
          alt="Bangkok skyline"
          fill
          className="object-cover opacity-60 dark:opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-teal-900/60 dark:from-blue-950/80 dark:to-slate-900/60"></div>
      </div>
      {/* Floating Navigation Bar - Shows when scrolled */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${isScrolled ? "translate-y-0" : "-translate-y-full"
          } bg-gradient-to-r from-blue-900/95 to-teal-900/90 backdrop-blur-sm shadow-lg`}
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-white font-bold text-lg">
              TEEDIN EASY
            </Link>{" "}
            <nav className="hidden md:flex items-center space-x-4">
              <button
                type="button"
                onClick={() => handleNavbarFilterClick("buy")}
                className="text-white hover:text-blue-200 text-sm px-2 py-1 rounded transition-colors"
                suppressHydrationWarning={true}
              >
                {t("buy")}
              </button>
              <button
                type="button"
                onClick={() => handleNavbarFilterClick("rent")}
                className="text-white hover:text-blue-200 text-sm px-2 py-1 rounded transition-colors"
                suppressHydrationWarning={true}
              >
                {t("rent")}
              </button>
              <button
                type="button"
                onClick={() => router.push("/real-estate")}
                className="text-white hover:text-blue-200 text-sm"
              >
                {t("real_estate")}
              </button>
              <button
                type="button"
                onClick={() => router.push("/new-real-estate")}
                className="text-white hover:text-blue-200 text-sm"
              >
                {t("new_real_estate")}
              </button>
              <button
                type="button"
                onClick={() => router.push("/new-projects")}
                className="text-white hover:text-blue-200 text-sm"
              >
                {t("new_projects")}
              </button>
            </nav>
          </div>{" "}
          <div className="hidden md:flex items-center space-x-3">
            {" "}
            {isLoggedIn && (
              <button
                type="button"
                aria-label="Notifications"
                className="text-white hover:text-blue-200 transition-colors"
              >
                <Bell size={18} />
              </button>
            )}
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Language selector"
                    className="flex items-center text-white bg-transparent border border-white/30 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-0"
                  >
                    <span className="mr-1">
                      {language === "th" ? t("language_th") : t("language_en")}
                    </span>
                    <ChevronDown size={14} />
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
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm flex items-center gap-2"
                onClick={() => router.push("/dashboard")}
              >
                <User size={16} />
                {t("profile")}
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm"
                onClick={() => setIsLoginOpen(true)}
              >
                {t("login")}
              </Button>
            )}
          </div>
          {/* Hamburger button for mobile */}
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
      {/* Original Top Navigation */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-white font-bold text-lg">
              TEEDIN EASY
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              <button
                type="button"
                onClick={() => handleNavbarFilterClick("buy")}
                className="text-white hover:text-blue-200 text-sm"
                suppressHydrationWarning={true}
              >
                {t("buy")}
              </button>
              <button
                type="button"
                onClick={() => handleNavbarFilterClick("rent")}
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
              </Link>{" "}
              <button
                type="button"
                onClick={handleListingClick}
                className="text-white hover:text-blue-200 text-sm"
                suppressHydrationWarning={true}
              >
                {t("post_listing")}
              </button>{" "}
              {/* Agent button: show only if not loading, user is logged in, and not agent */}
              {!loading && isLoggedIn && baseRole !== "agent" && (
                <button
                  type="button"
                  onClick={() => setIsAgentRegisterOpen(true)}
                  className="text-white hover:text-blue-200 text-sm"
                  suppressHydrationWarning={true}
                >
                  {t("agent")}
                </button>
              )}
            </nav>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {" "}
            {isLoggedIn && (
              <button
                type="button"
                aria-label="Notifications"
                className="text-white"
              >
                <Bell size={20} />
              </button>
            )}{" "}
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
                      {language === "th" ? t("language_th") : t("language_en")}
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

          {/* Hamburger button for mobile */}
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
      {/* Search Section - แสดงเฉพาะเมื่อ showSearchSection เป็น true */}
      {showSearchSection && (
        <div className="relative z-10 pt-12 pb-8 px-4">
          <div className="max-w-3xl mx-auto">
            {/* Compact Search Container */}
            <div
              className="bg-white/15 backdrop-blur-lg rounded-xl shadow-xl overflow-visible border border-white/20"
              suppressHydrationWarning={true}
            >
              {/* Compact Search Bar */}
              <div className="p-4">
                <div ref={suggestionsRef} className="relative">
                  <div className="flex items-center bg-white backdrop-blur-sm rounded-lg border border-white/30 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200">
                    <div className="pl-4">
                      <Search size={18} className="text-blue-600" />
                    </div>
                    <input
                      type="text"
                      placeholder={t("search_placeholder")}
                      value={searchQuery}
                      ref={el => {
                        inputRef.current = el;
                      }}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        updateSuggestions(e.target.value);
                      }}
                      onKeyDown={handleInputKeyDown}
                      onKeyPress={handleSearchKeyPress}
                      className="flex-grow py-3 px-3 text-gray-800 placeholder-gray-500 bg-white focus:outline-none text-sm"
                      suppressHydrationWarning={true}
                    />
                    <button
                      type="button"
                      onClick={handleSearch}
                      aria-label="Search properties"
                      className="m-1.5 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white px-4 py-2.5 rounded-md flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                      suppressHydrationWarning={true}
                    >
                      <span className="hidden sm:inline mr-1.5 text-sm font-medium">
                        {t("search")}
                      </span>
                      <Search size={16} />
                    </button>
                  </div>

                  {/* Suggestions dropdown */}
                  {showSuggestions &&
                    suggestions.length > 0 &&
                    portalStyles &&
                    typeof document !== "undefined" &&
                    createPortal(
                      <div
                        ref={el => {
                          portalRef.current = el;
                        }}
                        style={{
                          position: "absolute",
                          top: portalStyles.top,
                          left: portalStyles.left,
                          width: portalStyles.width,
                        }}
                        className="bg-white border border-gray-200 rounded-md shadow-lg z-[99999]"
                      >
                        <ul role="listbox" className="max-h-60 overflow-auto">
                          {suggestions.map((s, idx) => (
                            <li
                              key={s}
                              role="option"
                              aria-selected={idx === activeSuggestionIndex}
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => selectSuggestion(s)}
                              className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors ${idx === activeSuggestionIndex
                                ? "bg-blue-50 font-medium"
                                : ""
                                }`}
                            >
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>,
                      document.body
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}{" "}
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
          <div className="flex flex-1 flex-col items-center justify-center mt-6 px-4">
            <nav className="flex flex-col items-center space-y-4 text-center">
              <button
                type="button"
                onClick={() => {
                  handleNavbarFilterClick("buy");
                  setIsMobileMenuOpen(false);
                }}
                className="text-white hover:text-blue-200 text-lg"
                suppressHydrationWarning={true}
              >
                {t("buy")}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleNavbarFilterClick("rent");
                  setIsMobileMenuOpen(false);
                }}
                className="text-white hover:text-blue-200 text-lg"
                suppressHydrationWarning={true}
              >
                {t("rent")}
              </button>
              <Link
                href="/real-estate"
                className="text-white hover:text-blue-200 text-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t("real_estate")}
              </Link>
              <Link
                href="/new-real-estate"
                className="text-white hover:text-blue-200 text-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t("new_real_estate")}
              </Link>
              <Link
                href="/new-projects"
                className="text-white hover:text-blue-200 text-lg"
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
                className="text-white hover:text-blue-200 text-lg"
                suppressHydrationWarning={true}
              >
                {t("post_listing")}
              </button>
              {!loading && isLoggedIn && baseRole !== "agent" && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAgentRegisterOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-white hover:text-blue-200 text-lg"
                  suppressHydrationWarning={true}
                >
                  {t("agent")}
                </button>
              )}
            </nav>
            <div className="mt-8 border-t border-white/20 pt-6 flex items-center justify-between">
              {isLoggedIn ? (
                <div className="w-full flex flex-col gap-3">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2"
                    onClick={() => {
                      router.push("/dashboard");
                      setIsMobileMenuOpen(false);
                    }}
                    suppressHydrationWarning
                  >
                    <User size={18} />
                    {t("profile")}
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
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
      {/* Property Listing Modal - Removed as we now use /add-property page */}
      {/* <PropertyListingModal isOpen={isListingModalOpen} onClose={() => setIsListingModalOpen(false)} /> */}
      {/* Agent Register Modal */}
      <AgentRegisterModal
        isOpen={isAgentRegisterOpen}
        onClose={() => setIsAgentRegisterOpen(false)}
      />
      <RoleSwitchAlert
        isOpen={showRoleSwitchAlert}
        onOpenChange={setShowRoleSwitchAlert}
      />
      {/* Login Success Modal */}
      <LoginSuccessModal
        isOpen={isLoginSuccessOpen}
        onClose={() => setIsLoginSuccessOpen(false)}
      />
    </div>
  );
}

interface FilterTabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function FilterTab({ label, isActive, onClick }: FilterTabProps) {
  return (
    <button
      type="button"
      className={`flex-1 px-6 py-3 text-sm font-medium transition-all duration-200 relative ${isActive
        ? "text-white bg-gradient-to-r from-blue-600 to-teal-600"
        : "text-white/80 hover:text-white hover:bg-white/10"
        }`}
      onClick={onClick}
      suppressHydrationWarning={true}
    >
      {label}
      {isActive && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-white rounded-full"></div>
      )}
    </button>
  );
}
