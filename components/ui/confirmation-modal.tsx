import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import React from "react";
import { Button } from "./button";
import { GenericModal } from "./generic-modal";

interface ConfirmationModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  type?: "success" | "error" | "warning";
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

const typeConfig = {
  success: {
    icon: CheckCircle,
    iconColor: "text-green-500",
    iconBg: "bg-green-50",
    confirmButtonClass: "bg-green-600 hover:bg-green-700",
  },
  error: {
    icon: XCircle,
    iconColor: "text-red-500",
    iconBg: "bg-red-50",
    confirmButtonClass: "bg-red-600 hover:bg-red-700",
  },
  warning: {
    icon: AlertCircle,
    iconColor: "text-yellow-500",
    iconBg: "bg-yellow-50",
    confirmButtonClass: "bg-yellow-600 hover:bg-yellow-700",
  },
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  type = "warning",
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  showCancel = true,
}) => {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <GenericModal
      open={open}
      onClose={onCancel}
      size="sm"
      showCloseButton={false}
    >
      <div className="flex flex-col items-center w-full">
        <div
          className={`w-14 h-14 rounded-full ${config.iconBg} flex items-center justify-center mb-4`}
        >
          <Icon className={`w-7 h-7 ${config.iconColor}`} />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
          {title}
        </h3>

        <p className="text-gray-600 text-center mb-6">{message}</p>

        <div className="flex gap-3 w-full">
          {showCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              {cancelText}
            </Button>
          )}
          <Button
            onClick={onConfirm}
            className={`flex-1 text-white ${config.confirmButtonClass}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </GenericModal>
  );
};
