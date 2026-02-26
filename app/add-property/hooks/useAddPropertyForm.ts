import type { TranslateEntry, TranslationResult } from "@/lib/ai/translator";
import type { LocalizedValue } from "@/lib/localization";
import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { TRANSLATION_KEYS } from "../constants";
import {
  convertMultipleToWebP,
  getOptimalQuality,
} from "../utils/image-converter";
import {
  validateStep2,
  validateStep3,
  validateStep4,
} from "../utils/validation";

const buildBulletString = (items: string[]): string =>
  items
    .map(item => item?.trim())
    .filter(Boolean)
    .map(item => `• ${item}`)
    .join("\n");

const buildFacilitiesList = (amenities: FormData["amenities"]): string[] => {
  const list: string[] = [];
  if (amenities.aircon) {
    list.push(`แอร์: ${amenities.aircon}`);
  }
  if (amenities.kitchen) {
    list.push(`ครัว: ${amenities.kitchen}`);
  }
  if (amenities.additional) {
    list.push(amenities.additional);
  }
  return list;
};

const buildProjectFacilitiesList = (
  projectAmenities: FormData["projectAmenities"]
): string[] => {
  const list: string[] = [];
  if (projectAmenities.security) {
    list.push(projectAmenities.security);
  }
  if (projectAmenities.garden) {
    list.push(projectAmenities.garden);
  }
  if (projectAmenities.additional) {
    list.push(projectAmenities.additional);
  }
  return list;
};

const buildHighlightSummary = (
  highlightsType: FormData["highlightsType"],
  highlightsCustom: FormData["highlightsCustom"],
  highlightsArea: string,
  highlightsSurrounding: string
): string => {
  const features = [...(highlightsType ?? []), ...(highlightsCustom ?? [])]
    .map(item => item?.trim())
    .filter(Boolean);

  const sections: string[] = [];

  if (features.length > 0) {
    sections.push("จุดเด่นโครงการ:\n" + buildBulletString(features));
  }

  const areaTexts = [highlightsArea, highlightsSurrounding]
    .map(text => text?.trim())
    .filter(Boolean);

  if (areaTexts.length > 0) {
    sections.push("พื้นที่รอบโครงการ:\n" + areaTexts.join("\n"));
  }

  return sections.join("\n\n").trim();
};

const buildAreaAroundText = (
  highlightsArea: string,
  highlightsSurrounding: string
): string =>
  [highlightsArea, highlightsSurrounding]
    .map(text => text?.trim())
    .filter(Boolean)
    .join("\n");

const buildTranslationEntries = (form: FormData): TranslateEntry[] => {
  const entries: TranslateEntry[] = [];

  if (form.projectName?.trim()) {
    entries.push({
      key: TRANSLATION_KEYS.projectName,
      text: form.projectName.trim(),
    });
  }

  const addressText =
    form.address?.trim() || form.selectedLocation?.ที่อยู่ || "";
  if (addressText.trim()) {
    entries.push({
      key: TRANSLATION_KEYS.address,
      text: addressText.trim(),
    });
  }

  if (form.projectDescription?.trim()) {
    entries.push({
      key: TRANSLATION_KEYS.description,
      text: form.projectDescription.trim(),
      html: false,
    });
  }

  const highlightSummary = buildHighlightSummary(
    form.highlightsType,
    form.highlightsCustom,
    form.highlightsArea,
    form.highlightsSurrounding
  );
  if (highlightSummary) {
    entries.push({
      key: TRANSLATION_KEYS.highlight,
      text: highlightSummary,
      html: true,
      context: "Summarize property highlights. Preserve bullet formatting.",
    });
  }

  const areaAroundText = buildAreaAroundText(
    form.highlightsArea,
    form.highlightsSurrounding
  );
  if (areaAroundText) {
    entries.push({
      key: TRANSLATION_KEYS.areaAround,
      text: areaAroundText,
      context:
        "Describe the surrounding area and nearby amenities. Each sentence on a new line.",
    });
  }

  if (form.houseAge && form.houseAge.trim() && form.houseAge !== "0") {
    // Extract only the number from houseAge (in case it contains text)
    const ageNumber =
      form.houseAge.trim().replace(/\D/g, "") || form.houseAge.trim();
    entries.push({
      key: TRANSLATION_KEYS.houseCondition,
      text: `สภาพบ้าน: อายุ ${ageNumber} ปี`,
      context:
        "Extract only the numeric age value. Do not include any text like 'years' or 'ปี' in the translation.",
    });
  }

  const facilitiesList = buildFacilitiesList(form.amenities);
  if (facilitiesList.length > 0) {
    entries.push({
      key: TRANSLATION_KEYS.facilities,
      text: buildBulletString(facilitiesList),
      context:
        "Each bullet represents an in-unit facility. Keep one facility per line.",
    });
  }

  const projectFacilitiesList = buildProjectFacilitiesList(
    form.projectAmenities
  );
  if (projectFacilitiesList.length > 0) {
    entries.push({
      key: TRANSLATION_KEYS.projectFacilities,
      text: buildBulletString(projectFacilitiesList),
      context:
        "Each bullet represents a project/common facility. Keep one facility per line.",
    });
  }

  return entries;
};

export interface FormData {
  currentStep: number;
  projectName: string;
  address: string;
  projectDescription: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  parking: string;
  houseAge: string;
  highlights: string;
  highlightsType: string[];
  highlightsCustom: string[];
  facilities: string;
  price: string;
  amenities: {
    aircon: string;
    kitchen: string;
    additional: string;
  };
  projectAmenities: {
    security: string;
    garden: string;
    additional: string;
  };
  propertyType: string;
  saleType: string;
  isProject: boolean;
  rentalPeriod: string;
  projectLocation: string;
  selectedLocation: {
    ที่อยู่: string;
    ละติจูด: number;
    ลองจิจูด: number;
  };
  highlightsArea: string;
  highlightsSurrounding: string;
  images: (File | null)[];
  imageUrls: (string | null)[];
  errors: { [key: string]: string };
  showSuccessModal: boolean;
  showAgentAlert: boolean;
  showAgentRegisterBar: boolean;

  isDataLoaded: boolean;
  showDataRestoredMessage: boolean;
  langDropdownOpen: boolean;
  propertyTypeDropdownOpen: boolean;
  rentalPeriodDropdownOpen: boolean;
  selectedLang: string;
  isSubmitting: boolean;
  localizedPreview: Record<string, LocalizedValue<string>>;
  translationStatus: "idle" | "loading" | "ready" | "error";
  translationError?: string;
}

const initialFormData: FormData = {
  currentStep: 1,
  projectName: "",
  address: "",
  projectDescription: "",
  area: "",
  bedrooms: "",
  bathrooms: "",
  parking: "",
  houseAge: "",
  highlights: "",
  highlightsType: [],
  highlightsCustom: [],
  facilities: "",
  price: "",
  amenities: {
    aircon: "",
    kitchen: "",
    additional: "",
  },
  projectAmenities: {
    security: "",
    garden: "",
    additional: "",
  },
  propertyType: "บ้านเดี่ยว",
  saleType: "",
  isProject: false,
  rentalPeriod: "3",
  projectLocation: "",
  selectedLocation: {
    ที่อยู่: "",
    ละติจูด: 0,
    ลองจิจูด: 0,
  },
  highlightsArea: "",
  highlightsSurrounding: "",
  images: new Array(6).fill(null),
  imageUrls: new Array(6).fill(null),
  errors: {},
  showSuccessModal: false,
  showAgentAlert: false,
  showAgentRegisterBar: false,

  isDataLoaded: false,
  showDataRestoredMessage: false,
  langDropdownOpen: false,
  propertyTypeDropdownOpen: false,
  rentalPeriodDropdownOpen: false,
  selectedLang: "ภาษาไทย",
  isSubmitting: false,
  localizedPreview: {},
  translationStatus: "idle",
  translationError: undefined,
};

export function useAddPropertyForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const translationSignatureRef = useRef<string>("");

  // โหลดข้อมูลจาก localStorage เมื่อ component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedData = localStorage.getItem("addPropertyFormData");
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);

          console.log("Loading from localStorage:", {
            currentStep: parsedData.currentStep || 1,
          });

          // โหลดเฉพาะข้อมูลที่ปลอดภัยจาก localStorage
          const safeDataToRestore = {
            currentStep: 1, // Always start at step 1 to avoid confusion
            projectName: parsedData.projectName || "",
            address: parsedData.address || "",
            projectDescription: parsedData.projectDescription || "",
            area: parsedData.area || "",
            bedrooms: parsedData.bedrooms || "",
            bathrooms: parsedData.bathrooms || "",
            parking: parsedData.parking || "",
            houseAge: parsedData.houseAge || "",
            highlights: parsedData.highlights || "",
            highlightsType: parsedData.highlightsType || [],
            highlightsCustom: parsedData.highlightsCustom || [],
            facilities: parsedData.facilities || "",
            price: parsedData.price || "",
            amenities: parsedData.amenities || {
              aircon: "",
              kitchen: "",
              additional: "",
            },
            projectAmenities: parsedData.projectAmenities || {
              security: "",
              garden: "",
              additional: "",
            },
            propertyType: parsedData.propertyType || "บ้านเดี่ยว",
            saleType: parsedData.saleType || "",
            isProject: parsedData.isProject || false,
            rentalPeriod: parsedData.rentalPeriod || "3",
            projectLocation: parsedData.projectLocation || "",
            highlightsArea: parsedData.highlightsArea || "",
            highlightsSurrounding: parsedData.highlightsSurrounding || "",
            // Restore selectedLocation if available, otherwise default
            selectedLocation: parsedData.selectedLocation || {
              ที่อยู่: "",
              ละติจูด: 0,
              ลองจิจูด: 0,
            },
            // เก็บข้อมูล sensitive ไว้เป็นค่าเริ่มต้น (ไม่ override จาก localStorage)
            images: new Array(6).fill(null),
            imageUrls: new Array(6).fill(null),
            errors: {},
            showSuccessModal: false,
            showAgentAlert: false,

            isDataLoaded: true,
            showDataRestoredMessage: false,
            langDropdownOpen: false,
            propertyTypeDropdownOpen: false,
            rentalPeriodDropdownOpen: false,
            selectedLang: "ภาษาไทย",
            isSubmitting: false,
          };

          setFormData(prev => ({
            ...prev,
            ...safeDataToRestore,
          }));
        } catch (error) {
          console.error("Error parsing saved form data:", error);
          setFormData(prev => ({ ...prev, isDataLoaded: true }));
        }
      } else {
        setFormData(prev => ({ ...prev, isDataLoaded: true }));
      }
    }
  }, []);

  // บันทึกข้อมูลไปยัง localStorage เมื่อ formData เปลี่ยน
  useEffect(() => {
    if (typeof window !== "undefined" && formData.isDataLoaded) {
      // ข้อมูลที่ปลอดภัยที่จะบันทึกใน localStorage
      const safeDataToSave = {
        currentStep: formData.currentStep,
        projectName: formData.projectName,
        address: formData.address,
        projectDescription: formData.projectDescription,
        area: formData.area,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        parking: formData.parking,
        houseAge: formData.houseAge,
        highlights: formData.highlights,
        highlightsType: formData.highlightsType,
        highlightsCustom: formData.highlightsCustom,
        facilities: formData.facilities,
        price: formData.price,
        amenities: formData.amenities,
        projectAmenities: formData.projectAmenities,
        propertyType: formData.propertyType,
        saleType: formData.saleType,
        isProject: formData.isProject,
        rentalPeriod: formData.rentalPeriod,
        projectLocation: formData.projectLocation,
        highlightsArea: formData.highlightsArea,
        highlightsSurrounding: formData.highlightsSurrounding,
        selectedLocation: formData.selectedLocation, // Save location data
        // ไม่บันทึกข้อมูล sensitive เหล่านี้:
        // - images (ไฟล์รูปภาพ)
        // - imageUrls (URLs ของรูปภาพ)
        // - errors
        // - showSuccessModal
        // - showAgentAlert
        // - showAgentRegister
        // - isDataLoaded
        // - showDataRestoredMessage
        // - langDropdownOpen
        // - propertyTypeDropdownOpen
        // - rentalPeriodDropdownOpen
        // - selectedLang
        // - isSubmitting
      };

      console.log("Saving to localStorage:", {
        currentStep: formData.currentStep,
      });
      localStorage.setItem(
        "addPropertyFormData",
        JSON.stringify(safeDataToSave)
      );
    }
  }, [
    formData.currentStep,
    formData.projectName,
    formData.address,
    formData.projectDescription,
    formData.area,
    formData.bedrooms,
    formData.bathrooms,
    formData.parking,
    formData.houseAge,
    formData.highlights,
    formData.highlightsType,
    formData.highlightsCustom,
    formData.facilities,
    formData.price,
    formData.amenities,
    formData.projectAmenities,
    formData.propertyType,
    formData.saleType,
    formData.isProject,
    formData.rentalPeriod,
    formData.projectLocation,
    formData.highlightsArea,
    formData.highlightsSurrounding,
    formData.selectedLocation,
    formData.isDataLoaded,
  ]);

  useEffect(() => {
    const signature = JSON.stringify({
      projectName: formData.projectName,
      address: formData.address,
      selectedAddress: formData.selectedLocation?.ที่อยู่,
      projectDescription: formData.projectDescription,
      highlightsType: formData.highlightsType,
      highlightsCustom: formData.highlightsCustom,
      highlightsArea: formData.highlightsArea,
      highlightsSurrounding: formData.highlightsSurrounding,
      houseAge: formData.houseAge,
      amenities: formData.amenities,
      projectAmenities: formData.projectAmenities,
    });

    if (
      translationSignatureRef.current &&
      translationSignatureRef.current !== signature
    ) {
      setFormData(prev => ({
        ...prev,
        translationStatus:
          prev.currentStep === 4 ? "idle" : prev.translationStatus,
      }));
    }

    translationSignatureRef.current = signature;
  }, [
    formData.projectName,
    formData.address,
    formData.selectedLocation,
    formData.projectDescription,
    formData.highlightsType,
    formData.highlightsCustom,
    formData.highlightsArea,
    formData.highlightsSurrounding,
    formData.houseAge,
    formData.amenities,
    formData.projectAmenities,
  ]);

  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const translateWithAI = useCallback(async (): Promise<TranslationResult> => {
    const entries = buildTranslationEntries(formData);

    if (entries.length === 0) {
      updateFormData({
        localizedPreview: {},
        translationStatus: "ready",
        translationError: undefined,
      });
      return { success: true, data: {}, notes: "No translatable fields" };
    }

    updateFormData({
      translationStatus: "loading",
      translationError: undefined,
    });

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entries }),
      });

      const result = (await response.json()) as TranslationResult & {
        error?: string;
      };

      if (!response.ok || !result.success) {
        const message = result.error || "Translation request failed";
        updateFormData({
          translationStatus: "error",
          translationError: message,
        });
        return {
          success: false,
          data: {},
          notes: message,
        };
      }

      updateFormData({
        localizedPreview: result.data,
        translationStatus: "ready",
        translationError: undefined,
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected translation error";
      updateFormData({
        translationStatus: "error",
        translationError: message,
      });
      return {
        success: false,
        data: {},
        notes: message,
      };
    }
  }, [formData, updateFormData]);

  useEffect(() => {
    if (formData.currentStep === 4 && formData.translationStatus === "idle") {
      translateWithAI();
    }
  }, [formData.currentStep, formData.translationStatus, translateWithAI]);

  const updateNestedField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const updateError = useCallback(
    (fieldName: string, error: string | undefined) => {
      setFormData(prev => ({
        ...prev,
        errors: error
          ? { ...prev.errors, [fieldName]: error }
          : Object.fromEntries(
              Object.entries(prev.errors).filter(([key]) => key !== fieldName)
            ),
      }));
    },
    []
  );

  const clearError = useCallback(
    (fieldName: string) => {
      updateError(fieldName, undefined);
    },
    [updateError]
  );

  const setCurrentStep = useCallback(
    (step: number) => {
      updateFormData({ currentStep: step });
    },
    [updateFormData]
  );

  const nextStep = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 4),
    }));
  }, []);

  const previousStep = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
  }, []);

  const clearFormData = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("addPropertyFormData");
    }
  }, []);

  const handleConfirmPublish = useCallback(() => {
    updateFormData({ showSuccessModal: true });
  }, [updateFormData]);

  const handleSubmit = useCallback(
    async (user: User | null) => {
      console.log("=== handleSubmit called ===");
      console.log(
        "User parameter:",
        user ? { id: user.id, email: user.email } : null
      );
      console.log("FormData address:", formData.address);
      console.log("FormData selectedLocation:", formData.selectedLocation);

      console.log("Starting handleSubmit with formData:", {
        saleType: formData.saleType,
        propertyType: formData.propertyType,
        projectLocation: formData.projectLocation,
        selectedLocation: formData.selectedLocation,
        rentalPeriod: formData.rentalPeriod,
        projectName: formData.projectName,
        address: formData.address,
        area: formData.area,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        parking: formData.parking,
        highlightsType: formData.highlightsType,
        price: formData.price,
        images: formData.images
          ? formData.images.filter(img => img !== null).length
          : 0,
        isProject: formData.isProject,
        houseAge: formData.houseAge,
        projectDescription: formData.projectDescription,
        highlightsArea: formData.highlightsArea,
        highlightsSurrounding: formData.highlightsSurrounding,
        amenities: formData.amenities,
        projectAmenities: formData.projectAmenities,
      });

      const step2Errors = validateStep2(
        formData.saleType,
        formData.propertyType,
        formData.projectLocation,
        formData.selectedLocation,
        formData.rentalPeriod
      );
      const step3Errors = validateStep3(
        formData.projectName,
        formData.address,
        formData.area,
        formData.bedrooms,
        formData.bathrooms,
        formData.parking,
        formData.highlightsType,
        formData.price,
        formData.images,
        formData.selectedLocation, // เพิ่ม selectedLocation parameter
        formData.projectDescription // เพิ่ม projectDescription parameter
      );

      console.log("Validation results:", { step2Errors, step3Errors });

      if (!validateStep4(step2Errors, step3Errors)) {
        const allErrors = { ...step2Errors, ...step3Errors };
        const firstError = Object.values(allErrors)[0];
        alert(`กรุณาตรวจสอบข้อมูล: ${firstError}`);
        return;
      }

      // Show loading state
      updateFormData({ showSuccessModal: false, isSubmitting: true });

      try {
        const translationResult = await translateWithAI();

        if (!translationResult.success) {
          updateFormData({ isSubmitting: false });
          alert(
            "ไม่สามารถสร้างคำแปลอัตโนมัติได้ กรุณาลองใหม่อีกครั้งหรือแก้ไขข้อความ"
          );
          return;
        }

        const addressText =
          formData.address?.trim() || formData.selectedLocation.ที่อยู่ || "";
        const highlightSummary = buildHighlightSummary(
          formData.highlightsType,
          formData.highlightsCustom,
          formData.highlightsArea,
          formData.highlightsSurrounding
        );
        const areaAroundText = buildAreaAroundText(
          formData.highlightsArea,
          formData.highlightsSurrounding
        );
        const facilitiesList = buildFacilitiesList(formData.amenities);
        const projectFacilitiesList = buildProjectFacilitiesList(
          formData.projectAmenities
        );

        // Normalize values to Thai before submitting to backend
        const SALE_TYPE_THAI: Record<string, string> = {
          sale: "ขาย",
          rent: "เช่า",
          both: "ขายและเช่า",
        };

        // Map both Thai and English labels to Thai to ensure consistency
        const HIGHLIGHT_THAI_BY_LABEL: Record<string, string> = {
          // Near BTS
          ใกล้รถไฟฟ้า: "ใกล้รถไฟฟ้า",
          "Near BTS": "ใกล้รถไฟฟ้า",
          // Near highway
          ใกล้ทางด่วน: "ใกล้ทางด่วน",
          "Near highway": "ใกล้ทางด่วน",
          // Nice view
          วิวสวย: "วิวสวย",
          "Nice view": "วิวสวย",
        };

        const saleTypeThai =
          SALE_TYPE_THAI[formData.saleType] || formData.saleType;
        const highlightsTypeThaiArray = (formData.highlightsType || []).map(
          label => HIGHLIGHT_THAI_BY_LABEL[label] || label
        );

        const formDataToSubmit = new FormData();
        formDataToSubmit.append("saleType", saleTypeThai);
        formDataToSubmit.append("propertyType", formData.propertyType);
        formDataToSubmit.append(
          "isProject",
          formData.isProject ? "true" : "false"
        );
        formDataToSubmit.append("rentalPeriod", formData.rentalPeriod);
        formDataToSubmit.append("projectLocation", formData.projectLocation);
        formDataToSubmit.append("projectName", formData.projectName);
        formDataToSubmit.append("address", addressText);
        formDataToSubmit.append("area", formData.area);
        formDataToSubmit.append("bedrooms", formData.bedrooms);
        formDataToSubmit.append("bathrooms", formData.bathrooms);
        formDataToSubmit.append("parking", formData.parking);
        // Extract only numbers from houseAge before submitting
        const houseAgeNumber =
          formData.houseAge.trim().replace(/\D/g, "") ||
          formData.houseAge.trim();
        formDataToSubmit.append("houseAge", houseAgeNumber);
        formDataToSubmit.append(
          "projectDescription",
          formData.projectDescription
        );
        formDataToSubmit.append(
          "highlightsType",
          highlightsTypeThaiArray.join(", ")
        );
        formDataToSubmit.append("highlightsArea", formData.highlightsArea);
        formDataToSubmit.append(
          "highlightsSurrounding",
          formData.highlightsSurrounding
        );
        formDataToSubmit.append("price", formData.price);
        formDataToSubmit.append("agent_id", user?.id || "");
        formDataToSubmit.append(
          "selectedLocation",
          JSON.stringify(formData.selectedLocation)
        );
        formDataToSubmit.append(
          "amenities",
          JSON.stringify(formData.amenities)
        );
        formDataToSubmit.append(
          "projectAmenities",
          JSON.stringify(formData.projectAmenities)
        );

        formDataToSubmit.append(
          "localizedPayload",
          JSON.stringify({
            localized: translationResult.data,
            source: {
              [TRANSLATION_KEYS.projectName]: formData.projectName,
              [TRANSLATION_KEYS.address]: addressText,
              [TRANSLATION_KEYS.description]: formData.projectDescription,
              [TRANSLATION_KEYS.highlight]: highlightSummary,
              [TRANSLATION_KEYS.areaAround]: areaAroundText,
              [TRANSLATION_KEYS.houseCondition]:
                formData.houseAge.trim().replace(/\D/g, "") ||
                formData.houseAge.trim(),
              [TRANSLATION_KEYS.facilities]: facilitiesList,
              [TRANSLATION_KEYS.projectFacilities]: projectFacilitiesList,
            },
          })
        );

        console.log("=== DEBUG: FormData to submit ===");
        console.log("saleType:", formDataToSubmit.get("saleType"));
        console.log("propertyType:", formDataToSubmit.get("propertyType"));
        console.log("Original formData.saleType:", formData.saleType);
        console.log("saleTypeThai:", saleTypeThai);
        console.log("Full FormData contents:", {
          saleType: formDataToSubmit.get("saleType"),
          propertyType: formDataToSubmit.get("propertyType"),
          isProject: formDataToSubmit.get("isProject"),
          rentalPeriod: formDataToSubmit.get("rentalPeriod"),
          projectLocation: formDataToSubmit.get("projectLocation"),
          projectName: formDataToSubmit.get("projectName"),
          address: formDataToSubmit.get("address"),
          area: formDataToSubmit.get("area"),
          bedrooms: formDataToSubmit.get("bedrooms"),
          bathrooms: formDataToSubmit.get("bathrooms"),
          parking: formDataToSubmit.get("parking"),
          houseAge: formDataToSubmit.get("houseAge"),
          projectDescription: formDataToSubmit.get("projectDescription"),
          highlightsType: formDataToSubmit.get("highlightsType"),
          highlightsArea: formDataToSubmit.get("highlightsArea"),
          highlightsSurrounding: formDataToSubmit.get("highlightsSurrounding"),
          price: formDataToSubmit.get("price"),
          agent_id: formDataToSubmit.get("agent_id"),
          selectedLocation: formDataToSubmit.get("selectedLocation"),
          amenities: formDataToSubmit.get("amenities"),
          projectAmenities: formDataToSubmit.get("projectAmenities"),
          imagesCount: formDataToSubmit.getAll("images")
            ? formDataToSubmit.getAll("images").length
            : 0,
        });

        // Add images
        formData.images.forEach(file => {
          if (file) formDataToSubmit.append("images", file);
        });

        // ส่งไป backend
        const res = await fetch("/api/properties/create", {
          method: "POST",
          body: formDataToSubmit,
        });

        // Check if response is JSON
        const contentType = res.headers.get("content-type");
        let data;
        if (contentType && contentType.indexOf("application/json") !== -1) {
          data = await res.json();
        } else {
          // If not JSON, get text response
          const text = await res.text();
          console.error("Non-JSON response:", text);
          data = { error: "เซิร์ฟเวอร์ตอบกลับในรูปแบบที่ไม่ถูกต้อง" };
        }

        if (!res.ok) {
          alert(data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
          updateFormData({ isSubmitting: false });
          return;
        }

        // ล้างข้อมูลใน localStorage เมื่อ submit สำเร็จ
        clearFormData();
        updateFormData({ showSuccessModal: true, isSubmitting: false });
      } catch (error) {
        console.error("Error submitting form:", error);
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
      }
    },
    [
      clearFormData,
      formData.address,
      formData.amenities,
      formData.area,
      formData.bathrooms,
      formData.bedrooms,
      formData.highlightsArea,
      formData.highlightsSurrounding,
      formData.highlightsType,
      formData.houseAge,
      formData.images,
      formData.isProject,
      formData.parking,
      formData.price,
      formData.projectAmenities,
      formData.projectDescription,
      formData.projectLocation,
      formData.projectName,
      formData.propertyType,
      formData.rentalPeriod,
      formData.saleType,
      formData.selectedLocation,
      updateFormData,
    ]
  );

  const handleAddImage = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
      if (event.target.files && event.target.files.length > 0) {
        const files = Array.from(event.target.files);

        try {
          // แปลงรูปภาพเป็น WebP
          const webpFiles = await convertMultipleToWebP(files, {
            quality: getOptimalQuality(files[0]?.size || 0),
            maxWidth: 1920, // จำกัดความกว้างสูงสุด
            maxHeight: 1080, // จำกัดความสูงสูงสุด
          });

          // ถ้ามี 1 รูป ให้ใส่เฉพาะช่องที่คลิก
          if (webpFiles && webpFiles.length === 1) {
            const file = webpFiles[0];
            const url = URL.createObjectURL(file);

            const newImages = [...formData.images];
            newImages[index] = file;
            updateFormData({ images: newImages });

            const newImageUrls = [...formData.imageUrls];
            newImageUrls[index] = url;
            updateFormData({ imageUrls: newImageUrls });
          }
          // ถ้ามีหลายรูป ให้ใส่ให้ครบทั้ง 6 ช่อง
          else {
            const newImages = [...formData.images];
            const newImageUrls = [...formData.imageUrls];

            // ใส่รูปภาพให้ครบ 6 ช่อง หรือจนกว่ารูปจะหมด
            webpFiles.slice(0, 6).forEach((file, idx) => {
              const url = URL.createObjectURL(file);
              newImages[idx] = file;
              newImageUrls[idx] = url;
            });

            updateFormData({
              images: newImages,
              imageUrls: newImageUrls,
            });
          }

          // ล้าง error ของรูปภาพเมื่อผู้ใช้เพิ่มรูป
          clearError("images");
        } catch (error) {
          console.error("Error converting images to WebP:", error);
          // ถ้าแปลงไม่สำเร็จ ให้ใช้ไฟล์เดิม
          const files = Array.from(event.target.files);

          if (files && files.length === 1) {
            const file = files[0];
            const url = URL.createObjectURL(file);

            const newImages = [...formData.images];
            newImages[index] = file;
            updateFormData({ images: newImages });

            const newImageUrls = [...formData.imageUrls];
            newImageUrls[index] = url;
            updateFormData({ imageUrls: newImageUrls });
          } else {
            const newImages = [...formData.images];
            const newImageUrls = [...formData.imageUrls];

            files.slice(0, 6).forEach((file, idx) => {
              const url = URL.createObjectURL(file);
              newImages[idx] = file;
              newImageUrls[idx] = url;
            });

            updateFormData({
              images: newImages,
              imageUrls: newImageUrls,
            });
          }

          clearError("images");
        }
      }
    },
    [formData.images, formData.imageUrls, updateFormData, clearError]
  );

  const handleRemoveImage = useCallback(
    (index: number) => {
      const newImages = [...formData.images];
      const newImageUrls = [...formData.imageUrls];

      if (newImageUrls[index]) {
        URL.revokeObjectURL(newImageUrls[index]!);
      }

      newImages[index] = null;
      newImageUrls[index] = null;

      updateFormData({
        images: newImages,
        imageUrls: newImageUrls,
      });
    },
    [formData.imageUrls, formData.images, updateFormData]
  );

  const setStep = useCallback((step: number) => {
    const clampedStep = Math.max(1, Math.min(step, 4));
    setFormData(prev => ({ ...prev, currentStep: clampedStep }));
  }, []);

  return {
    formData,
    updateFormData,
    updateNestedField,
    updateError,
    clearError,
    setCurrentStep,
    nextStep,
    previousStep,
    resetForm,
    clearFormData,
    handleConfirmPublish,
    handleSubmit,
    handleAddImage,
    handleRemoveImage,
    setStep,
    validateStep2,
    validateStep3,
    validateStep4,
    translateWithAI,
  };
}
