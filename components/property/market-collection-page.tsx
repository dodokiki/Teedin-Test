"use client";

import { HeroSection } from "@/components/layout/hero-section";
import { PropertyCard, type PropertyData } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { useProperty } from "@/contexts/property-context";
import Link from "next/link";
import { useMemo, useState } from "react";

type CollectionMode = "all" | "new" | "project";

interface MarketCollectionPageProps {
  title: string;
  description: string;
  mode: CollectionMode;
}

const normalizeText = (value: unknown): string =>
  (value ?? "").toString().toLowerCase().trim();

const isProjectProperty = (property: PropertyData): boolean => {
  const text = normalizeText(`${property.title} ${property.description ?? ""}`);
  const listingTypes = (property.listing_type ?? []).map(normalizeText).join(" ");
  const category = normalizeText(property.property_category ?? "");
  const inProject = property.in_project === true;
  return (
    inProject ||
    text.includes("project") ||
    text.includes("โครงการ") ||
    listingTypes.includes("project") ||
    category.includes("project") ||
    category.includes("โครงการ") ||
    category.includes("คอนโด") ||
    category.includes("condo") ||
    category.includes("บ้านจัดสรร") ||
    category.includes("มิกซ์ยูส") ||
    category.includes("mixed")
  );
};

export function MarketCollectionPage({
  title,
  description,
  mode,
}: MarketCollectionPageProps) {
  const { t } = useLanguage();
  const { allProperties, allNewProperties, isLoading, dataSource } = useProperty();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isUsingDatabase = dataSource === "supabase";
  const baseProperties = isUsingDatabase ? allProperties : [];

  const sourceProperties = useMemo(() => {
    if (mode === "new") {
      if ((allNewProperties?.length ?? 0) > 0) return allNewProperties;
      const byNewest = [...baseProperties].sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });
      return byNewest.slice(0, 50);
    }
    if (mode === "project") {
      const projects = baseProperties.filter(isProjectProperty);
      if (projects.length > 0) return projects;
      const byNewest = [...baseProperties].sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });
      return byNewest.slice(0, 50);
    }
    return baseProperties;
  }, [allNewProperties, baseProperties, mode]);

  const properties = useMemo(() => {
    const q = normalizeText(searchQuery);
    const filtered = q
      ? sourceProperties.filter(property => {
          const locationText =
            typeof property.location === "string"
              ? property.location
              : `${property.location?.address ?? ""} ${property.location?.["ที่อยู่"] ?? ""}`;
          const haystack = normalizeText(
            `${property.title} ${property.description ?? ""} ${locationText} ${property.area_around ?? ""}`
          );
          return haystack.includes(q);
        })
      : sourceProperties;

    return [...filtered].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [searchQuery, sourceProperties]);

  const mapHref =
    mode === "new"
      ? "/map?isNew=true"
      : mode === "project"
        ? "/map?isProject=true"
        : "/map";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <HeroSection
        activeFilter={activeFilter}
        onFilterChangeAction={setActiveFilter}
        showSearchSection={false}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12 flex-1">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">{description}</p>
          <p className="mt-2 text-sm text-blue-700">
            {t("results_of")} {properties.length} {t("results_title")}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder={t("all_props_search_placeholder")}
            className="w-full md:flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex gap-2">
            <Link href={mapHref}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                {t("show_map")}
              </Button>
            </Link>
            <Link href="/all-properties">
              <Button variant="outline">{t("results_title")}</Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-gray-600">{t("loading_properties")}</div>
        ) : properties.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg font-medium text-gray-700">{t("no_properties_title")}</p>
            <p className="mt-2 text-sm text-gray-500">{t("try_adjust_filters")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {properties.map(property => (
              <div key={property.id} className="w-full h-full">
                <PropertyCard property={property} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
