"use client";

import { useLanguage } from "@/contexts/language-context";
import { UserPlus, X } from "lucide-react";

interface AgentRegisterBarProps {
  isVisible: boolean;
  onRegisterClick: () => void;
  onDismiss: () => void;
}

export function AgentRegisterBar({
  isVisible,
  onRegisterClick,
  onDismiss,
}: AgentRegisterBarProps) {
  const { t } = useLanguage();

  if (!isVisible) return null;

  return (
    <div className="sticky top-0 z-40 w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium truncate">
            {t("step1_alert_desc")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onRegisterClick}
            className="px-4 py-2 rounded-lg bg-white text-orange-600 font-semibold text-sm hover:bg-orange-50 transition-colors shadow-sm"
          >
            {t("step1_register_agent")}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            aria-label={t("close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
