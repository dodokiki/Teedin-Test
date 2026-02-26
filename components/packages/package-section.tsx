"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle,
  CreditCard,
  FileText,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PricingCard, SERVICE_PACKAGES, ServiceCard } from "./package-card";

declare global {
  interface Window {
    OmiseCard?: any;
  }
}

interface PricingSectionProps {
  propertyId?: string;
}

// Cache key for property payments
const PACKAGE_CACHE_KEY = "property-package-cache-v1";

// Helper to read cache synchronously
function getPackageCache(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const cached = localStorage.getItem(PACKAGE_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setPackageCache(propertyId: string, amount: number) {
  try {
    const cache = getPackageCache();
    cache[propertyId] = amount;
    localStorage.setItem(PACKAGE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export function PricingSection({ propertyId }: PricingSectionProps) {
  const { language } = useLanguage();
  const { session } = useAuth();
  const isEn = language === "en";
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAlreadyPaidModal, setShowAlreadyPaidModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [isPollingPayment, setIsPollingPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentChargeId, setCurrentChargeId] = useState<string | null>(null);

  // Initialize from cache to prevent flash
  const [currentPlanAmount, setCurrentPlanAmount] = useState<number | null>(() => {
    if (!propertyId) return null;
    const cache = getPackageCache();
    return cache[propertyId] ?? null;
  });
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getAccessToken = async () => {
    const {
      data: { session: sbSession },
    } = await supabase.auth.getSession();

    return sbSession?.access_token || session?.access_token || null;
  };

  // Fetch current plan on mount or when propertyId changes
  useEffect(() => {
    // First, try to load from cache immediately
    if (propertyId) {
      const cache = getPackageCache();
      if (cache[propertyId]) {
        setCurrentPlanAmount(cache[propertyId]);
      }
    }

    async function fetchCurrentPlan() {
      if (!propertyId) {
        setCurrentPlanAmount(null);
        return;
      }
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) return;

        const response = await fetch(
          `/api/property-payments/access?propertyId=${propertyId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const data = await response.json();
        if (data.success && data.hasAccess && data.currentPlanAmount) {
          setCurrentPlanAmount(data.currentPlanAmount);
          setPackageCache(propertyId, data.currentPlanAmount);
        } else {
          setCurrentPlanAmount(null);
        }
      } catch (error) {
        console.error("Error fetching plan:", error);
        setCurrentPlanAmount(null);
      }
    }
    fetchCurrentPlan();
  }, [propertyId, session?.access_token]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const startPollingPayment = (chargeId: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setIsPollingPayment(true);
    let pollCount = 0;
    const maxPolls = 60; // 5 minutes (5 seconds * 60)

    const pollInterval = setInterval(async () => {
      pollCount++;

      try {
        const accessToken = await getAccessToken();

        if (!accessToken) {
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          setIsPollingPayment(false);
          toast.error(
            isEn
              ? "Please login again to check payment status."
              : "กรุณาเข้าสู่ระบบอีกครั้งเพื่อตรวจสอบสถานะการชำระเงิน"
          );
          return;
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        };

        // Check access/payment status
        // We use the access endpoint because it checks for any successful payment for this property by this user
        const response = await fetch(
          `/api/property-payments/access?propertyId=${propertyId}`,
          {
            credentials: "include",
            headers,
          }
        );
        const result = await response.json();

        if (result.hasAccess) {
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          setIsPollingPayment(false);
          setShowQrModal(false);
          setQrCodeUrl(null);
          setCurrentPlanAmount(result.currentPlanAmount); // Update current plan
          setShowSuccessModal(true);
        } else if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          setIsPollingPayment(false);
          toast.error(
            isEn
              ? "Payment timeout. Please try again."
              : "หมดเวลารอการชำระเงิน กรุณาลองใหม่อีกครั้ง"
          );
        }
      } catch (error) {
        console.error("Polling error:", error);
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          pollingIntervalRef.current = null;
          setIsPollingPayment(false);
        }
      }
    }, 5000); // Poll every 5 seconds

    pollingIntervalRef.current = pollInterval;
  };

  const handlePurchase = (pkg: ServiceCard) => {
    // Temporary disabled for 6 months
    const systemAvailable = false;

    if (!systemAvailable) {
      toast.info(
        isEn
          ? "System Maintenance: This feature will be available in the next 6 months."
          : "ขออภัย ระบบยังไม่เปิดให้บริการในขณะนี้ "
      );
      return;
    }

    if (!propertyId) {
      toast.error(
        isEn
          ? "Property ID is missing. Please select a property to boost."
          : "ไม่พบรหัสประกาศ กรุณาเลือกประกาศที่ต้องการโปรโมท"
      );
      return;
    }

    if (!window.OmiseCard) {
      toast.error(
        isEn
          ? "Payment system is loading. Please try again."
          : "ระบบชำระเงินกำลังโหลด กรุณาลองใหม่อีกครั้ง"
      );
      return;
    }

    const price = parseInt(isEn ? pkg.priceEn : pkg.priceTh);

    window.OmiseCard.configure({
      publicKey: process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY,
      currency: "thb",
      frameLabel: "TEDIN EASY",
      submitLabel: isEn ? "Pay Now" : "ชำระเงิน",
      buttonLabel: isEn ? "Pay" : "ชำระเงิน",
    });

    window.OmiseCard.open({
      amount: price * 100,
      onCreateTokenSuccess: async (token: string) => {
        await handleCharge(token);
      },
      onCreateSourceSuccess: async (source: { id: string }) => {
        await handleCharge(source?.id);
      },
      onFormClosed: () => {
        // Handle form closing if needed
      },
      otherPaymentMethods: ["promptpay", "truemoney"],
    });

    async function handleCharge(paymentRef: string | undefined) {
      if (!paymentRef) {
        toast.error(
          isEn
            ? "Payment could not be created. Please try again."
            : "ไม่สามารถสร้างการชำระเงินได้ กรุณาลองอีกครั้ง"
        );
        return;
      }

      setIsProcessing(true);

      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

      try {
        try {
          // Check if it's a source (starts with src_) or token (tokn_)
          const isSource = paymentRef.startsWith("src_");

          const payload: any = {
            amount: price,
            propertyId: propertyId,
            description: `Purchase package: ${isEn ? pkg.titleEn : pkg.titleTh}`,
          };

          if (isSource) {
            payload.source = paymentRef;
          } else {
            payload.token = paymentRef;
          }

          // Get access token using Supabase client
          const accessToken = await getAccessToken();

          if (!accessToken) {
            toast.error(
              isEn
                ? "Please login as an agent before purchasing a package."
                : "กรุณาเข้าสู่ระบบในฐานะนายหน้าก่อนชำระค่าบริการ"
            );
            return;
          }

          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          };

          const response = await fetch("/api/omise-charge", {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload),
            credentials: "include", // Ensure cookies are sent
            signal: controller.signal,
          });

          clearTimeout(timeoutId); // Clear timeout on response

          const result = await response.json();

          if (result.alreadyPaid) {
            setIsProcessing(false);
            setShowAlreadyPaidModal(true);
            return;
          }

          if (result.success) {
            if (
              result.charge?.status === "pending" &&
              result.charge?.source?.scannable_code
            ) {
              // Show QR Code with best-effort URI
              const qrUri =
                result.charge.source.scannable_code.image?.download_uri ||
                result.charge.source.scannable_code.image?.uri ||
                null;

              if (qrUri) {
                setQrCodeUrl(qrUri);
                setShowQrModal(true);
                setCurrentChargeId(result.charge.id);
                startPollingPayment(result.charge.id);
              } else {
                toast.error(
                  isEn
                    ? "QR code not available yet. Please try again."
                    : "ไม่พบ QR code กรุณาลองใหม่อีกครั้ง"
                );
              }
            } else {
              // Update current plan immediately on success
              setCurrentPlanAmount(price);
              setShowSuccessModal(true);
            }
          } else {
            toast.error(
              `${isEn ? "Payment failed" : "การชำระเงินล้มเหลว"}: ${result.error
              }`
            );
          }
        } catch (error: any) {
          if (error.name === "AbortError") {
            toast.error(
              isEn
                ? "Payment request timed out. Please try again."
                : "การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง"
            );
          } else {
            console.error("Payment error:", error);
            toast.error(isEn ? "An error occurred." : "เกิดข้อผิดพลาด");
          }
        }
      } catch (error) {
        console.error("Payment error:", error);
        toast.error(isEn ? "An error occurred." : "เกิดข้อผิดพลาด");
      } finally {
        clearTimeout(timeoutId);
        setIsProcessing(false);
      }
    }
  };

  const headingLabel = isEn ? "Pricing" : "แพ็กเกจ";
  const headingTitle = isEn
    ? "Boost Your Property Visibility & Sell Faster"
    : "ดันประกาศของคุณให้เห็นก่อนใคร ปิดการขายได้ไวกว่าเดิม";
  const headingDescription = isEn
    ? "Choose the perfect plan to highlight your property. Higher visibility means more views, more leads, and faster deals. No hidden fees."
    : "เลือกแพ็กเกจที่ใช่เพื่อโปรโมททรัพย์ของคุณ การมองเห็นที่มากขึ้นหมายถึงยอดวิวที่เยอะขึ้น ลูกค้าที่สนใจมากขึ้น และปิดดีลได้เร็วยิ่งขึ้น จ่ายครั้งเดียวจบ ไม่มีข้อผูกมัด";
  const featuredIndex = 3; // แพ็กฮิต 30 วัน

  // Group packages
  const packagesWithIndex = SERVICE_PACKAGES.map((pkg, index) => ({
    pkg,
    index,
  }));
  // Top row: 15, 30, 45 days (Indices 2, 3, 4)
  const mainGroup = [
    packagesWithIndex[2],
    packagesWithIndex[3],
    packagesWithIndex[4],
  ];
  // Bottom row: 3, 7 days (Indices 0, 1)
  const trialGroup = [packagesWithIndex[0], packagesWithIndex[1]];

  return (
    <section className="bg-slate-50 py-20 sm:py-24">
      <Script
        src="https://cdn.omise.co/omise.js"
        onLoad={() => {
          window.OmiseCard?.configure({
            publicKey: process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY,
            currency: "thb",
            frameLabel: "TEDIN EASY",
            submitLabel: "ชำระเงิน",
            buttonLabel: "ชำระเงิน",
          });
        }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 flex flex-col items-center gap-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            {headingTitle}
          </h2>
          <p className="max-w-3xl text-base leading-relaxed text-slate-600">
            {headingDescription}
          </p>
        </div>

        {/* Main Packages (Results Oriented) */}
        <div className="mb-12">
          <div className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-5 py-2 shadow-sm">
              <Sparkles className="h-4 w-4 text-blue-600 fill-blue-600" />
              <span className="text-sm font-medium text-slate-700">
                {isEn
                  ? "Recommended for Best Results"
                  : "แนะนำเพื่อผลลัพธ์ที่ดีที่สุด"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-6 lg:gap-8 isolate items-center">
            {mainGroup.map(({ pkg, index }) => {
              const price = parseInt(pkg.priceTh);
              return (
                <div
                  key={index}
                  className="w-full max-w-[300px] lg:max-w-[320px]"
                >
                  <PricingCard
                    tier={pkg}
                    featured={index === featuredIndex}
                    isCurrentPlan={
                      currentPlanAmount !== null && currentPlanAmount === price
                    }
                    onPurchase={handlePurchase}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="relative mb-12">
          <div
            className="absolute inset-0 flex items-center"
            aria-hidden="true"
          >
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-slate-50 px-4 text-sm text-slate-500">
              {isEn
                ? "Or start with a short trial"
                : "หรือเริ่มต้นด้วยการทดลองใช้"}
            </span>
          </div>
        </div>

        {/* Trial Packages */}
        <div className="flex flex-wrap justify-center gap-6 lg:gap-8 mb-16">
          {trialGroup.map(({ pkg, index }) => {
            const price = parseInt(pkg.priceTh);
            return (
              <div key={index} className="w-full max-w-[280px]">
                <PricingCard
                  tier={pkg}
                  featured={index === featuredIndex}
                  isCurrentPlan={
                    currentPlanAmount !== null && currentPlanAmount === price
                  }
                  onPurchase={handlePurchase}
                />
              </div>
            );
          })}
        </div>

        {/* Trust & Security */}
        <div className="flex flex-col items-center gap-6 text-center opacity-90">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-slate-600">
              {isEn
                ? "Secure payment via Credit Card & PromptPay QR"
                : "ชำระเงินปลอดภัยผ่านบัตรเครดิต และ PromptPay QR Code"}
            </p>
            <div className="flex items-center gap-4 text-slate-400">
              <div className="flex items-center gap-2" title="Credit Card">
                <CreditCard className="h-8 w-8" />
                <span className="text-xs font-semibold">Credit Card</span>
              </div>
              <div className="h-4 w-px bg-slate-300"></div>
              <div className="flex items-center gap-2" title="PromptPay">
                <QrCode className="h-8 w-8" />
                <span className="text-xs font-semibold">PromptPay</span>
              </div>
              <div className="h-4 w-px bg-slate-300"></div>
              <div className="flex items-center gap-2" title="Secure">
                <ShieldCheck className="h-8 w-8" />
                <span className="text-xs font-semibold">Secure</span>
              </div>
            </div>
          </div>

          {/* Refund Request Link */}
          <button
            onClick={() => setShowRefundModal(true)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors underline decoration-slate-300 underline-offset-4"
          >
            <FileText className="h-4 w-4" />
            {isEn ? "Request a Refund" : "ยื่นคำร้องขอคืนเงิน"}
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-2xl">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-lg font-medium text-slate-700">
              {isEn ? "Processing Payment..." : "กำลังดำเนินการชำระเงิน..."}
            </p>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {isEn ? "Scan to Pay" : "สแกนเพื่อชำระเงิน"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {isEn
                ? "Please scan the QR code below with your banking app."
                : "กรุณาสแกน QR Code ด้านล่างด้วยแอปธนาคารของคุณ"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4">
            {qrCodeUrl && (
              <img
                src={qrCodeUrl}
                alt="PromptPay QR Code"
                className="w-64 h-64 object-contain border rounded-lg shadow-sm"
              />
            )}

            {isPollingPayment && (
              <div className="mt-6 mb-2 rounded-xl bg-blue-50 text-blue-600 px-6 py-3 text-sm w-full max-w-xs">
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="font-medium">
                    {isEn ? "Waiting for payment..." : "กำลังรอการชำระเงิน..."}
                  </span>
                </div>
              </div>
            )}

            <p className="mt-4 text-sm text-slate-500 text-center">
              {isEn
                ? "Please scan the QR code with your banking app."
                : "ใช้แอปธนาคารหรือแอป e-wallet สแกน QR Code นี้"}
            </p>

            {currentChargeId && (
              <button
                onClick={async () => {
                  try {
                    const accessToken = await getAccessToken();
                    await fetch("/api/test/simulate-payment", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                      },
                      body: JSON.stringify({ chargeId: currentChargeId }),
                    });
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="mt-4 w-full max-w-xs rounded-full bg-green-100 text-green-700 font-semibold py-3 shadow-md hover:bg-green-200 transition-colors"
              >
                {isEn
                  ? "[TEST] Simulate Success"
                  : "[TEST] จำลองการชำระเงินสำเร็จ"}
              </button>
            )}

            <button
              onClick={() => {
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
                setIsPollingPayment(false);
                setShowQrModal(false);
                setQrCodeUrl(null);
              }}
              className="mt-6 w-full max-w-xs rounded-full bg-gray-200 text-gray-700 font-semibold py-3 shadow-md hover:bg-gray-300 transition-colors"
            >
              {isEn ? "Cancel" : "ยกเลิก"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Already Paid Modal */}
      <Dialog
        open={showAlreadyPaidModal}
        onOpenChange={open => {
          if (!open) {
            window.location.reload();
          }
          setShowAlreadyPaidModal(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 rounded-full bg-blue-100 p-3">
              <CheckCircle className="h-12 w-12 text-blue-600" />
            </div>
            <DialogTitle className="mb-2 text-2xl font-bold text-slate-900">
              {isEn ? "Package Already Active" : "แพ็กเกจใช้งานอยู่แล้ว"}
            </DialogTitle>
            <DialogDescription className="mb-6 text-base text-slate-600">
              {isEn
                ? "You have already purchased a package for this property. No need to pay again!"
                : "คุณได้ทำการชำระเงินสำหรับประกาศนี้ไปแล้ว ไม่จำเป็นต้องชำระซ้ำ"}
            </DialogDescription>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              {isEn ? "OK" : "ตกลง"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog
        open={showSuccessModal}
        onOpenChange={open => {
          if (!open) {
            window.location.reload();
          }
          setShowSuccessModal(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 rounded-full bg-green-100 p-3">
              <ShieldCheck className="h-12 w-12 text-green-600" />
            </div>
            <DialogTitle className="mb-2 text-2xl font-bold text-slate-900">
              {isEn ? "Payment Successful!" : "ชำระเงินสำเร็จ!"}
            </DialogTitle>
            <DialogDescription className="mb-6 text-base text-slate-600">
              {isEn
                ? "Your property has been successfully boosted. It is now featured and will appear at the top of search results."
                : "ประกาศของคุณได้รับการโปรโมทเรียบร้อยแล้ว ประกาศของคุณจะแสดงเป็นประกาศแนะนำและอยู่บนสุดของการค้นหา"}
            </DialogDescription>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              {isEn ? "Done" : "ตกลง"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Request Modal */}
      <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEn ? "Refund Request" : "คำร้องขอคืนเงิน"}
            </DialogTitle>
            <DialogDescription>
              {isEn
                ? "If you are not satisfied with our service, you can request a refund within 7 days."
                : "หากคุณไม่พอใจในบริการ คุณสามารถยื่นคำร้องขอคืนเงินได้ภายใน 7 วัน"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p className="mb-2 font-semibold text-slate-900">
                {isEn ? "Contact Support:" : "ติดต่อฝ่ายบริการลูกค้า:"}
              </p>
              <p>Email: support@tedin.com</p>
              <p>Line: @tedin-support</p>
              <p>Tel: 02-XXX-XXXX</p>
            </div>
            <p className="text-xs text-slate-500">
              {isEn
                ? "Please provide your transaction ID and reason for refund."
                : "กรุณาแจ้งหมายเลขรายการและเหตุผลในการขอคืนเงิน"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
