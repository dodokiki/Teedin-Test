import {
  PropertyCard,
  type PropertyData,
} from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

interface PropertySectionProps {
  title: string;
  properties: PropertyData[];
  t: (key: string) => string;
  priority?: boolean;
}

const PropertySectionHeader = ({
  title,
  t,
}: {
  title: string;
  t: (key: string) => string;
}) => (
  <div className="flex justify-between items-center mb-6">
    <div>
      <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-black to-black inline-block text-transparent bg-clip-text">
        {title}
      </h2>
    </div>
    <div className="flex items-center">
      <Link href="/all-properties">
        <Button
          variant="outline"
          className="flex items-center gap-1.5 text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md border-none transition-all rounded-full px-5 py-2 font-medium"
        >
          <span>{t("view_all")}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  </div>
);

const PropertyGrid = ({
  properties,
  priority,
}: {
  properties: PropertyData[];
  priority: boolean;
}) => (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
    {properties.map((property, index) => (
      <PropertyCard
        key={property.id}
        property={property}
        priority={priority && index < 3}
      />
    ))}
  </div>
);

export const PropertySection = memo(
  ({ title, properties, t, priority = false }: PropertySectionProps) => {
    return (
      <section className="mb-12">
        <PropertySectionHeader title={title} t={t} />
        <PropertyGrid properties={properties} priority={priority} />
      </section>
    );
  }
);

PropertySection.displayName = "PropertySection";
