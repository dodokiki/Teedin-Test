"use client";
import { HeroSection } from "@/components/layout/hero-section";
import type { PropertyData } from "@/components/property/property-card";
import { PropertySection } from "@/components/property/property-section";
import { useLanguage } from "@/contexts/language-context";
import { useProperty } from "@/contexts/property-context";

import dynamic from "next/dynamic";
import { Suspense, memo, useState } from "react";

import { loadChunkWithRetry } from "@/lib/dynamic-chunk-retry";
import Link from "next/link";

// ✅ ใช้ dynamic import เพื่อ code splitting และ lazy loading

const PopularLocations = dynamic(
  () =>
    loadChunkWithRetry(() =>
      import("@/components/layout/popular-locations").then(mod => ({
        default: mod.PopularLocations,
      }))
    ),
  {
    loading: () => (
      <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />
    ),
    ssr: false, // ✅ ปิด SSR สำหรับ component นี้เพื่อลด initial load
  }
);

const LoadingSpinner = memo(() => (
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 text-center font-sukhumvit">
    <div className="max-w-md mx-auto">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <HomeLoadingText />
    </div>
  </div>
));

LoadingSpinner.displayName = "LoadingSpinner";

// ✅ Property Sections Container
const PropertySectionsContainer = memo(
  ({
    homeNewProperties,
    homeRentalProperties,
    homeSaleProperties,
    titles,
    t,
  }: {
    homeNewProperties: PropertyData[];
    homeRentalProperties: PropertyData[];
    homeSaleProperties: PropertyData[];
    titles: {
      newProperties: string;
      rental: string;
      sale: string;
      saleRent: string;
      popular: string;
    };
    t: (key: string) => string;
  }) => (
    <>
      {/* อสังหามาใหม่ล่าสุด */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 lg:mt-10 mb-8 sm:mb-10 lg:mb-12">
        <PropertySection
          title={titles.newProperties}
          properties={homeNewProperties || []}
          priority={true} // ✅ ให้ priority สำหรับ section แรก
          t={t}
        />
      </div>

      {/* ประกาศเช่า */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 lg:mt-10 mb-8 sm:mb-10 lg:mb-12">
        <PropertySection
          title={titles.rental}
          properties={homeRentalProperties || []}
          t={t}
        />
      </div>

      {/* Featured Property - Full Screen Section */}
      {/* Removed as per request */}

      {/* ประกาศขาย */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 lg:mt-10 mb-8 sm:mb-10 lg:mb-12">
        <PropertySection
          title={titles.sale}
          properties={homeSaleProperties || []}
          t={t}
        />
      </div>

      {/* ประกาศเช่า/ขาย */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 lg:mt-10 mb-8 sm:mb-10 lg:mb-12">
        <PropertySection
          title={titles.saleRent}
          properties={
            (homeNewProperties && homeNewProperties.length > 0
              ? homeNewProperties.slice(0, 5)
              : []) as PropertyData[]
          }
          t={t}
        />
      </div>

      {/* Popular Locations - ใช้ Suspense */}
      <div className="w-full">
        <Suspense
          fallback={
            <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />
          }
        >
          <PopularLocations
            title={titles.popular}
            locations={[
              {
                name: t("location_sukhumvit"),
                image: "/locations/sukhumvit.jpg",
                url: "/map?location=sukhumvit&lat=13.736717&lng=100.560471&zoom=13",
              },
              {
                name: t("location_rama9"),
                image: "/locations/rama9.jpg",
                url: "/map?location=rama 9&lat=13.759621&lng=100.568850&zoom=13",
              },
              {
                name: t("location_ladprao"),
                image: "/locations/ladprao.jpg",
                url: "/map?location=ladprao&lat=13.816728&lng=100.561408&zoom=13",
              },
              {
                name: t("location_sathorn"),
                image: "/locations/sathorn.jpg",
                url: "/map?location=sathon&lat=13.724421&lng=100.526588&zoom=13",
              },
            ]}
          />
        </Suspense>
      </div>
    </>
  )
);

PropertySectionsContainer.displayName = "PropertySectionsContainer";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#006CE3] text-white p-6 mt-auto">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">
              {t("footer_company_name")}
            </h3>
            <p className="text-sm text-gray-300">
              {t("footer_company_description")}
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-3">{t("footer_about_us")}</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer_about_teedin")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer_contact_us")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer_join_us")}
                </a>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-white">
                  {t("footer_privacy_policy")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-3">{t("footer_our_services")}</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer_buy_house")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer_rent_house")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer_sell_house")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer_appraise_price")}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-3">{t("footer_follow_us")}</h4>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-white hover:text-gray-300 transition-colors"
              >
                <span className="sr-only">Facebook</span>
                <svg
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a
                href="#"
                className="text-white hover:text-gray-300 transition-colors"
              >
                <span className="sr-only">Instagram</span>
                <svg
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a
                href="#"
                className="text-white hover:text-gray-300 transition-colors"
              >
                <span className="sr-only">Twitter</span>
                <svg
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white-700 text-sm text-white-400">
          <p>{t("footer_copyright")}</p>
        </div>
      </div>
    </footer>
  );
};

// ✅ Main Component
export default function PropertyListing() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const { t } = useLanguage();

  // ใช้ข้อมูลจาก context
  const {
    homeNewProperties,
    homeRentalProperties,
    homeSaleProperties,
    isLoading,
    dataSource,
    debugLogs,
    refreshData,
  } = useProperty();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-blue-25 to-white font-sukhumvit">
      <HeroSection
        activeFilter={activeFilter}
        onFilterChangeAction={setActiveFilter}
      />

      <main className="flex-grow">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Property Sections */}
            <PropertySectionsContainer
              homeNewProperties={homeNewProperties}
              homeRentalProperties={homeRentalProperties}
              homeSaleProperties={homeSaleProperties}
              titles={{
                newProperties: t("home_new_properties_title"),
                rental: t("home_rental_properties_title"),
                sale: t("home_sale_properties_title"),
                saleRent: t("home_sale_rent_properties_title"),
                popular: t("popular_locations"),
              }}
              t={t}
            />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

function HomeLoadingText() {
  const { t } = useLanguage();
  return (
    <p className="text-lg sm:text-xl font-medium text-gray-600">
      {t("loading_properties")}
    </p>
  );
}
