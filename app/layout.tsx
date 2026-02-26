import { AddAccountModal } from "@/components/auth/add-account-modal";
import { SessionGuard } from "@/components/auth/session-guard";
import { CookieConsent } from "@/components/common/cookie-consent";
import { ThemeProvider } from "@/components/common/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { LanguageProvider } from "@/contexts/language-context";
import { PropertyProvider } from "@/contexts/property-context";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// ✅ เพิ่ม metadata สำหรับ SEO และ performance
export const metadata: Metadata = {
  title: "TEEDIN EASY",
  description: "Real Estate Platform",
  generator: "v0.dev",
  icons: {
    icon: "/thai-icon.png?v=2",
    shortcut: "/thai-icon.png?v=2",
    apple: "/thai-icon.png?v=2",
  },
  // ✅ เพิ่ม manifest
  manifest: "/manifest.json",
};

// ✅ แยก viewport export ตาม Next.js 15 best practices
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("lang")?.value;
  const initialLang =
    cookieLang === "en" || cookieLang === "th" ? cookieLang : "th";
  return (
    <html lang={initialLang} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/thai-icon.png?v=2" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/thai-icon.png?v=2"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/thai-icon.png?v=2"
        />
        <link rel="shortcut icon" href="/thai-icon.png?v=2" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        {/* ✅ Google Fonts - Sukhumvit Set and IBM Plex Sans Thai */}
        <link
          href="https://fonts.googleapis.com/css2?family=Sukhumvit+Set:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Google Maps API Script removed from global layout to avoid loading on all pages. */}
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <PropertyProvider>
            <LanguageProvider initialLanguage={initialLang as "th" | "en"}>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                disableTransitionOnChange
              >
                <SessionGuard>{children}</SessionGuard>
                <CookieConsent />
                <Toaster />
                <AddAccountModal />
              </ThemeProvider>
            </LanguageProvider>
          </PropertyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
