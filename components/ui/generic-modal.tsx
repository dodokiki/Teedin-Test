import { X } from "lucide-react";
import React from "react";

interface GenericModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export const GenericModal: React.FC<GenericModalProps> = ({
  open,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  className = "",
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        className={`bg-white rounded-2xl shadow-lg p-8 ${sizeClasses[size]} w-full relative flex flex-col items-center ${className}`}
      >
        {showCloseButton && (
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
            onClick={onClose}
            aria-label="ปิด"
          >
            <X size={24} />
          </button>
        )}

        {title && (
          <h2 className="text-xl font-semibold mb-4 text-center">{title}</h2>
        )}

        {children}
      </div>
    </div>
  );
};
