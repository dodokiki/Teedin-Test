"use client";

import { X } from "lucide-react";
import { useState } from "react";

interface EmailCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (email: string) => Promise<void>;
  loading?: boolean;
  language?: "th" | "en";
}

// Translation object
const translations = {
  th: {
    title: "กรอก Gmail ลูกค้า",
    label: "Gmail Address",
    placeholder: "example@gmail.com",
    errorEmpty: "กรุณากรอก Gmail",
    errorFormat: "รูปแบบ Gmail ไม่ถูกต้อง",
    cancel: "ยกเลิก",
    submit: "ส่ง",
    loading: "กำลังประมวลผล...",
  },
  en: {
    title: "Enter Customer Email",
    label: "Gmail Address",
    placeholder: "example@gmail.com",
    errorEmpty: "Please enter an email",
    errorFormat: "Invalid email format",
    cancel: "Cancel",
    submit: "Submit",
    loading: "Processing...",
  },
};

function t(key: string, language: string = "th"): string {
  return (
    (translations[language as keyof typeof translations] as any)[key] || key
  );
}

export const EmailCustomerDialog = ({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  language = "th",
}: EmailCustomerDialogProps) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    // Validate email format
    if (!email.trim()) {
      setError(t("errorEmpty", language));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t("errorFormat", language));
      return;
    }

    try {
      await onSubmit(email);
      setEmail("");
      onOpenChange(false);
    } catch (err) {
      // Error is already handled and shown in toast by parent component
      // Just reset the loading state
      console.error("Dialog error:", err);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError(null);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">{t("title", language)}</h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("label", language)}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder={t("placeholder", language)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              {t("cancel", language)}
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? t("loading", language) : t("submit", language)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
