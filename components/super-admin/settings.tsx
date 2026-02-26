"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { getSuperAdminBrowserClient } from "@/lib/super-admin-supabase";
import {
  computeInitials,
  deriveAvatarTheme,
  pickDeterministicColor,
} from "@/utils/avatar-colors";
import { Loader2 } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

export interface AdminProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password?: string;
  avatar?: string;
}

interface SuperAdminSettingsProps {
  initialProfile?: AdminProfile;
}

const SuperAdminSettings: React.FC<SuperAdminSettingsProps> = ({
  initialProfile,
}) => {
  const { user } = useAuth();
  const [adminProfile, setAdminProfile] = useState<AdminProfile>(
    initialProfile || {
      id: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    }
  );
  const [loading, setLoading] = useState(!initialProfile);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // เพิ่ม state สำหรับโหมดแก้ไข
  const [showConfirmModal, setShowConfirmModal] = useState(false); // state สำหรับ modal
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [avatarColor, setAvatarColor] = useState("#60a5fa");

  const fullName =
    `${adminProfile.firstName || ""} ${adminProfile.lastName || ""}`.trim();
  const initials = useMemo(
    () =>
      computeInitials(
        fullName || undefined,
        adminProfile.firstName,
        adminProfile.lastName,
        adminProfile.email
      ),
    [
      adminProfile.email,
      adminProfile.firstName,
      adminProfile.lastName,
      fullName,
    ]
  );
  const derivedAvatarTheme = useMemo(
    () => deriveAvatarTheme(avatarColor),
    [avatarColor]
  );

  // อัพเดตข้อมูลโปรไฟล์
  const updateProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const superAdminSupabase = getSuperAdminBrowserClient();
      const { error } = await superAdminSupabase
        .from("users")
        .update({
          first_name: adminProfile.firstName,
          last_name: adminProfile.lastName,
          email: adminProfile.email,
          phone: adminProfile.phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", adminProfile.id);

      if (error) {
        console.error("Error updating profile:", error);
        return;
      }

      if (adminProfile.password) {
        const { error: authError } = await superAdminSupabase.auth.updateUser({
          password: adminProfile.password,
        });

        if (authError) {
          console.error("Error updating auth password:", authError);
          return;
        }
      }

      // Reset password field after update
      setAdminProfile(prev => ({ ...prev, password: "" }));
      setIsEditing(false); // กลับเป็นโหมดดูอย่างเดียว
      setShowConfirmModal(false);
      setShowSuccessModal(true); // แสดง success modal
    } catch (error: unknown) {
      console.error("Error:", error);
    } finally {
      setSaving(false);
    }
  };

  const fetchAdminProfile = useCallback(async () => {
    if (!user?.id || initialProfile) return;
    try {
      setLoading(true);
      const superAdminSupabase = getSuperAdminBrowserClient();
      const { data, error } = await superAdminSupabase
        .from("users")
        .select("id, first_name, last_name, email, phone")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error, error?.message);
        return;
      }
      if (!data) {
        console.error("No user profile found for this user id");
        return;
      }

      setAdminProfile({
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        password: "",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error:", message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, initialProfile]);

  useEffect(() => {
    fetchAdminProfile();
  }, [fetchAdminProfile]);

  // Ensure every account gets a deterministic avatar background (same logic as logout modal)
  useEffect(() => {
    if (!user?.id) return;
    const customColor =
      (user.user_metadata?.avatar_color as string) ||
      (user.user_metadata?.color as string);
    if (customColor && /^#?[0-9a-fA-F]{6}$/.test(customColor)) {
      setAvatarColor(
        customColor.startsWith("#") ? customColor : `#${customColor}`
      );
    } else {
      setAvatarColor(pickDeterministicColor(user.id));
    }
  }, [user?.id, user?.user_metadata]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-96 mx-auto">
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <form
            onSubmit={e => {
              if (!isEditing) {
                setIsEditing(true);
              } else {
                setShowConfirmModal(true);
              }
              e.preventDefault();
            }}
            className="space-y-4"
          >
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={adminProfile.avatar || "/placeholder-user.jpg"}
                  />
                  <AvatarFallback
                    style={{
                      background: `linear-gradient(135deg, ${derivedAvatarTheme.bgStart}, ${derivedAvatarTheme.bgEnd})`,
                      boxShadow: `0 2px 8px ${derivedAvatarTheme.shadow}`,
                      border: `1px solid ${derivedAvatarTheme.outline}`,
                      color: "#0b2540",
                    }}
                  >
                    {initials || "A"}
                  </AvatarFallback>
                </Avatar>
                <p className="text-center mt-2 text-sm text-gray-600">
                  รูปโปรไฟล์
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="firstName">ชื่อ</Label>
              <Input
                id="firstName"
                value={adminProfile.firstName}
                onChange={e =>
                  setAdminProfile(prev => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
                placeholder="กรุณากรอกชื่อ"
                readOnly={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="lastName">นามสกุล</Label>
              <Input
                id="lastName"
                value={adminProfile.lastName}
                onChange={e =>
                  setAdminProfile(prev => ({
                    ...prev,
                    lastName: e.target.value,
                  }))
                }
                placeholder="กรุณากรอกนามสกุล"
                readOnly={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="superadmin-settings-email"
                type="email"
                value={adminProfile.email}
                onChange={e =>
                  setAdminProfile(prev => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="example@email.com"
                readOnly={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="phone">เบอร์โทร</Label>
              <Input
                id="phone"
                value={adminProfile.phone}
                onChange={e =>
                  setAdminProfile(prev => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                placeholder="081-111-1111"
                readOnly={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="superadmin-settings-password"
                type={showPassword ? "text" : "password"}
                value={adminProfile.password || ""}
                onChange={e =>
                  setAdminProfile(prev => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                placeholder="pppppppp123"
                readOnly={!isEditing}
              />
              <button
                type="button"
                className="text-xs text-blue-600 mt-1 ml-2 focus:outline-none"
                onClick={() => setShowPassword(prev => !prev)}
                disabled={!isEditing}
              >
                {showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : isEditing ? (
                "ยืนยัน"
              ) : (
                "แก้ไขข้อมูล"
              )}
            </Button>
          </form>
        )}
        {/* Modal ยืนยันการแก้ไข */}
        <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <AlertDialogContent className="rounded-2xl max-w-md w-full p-8 flex flex-col items-center bg-white">
            {/* ไอคอนเตือนด้านบน */}
            <div className="flex flex-col items-center w-full mb-4">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L2 22H22L12 2Z"
                  stroke="#F44336"
                  strokeWidth="2"
                  fill="none"
                />
                <circle cx="12" cy="17" r="1.2" fill="#F44336" />
                <rect x="11" y="9" width="2" height="6" rx="1" fill="#F44336" />
              </svg>
            </div>
            {/* ข้อความเตือน */}
            <span className="text-red-600 text-lg font-semibold text-center mb-6">
              ต้องการแก้ไขข้อมูลใช่หรือไม่?
            </span>
            {/* ปุ่มเรียงแนวตั้ง */}
            <div className="w-full flex flex-col gap-3">
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg w-full py-2 text-base"
                onClick={updateProfile}
                disabled={saving}
              >
                ยืนยัน
              </AlertDialogAction>
              <AlertDialogCancel
                className="border border-red-600 text-red-600 bg-white font-semibold rounded-lg w-full py-2 text-base hover:bg-red-50"
                onClick={() => setShowConfirmModal(false)}
              >
                ย้อนกลับ
              </AlertDialogCancel>
            </div>
          </AlertDialogContent>
        </AlertDialog>
        {/* Success Modal */}
        <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <AlertDialogContent className="rounded-2xl max-w-md w-full p-8 flex flex-col items-center bg-white">
            <div className="flex flex-col items-center w-full mb-4">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="#2563eb"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M8 12.5l2.5 2.5 5-5"
                  stroke="#2563eb"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-blue-600 text-lg font-semibold text-center mb-6">
              แก้ไขข้อมูลสำเร็จ!
            </span>
            <div className="w-full flex flex-col gap-3">
              <AlertDialogAction
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg w-full py-2 text-base"
                onClick={() => setShowSuccessModal(false)}
              >
                ยืนยัน
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default SuperAdminSettings;
