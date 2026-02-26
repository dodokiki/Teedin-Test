"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface View3MRentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
}

type RoomType = "bedroom" | "bathroom" | "livingroom" | "kitchen" | "balcony";

interface RoomData {
  images: string[];
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

export function View3MRentForm({
  open,
  onOpenChange,
  propertyId,
}: View3MRentFormProps) {
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rooms, setRooms] = useState<Record<RoomType, RoomData>>({
    bedroom: { images: [] },
    bathroom: { images: [] },
    livingroom: { images: [] },
    kitchen: { images: [] },
    balcony: { images: [] },
  });

  const [roomNotes, setRoomNotes] = useState<Record<RoomType, string>>({
    bedroom: "",
    bathroom: "",
    livingroom: "",
    kitchen: "",
    balcony: "",
  });
  const [generalNote, setGeneralNote] = useState<string | null>(null);

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
    const distribution: Record<RoomType, RoomData> = {
      bedroom: { images: [] },
      bathroom: { images: [] },
      livingroom: { images: [] },
      kitchen: { images: [] },
      balcony: { images: [] },
    };

    if (allImages.length === 0) {
      return distribution;
    }

    // If we have sparse data (empty strings), we trust the fixed slots.
    // If we have compact data (legacy), we fill sequentially.
    // The logic below handles both if we assume fixed 3 slots per room.

    let cursor = 0;
    roomTypesOrdered.forEach((roomType, index) => {
      // Fixed 3 slots per room
      const count = 3;
      const slice = allImages.slice(cursor, cursor + count);
      // Pad with empty strings if slice is shorter than 3
      while (slice.length < 3) {
        slice.push("");
      }
      distribution[roomType].images = slice;
      cursor += count;
    });

    return distribution;
  };

  // Fetch property data when dialog opens
  useEffect(() => {
    if (open && propertyId) {
      fetchPropertyData();
    } else {
      // Reset when dialog closes
      setRooms({
        bedroom: { images: [] },
        bathroom: { images: [] },
        livingroom: { images: [] },
        kitchen: { images: [] },
        balcony: { images: [] },
      });
      setError(null);
    }
  }, [open, propertyId]);

  const fetchPropertyData = async () => {
    if (!propertyId) return;

    setFetching(true);
    setError(null);

    try {
      // Prefer latest three_month_update record
      const { data: latestUpdate, error: updateError } = await supabase
        .from("three_month_update")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (updateError) {
        console.warn("Error fetching three_month_update:", updateError);
      }

      if (latestUpdate) {
        const merged = Array.isArray(latestUpdate.image_urls)
          ? latestUpdate.image_urls
          : normalizeImages(latestUpdate.image_url);
        // Ensure we have enough slots for distribution if data is sparse
        const distribution = distributeImages(merged);
        setRooms(distribution);
        setRoomNotes({
          bedroom: "",
          bathroom: "",
          livingroom: "",
          kitchen: "",
          balcony: "",
        });
        setGeneralNote(
          typeof latestUpdate.details === "string" ? latestUpdate.details : null
        );
        setFetching(false);
        return;
      }

      // Fetch property with details (fallback)
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

      const details = Array.isArray(property.property_details)
        ? property.property_details[0]
        : property.property_details;

      if (details?.description && typeof details.description === "string") {
        const description = details.description;
        const parsedNotes: Record<RoomType, string> = {
          bedroom: "",
          bathroom: "",
          livingroom: "",
          kitchen: "",
          balcony: "",
        };

        description.split("\n\n").forEach(entry => {
          roomTypesOrdered.forEach(roomType => {
            const titles = [
              roomConfig[roomType].title,
              ...roomConfig[roomType].legacyTitles,
            ];
            const matchedTitle = titles.find(title =>
              entry.startsWith(`${title}:`)
            );
            if (matchedTitle) {
              parsedNotes[roomType] = entry
                .replace(`${matchedTitle}:`, "")
                .trim();
            }
          });
        });

        setRoomNotes(parsedNotes);
        setGeneralNote(null);
      } else {
        setRoomNotes({
          bedroom: "",
          bathroom: "",
          livingroom: "",
          kitchen: "",
          balcony: "",
        });
        setGeneralNote(null);
      }

      const mergedImages = Array.from(
        new Set([
          ...normalizeImages(property.images),
          ...normalizeImages(details?.images),
        ])
      );
      // If we are falling back to property images, they might be compact (no empty strings).
      // We should distribute them sequentially as best effort.
      const distribution = distributeImages(mergedImages);
      setRooms(distribution);
    } catch (err) {
      console.error("Error fetching property:", err);
      setError("Unable to load listing data");
      toast.error("An error occurred while loading data");
    } finally {
      setFetching(false);
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
          <p className="text-sm text-gray-600">Uploaded photos</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(index => (
            <div key={index} className="relative">
              {room.images[index] ? (
                <div className="relative aspect-square bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden">
                  <img
                    src={room.images[index]}
                    alt={`${config.title} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  <span className="text-gray-400 text-xs">No image</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {roomNotes[roomType] && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            {roomNotes[roomType]}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogTitle className="sr-only">
          View rental update information
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

            {generalNote && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                {generalNote}
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

            {/* Close Button */}
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
