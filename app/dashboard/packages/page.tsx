"use client";

import { PricingSection } from "@/components/packages";
import { useAuth } from "@/contexts/auth-context";
import { useProperty } from "@/contexts/property-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PackagesPage() {
  const { user, userRole, loading } = useAuth();
  const { allProperties, isLoading: isPropertiesLoading } = useProperty();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const router = useRouter();

  // Redirect customers away from this page
  useEffect(() => {
    if (!loading && userRole === "customer") {
      router.push("/"); // Or /dashboard if appropriate
    }
  }, [userRole, loading, router]);

  // Filter properties owned by the current user
  const myProperties = allProperties.filter(p => p.agent?.id === user?.id);

  // Auto-select the first property if available and none selected
  useEffect(() => {
    if (myProperties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(myProperties[0].id);
    }
  }, [myProperties, selectedPropertyId]);

  if (loading || userRole === "customer" || isPropertiesLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* Property Selector for Testing/Usage */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm font-medium text-slate-700">
            Select Property to Boost:
          </div>
          <select
            value={selectedPropertyId}
            onChange={e => setSelectedPropertyId(e.target.value)}
            className="block w-full sm:w-auto rounded-md border-slate-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          >
            <option value="" disabled>
              -- Select a Property --
            </option>
            {myProperties.map(p => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
            {myProperties.length === 0 && (
              <option value="" disabled>
                No properties found
              </option>
            )}
          </select>
        </div>
      </div>

      <PricingSection key={selectedPropertyId} propertyId={selectedPropertyId} />
    </div>
  );
}
