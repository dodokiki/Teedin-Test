"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { SUPER_ADMIN_COOKIE_NAME } from "@/lib/super-admin-supabase";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  computeInitials,
  deriveAvatarTheme,
  pickDeterministicColor,
} from "@/utils/avatar-colors";

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogoutConfirmationModal({
  isOpen,
  onClose,
}: LogoutConfirmationModalProps) {
  const router = useRouter();

  const { logout: authLogout, user } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState<string>("");
  const [avatarColor, setAvatarColor] = useState<string>("#60a5fa"); // default blue-400
  const [isLoading, setIsLoading] = useState(false);

  // Derived colors (memoized to avoid recalculation each render)
  const derived = useMemo(() => deriveAvatarTheme(avatarColor), [avatarColor]);

  useEffect(() => {
    const loadAvatar = async () => {
      if (!user?.id) return;
      let url: string | null =
        (user.user_metadata?.avatar_url as string | null) ||
        (user.user_metadata?.picture as string | null) ||
        null;
      let fullName: string | undefined =
        user.user_metadata?.full_name ||
        `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`.trim();

      try {
        const { data: customer } = await supabase
          .from("customers")
          .select("profile_picture, full_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (customer) {
          if (!url && customer.profile_picture) url = customer.profile_picture;
          if (!fullName && customer.full_name) fullName = customer.full_name;
        }
      } catch (e) {
        // ignore
      }

      try {
        const { data: agent } = await supabase
          .from("agens")
          .select("profile_picture")
          .eq("user_id", user.id)
          .maybeSingle();
        if (agent && !url && agent.profile_picture) url = agent.profile_picture;
      } catch (e) {
        // ignore
      }

      setAvatarUrl(url);
      setInitials(
        computeInitials(
          fullName,
          user.user_metadata?.first_name,
          user.user_metadata?.last_name,
          user.email || undefined
        )
      );

      // Pick avatar color - user can specify in metadata, else per-user deterministic
      const customColor =
        (user.user_metadata?.avatar_color as string) ||
        (user.user_metadata?.color as string);
      if (customColor && /^#?[0-9a-fA-F]{6}$/.test(customColor)) {
        setAvatarColor(
          customColor.startsWith("#") ? customColor : `#${customColor}`
        );
      } else if (user.id) {
        setAvatarColor(pickDeterministicColor(user.id));
      }
    };

    if (isOpen) {
      loadAvatar();
    }
  }, [isOpen, user?.id]);

  const handleLogout = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      console.log("[LOGOUT-MODAL] handleLogout started");

      // Call authLogout from context
      console.log("[LOGOUT-MODAL] Calling authLogout");
      await authLogout();

      // Small delay to ensure state is reset
      await new Promise(resolve => setTimeout(resolve, 50));

      console.log("[LOGOUT-MODAL] Logout completed, redirecting");

      // Redirect to home page
      window.location.href = "/";
    } catch (error) {
      console.error("[LOGOUT-MODAL] Logout error:", error);
      setIsLoading(false);
      alert("เกิดข้อผิดพลาดในการออกจากระบบ");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl w-full max-w-md p-8 flex flex-col items-center shadow-xl">
          {/* User avatar */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="โปรไฟล์"
              className="w-24 h-24 rounded-full object-cover mb-6 border-4 border-white shadow-md"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full mb-6 flex items-center justify-center text-white text-2xl font-semibold ring-2 ring-offset-2 ring-offset-white shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${derived.bgStart}, ${derived.bgEnd})`,
                boxShadow: `0 2px 8px ${derived.shadow}`,
                outline: `2px solid ${derived.outline}`,
              }}
            >
              {initials}
            </div>
          )}

          {/* Confirmation text */}
          <h2 className="text-2xl font-bold mb-8 text-center text-slate-800">
            ต้องการออกจากระบบ?
          </h2>

          {/* Buttons */}
          <div className="w-full space-y-3">
            <Button
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  กำลังออกจากระบบ...
                </div>
              ) : (
                "ยืนยัน"
              )}
            </Button>

            <Button
              onClick={onClose}
              disabled={isLoading}
              variant="outline"
              className="w-full border-gray-300 text-gray-800 font-bold py-3 rounded-md bg-white hover:bg-gray-200 disabled:text-gray-400 disabled:bg-gray-100"
            >
              ย้อนกลับ
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
