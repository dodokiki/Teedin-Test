"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageGalleryModalProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  isOpen: boolean;
}

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
  images,
  initialIndex = 0,
  onClose,
  isOpen,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, images]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prevIndex => (prevIndex + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(
      prevIndex => (prevIndex - 1 + images.length) % images.length
    );
  }, [images.length]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [isOpen, handleNext, handlePrev, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
      <div className="relative w-full h-full max-w-screen-lg max-h-screen-lg flex items-center justify-center">
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-50 p-2 bg-black bg-opacity-50 rounded-full"
          onClick={onClose}
          aria-label="Close image gallery"
        >
          <X size={28} />
        </button>

        {/* Image */}
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src={currentImage}
            alt={`Gallery image ${currentIndex + 1}`}
            fill
            style={{ objectFit: "contain" }}
            className="rounded-lg shadow-lg"
            priority
          />
        </div>

        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            <button
              className="absolute left-4 text-white hover:text-gray-300 transition-colors z-50 p-2 bg-black bg-opacity-50 rounded-full"
              onClick={handlePrev}
              aria-label="Previous image"
            >
              <ChevronLeft size={36} />
            </button>
            <button
              className="absolute right-4 text-white hover:text-gray-300 transition-colors z-50 p-2 bg-black bg-opacity-50 rounded-full"
              onClick={handleNext}
              aria-label="Next image"
            >
              <ChevronRight size={36} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageGalleryModal;
