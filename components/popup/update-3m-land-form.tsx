"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Camera, Loader2, X } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import { toast } from "sonner";

interface Update3MLandFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
  onSuccess?: () => void;
}

export function Update3MLandForm({
  open,
  onOpenChange,
  propertyId,
  onSuccess,
}: Update3MLandFormProps) {
  const MAX_IMAGES = 3;
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([]);
  const [notes, setNotes] = useState("");
  const [propertyAgentId, setPropertyAgentId] = useState<string | null>(null);

  const normalizeImages = (input: unknown): string[] => {
    if (!input) return [];
    if (Array.isArray(input)) {
      return input
        .filter((item): item is string => typeof item === "string")
        .map(item => item.trim());
    }
    if (typeof input === "string" && input.trim().length > 0) {
      return [input.trim()];
    }
    return [];
  };

  const mergeImages = (
    propertyImages: unknown,
    detailImages: unknown
  ): string[] => {
    const combined = [
      ...normalizeImages(propertyImages),
      ...normalizeImages(detailImages),
    ];
    // Use sequential distribution logic if needed, but for land it's just one list.
    // Just ensure we don't exceed MAX_IMAGES
    return Array.from(new Set(combined)).slice(0, MAX_IMAGES);
  };

  // Fetch property data when dialog opens
  useEffect(() => {
    if (open && propertyId) {
      fetchPropertyData();
    } else {
      // Reset form when dialog closes
      setImages([]);
      setImageFiles([]);
      setNotes("");
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
      setPropertyAgentId(property?.agent_id ?? null);

      // Get primary detail
      const details = Array.isArray(property.property_details)
        ? property.property_details[0]
        : property.property_details;

      const mergedImages = mergeImages(property.images, details?.images);
      setImages(mergedImages);

      // Set notes from description if the value is a string
      const descriptionText =
        typeof details?.description === "string" ? details.description : null;
      if (descriptionText) {
        setNotes(descriptionText);
      }
    } catch (err) {
      console.error("Error fetching property:", err);
      setError("Unable to load listing data");
      toast.error("An error occurred while loading data");
    } finally {
      setFetching(false);
    }
  };

  const handleImageUpload = (
    e: ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const newImage = URL.createObjectURL(file);
      const newImages = [...images];
      newImages[index] = newImage;
      setImages(newImages);

      const newFiles = [...imageFiles];
      newFiles[index] = file;
      setImageFiles(newFiles);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => {
      const next = [...prev];
      // Use empty string instead of delete to preserve slot
      next[index] = "";
      return next;
    });
    setImageFiles(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const uploadViaApi = async (file: File, slot: number): Promise<string> => {
    if (!propertyId) {
      throw new Error("Missing property reference");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("propertyId", propertyId);
    formData.append("scope", "land");
    formData.append("slot", slot.toString());

    const response = await fetch("/api/storage/upload", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        (payload && typeof payload.error === "string" && payload.error) ||
        "Unable to upload images, please try again";
      throw new Error(message);
    }

    if (!payload?.publicUrl) {
      throw new Error("Upload failed: missing public URL");
    }

    return payload.publicUrl as string;
  };

  const uploadImages = async (): Promise<string[]> => {
    const finalImages: string[] = [];

    for (let i = 0; i < MAX_IMAGES; i++) {
      const img = images[i];
      const file = imageFiles[i];

      if (file instanceof File) {
        try {
          const uploadedUrl = await uploadViaApi(file, i);
          finalImages.push(uploadedUrl);
        } catch (err) {
          console.error("Error uploading image:", err);
          if (err instanceof Error) {
            throw err;
          }
          throw new Error("Unable to upload images, please try again");
        }
      } else if (typeof img === "string" && !img.startsWith("blob:")) {
        finalImages.push(img || "");
      } else {
        finalImages.push("");
      }
    }

    return finalImages;
  };

  const saveThreeMonthUpdate = async (
    finalImages: string[],
    detailText: string | null
  ) => {
    if (!user?.id || !propertyId) return;
    const { error: updateError } = await supabase
      .from("three_month_update")
      .insert({
        property_id: propertyId,
        customer_id: user.id,
        agent_id: propertyAgentId,
        image_urls: finalImages,
        details: detailText,
      });

    if (updateError) {
      const msg = (updateError.message || "").toLowerCase();
      if (msg.includes("permission denied") || msg.includes("row-level")) {
        console.warn(
          "[Update3MLandForm] Skipping three_month_update insert due to permission error",
          updateError
        );
      } else {
        console.error("Error saving three_month_update:", updateError);
        toast.error("บันทึกข้อมูลอัปเดต 3 เดือนไม่สำเร็จ");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) return;

    setLoading(true);
    setError(null);

    try {
      // Upload new images
      const finalImages = await uploadImages();

      // Update property_details with notes
      const detailData = {
        property_id: propertyId,
        description: notes.trim() || null,
        images: finalImages.length > 0 ? finalImages : null,
      };

      const { error: detailError } = await supabase
        .from("property_details")
        .upsert(detailData, { onConflict: "property_id" });

      if (detailError) {
        const message = detailError.message?.toLowerCase() ?? "";
        if (
          message.includes("permission denied") ||
          message.includes("row-level security")
        ) {
          console.warn(
            "[Update3MLandForm] Skipping property_details update due to permission error",
            detailError
          );
        } else {
          throw detailError;
        }
      }

      await saveThreeMonthUpdate(finalImages, notes.trim() || null);

      toast.success("Information updated successfully");
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Error updating property:", err);
      const message =
        err instanceof Error
          ? err.message
          : "An error occurred while updating the data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <DialogTitle className="sr-only">Update land information</DialogTitle>
        {fetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading data...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Title */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Land</h2>
              <p className="text-sm text-gray-600">Upload photos</p>
            </div>

            {/* Image Upload Section - 3 slots */}
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map(index => (
                <div key={index} className="relative">
                  {images[index] ? (
                    <div className="relative aspect-square bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 z-10 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <img
                        src={images[index]}
                        alt={`Land Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <label className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors border-2 border-dashed border-gray-300">
                      <Camera className="h-8 w-8 text-gray-400" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleImageUpload(e, index)}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
              <label
                htmlFor="notes"
                className="text-sm font-medium text-gray-700"
              >
                Notes
              </label>
              <Textarea
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Enter notes"
                rows={6}
                className="w-full border border-blue-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin inline" />
                    Saving...
                  </>
                ) : (
                  "Confirm"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
