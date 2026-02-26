"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";

interface ImageExpansionModalProps {
  isOpen: boolean;
  images: string[];
  currentImageIndex: number;
  onClose: () => void;
  onPrevImage: () => void;
  onNextImage: () => void;
  propertyName?: string;
}

export function ImageExpansionModal({
  isOpen,
  images,
  currentImageIndex,
  onClose,
  onPrevImage,
  onNextImage,
  propertyName = "Property",
}: ImageExpansionModalProps) {
  // Handle keyboard navigation and scroll lock
  useEffect(() => {
    if (!isOpen) {
      // Remove scroll lock when modal closes
      document.body.style.overflow = "";
      return;
    }

    // Lock scroll when modal opens
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        onPrevImage();
      } else if (e.key === "ArrowRight") {
        onNextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, onPrevImage, onNextImage]);

  if (!isOpen || !images || images.length === 0) {
    return null;
  }

  const currentImage = images[currentImageIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-100 flex items-center justify-center p-4 overflow-hidden"
      onClick={e => {
        // Close modal only if clicking on the background, not on the image or buttons
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 hover:bg-gray-200 transition-colors"
        aria-label="Close"
      >
        <X size={24} className="text-black" />
      </button>

      {/* Image Container */}
      <div className="relative w-full h-full max-w-4xl max-h-[90vh] flex items-center justify-center">
        <Image
          src={currentImage || "/placeholder.svg"}
          alt={`${propertyName} image ${currentImageIndex + 1}`}
          fill
          className="object-contain pointer-events-auto"
          quality={100}
          priority
        />
      </div>

      {/* Previous Button */}
      {images.length > 1 && (
        <button
          onClick={onPrevImage}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-3 transition-all hover:scale-110"
          aria-label="Previous image"
        >
          <ChevronLeft size={28} className="text-black" />
        </button>
      )}

      {/* Next Button */}
      {images.length > 1 && (
        <button
          onClick={onNextImage}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-3 transition-all hover:scale-110"
          aria-label="Next image"
        >
          <ChevronRight size={28} className="text-black" />
        </button>
      )}

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium">
          {currentImageIndex + 1} / {images.length}
        </div>
      )}

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-md px-4 pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => {
                // This will require passing a callback, but for now we'll use arrow keys
              }}
              className={`relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                index === currentImageIndex
                  ? "ring-2 ring-white opacity-100"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={image || "/placeholder.svg"}
                alt={`Thumbnail ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
