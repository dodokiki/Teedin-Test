"use client";

import { LogoutConfirmationModal } from "@/components/auth/logout-confirmation-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { isLoggedIn, userRole, loading } = useAuth();
  const router = useRouter();
  const [showLogout, setShowLogout] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    // เพิ่มการตรวจสอบเพื่อป้องกันการ redirect ซ้ำ
    if (!loading && isLoggedIn && userRole) {
      const currentPath = window.location.pathname;

      switch (userRole) {
        case "customer":
          // Redirect customers to account page
          if (currentPath === "/dashboard") {
            setIsRedirecting(true);
            router.push("/dashboard/account");
          }
          break;
        case "agent":
          if (currentPath === "/dashboard") {
            setIsRedirecting(true);
            router.push("/dashboard/agent");
          }
          break;
        // Remove auto-redirect for admin users to Super Admin
        // They should access Super Admin via dedicated login page only
      }
    }
  }, [isLoggedIn, userRole, router, loading]);

  if (loading || isRedirecting) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("checking_user_info")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t("please_wait_redirect")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">{t("dashboard_title")}</h1>

      {!isLoggedIn ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("please_login")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{t("you_are_not_logged_in_description")}</p>
            <Button onClick={() => router.push("/")}>
              {t("back_to_home")}
            </Button>
          </CardContent>
        </Card>
      ) : userRole === "admin" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("admin_dashboard")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{t("welcome_admin")}</p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => router.push("/dashboard/account")}
                  className="justify-start"
                >
                  {t("manage_my_account")}
                </Button>
                <Button
                  onClick={() => window.open("/super-admin-login", "_blank")}
                  variant="outline"
                  className="justify-start"
                >
                  {t("open_super_admin_login_new_window")}
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                {t("note_super_admin")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : !userRole ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("checking_user_info")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t("please_wait_redirect")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("welcome")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{t("redirecting")}</p>
          </CardContent>
        </Card>
      )}

      {userRole === "admin" && isLoggedIn && (
        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={() => setShowLogout(true)}>
            {t("logout")}
          </Button>
        </div>
      )}
      <LogoutConfirmationModal
        isOpen={showLogout}
        onClose={() => setShowLogout(false)}
      />
    </div>
  );
}
