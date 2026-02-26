"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Camera, Loader2, Smartphone, Upload, X } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { CrossDeviceUploadModal } from "./cross-device-upload-modal";

interface Update3MRentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
  onSuccess?: () => void;
  initialData?: any; // Add initialData prop
}

type RoomType = "bedroom" | "bathroom" | "livingroom" | "kitchen" | "balcony";

interface RoomData {
  images: string[];
  imageFiles: (File | null)[];
  notes: string;
}

const roomConfig: Record<
  RoomType,
  { title: string; emoji: string; legacyTitles: string[] }
> = {
  bedroom: { title: "Bedroom", emoji: "🛏️", legacyTitles: ["ห้องนอน"] },
  bathroom: { title: "Bathroom", emoji: "🚿", legacyTitles: ["ห้องน้ำ"] },
  livingroom: {
    title: "Living Room",
    emoji: "🛋️",
    legacyTitles: ["ห้องนั่งเล่น"],
  },
  kitchen: { title: "Kitchen", emoji: "🍽️", legacyTitles: ["ห้องครัว"] },
  balcony: { title: "Balcony", emoji: "🌇", legacyTitles: ["ระเบียง"] },
};

export function Update3MRentForm({
  open,
  onOpenChange,
  propertyId,
  onSuccess,
  initialData,
}: Update3MRentFormProps) {
  const MAX_IMAGES_PER_ROOM = 3;
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyAgentId, setPropertyAgentId] = useState<string | null>(null);

  // Cross-device upload state
  const [crossDeviceOpen, setCrossDeviceOpen] = useState(false);
  const [activeUploadRoom, setActiveUploadRoom] = useState<RoomType | null>(
    null
  );
  const [activeUploadSlot, setActiveUploadSlot] = useState<number | null>(null);

  const [rooms, setRooms] = useState<Record<RoomType, RoomData>>({
    bedroom: { images: [], imageFiles: [], notes: "" },
    bathroom: { images: [], imageFiles: [], notes: "" },
    livingroom: { images: [], imageFiles: [], notes: "" },
    kitchen: { images: [], imageFiles: [], notes: "" },
    balcony: { images: [], imageFiles: [], notes: "" },
  });

  const roomTypesOrdered: RoomType[] = [
    "bedroom",
    "bathroom",
    "livingroom",
    "kitchen",
    "balcony",
  ];

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

  const distributeImages = (allImages: string[]) => {
    const distribution: Record<RoomType, string[]> = {
      bedroom: [],
      bathroom: [],
      livingroom: [],
      kitchen: [],
      balcony: [],
    };

    let currentImageIndex = 0;
    roomTypesOrdered.forEach(roomType => {
      const roomImages = [];
      for (let i = 0; i < MAX_IMAGES_PER_ROOM; i++) {
        if (currentImageIndex < allImages.length) {
          roomImages.push(allImages[currentImageIndex]);
          currentImageIndex++;
        }
      }
      // Pad with empty strings if we have fewer images than slots
      // This ensures that if we save sparse data, we respect it,
      // but if we load legacy compact data, we fill sequentially.
      // However, for sparse data to work, allImages MUST contain the empty strings.
      // If allImages is ["a", "", "b"], loop 0: "a", loop 1: "", loop 2: "b".
      // If allImages is ["a", "b"] (legacy), loop 0: "a", loop 1: "b", loop 2: undefined -> stop.

      distribution[roomType] = roomImages;
    });

    return distribution;
  };

  const [uploadingSlots, setUploadingSlots] = useState<Record<string, boolean>>(
    {}
  );

  // Load draft from localStorage on mount
  useEffect(() => {
    if (open && propertyId) {
      const draftKey = `update-3m-draft-${propertyId}`;
      const savedDraft = localStorage.getItem(draftKey);

      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          // Validate structure briefly
          if (parsed && typeof parsed === "object" && "bedroom" in parsed) {
            console.log("Restoring draft from localStorage");
            setRooms(parsed);
            // If we have a draft, we don't fetch from DB to avoid overwriting
            // But we might want to fetch agent_id if it's missing?
            // Let's just fetch property data to get agent_id, but NOT overwrite rooms if draft exists
            fetchPropertyData(true); // true = preserveRooms
            return;
          }
        } catch (e) {
          console.error("Failed to parse draft", e);
        }
      }

      if (initialData) {
        processPropertyData(initialData);
      } else {
        fetchPropertyData(false);
      }
    } else {
      // Reset form when dialog closes
      // We DON'T clear the draft here, in case they closed by accident.
      // We only clear on successful save.
      setFetching(false);
      setRooms({
        bedroom: { images: [], imageFiles: [], notes: "" },
        bathroom: { images: [], imageFiles: [], notes: "" },
        livingroom: { images: [], imageFiles: [], notes: "" },
        kitchen: { images: [], imageFiles: [], notes: "" },
        balcony: { images: [], imageFiles: [], notes: "" },
      });
      setError(null);
      setUploadingSlots({});
    }
  }, [open, propertyId, initialData]);

  // Save draft to localStorage whenever rooms change
  useEffect(() => {
    if (open && propertyId && rooms) {
      const draftKey = `update-3m-draft-${propertyId}`;
      // We strip out imageFiles before saving (though we are moving away from using them)
      const cleanRooms = Object.entries(rooms).reduce(
        (acc, [key, data]) => {
          acc[key as RoomType] = {
            ...data,
            imageFiles: [], // Don't save files
          };
          return acc;
        },
        {} as Record<RoomType, RoomData>
      );

      localStorage.setItem(draftKey, JSON.stringify(cleanRooms));
    }
  }, [rooms, open, propertyId]);

  const processPropertyData = (property: any) => {
    setPropertyAgentId(property.agent_id ?? null);

    // Get primary detail
    const details = Array.isArray(property.property_details)
      ? property.property_details[0]
      : property.property_details;

    // Parse notes from description
    // Format examples: "Bedroom: note1" (legacy Thai labels also supported)
    const descriptionText =
      typeof details?.description === "string" ? details.description : null;

    if (descriptionText) {
      const roomEntries = descriptionText.split("\n\n");

      const parsedRooms: Record<RoomType, RoomData> = {
        bedroom: { images: [], imageFiles: [], notes: "" },
        bathroom: { images: [], imageFiles: [], notes: "" },
        livingroom: { images: [], imageFiles: [], notes: "" },
        kitchen: { images: [], imageFiles: [], notes: "" },
        balcony: { images: [], imageFiles: [], notes: "" },
      };

      roomEntries.forEach((entry: string) => {
        for (const [roomType, config] of Object.entries(roomConfig)) {
          const titles = [config.title, ...config.legacyTitles];
          const matchedTitle = titles.find(title =>
            entry.startsWith(`${title}:`)
          );
          if (matchedTitle) {
            parsedRooms[roomType as RoomType].notes = entry
              .replace(`${matchedTitle}:`, "")
              .trim();
          }
        }
      });

      setRooms(prev => {
        const updated = { ...prev };
        Object.keys(parsedRooms).forEach(roomType => {
          updated[roomType as RoomType] = {
            ...prev[roomType as RoomType],
            notes: parsedRooms[roomType as RoomType].notes,
          };
        });
        return updated;
      });
    }

    const mergedImages = Array.from(
      new Set([
        ...normalizeImages(property.images),
        ...normalizeImages(details?.images),
      ])
    );

    const distribution = distributeImages(mergedImages);
    setRooms(prev => {
      const updated = { ...prev };
      roomTypesOrdered.forEach(roomType => {
        updated[roomType] = {
          ...prev[roomType],
          images: distribution[roomType],
        };
      });
      return updated;
    });
  };

  const fetchPropertyData = async (preserveRooms = false) => {
    if (!propertyId) return;

    setFetching(true);
    setError(null);

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out")), 15000);
      });

      // Fetch property with details - Optimized query
      const fetchPromise = (async () => {
        return await supabase
          .from("properties")
          .select(
            `
          id,
          agent_id,
          property_details (
            description,
            images
          )
        `
          )
          .eq("id", propertyId)
          .maybeSingle();
      })();

      // Race between fetch and timeout
      const result = (await Promise.race([
        fetchPromise,
        timeoutPromise,
      ])) as any;

      const { data: property, error: propertyError } = result;

      if (propertyError) {
        console.error("Supabase error details:", JSON.stringify(propertyError));
        throw new Error(propertyError.message || "Database error");
      }

      if (!property) {
        throw new Error("Property not found");
      }

      if (preserveRooms) {
        // Only set agent ID, don't touch rooms
        setPropertyAgentId(property.agent_id ?? null);
      } else {
        processPropertyData(property);
      }
    } catch (err) {
      console.error("Error fetching property:", err);
      const message =
        err instanceof Error ? err.message : "Unable to load listing data";
      setError(message);
      toast.error("An error occurred while loading data");
    } finally {
      setFetching(false);
    }
  };

  const handleImageUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    roomType: RoomType,
    index: number
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const slotKey = `${roomType}-${index}`;

      // Set uploading state
      setUploadingSlots(prev => ({ ...prev, [slotKey]: true }));

      try {
        // Upload immediately
        const uploadedUrl = await uploadViaApi(file, roomType, index);

        // Update state with URL
        const room = rooms[roomType];
        const newImages = [...room.images];
        newImages[index] = uploadedUrl;

        // We don't need imageFiles anymore for this slot since it's uploaded
        const newFiles = [...room.imageFiles];
        newFiles[index] = null;

        setRooms(prev => ({
          ...prev,
          [roomType]: {
            ...room,
            images: newImages,
            imageFiles: newFiles,
          },
        }));

        toast.success("Image uploaded successfully");
      } catch (err) {
        console.error("Upload failed:", err);
        toast.error("Failed to upload image");
      } finally {
        setUploadingSlots(prev => ({ ...prev, [slotKey]: false }));
        // Clear input value to allow selecting same file again if needed
        e.target.value = "";
      }
    }
  };

  const handleRemoveImage = (roomType: RoomType, index: number) => {
    const room = rooms[roomType];
    const newImages = [...room.images];
    // Use empty string instead of delete to preserve slot
    newImages[index] = "";

    const newFiles = [...room.imageFiles];
    newFiles[index] = null;

    setRooms({
      ...rooms,
      [roomType]: {
        ...room,
        images: newImages,
        imageFiles: newFiles,
      },
    });
  };

  const handleNotesChange = (roomType: RoomType, notes: string) => {
    setRooms({
      ...rooms,
      [roomType]: {
        ...rooms[roomType],
        notes,
      },
    });
  };

  const uploadViaApi = async (
    file: File,
    roomType: RoomType,
    slot: number
  ): Promise<string> => {
    if (!propertyId) {
      throw new Error("Missing property reference");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("propertyId", propertyId);
    formData.append("scope", "rent");
    formData.append("roomType", roomType);
    formData.append("slot", slot.toString());

    const response = await fetch("/api/storage/upload", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        (payload && typeof payload.error === "string" && payload.error) ||
        `Unable to upload images for ${roomConfig[roomType].title}`;
      throw new Error(message);
    }

    if (!payload?.publicUrl) {
      throw new Error("Upload failed: missing public URL");
    }

    return payload.publicUrl as string;
  };

  const uploadImages = async (roomType: RoomType): Promise<string[]> => {
    const room = rooms[roomType];
    const finalImages: string[] = [];

    for (let i = 0; i < MAX_IMAGES_PER_ROOM; i++) {
      const img = room.images[i];
      const file = room.imageFiles[i];

      if (file instanceof File) {
        try {
          const uploadedUrl = await uploadViaApi(file, roomType, i);
          finalImages.push(uploadedUrl);
        } catch (err) {
          console.error("Error uploading image:", err);
          if (err instanceof Error) {
            throw err;
          }
          throw new Error(
            `Unable to upload images for ${roomConfig[roomType].title}`
          );
        }
      } else if (typeof img === "string" && !img.startsWith("blob:")) {
        finalImages.push(img || "");
      } else {
        finalImages.push("");
      }
    }

    return finalImages;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) return;

    setLoading(true);
    setError(null);

    try {
      // Collect all images (they should already be URLs now)
      const allImages: string[] = [];
      for (const roomType of roomTypesOrdered) {
        const room = rooms[roomType];
        // Filter out empty strings and ensure we only send valid URLs
        const validImages = room.images.filter(
          img => img && typeof img === "string" && img.trim().length > 0
        );
        allImages.push(...validImages);
      }

      // Collect all notes
      const allNotes = Object.entries(rooms)
        .map(([roomType, room]) => {
          if (room.notes.trim()) {
            return `${roomConfig[roomType as RoomType].title}: ${room.notes.trim()}`;
          }
          return null;
        })
        .filter(Boolean)
        .join("\n\n");

      // Update property_details with notes
      const detailData = {
        property_id: propertyId,
        description: allNotes || null,
        images: allImages.length > 0 ? allImages : null,
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
            "[Update3MRentForm] Skipping property_details update due to permission error",
            detailError
          );
        } else {
          throw detailError;
        }
      }

      // Save to three_month_update for agents to view
      if (user?.id) {
        const { error: updateError } = await supabase
          .from("three_month_update")
          .insert({
            property_id: propertyId,
            customer_id: user.id,
            agent_id: propertyAgentId,
            image_urls: allImages,
            details: allNotes || null,
          });

        if (updateError) {
          const msg = (updateError.message || "").toLowerCase();
          if (msg.includes("permission denied") || msg.includes("row-level")) {
            console.warn(
              "[Update3MRentForm] Skipping three_month_update insert due to permission error",
              updateError
            );
          } else {
            console.error("Error saving three_month_update:", updateError);
            toast.error("บันทึกข้อมูลอัปเดต 3 เดือนไม่สำเร็จ");
          }
        }
      }

      // Clear draft on success
      localStorage.removeItem(`update-3m-draft-${propertyId}`);

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

  const handleCrossDeviceUploadComplete = (url: string) => {
    if (activeUploadRoom && activeUploadSlot !== null) {
      const room = rooms[activeUploadRoom];
      const newImages = [...room.images];
      newImages[activeUploadSlot] = url;

      // We don't have a File object for this, so we keep imageFiles as null/unchanged
      // But we need to make sure uploadImages handles string URLs correctly (it does)

      setRooms({
        ...rooms,
        [activeUploadRoom]: {
          ...room,
          images: newImages,
        },
      });

      setCrossDeviceOpen(false);
      setActiveUploadRoom(null);
      setActiveUploadSlot(null);
    }
  };

  const renderRoomSection = (roomType: RoomType) => {
    const room = rooms[roomType];
    const config = roomConfig[roomType];

    return (
      <div key={roomType} className="space-y-4 pb-6 border-b last:border-b-0">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {config.title} {config.emoji}
          </h2>
          <p className="text-sm text-gray-600">Upload photos</p>
        </div>

        {/* Image Upload Section - 3 slots */}
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(index => {
            const isUploading = uploadingSlots[`${roomType}-${index}`];

            return (
              <div key={index} className="relative">
                {isUploading ? (
                  <div className="aspect-square bg-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-blue-300">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                    <span className="text-xs text-blue-600 font-medium">
                      Uploading...
                    </span>
                  </div>
                ) : room.images[index] ? (
                  <div className="relative aspect-square bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden group">
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(roomType, index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 z-10 hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <img
                      src={room.images[index]}
                      alt={`${config.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors border-2 border-dashed border-gray-300 w-full"
                      >
                        <Camera className="h-8 w-8 text-gray-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2">
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          className="w-full justify-start font-normal"
                          asChild
                        >
                          <label className="cursor-pointer">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload from Device
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e =>
                                handleImageUpload(e, roomType, index)
                              }
                            />
                          </label>
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start font-normal"
                          onClick={() => {
                            setActiveUploadRoom(roomType);
                            setActiveUploadSlot(index);
                            setCrossDeviceOpen(true);
                          }}
                        >
                          <Smartphone className="mr-2 h-4 w-4" />
                          Take Photo from Phone
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            );
          })}
        </div>

        {/* Notes Section */}
        <div className="space-y-2">
          <label
            htmlFor={`notes-${roomType}`}
            className="text-sm font-medium text-gray-700"
          >
            Notes
          </label>
          <Textarea
            id={`notes-${roomType}`}
            value={room.notes}
            onChange={e => handleNotesChange(roomType, e.target.value)}
            placeholder="Enter notes"
            rows={4}
            className="w-full border border-blue-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col gap-0">
        <DialogTitle className="sr-only">Update rental information</DialogTitle>
        {fetching ? (
          <div className="flex items-center justify-center py-8 flex-1">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading data...</span>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              <form
                id="update-3m-form"
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex justify-between items-center">
                    <span>{error}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={e => {
                        e.preventDefault();
                        fetchPropertyData();
                      }}
                      className="ml-2 h-8 bg-white hover:bg-red-50 border-red-200 text-red-700"
                    >
                      Retry
                    </Button>
                  </div>
                )}

                {/* Room Sections */}
                {(
                  [
                    "bedroom",
                    "bathroom",
                    "livingroom",
                    "kitchen",
                    "balcony",
                  ] as RoomType[]
                ).map(renderRoomSection)}
              </form>
            </div>

            {/* Submit Button - Fixed Footer */}
            <div className="p-4 border-t bg-white">
              <Button
                form="update-3m-form"
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
                  "Save"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>

      {activeUploadRoom && activeUploadSlot !== null && (
        <CrossDeviceUploadModal
          open={crossDeviceOpen}
          onOpenChange={setCrossDeviceOpen}
          onUploadComplete={handleCrossDeviceUploadComplete}
          roomType={activeUploadRoom}
          slotIndex={activeUploadSlot}
          propertyId={propertyId}
        />
      )}
    </Dialog>
  );
}
