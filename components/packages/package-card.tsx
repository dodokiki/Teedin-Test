"use client";

import { useLanguage } from "@/contexts/language-context";
import { Check, X } from "lucide-react";
import React from "react";

export interface ServiceCard {
  titleTh: string;
  titleEn: string;
  priceTh: string;
  priceEn: string;
  descriptionTh: string;
  descriptionEn: string;
  featuresTh: string[];
  featuresEn: string[];
  notIncludedTh?: string[];
  notIncludedEn?: string[];
  periodTh: string;
  periodEn: string;
  icon: React.ReactNode;
}

interface PricingCardProps {
  tier: ServiceCard;
  featured?: boolean;
  isCurrentPlan?: boolean; // Re-add this prop
  onPurchase?: (tier: ServiceCard) => void;
}

export const SERVICE_PACKAGES: ServiceCard[] = [
  {
    titleTh: "แพ็กลองใช้ 3 วัน",
    titleEn: "Trial Pack – 3 Days",
    priceTh: "69",
    priceEn: "69",
    descriptionTh: "เหมาะแค่ลองใช้ (เฉลี่ยวันละ 23 บาท)",
    descriptionEn: "Good for testing (Avg. 23 THB/day)",
    featuresTh: [
      "หมุดเด่น/เคลื่อนไหวบนแผนที่",
      "ดันประกาศอยู่บนสุดหน้าค้นหา",
      "กระจาย Card ทั่วเว็บเพิ่มการมองเห็น",
      "เหมาะสำหรับทดลองระบบ",
    ],
    featuresEn: [
      "Prominent/Animated Map Pin",
      "Top Ranking in Search",
      "Boosted Visibility Across Site",
      "Ideal for system testing",
    ],
    periodTh: "/ 3 วัน",
    periodEn: "/ 3 Days",
    notIncludedTh: ["ความคุ้มค่าระยะยาว", "ราคาเฉลี่ยต่อวันถูกที่สุด"],
    notIncludedEn: ["Long-term value", "Lowest daily rate"],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <path d="M20 12a8 8 0 1 0-8 8 8 8 0 0 0 8-8Z" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    titleTh: "แพ็กเริ่มจริงจัง 7 วัน",
    titleEn: "Getting Serious – 7 Days",
    priceTh: "99",
    priceEn: "99",
    descriptionTh: "คุ้มกว่า 3 วันเล็กน้อย (เฉลี่ยวันละ ~14 บาท)",
    descriptionEn: "Better value than 3 days (Avg. ~14 THB/day)",
    featuresTh: [
      "หมุดเด่น/เคลื่อนไหวบนแผนที่",
      "ดันประกาศอยู่บนสุดหน้าค้นหา",
      "กระจาย Card ทั่วเว็บเพิ่มการมองเห็น",
      "ประหยัดกว่าแพ็ก 3 วัน",
    ],
    featuresEn: [
      "Prominent/Animated Map Pin",
      "Top Ranking in Search",
      "Boosted Visibility Across Site",
      "Cheaper daily rate than 3-day",
    ],
    periodTh: "/ 7 วัน",
    periodEn: "/ 7 Days",
    notIncludedTh: ["ความคุ้มค่าระยะยาว"],
    notIncludedEn: ["Long-term value"],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    titleTh: "แพ็กต่อเนื่อง 15 วัน",
    titleEn: "Continuous – 15 Days",
    priceTh: "129",
    priceEn: "129",
    descriptionTh: "เริ่มเห็นผลชัดเจน (เฉลี่ยวันละ 8.6 บาท)",
    descriptionEn: "Clearer results (Avg. 8.6 THB/day)",
    featuresTh: [
      "หมุดเด่น/เคลื่อนไหวบนแผนที่",
      "ดันประกาศอยู่บนสุดหน้าค้นหา",
      "กระจาย Card ทั่วเว็บเพิ่มการมองเห็น",
      "ระยะเวลาพอเหมาะเพื่อดูผลลัพธ์",
    ],
    featuresEn: [
      "Prominent/Animated Map Pin",
      "Top Ranking in Search",
      "Boosted Visibility Across Site",
      "Good duration to see results",
    ],
    periodTh: "/ 15 วัน",
    periodEn: "/ 15 Days",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
        <path d="M17 14h-6" />
        <path d="M13 18H7" />
        <path d="M7 14h.01" />
        <path d="M17 18h.01" />
      </svg>
    ),
  },
  {
    titleTh: "แพ็กฮิต 30 วัน",
    titleEn: "Best Seller – 30 Days",
    priceTh: "199",
    priceEn: "199",
    descriptionTh: "ฮิตที่สุด / คุ้มสุด / คนเลือกเยอะสุด",
    descriptionEn: "Most Popular / Best Value",
    featuresTh: [
      "หมุดเด่น/เคลื่อนไหวบนแผนที่",
      "ดันประกาศอยู่บนสุดหน้าค้นหา",
      "กระจาย Card ทั่วเว็บเพิ่มการมองเห็น",
      "ราคาเฉลี่ยต่อวันสุดคุ้ม (6.6 บาท)",
      "เพิ่มโอกาสปิดการขายสูงสุด",
    ],
    featuresEn: [
      "Prominent/Animated Map Pin",
      "Top Ranking in Search",
      "Boosted Visibility Across Site",
      "Great daily value (6.6 THB)",
      "Highest sales opportunity",
    ],
    periodTh: "/ 30 วัน",
    periodEn: "/ 30 Days",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.2-2.2.6-3.3.7-1.9 2.5-3.2 4.4-3.2 1.5 0 2.5.8 2.5 2.5z" />
      </svg>
    ),
  },
  {
    titleTh: "แพ็กคุ้มสุด 45 วัน",
    titleEn: "Max Value – 45 Days",
    priceTh: "250",
    priceEn: "250",
    descriptionTh: "เฉลี่ยวันละ 5.5 บาทเท่านั้น",
    descriptionEn: "Only ~5.5 THB per day",
    featuresTh: [
      "หมุดเด่น/เคลื่อนไหวบนแผนที่",
      "ดันประกาศอยู่บนสุดหน้าค้นหา",
      "กระจาย Card ทั่วเว็บเพิ่มการมองเห็น",
      "ราคาต่อวันถูกที่สุดในทุกแพ็ก",
      "อยู่ยาว 45 วัน ไม่ต้องเติมบ่อย",
    ],
    featuresEn: [
      "Prominent/Animated Map Pin",
      "Top Ranking in Search",
      "Boosted Visibility Across Site",
      "Lowest daily rate of all packs",
      "Long 45-day duration",
    ],
    periodTh: "/ 45 วัน",
    periodEn: "/ 45 Days",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
];

export function PricingCard({
  tier,
  featured,
  isCurrentPlan, // Re-add this prop
  onPurchase,
}: PricingCardProps) {
  const { language } = useLanguage();
  const isEn = language === "en";

  const title = isEn ? tier.titleEn : tier.titleTh;
  const price = isEn ? tier.priceEn : tier.priceTh;
  const description = isEn ? tier.descriptionEn : tier.descriptionTh;
  const features = isEn ? tier.featuresEn : tier.featuresTh;
  const notIncluded = isEn ? tier.notIncludedEn : tier.notIncludedTh;

  const ctaLabel = isCurrentPlan // Conditional CTA label
    ? isEn
      ? "Current Plan"
      : "แพ็กเกจปัจจุบัน"
    : isEn
      ? "Purchase Now"
      : "ซื้อเลย";
  const period = isEn ? tier.periodEn : tier.periodTh;
  const keyFeaturesLabel = isEn ? "Key Features:" : "ฟีเจอร์หลัก:";
  const currency = "฿";

  return (
    <div
      className={`relative flex flex-col h-full rounded-3xl p-6 transition-all duration-300 ${isCurrentPlan
        ? "bg-white ring-2 ring-blue-500/20 shadow-2xl scale-105 z-20 relative overflow-hidden"
        : featured
          ? "z-10 bg-white shadow-[0_30px_60px_-12px_rgba(29,78,216,0.25)] border-2 border-b-[8px] border-blue-100 scale-105 xl:scale-110 -translate-y-3"
          : "bg-white shadow-lg border border-slate-100 hover:shadow-xl hover:-translate-y-1"
        }`}
    >
      {/* Premium Background Gradient for Current Plan */}
      {isCurrentPlan && (
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute top-0 right-0 z-20">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-600 blur-sm opacity-20 rounded-bl-2xl" />
            <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl shadow-sm flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              {isEn ? "Current Plan" : "แพ็กเกจปัจจุบัน"}
            </div>
          </div>
        </div>
      )}

      {/* Most Popular Badge (Only if not current plan) */}
      {!isCurrentPlan && featured && (
        <div className="absolute top-0 right-0 z-20">
          <div className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-bl-2xl rounded-tr-2xl shadow-sm">
            {isEn ? "Most Popular" : "ยอดนิยม"}
          </div>
        </div>
      )}

      {/* Header: Title & Description (No Icon as per request) */}
      <div className="mb-6 mt-2">
        <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 min-h-[40px] leading-relaxed">
          {description}
        </p>
      </div>

      {/* Price Section */}
      <div className="mb-8 relative">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-slate-900">
            {currency}
            {price}
          </span>
          <span className="text-sm font-medium text-slate-500 ml-1">
            {period}
          </span>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => !isCurrentPlan && onPurchase?.(tier)}
        disabled={isCurrentPlan}
        className={`w-full rounded-xl py-3 text-sm font-bold transition-all duration-200 relative mb-8 active:scale-[0.98] ${isCurrentPlan
            ? "bg-blue-50 text-blue-700 cursor-default border border-blue-100"
            : featured
              ? "bg-slate-900 text-white shadow-lg hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5"
              : "bg-slate-100 text-slate-900 hover:bg-slate-200"
          }`}
      >
        <div className="flex items-center justify-center gap-2">
          {isCurrentPlan ? (
            <>
              <Check className="h-4 w-4" />
              <span>{isEn ? "Active" : "กำลังใช้งาน"}</span>
            </>
          ) : (
            <span>{ctaLabel}</span>
          )}
        </div>
      </button>

      {/* Features List with Divider */}
      <div className="flex-1 border-t border-slate-100 pt-6">
        <div className="mb-4 text-base font-bold text-slate-900">
          {keyFeaturesLabel}
        </div>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li
              key={index}
              className="flex items-start gap-3 text-sm text-slate-600"
            >
              <div className="mt-0.5 shrink-0 text-slate-700">
                <Check className="h-4 w-4" strokeWidth={2} />
              </div>
              <span className="leading-tight">
                {feature}
              </span>
            </li>
          ))}
          {notIncluded?.map((feature, index) => (
            <li
              key={`not-${index}`}
              className="flex items-start gap-3 text-sm text-slate-400"
            >
              <X
                className="h-4 w-4 shrink-0 text-slate-300"
                strokeWidth={2}
              />
              <span className="line-through decoration-slate-300 leading-tight">
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
