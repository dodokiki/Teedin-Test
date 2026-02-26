"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { AnimatePresence, motion } from "framer-motion";
import { Cookie } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    setIsMounted(true);
    // Check if user has already consented
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      // Show banner after a small delay
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie_consent", "true");
    setIsVisible(false);
  };

  if (!isMounted) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed bottom-4 left-4 right-4 md:bottom-8 md:left-0 md:right-0 md:mx-auto md:max-w-3xl z-50 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-800 shadow-2xl"
        >
          <div className="container mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full shrink-0 hidden md:block">
                <Cookie className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <p className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                  <Cookie className="w-4 h-4 md:hidden text-blue-600" />
                  {language === "th"
                    ? "เว็บไซต์นี้ใช้คุกกี้"
                    : "This website uses cookies"}
                </p>
                <p>
                  {language === "th"
                    ? "เราใช้คุกกี้เพื่อเพิ่มประสิทธิภาพและประสบการณ์ที่ดีในการใช้งานเว็บไซต์ รวมถึงเพื่อวิเคราะห์การเข้าใช้งาน คุณสามารถศึกษารายละเอียดเพิ่มเติมได้ใน"
                    : 'We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept", you consent to our use of cookies. Read more in our'}{" "}
                  <Link
                    href="/privacy-policy"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {language === "th"
                      ? "นโยบายความเป็นส่วนตัว"
                      : "Privacy Policy"}
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none"
                onClick={() => setIsVisible(false)}
              >
                {language === "th" ? "ปิด" : "Close"}
              </Button>
              <Button
                size="sm"
                className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white"
                onClick={acceptCookies}
              >
                {language === "th" ? "ยอมรับทั้งหมด" : "Accept All"}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
