"use client";

import { HeroSection } from "@/components/layout/hero-section";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MapPicker from "./components/MapPicker";

import { AgentRegisterBar } from "./components/AgentRegisterBar";
import { ProgressBar } from "./components/ProgressBar";
import { RoleSwitchAlert } from "./components/RoleSwitchAlert";
import { Step1Introduction } from "./components/Step1Introduction";
import { AgentRegisterModal } from "@/components/auth/agent-register-modal";
import { useAddPropertyForm } from "./hooks/useAddPropertyForm";
import { useAddPropertyNavigation } from "./hooks/useAddPropertyNavigation";

function AddPropertyPage() {
  const { isLoggedIn, userRole, user, loading, baseRole } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isAgentRegisterOpen, setIsAgentRegisterOpen] = useState(false);

  const {
    formData,
    updateFormData,
    clearError,
    previousStep,
    handleSubmit,
    handleAddImage,
    handleRemoveImage,
    validateStep2,
    validateStep3,
    translateWithAI,
  } = useAddPropertyForm();

  const { navigateAway } = useAddPropertyNavigation(
    formData.currentStep,
    formData.projectName,
    formData.address,
    formData.price
  );

  // Function to translate property type based on current language
  const getPropertyTypeLabel = (propertyType: string | null | undefined) => {
    if (!propertyType) return "";

    const propertyTypeMap: Record<string, string> = {
      บ้านเดี่ยว: t("step2_house_single"),
      ทาวน์โฮม: t("step2_townhouse"),
      คอนโดมิเนียม: t("step2_condo"),
      ที่ดิน: t("step2_land"),
      อาคารพาณิชย์: t("step2_commercial"),
      สำนักงาน: t("step2_office"),
    };

    return propertyTypeMap[propertyType] || propertyType;
  };

  // Create callback functions at top-level
  const handleLocationSelect = useCallback(
    (location: { ที่อยู่: string; ละติจูด: number; ลองจิจูด: number }) => {
      updateFormData({
        selectedLocation: location,
        projectLocation: location.ที่อยู่,
        address: location.ที่อยู่, // เพิ่มการอัพเดท address field
      });
    },
    [updateFormData]
  );

  // ... all useEffect hooks continue from here
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      // Instead of redirecting to /login, redirect to home and show login drawer
      router.replace("/");
    }
  }, [isLoggedIn, loading, router]);

  const handleNextStep = () => {
    console.log("=== handleNextStep called ===");
    console.log("Current step:", formData.currentStep);
    console.log("User authentication status:", {
      isLoggedIn,
      userRole,
      user: user ? { id: user.id, email: user.email } : null,
      loading,
    });

    if (userRole === "customer") {
      updateFormData({ showAgentAlert: true });
      return;
    }

    let isValid = true;
    if (formData.currentStep === 2) {
      const errors = validateStep2(
        formData.saleType,
        formData.propertyType,
        formData.projectLocation,
        formData.selectedLocation,
        formData.rentalPeriod
      );
      if (Object.keys(errors).length > 0) {
        updateFormData({ errors });
        isValid = false;
        // Scroll to the first error
        const firstErrorKey = Object.keys(errors)[0];
        // Map error keys to potential element IDs or names
        const element =
          document.getElementById(firstErrorKey) ||
          document.querySelector(`[name="${firstErrorKey}"]`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          if (element instanceof HTMLElement) {
            element.focus();
          }
        }
      }
    } else if (formData.currentStep === 3) {
      const errors = validateStep3(
        formData.projectName,
        formData.address,
        formData.area,
        formData.bedrooms,
        formData.bathrooms,
        formData.parking,
        formData.highlightsType,
        formData.price,
        formData.images,
        formData.selectedLocation, // Add selectedLocation parameter
        formData.projectDescription // Add projectDescription parameter
      );
      if (Object.keys(errors).length > 0) {
        updateFormData({ errors });
        isValid = false;
        console.log("Validation errors in step 3:", errors);
        // Scroll to the first error
        const firstErrorKey = Object.keys(errors)[0];
        // Map error keys to potential element IDs or names (some inputs might have names matching keys)
        const element =
          document.getElementById(firstErrorKey) ||
          document.querySelector(`[name="${firstErrorKey}"]`) ||
          // For images or custom inputs that might not have direct ID match, fallback to a container or specific logic if needed
          (firstErrorKey === "images"
            ? document.querySelector(".grid.grid-cols-2")
            : null);

        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          if (element instanceof HTMLElement && element.tagName !== "DIV") {
            // Only focus if it's an input/select/textarea
            element.focus();
          }
        }
      }
    }

    if (isValid) {
      updateFormData({ errors: {} });
      console.log(
        "Validation passed, changing step from",
        formData.currentStep,
        "to",
        Math.min(formData.currentStep + 1, 4)
      );
      updateFormData({ currentStep: Math.min(formData.currentStep + 1, 4) });
      console.log(
        "New currentStep after update:",
        Math.min(formData.currentStep + 1, 4)
      );
    } else {
      console.log("Validation failed, staying on step", formData.currentStep);
    }
  };

  const handlePreviousStep = () => {
    previousStep();
  };

  // Show loading screen while loading data
  if (loading || !formData.isDataLoaded) {
    return (
      <div className="bg-gray-100 min-h-screen font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("add_prop_loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen font-sans">
      <HeroSection
        activeFilter={activeFilter}
        onFilterChangeAction={setActiveFilter}
        showSearchSection={false}
      />

      <ProgressBar currentStep={formData.currentStep} />

      {/* ✅ Success Modal */}
      {formData.showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 shadow-lg">
            <div className="text-center">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 text-blue-500 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-blue-700">
                {t("add_prop_success_title")}
              </h3>
              <p className="text-gray-700 mb-6 text-base leading-relaxed">
                {t("add_prop_success_desc_line1")}
                <br />
                {t("add_prop_success_desc_line2")}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    updateFormData({ showSuccessModal: false });
                    router.push("/dashboard/listings");
                  }}
                  className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-lg font-bold shadow"
                >
                  {t("add_prop_view_my_listings")}
                </button>
                <button
                  onClick={() => {
                    updateFormData({ showSuccessModal: false });
                    router.push("/");
                  }}
                  className="w-full py-2 border border-gray-300 rounded-md hover:bg-gray-100 text-gray-700"
                >
                  {t("add_prop_back_to_home")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-16">
        <RoleSwitchAlert
          isOpen={formData.showAgentAlert}
          onOpenChange={show => {
            updateFormData({ showAgentAlert: show });
            if (!show) updateFormData({ showAgentRegisterBar: true });
          }}
        />
        <AgentRegisterBar
          isVisible={formData.showAgentRegisterBar}
          onRegisterClick={() => setIsAgentRegisterOpen(true)}
          onDismiss={() => updateFormData({ showAgentRegisterBar: false })}
        />
        <AgentRegisterModal
          isOpen={isAgentRegisterOpen}
          onClose={() => setIsAgentRegisterOpen(false)}
        />

        <div className="max-w-4xl mx-auto p-6 md:p-8">
          {formData.currentStep === 1 && (
            <Step1Introduction onNextStep={handleNextStep} />
          )}

          {formData.currentStep === 2 && (
            <div className="max-w-4xl mx-auto mt-8 px-4">
              <div className="space-y-6">
                {/* Want to sell or rent */}
                <div>
                  <h3 className="text-lg font-medium mb-2 text-gray-700">
                    {t("step2_sale_rent_title")}
                  </h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="saleType"
                        value="sale"
                        checked={formData.saleType === "sale"}
                        onChange={e => {
                          updateFormData({ saleType: e.target.value });
                          clearError("saleType");
                        }}
                        className={`w-4 h-4 mr-2 text-blue-600 border-gray-300 focus:ring-blue-500 ${
                          formData.errors.saleType
                            ? "ring-2 ring-red-500 border-red-500"
                            : ""
                        }`}
                      />
                      <span className="text-gray-700 text-sm">
                        {t("step2_i_want_sell")}
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="saleType"
                        value="rent"
                        checked={formData.saleType === "rent"}
                        onChange={e => {
                          updateFormData({ saleType: e.target.value });
                          clearError("saleType");
                        }}
                        className={`w-4 h-4 mr-2 text-blue-600 border-gray-300 focus:ring-blue-500 ${
                          formData.errors.saleType
                            ? "ring-2 ring-red-500 border-red-500"
                            : ""
                        }`}
                      />
                      <span className="text-gray-700 text-sm">
                        {t("step2_i_want_rent")}
                      </span>
                    </label>
                  </div>
                  {formData.errors.saleType && (
                    <div className="text-red-500 text-xs mt-1">
                      {formData.errors.saleType}
                    </div>
                  )}
                </div>

                {/* Property type */}
                <div>
                  <h3 className="text-lg font-medium mb-2 text-gray-700">
                    {t("step2_property_type_title")}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      {
                        value: "บ้านเดี่ยว",
                        label: t("step2_house_single"),
                        icon: "/icons/home.png",
                      },
                      {
                        value: "ทาวน์โฮม",
                        label: t("step2_townhouse"),
                        icon: "/icons/town.png",
                      },
                      {
                        value: "คอนโดมิเนียม",
                        label: t("step2_condo"),
                        icon: "/icons/building.png",
                      },
                      {
                        value: "ที่ดิน",
                        label: t("step2_land"),
                        icon: "/icons/land.png",
                      },
                      {
                        value: "อาคารพาณิชย์",
                        label: t("step2_commercial"),
                        icon: "/icons/apartment.png",
                      },
                      {
                        value: "สำนักงาน",
                        label: t("step2_office"),
                        icon: "/icons/work.png",
                      },
                    ].map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          updateFormData({ propertyType: type.value });
                          clearError("propertyType");
                        }}
                        className={`p-4 border rounded-lg text-center transition-colors min-h-[80px] flex flex-col items-center justify-center ${
                          formData.propertyType === type.value
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <div className="w-12 h-12 mb-2 flex items-center justify-center">
                          {type.value === "บ้านเดี่ยว" ||
                          type.value === "ทาวน์โฮม" ||
                          type.value === "คอนโดมิเนียม" ||
                          type.value === "ที่ดิน" ||
                          type.value === "อาคารพาณิชย์" ||
                          type.value === "สำนักงาน" ? (
                            <Image
                              src={type.icon}
                              alt={type.label}
                              width={48}
                              height={48}
                              className="h-full w-full object-contain"
                              priority
                            />
                          ) : (
                            <span className="text-3xl">{type.icon}</span>
                          )}
                        </div>
                        <div className="text-sm font-medium leading-tight">
                          {type.label}
                        </div>
                      </button>
                    ))}
                  </div>
                  {formData.errors.propertyType && (
                    <div className="text-red-500 text-xs mt-1">
                      {formData.errors.propertyType}
                    </div>
                  )}
                </div>

                {/* Is it a project or not */}
                <div>
                  <h3 className="text-lg font-medium mb-2 text-gray-700">
                    {t("step2_is_project_title")}
                  </h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="isProject"
                        checked={!formData.isProject}
                        onChange={() => {
                          updateFormData({ isProject: false });
                          clearError("isProject");
                        }}
                        className="w-4 h-4 mr-2 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 text-sm">
                        {t("step2_not_project")}
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="isProject"
                        checked={formData.isProject}
                        onChange={() => {
                          updateFormData({ isProject: true });
                          clearError("isProject");
                        }}
                        className="w-4 h-4 mr-2 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 text-sm">
                        {t("step2_is_project")}
                      </span>
                    </label>
                  </div>
                  {formData.errors.isProject && (
                    <div className="text-red-500 text-xs mt-1">
                      {formData.errors.isProject}
                    </div>
                  )}
                </div>

                {/* Minimum rental period */}
                {formData.saleType === "rent" && (
                  <div>
                    <h3 className="text-lg font-medium mb-2 text-gray-700">
                      {t("step2_rental_period_title")}
                    </h3>
                    <label htmlFor="rentalPeriod" className="sr-only">
                      {t("step2_rental_period_title")}
                    </label>
                    <select
                      id="rentalPeriod"
                      value={formData.rentalPeriod}
                      onChange={e => {
                        updateFormData({ rentalPeriod: e.target.value });
                        clearError("rentalPeriod");
                      }}
                      className={`w-full h-9 border rounded-lg py-1 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 ${
                        formData.errors.rentalPeriod
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    >
                      <option value="">{t("step2_select_period")}</option>
                      <option value="3">{t("step2_3_months")}</option>
                      <option value="6">{t("step2_6_months")}</option>
                      <option value="9">{t("step2_9_months")}</option>
                      <option value="12">{t("step2_12_months")}</option>
                    </select>
                    {formData.errors.rentalPeriod && (
                      <div className="text-red-500 text-xs mt-1">
                        {formData.errors.rentalPeriod}
                      </div>
                    )}
                  </div>
                )}

                {/* Pin location to find project or rental house address */}
                <div>
                  <h3 className="text-lg font-medium mb-2 text-gray-700">
                    {t("step2_pin_location_title")}
                  </h3>
                  <MapPicker
                    onLocationSelect={handleLocationSelect}
                    initialLocation={
                      formData.selectedLocation.ที่อยู่
                        ? formData.selectedLocation
                        : undefined
                    }
                  />
                  {formData.errors.projectLocation && (
                    <div className="text-red-500 text-xs mt-1">
                      {formData.errors.projectLocation}
                    </div>
                  )}
                </div>

                {/* Back and continue buttons */}
                <div className="flex justify-between mt-8">
                  <button
                    onClick={() => handlePreviousStep()}
                    className="px-6 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {t("back")}
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    {t("next")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {formData.currentStep === 3 && (
            <div className="max-w-4xl mx-auto mt-8 px-4">
              <div className="space-y-6">
                {/* Project name */}
                <div>
                  <h3 className="text-lg font-medium mb-2 text-gray-700">
                    {t("step3_project_name_title")}
                  </h3>
                  <input
                    type="text"
                    value={formData.projectName}
                    name="projectName"
                    onChange={e => {
                      updateFormData({ projectName: e.target.value });
                      clearError("projectName");
                    }}
                    placeholder={t("step3_project_name_placeholder")}
                    className={`w-64 h-9 border rounded-lg py-1 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500 ${
                      formData.errors.projectName
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {formData.errors.projectName && (
                    <div className="text-red-500 text-xs mt-1">
                      {formData.errors.projectName}
                    </div>
                  )}
                </div>

                {/* Address - Display from MapPicker */}
                <div>
                  <h3 className="text-lg font-medium mb-2 text-gray-700">
                    {t("step3_address_title")}
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="text-sm text-gray-600 mb-2">
                      {t("step3_address_from_map")}
                    </div>
                    <div className="text-gray-900 font-medium">
                      {formData.selectedLocation.ที่อยู่ ||
                        t("step3_please_select_location")}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {t("map_pick_coordinates_label")}{" "}
                      {formData.selectedLocation.ละติจูด.toFixed(6)},{" "}
                      {formData.selectedLocation.ลองจิจูด.toFixed(6)}
                    </div>
                  </div>
                </div>

                {/* Basic information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2 text-gray-700">
                      {t("step3_area_title")}
                    </h3>
                    <input
                      type="number"
                      name="area"
                      value={formData.area}
                      onChange={e => {
                        updateFormData({ area: e.target.value });
                        clearError("area");
                      }}
                      placeholder={t("step3_area_placeholder")}
                      className={`w-full h-9 border rounded-lg py-1 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500 ${
                        formData.errors.area
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {formData.errors.area && (
                      <div className="text-red-500 text-xs mt-1">
                        {formData.errors.area}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2 text-gray-700">
                      {t("step3_price_title")}
                    </h3>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={e => {
                        updateFormData({ price: e.target.value });
                        clearError("price");
                      }}
                      placeholder={t("step3_price_placeholder")}
                      className={`w-full h-9 border rounded-lg py-1 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500 ${
                        formData.errors.price
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {formData.errors.price && (
                      <div className="text-red-500 text-xs mt-1">
                        {formData.errors.price}
                      </div>
                    )}
                  </div>
                </div>

                {/* Room and parking information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2 text-gray-700">
                      {t("step3_bedrooms_title")}
                    </h3>
                    <input
                      type="number"
                      name="bedrooms"
                      min="0"
                      value={formData.bedrooms}
                      onChange={e => {
                        updateFormData({ bedrooms: e.target.value });
                        clearError("bedrooms");
                      }}
                      placeholder="0"
                      className={`w-full h-9 border rounded-lg py-1 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500 ${
                        formData.errors.bedrooms
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {formData.errors.bedrooms && (
                      <div className="text-red-500 text-xs mt-1">
                        {formData.errors.bedrooms}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2 text-gray-700">
                      {t("step3_bathrooms_title")}
                    </h3>
                    <input
                      type="number"
                      name="bathrooms"
                      min="1"
                      value={formData.bathrooms}
                      onChange={e => {
                        updateFormData({ bathrooms: e.target.value });
                        clearError("bathrooms");
                      }}
                      placeholder="1"
                      className={`w-full h-9 border rounded-lg py-1 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500 ${
                        formData.errors.bathrooms
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {formData.errors.bathrooms && (
                      <div className="text-red-500 text-xs mt-1">
                        {formData.errors.bathrooms}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2 text-gray-700">
                      {t("step3_parking_title")}
                    </h3>
                    <input
                      type="number"
                      name="parking"
                      min="0"
                      value={formData.parking}
                      onChange={e => {
                        updateFormData({ parking: e.target.value });
                        clearError("parking");
                      }}
                      placeholder="0"
                      className={`w-full h-9 border rounded-lg py-1 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500 ${
                        formData.errors.parking
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {formData.errors.parking && (
                      <div className="text-red-500 text-xs mt-1">
                        {formData.errors.parking}
                      </div>
                    )}
                  </div>
                </div>

                {/* House age */}
                <div>
                  <h3 className="text-lg font-medium mb-2 text-gray-700">
                    {t("step3_house_age_title")}
                  </h3>
                  <input
                    type="number"
                    name="houseAge"
                    min="0"
                    value={formData.houseAge}
                    onChange={e => {
                      // Extract only numbers from input
                      const numericValue = e.target.value.replace(/\D/g, "");
                      updateFormData({ houseAge: numericValue });
                      clearError("houseAge");
                    }}
                    placeholder="0"
                    className={`w-full md:w-64 h-9 border rounded-lg py-1 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500 ${
                      formData.errors.houseAge
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {formData.errors.houseAge && (
                    <div className="text-red-500 text-xs mt-1">
                      {formData.errors.houseAge}
                    </div>
                  )}
                </div>

                {/* Property highlights */}
                <div>
                  <h3 className="text-lg font-medium mb-2 text-gray-700">
                    {t("step3_highlights_title")}
                  </h3>

                  {/* Selected highlights */}
                  {formData.highlightsType.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {formData.highlightsType.map((highlight, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                          >
                            #{highlight}
                            <button
                              type="button"
                              onClick={() => {
                                const newHighlights =
                                  formData.highlightsType.filter(
                                    h => h !== highlight
                                  );
                                updateFormData({
                                  highlightsType: newHighlights,
                                });
                              }}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Highlight options */}
                  <div className="space-y-2">
                    {[
                      t("step3_near_bts"),
                      t("step3_near_highway"),
                      t("step3_nice_view"),
                    ].map(highlight => (
                      <label key={highlight} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.highlightsType.includes(highlight)}
                          onChange={e => {
                            if (e.target.checked) {
                              updateFormData({
                                highlightsType: [
                                  ...formData.highlightsType,
                                  highlight,
                                ],
                              });
                            } else {
                              updateFormData({
                                highlightsType: formData.highlightsType.filter(
                                  h => h !== highlight
                                ),
                              });
                            }
                          }}
                          className="w-4 h-4 mr-2 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-gray-700 text-sm">
                          #{highlight}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Add custom highlight */}
                  <div className="mt-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t("step3_add_highlight_placeholder")}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={e => {
                          if (
                            e.key === "Enter" &&
                            e.currentTarget.value.trim()
                          ) {
                            const newHighlight = e.currentTarget.value.trim();
                            if (
                              !formData.highlightsType.includes(newHighlight)
                            ) {
                              updateFormData({
                                highlightsType: [
                                  ...formData.highlightsType,
                                  newHighlight,
                                ],
                              });
                            }
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={e => {
                          const input = e.currentTarget
                            .previousElementSibling as HTMLInputElement;
                          if (input && input.value.trim()) {
                            const newHighlight = input.value.trim();
                            if (
                              !formData.highlightsType.includes(newHighlight)
                            ) {
                              updateFormData({
                                highlightsType: [
                                  ...formData.highlightsType,
                                  newHighlight,
                                ],
                              });
                            }
                            input.value = "";
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        {t("step3_add_highlight_button")}
                      </button>
                    </div>
                  </div>
                </div>

                {/* About property or project */}
                <div>
                  <h3 className="text-lg font-medium mb-2 text-gray-700">
                    {t("step3_description_title")}
                  </h3>
                  <textarea
                    value={formData.projectDescription}
                    onChange={e => {
                      updateFormData({ projectDescription: e.target.value });
                      clearError("projectDescription");
                    }}
                    placeholder={t("step3_description_placeholder")}
                    rows={4}
                    className={`w-full border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500 ${
                      formData.errors.projectDescription
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {formData.errors.projectDescription && (
                    <div className="text-red-500 text-xs mt-1">
                      {formData.errors.projectDescription}
                    </div>
                  )}
                </div>

                {/* Images */}
                <div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative">
                        <div
                          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                            formData.errors.images
                              ? "border-red-300"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          {image ? (
                            <div className="relative">
                              <div className="relative w-full h-32 mb-2">
                                {formData.imageUrls[index] && (
                                  <Image
                                    src={formData.imageUrls[index]!}
                                    alt={`Preview ${index + 1}`}
                                    fill
                                    className="object-cover rounded-md"
                                  />
                                )}
                              </div>
                              <div className="text-sm text-gray-500 mb-2">
                                {t("step3_image_upload")} {index + 1}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs z-10"
                              >
                                ×
                              </button>
                              <div className="text-xs text-gray-400">
                                {t("step3_image_click_to_add")}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-2xl mb-2"></div>
                              <div className="text-sm text-gray-500 mb-2">
                                {t("step3_image_upload")} {index + 1}
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                title={t("step3_image_upload_title")}
                                placeholder={t(
                                  "step3_image_upload_placeholder"
                                )}
                                onChange={e => handleAddImage(e, index)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <div className="text-xs text-gray-400">
                                {t("step3_image_click_to_add")}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {formData.errors.images && (
                    <div className="text-red-500 text-xs mt-1">
                      {formData.errors.images}
                    </div>
                  )}
                </div>

                {/* Back and continue buttons */}
                <div className="flex justify-between mt-8">
                  <button
                    onClick={() => handlePreviousStep()}
                    className="px-6 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {t("back")}
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    {t("next")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {formData.currentStep === 4 && (
            <div className="max-w-4xl mx-auto mt-8 px-4">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {t("step4_review_title")}
                  </h2>
                  <p className="text-gray-600">{t("step4_review_desc")}</p>
                </div>

                {/* Basic information */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    {t("step4_basic_info_title")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-gray-700">
                        {t("step4_sale_type_label")}
                      </span>
                      <span className="ml-2 text-gray-900">
                        {formData.saleType === "sale" &&
                          t("step4_sale_type_sell")}
                        {formData.saleType === "rent" &&
                          t("step4_sale_type_rent")}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        {t("step4_property_type_label")}
                      </span>
                      <span className="ml-2 text-gray-900">
                        {getPropertyTypeLabel(formData.propertyType)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        {t("step4_is_project_label")}
                      </span>
                      <span className="ml-2 text-gray-900">
                        {formData.isProject
                          ? t("step4_is_project_yes")
                          : t("step4_is_project_no")}
                      </span>
                    </div>
                    {formData.saleType === "rent" && (
                      <div>
                        <span className="font-medium text-gray-700">
                          {t("step4_rental_period_label")}
                        </span>
                        <span className="ml-2 text-gray-900">
                          {formData.rentalPeriod === "3" &&
                            t("step4_rental_3_months")}
                          {formData.rentalPeriod === "6" &&
                            t("step4_rental_6_months")}
                          {formData.rentalPeriod === "9" &&
                            t("step4_rental_9_months")}
                          {formData.rentalPeriod === "12" &&
                            t("step4_rental_12_months")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Detail information */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    {t("step4_detail_info_title")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-gray-700">
                        {t("step4_project_name_label")}
                      </span>
                      <span className="ml-2 text-gray-900">
                        {formData.projectName}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        {t("step4_area_label")}
                      </span>
                      <span className="ml-2 text-gray-900">
                        {formData.area} {t("step4_area_unit")}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        {t("step4_price_label")}
                      </span>
                      <span className="ml-2 text-gray-900">
                        {Number(formData.price).toLocaleString()}{" "}
                        {t("step4_price_unit")}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        {t("step4_bedrooms_label")}
                      </span>
                      <span className="ml-2 text-gray-900">
                        {formData.bedrooms === "0"
                          ? t("step4_bedroom_studio")
                          : `${formData.bedrooms} ${t("step4_bedroom_rooms")}`}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        {t("step4_bathrooms_label")}
                      </span>
                      <span className="ml-2 text-gray-900">
                        {formData.bathrooms} {t("step4_bathroom_rooms")}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        {t("step4_parking_label")}
                      </span>
                      <span className="ml-2 text-gray-900">
                        {formData.parking === "0"
                          ? t("step4_parking_none")
                          : `${formData.parking} ${t("step4_parking_cars")}`}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        {t("step4_house_age_label")}
                      </span>
                      <span className="ml-2 text-gray-900">
                        {formData.houseAge === "0"
                          ? t("step4_house_age_new")
                          : `${formData.houseAge} ${t("step4_house_age_years")}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    {t("step4_address_info_title")}
                  </h3>
                  <div className="text-gray-900">
                    {formData.address ||
                      formData.selectedLocation.ที่อยู่ ||
                      t("step3_please_select_location")}
                  </div>
                  {(formData.selectedLocation.ละติจูด !== 0 ||
                    formData.selectedLocation.ลองจิจูด !== 0) && (
                    <div className="text-xs text-gray-500 mt-1">
                      {t("map_pick_coordinates_label")}{" "}
                      {formData.selectedLocation.ละติจูด.toFixed(6)},{" "}
                      {formData.selectedLocation.ลองจิจูด.toFixed(6)}
                    </div>
                  )}
                </div>

                {/* About property or project */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    {t("step4_description_info_title")}
                  </h3>
                  <div className="text-gray-900 whitespace-pre-wrap">
                    {formData.projectDescription || t("step4_not_specified")}
                  </div>
                </div>

                {/* Images */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    {t("step4_images_info_title")} (
                    {formData.images.filter(img => img !== null).length}{" "}
                    {t("step3_image_upload")})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.images.map((image, index) =>
                      image ? (
                        <div
                          key={index}
                          className="relative h-32 w-full flex items-center justify-center bg-gray-100 rounded border overflow-hidden"
                        >
                          {formData.imageUrls[index] ? (
                            <Image
                              src={formData.imageUrls[index]!}
                              alt={`Preview ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-sm text-gray-600">
                              {t("step3_image_upload")} {index + 1}
                            </span>
                          )}
                        </div>
                      ) : null
                    )}
                  </div>
                </div>

                {/* Back and publish buttons */}
                <div className="flex justify-between mt-8">
                  <button
                    onClick={() => handlePreviousStep()}
                    className="px-6 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {t("back")}
                  </button>
                  <button
                    onClick={() => handleSubmit(user)}
                    disabled={formData.isSubmitting}
                    className={`px-8 py-3 rounded-md transition-colors font-medium ${
                      formData.isSubmitting
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {formData.isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {t("step4_saving")}
                      </div>
                    ) : (
                      t("step4_publish_button")
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AddPropertyPage;
