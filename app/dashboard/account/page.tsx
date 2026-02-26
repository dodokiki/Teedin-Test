"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { supabase } from "@/lib/supabase";
import {
  computeInitials,
  deriveAvatarTheme,
  pickDeterministicColor,
} from "@/utils/avatar-colors";
import {
  BadgeCheck,
  Bell,
  Building,
  Pencil,
  Shield,
  User,
  UserCheck,
  Crown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EditFirstNameDialog } from "../../../components/popup/edit-first-name-dialog";
import { EditLastNameDialog } from "../../../components/popup/edit-last-name-dialog";
import { EditPhoneDialog } from "../../../components/popup/edit-phone-dialog";

export default function AccountPage() {
  const { user, isLoggedIn, loading: authLoading, userRole, session } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  // Types for cached payload
  type Profile = {
    role?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    [key: string]: any;
  };
  type Agent = any;
  type Customer = any;

  // Read cache synchronously on client to prevent flash
  const CACHE_KEY = "dashboard-account-cache-v1";
  const getInitialCache = () => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };

  const [initialCache] = useState<{
    profile?: Profile;
    agent?: Agent;
    customer?: Customer;
    activeBoosts?: number;
  } | null>(getInitialCache);

  const [loading, setLoading] = useState(!initialCache?.profile);
  const [profile, setProfile] = useState<{
    role?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    is_premium?: boolean | null;
  }>(initialCache?.profile || {});
  const [agent, setAgent] = useState<any | null>(initialCache?.agent ?? null);
  const [agentLoading, setAgentLoading] = useState(!initialCache?.agent);
  const [customer, setCustomer] = useState<any | null>(initialCache?.customer ?? null);
  const [customerLoading, setCustomerLoading] = useState(!initialCache?.customer);
  // isPremium from profile - null means loading
  const isPremium = profile.is_premium ?? null;
  const [openFirst, setOpenFirst] = useState(false);
  const [openLast, setOpenLast] = useState(false);
  const [openPhone, setOpenPhone] = useState(false);
  const [avatarColor, setAvatarColor] = useState("#60a5fa");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const hasCachedProfile = Boolean(initialCache?.profile);

  const persistCache = (next?: { profile?: Profile; agent?: Agent; customer?: Customer }) => {
    try {
      const payload = {
        profile: next?.profile ?? profile,
        agent: next?.agent ?? agent,
        customer: next?.customer ?? customer,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      // ignore cache errors
    }
  };

  // ตรวจสอบ auth state และ redirect ถ้าไม่ได้ login
  useEffect(() => {
    const checkAuth = async () => {
      if (authLoading) return;

      // ตรวจสอบ session จาก Supabase โดยตรงเพื่อป้องกัน cache
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !isLoggedIn) {
        // ใช้ replace เพื่อป้องกัน back button
        router.replace("/");
        return;
      }
    };

    checkAuth();

    // ตรวจสอบอีกครั้งเมื่อกลับมาที่หน้า (เช่น หลังกด back button)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAuth();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      if (!hasCachedProfile) setLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("role, first_name, last_name, email, phone, is_premium")
          .eq("id", user.id)
          .single();

        if (error) {
          // Ignore "Row not found" error (PGRST116)
          if (error.code !== "PGRST116") {
            console.error("Error fetching profile:", error);
          }
        } else if (mounted) {
          setProfile(data || {});
          persistCache({ profile: data || {} });
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const fetchAgent = async () => {
      if (!user?.id) {
        setAgentLoading(false);
        return;
      }
      if (!hasCachedProfile) setAgentLoading(true);
      try {
        const { data, error } = await supabase
          .from("agens")
          .select(
            `company_name,license_number,business_license_id,address,property_types,service_areas,verification_documents,status,created_at,updated_at,approved_at,approved_by,rejection_reason,profile_picture`
          )
          .eq("user_id", user.id)
          .single();
        if (!mounted) return;
        if (error && error.code !== "PGRST116") {
          console.error("Error fetching agent:", error);
        }
        setAgent(data || null);
        persistCache({ agent: data || null });
      } catch (err) {
        console.error("Fetch agent error:", err);
      } finally {
        if (mounted) setAgentLoading(false);
      }
    };

    const fetchCustomer = async () => {
      if (!user?.id) {
        setCustomerLoading(false);
        return;
      }
      if (!hasCachedProfile) setCustomerLoading(true);
      try {
        const { data, error } = await supabase
          .from("customers")
          .select(
            `address,preferred_location,budget_range,interested_property_types,created_at,profile_picture,full_name`
          )
          .eq("user_id", user.id)
          .single();
        if (!mounted) return;
        if (error && error.code !== "PGRST116") {
          console.error("Error fetching customer:", error);
        }
        setCustomer(data || null);
        persistCache({ customer: data || null });
      } catch (err) {
        console.error("Fetch customer error:", err);
      } finally {
        if (mounted) setCustomerLoading(false);
      }
    };

    fetchProfile();
    fetchAgent();
    fetchCustomer();

    return () => {
      mounted = false;
    };
  }, [user?.id, hasCachedProfile]);

  // Load notification settings
  useEffect(() => {
    if (!user?.id) return;

    const fetchNotificationSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("email_notifications, sms_notifications")
          .eq("id", user.id)
          .single();

        if (!error && data) {
          setEmailNotifications(data.email_notifications ?? true);
          setSmsNotifications(data.sms_notifications ?? false);
        }
      } catch (err) {
        console.error("Error fetching notification settings:", err);
      }
    };

    fetchNotificationSettings();
  }, [user?.id]);


  const metadataFirstName = (user?.user_metadata?.first_name as string) || "";
  const metadataLastName = (user?.user_metadata?.last_name as string) || "";
  const metadataEmail =
    user?.email || (user?.user_metadata?.email as string) || "";

  const profileImage: string | undefined =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    agent?.profile_picture ||
    customer?.profile_picture ||
    undefined;
  const fullName = `${profile.first_name || metadataFirstName || ""} ${profile.last_name || metadataLastName || ""
    }`.trim();
  const initials = useMemo(
    () =>
      computeInitials(
        fullName || undefined,
        profile.first_name || metadataFirstName || undefined,
        profile.last_name || metadataLastName || undefined,
        profile.email || metadataEmail || undefined
      ) || (metadataEmail ? metadataEmail[0]?.toUpperCase() : ""),
    [
      fullName,
      profile.email,
      profile.first_name,
      profile.last_name,
      metadataEmail,
      metadataFirstName,
      metadataLastName,
    ]
  );

  const derivedAvatarTheme = useMemo(
    () => deriveAvatarTheme(avatarColor),
    [avatarColor]
  );

  // Ensure every account gets a consistent colored avatar background (matches logout modal)
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
      const seed =
        user.id ||
        fullName ||
        profile.email ||
        `${profile.first_name || ""}${profile.last_name || ""}` ||
        "user";
      setAvatarColor(pickDeterministicColor(seed));
    }
  }, [
    user?.id,
    user?.user_metadata,
    fullName,
    profile.email,
    profile.first_name,
    profile.last_name,
  ]);

  const handleNotificationChange = async (
    type: "email" | "sms",
    enabled: boolean
  ) => {
    setNotificationLoading(true);
    try {
      if (!user?.id) return;

      const { error } = await supabase
        .from("users")
        .update({
          [type === "email" ? "email_notifications" : "sms_notifications"]:
            enabled,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error updating notification settings:", error);
        alert(`${t("error")}: ${error.message}`);
        return;
      }

      if (type === "email") {
        setEmailNotifications(enabled);
      } else {
        setSmsNotifications(enabled);
      }

      // Show success message
      console.log(
        `${type === "email" ? "Email" : "SMS"} notifications ${enabled ? "enabled" : "disabled"
        }`
      );
    } catch (err) {
      console.error("Error:", err);
      alert(t("error"));
    } finally {
      setNotificationLoading(false);
    }
  };

  const InfoRow = ({
    label,
    value,
    onEdit,
    isLink = false,
    href = "#",
  }: {
    label: string;
    value: string | null | undefined;
    onEdit?: () => void;
    isLink?: boolean;
    href?: string;
  }) => (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 py-3 border-b">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2">
        {isLink && value ? (
          <a href={href} className="text-sm text-indigo-600 hover:underline">
            {value}
          </a>
        ) : (
          <span className="text-sm text-gray-900">{value || "-"}</span>
        )}
        {onEdit && (
          <button
            type="button"
            className="inline-flex p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            aria-label={`Edit ${label}`}
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  const DetailRow = ({ label, value }: { label: string; value: any }) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 sm:col-span-2">
        {Array.isArray(value) ? value.join(", ") : value ? String(value) : "-"}
      </dd>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-8">
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-semibold ring-2 ring-offset-2 ring-offset-white shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${derivedAvatarTheme.bgStart}, ${derivedAvatarTheme.bgEnd})`,
                boxShadow: `0 2px 8px ${derivedAvatarTheme.shadow}`,
                outline: `2px solid ${derivedAvatarTheme.outline}`,
                color: "#0b2540",
              }}
            >
              {initials || profile.email?.[0]?.toUpperCase() || "U"}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {profile.first_name || profile.last_name
                ? `${profile.first_name || ""} ${profile.last_name || ""}`
                : profile.email}
              {isPremium === true && (
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-full h-full drop-shadow-sm"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient
                        id="blue-gradient"
                        x1="3.85"
                        y1="3.85"
                        x2="20.15"
                        y2="20.15"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#3b82f6" />
                        <stop offset="1" stopColor="#2563eb" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
                      fill="url(#blue-gradient)"
                    />
                    <path
                      d="M10.5 15.5L7.5 12.5L8.2 11.8L10.5 14.1L15.8 8.8L16.5 9.5L10.5 15.5Z"
                      fill="white"
                      stroke="white"
                      strokeWidth="0.5"
                    />
                  </svg>
                </div>
              )}
            </h1>
            <div className="flex flex-col items-start gap-2 mt-1">
              {isPremium === null && loading ? (
                // Loading skeleton
                <span className="text-sm font-medium bg-gray-200 animate-pulse px-6 py-1 rounded-full">
                  &nbsp;
                </span>
              ) : isPremium === true ? (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 rounded-full shadow-lg border border-yellow-200/50 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-700 ease-in-out skew-x-12"></div>
                  <Crown className="w-4 h-4 text-amber-900 fill-amber-100" />
                  <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider drop-shadow-sm">
                    Premium Agent
                  </span>
                </div>
              ) : (
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {userRole || profile.role || "User"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="flex flex-wrap justify-center gap-4 w-full">
            <TabsTrigger value="account">
              <User className="w-4 h-4 mr-2" />
              {t("account_title")}
            </TabsTrigger>
            <TabsTrigger value="profile">
              {userRole === "agent" ? (
                <Building className="w-4 h-4 mr-2" />
              ) : (
                <UserCheck className="w-4 h-4 mr-2" />
              )}
              {t("account_profile_tab")}
            </TabsTrigger>

            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              {t("account_notifications_tab")}
            </TabsTrigger>
          </TabsList>

          {/* Account Details Tab */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>{t("account_title")}</CardTitle>
                <CardDescription>{t("account_manage_profile")}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p>{t("account_loading")}</p>
                ) : (
                  <div>
                    <InfoRow
                      label={t("account_edit_first_name")}
                      value={profile.first_name || metadataFirstName}
                      onEdit={() => setOpenFirst(true)}
                    />
                    <InfoRow
                      label={t("account_edit_last_name")}
                      value={profile.last_name || metadataLastName}
                      onEdit={() => setOpenLast(true)}
                    />
                    <InfoRow
                      label="Email"
                      value={profile.email || metadataEmail}
                      isLink
                      href={`mailto:${profile.email || metadataEmail}`}
                    />
                    <InfoRow
                      label={t("account_edit_phone")}
                      value={profile.phone || user?.phone}
                      onEdit={() => setOpenPhone(true)}
                    />
                    <InfoRow
                      label={t("account_role_label")}
                      value={userRole || profile.role}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Details Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t("account_profile_info")}</CardTitle>
                <CardDescription>
                  {t("account_manage_role_info")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userRole === "agent" ? (
                  agentLoading ? (
                    <p>{t("account_loading_agent")}</p>
                  ) : agent ? (
                    <div className="space-y-2">
                      <DetailRow
                        label={t("account_agent_company_name")}
                        value={agent.company_name}
                      />
                      <DetailRow
                        label={t("account_agent_license")}
                        value={agent.license_number}
                      />
                      <DetailRow
                        label={t("account_agent_address")}
                        value={agent.address}
                      />
                      <DetailRow
                        label={t("account_agent_property_types")}
                        value={agent.property_types}
                      />
                      <DetailRow
                        label={t("account_agent_service_areas")}
                        value={agent.service_areas}
                      />
                      <DetailRow
                        label={t("account_agent_status")}
                        value={agent.status}
                      />
                    </div>
                  ) : (
                    <p>{t("account_agent_not_found")}</p>
                  )
                ) : userRole === "customer" ? (
                  customerLoading ? (
                    <p>{t("account_loading_customer")}</p>
                  ) : customer ? (
                    <div className="space-y-2">
                      <DetailRow
                        label={t("account_customer_address")}
                        value={customer.address}
                      />
                      <DetailRow
                        label={t("account_customer_preferred_location")}
                        value={customer.preferred_location}
                      />
                      <DetailRow
                        label={t("account_customer_budget_range")}
                        value={customer.budget_range}
                      />
                      <DetailRow
                        label={t("account_customer_interested_types")}
                        value={customer.interested_property_types}
                      />
                    </div>
                  ) : (
                    <p>{t("account_customer_not_found")}</p>
                  )
                ) : (
                  <p>{t("account_no_profile_role")}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>



          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>{t("account_notifications_title")}</CardTitle>
                <CardDescription>
                  {t("account_notifications_desc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label
                      htmlFor="email-notifications"
                      className="font-medium"
                    >
                      {t("account_notifications_email")}
                    </Label>
                    <p className="text-sm text-gray-500">
                      {t("account_notifications_email_desc")}
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={(checked) =>
                      handleNotificationChange("email", checked)
                    }
                    disabled={notificationLoading}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label htmlFor="sms-notifications" className="font-medium">
                      {t("account_notifications_sms")}
                    </Label>
                    <p className="text-sm text-gray-500">
                      {t("account_notifications_sms_desc")}
                    </p>
                  </div>
                  <Switch
                    id="sms-notifications"
                    checked={smsNotifications}
                    onCheckedChange={(checked) =>
                      handleNotificationChange("sms", checked)
                    }
                    disabled={notificationLoading}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit dialogs */}
      {user?.id && (
        <>
          <EditFirstNameDialog
            open={openFirst}
            onOpenChange={setOpenFirst}
            userId={user.id}
            currentValue={profile.first_name || metadataFirstName}
            onUpdated={(v: string) =>
              setProfile(p => ({ ...p, first_name: v }))
            }
          />
          <EditLastNameDialog
            open={openLast}
            onOpenChange={setOpenLast}
            userId={user.id}
            currentValue={profile.last_name || metadataLastName}
            onUpdated={(v: string) => setProfile(p => ({ ...p, last_name: v }))}
          />
          <EditPhoneDialog
            open={openPhone}
            onOpenChange={setOpenPhone}
            userId={user.id}
            currentValue={profile.phone || user?.phone}
            onUpdated={(v: string) => setProfile(p => ({ ...p, phone: v }))}
          />
        </>
      )}
    </div>
  );
}
