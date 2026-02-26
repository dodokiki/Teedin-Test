"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface View3MLandFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
}

export function View3MLandForm({
  open,
  onOpenChange,
  propertyId,
}: View3MLandFormProps) {
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [notes, setNotes] = useState<string | null>(null);

  const normalizeImages = (input: unknown): string[] => {
    if (!input) return [];
    if (Array.isArray(input)) {
      return input
        .filter((item): item is string => typeof item === "string")
        .map(item => item.trim())
        .filter(Boolean);
    }
    if (typeof input === "string" && input.trim().length > 0) {
      return [input.trim()];
    }
    return [];
  };

  // Fetch property data when dialog opens
  useEffect(() => {
    if (open && propertyId) {
      fetchPropertyData();
    } else {
      // Reset when dialog closes
      setImages([]);
      setError(null);
    }
  }, [open, propertyId]);

  const fetchPropertyData = async () => {
    if (!propertyId) return;

    setFetching(true);
    setError(null);

    try {
      // Fetch property with details
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select(
          `
          *,
          property_details(*)
        `
        )
        .eq("id", propertyId)
        .single();

      if (propertyError) throw propertyError;

      // Get primary detail
      const details = Array.isArray(property.property_details)
        ? property.property_details[0]
        : property.property_details;

      const mergedImages = Array.from(
        new Set([
          ...normalizeImages(property.images),
          ...normalizeImages(details?.images),
        ])
      );
      setImages(mergedImages.slice(0, 3));
      setNotes(
        typeof details?.description === "string" ? details.description : null
      );
    } catch (err) {
      console.error("Error fetching property:", err);
      setError("Unable to load listing data");
      toast.error("An error occurred while loading data");
    } finally {
      setFetching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <DialogTitle className="sr-only">
          View land update information
        </DialogTitle>
        {fetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading data...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Land</h2>
              <p className="text-sm text-gray-600">Most recent updates</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map(index => (
                <div key={index} className="relative">
                  {images[index] ? (
                    <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={images[index]}
                        alt={`Property ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                      <span className="text-gray-400 text-sm">No image</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {notes && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {notes}
                </p>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg text-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
