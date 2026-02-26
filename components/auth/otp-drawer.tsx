"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { ChevronLeft } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface OtpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  onSuccess?: () => void; // เพิ่ม prop สำหรับ callback สำเร็จ
}

export function OtpDrawer({
  isOpen,
  onClose,
  phone,
  onSuccess,
}: OtpDrawerProps) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const autoSubmitTimer = useRef<NodeJS.Timeout | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const { verifyOtp, loginWithOtp } = useAuth();
  const cooldownTimer = useRef<NodeJS.Timeout | null>(null);
  const onSuccessCalledRef = useRef(false); // ป้องกันการเรียก onSuccess ซ้ำ

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setOtp("");
      setError("");
      setIsLoading(false);
      onSuccessCalledRef.current = false; // รีเซ็ตเมื่อเปิด drawer ใหม่
      // Start cooldown when the drawer opens for the first time
      if (!isCooldownActive) {
        setCooldown(60);
        setIsCooldownActive(true);
      }
    } else {
      const timeout = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isCooldownActive && cooldown > 0) {
      cooldownTimer.current = setTimeout(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    } else if (cooldown === 0) {
      setIsCooldownActive(false);
      if (cooldownTimer.current) {
        clearTimeout(cooldownTimer.current);
      }
    }
    return () => {
      if (cooldownTimer.current) {
        clearTimeout(cooldownTimer.current);
      }
    };
  }, [isCooldownActive, cooldown]);

  const verifyCurrentOtp = async () => {
    if (isLoading) return;
    if (otp.length !== 6) return;
    setIsLoading(true);
    setError("");
    try {
      const { error } = await verifyOtp(phone, otp);
      if (error) {
        setError(error.message || "รหัส OTP ไม่ถูกต้อง");
        setIsLoading(false);
        return;
      }
      setShowSuccessModal(true);
      setIsLoading(false);
      // ไม่เรียก onSuccess ที่นี่ เพราะจะเรียกจากปุ่มใน success modal แทน
      // เพื่อป้องกันการเรียกซ้ำ
    } catch (error: unknown) {
      console.error("OTP verification error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการยืนยัน OTP";
      setError(message);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("กรุณากรอกรหัส OTP 6 หลัก");
      return;
    }
    await verifyCurrentOtp();
  };

  const scheduleAutoSubmit = (candidate: string) => {
    if (candidate.length === 6 && !isLoading) {
      if (autoSubmitTimer.current) clearTimeout(autoSubmitTimer.current);
      autoSubmitTimer.current = setTimeout(() => {
        verifyCurrentOtp();
      }, 200);
    }
  };

  // ส่ง OTP ใหม่
  const handleResendOtp = async () => {
    if (isCooldownActive) return;

    try {
      setIsLoading(true);
      const { error } = await loginWithOtp(phone);
      if (error) {
        setError(error.message || "ส่งรหัสใหม่ไม่สำเร็จ");
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      // แสดงข้อความสำเร็จ
      setError("ส่งรหัส OTP ใหม่เรียบร้อยแล้ว");
      setCooldown(60);
      setIsCooldownActive(true);
      setTimeout(() => setError(""), 3000);
    } catch (error) {
      console.error("Resend OTP error:", error);
      setError("เกิดข้อผิดพลาดในการส่งรหัส OTP ใหม่");
      setIsLoading(false);
    }
  };

  return (
    <>
      {isOpen && !showSuccessModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        ></div>
      )}
      {isVisible && !showSuccessModal && (
        <div
          className={`fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white z-[60] transform transition-all duration-300 ease-in-out
            ${isOpen && isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
          style={{ marginTop: 0, paddingTop: 0 }}
        >
          <div className="h-full flex flex-col px-10 py-12 overflow-y-auto">
            <div className="flex items-center mb-8">
              <button
                onClick={onClose}
                className="p-2 mr-2 rounded-full hover:bg-gray-100 text-gray-800"
                title="ย้อนกลับ"
              >
                <ChevronLeft size={28} className="text-gray-800" />
              </button>
              <span className="text-base text-gray-800 font-medium">
                ย้อนกลับ
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center w-full">
              <h2 className="text-3xl font-bold mb-2 w-full text-left text-gray-900">
                ยืนยันรหัส OTP
              </h2>
              <div className="mb-8 w-full text-left text-gray-700 text-base">
                รหัสยืนยันได้ถูกส่งไปยังเบอร์โทรศัพท์ {phone ? phone : "ของคุณ"}{" "}
                แล้ว
              </div>
              <form
                onSubmit={handleSubmit}
                className="w-full flex flex-col items-center"
              >
                <div className="flex justify-center gap-4 mb-10 w-full">
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <Input
                      key={i}
                      maxLength={1}
                      className={`w-16 h-16 text-center text-3xl border-2 rounded-2xl font-bold text-blue-600 bg-white ${typeof window !== "undefined" && window.document.activeElement === codeRefs.current[i] ? "border-blue-500" : "border-blue-300"}`}
                      value={otp[i] || ""}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        const arr = otp.split("");
                        arr[i] = val;
                        const nextOtp = arr.join("").slice(0, 6);
                        setOtp(nextOtp);
                        if (val && codeRefs.current[i + 1]) {
                          codeRefs.current[i + 1]?.focus();
                        }
                        scheduleAutoSubmit(nextOtp);
                      }}
                      onPaste={e => {
                        const pasted = e.clipboardData?.getData("text") || "";
                        const code = pasted.replace(/\D/g, "").slice(0, 6);
                        if (!code) return;
                        e.preventDefault();
                        setOtp(code);
                        scheduleAutoSubmit(code);
                      }}
                      ref={el => {
                        codeRefs.current[i] = el;
                      }}
                      onKeyDown={e => {
                        if (
                          e.key === "Backspace" &&
                          !otp[i] &&
                          codeRefs.current[i - 1]
                        )
                          codeRefs.current[i - 1]?.focus();
                      }}
                      autoFocus={i === 0}
                      disabled={isLoading}
                    />
                  ))}
                </div>
                {error && (
                  <div
                    className={`text-sm mb-2 font-medium ${error.includes("สำเร็จ") || error.includes("เรียบร้อย") ? "text-green-600" : "text-red-600"}`}
                  >
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full h-14 text-lg bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
                  disabled={isLoading}
                >
                  {isLoading ? "กำลังดำเนินการ..." : "ยืนยัน"}
                </Button>

                <div className="mt-6 text-center">
                  <p className="text-gray-700">
                    ไม่ได้รับรหัส?{" "}
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium disabled:text-gray-400 disabled:no-underline"
                      onClick={handleResendOtp}
                      disabled={isLoading || isCooldownActive}
                    >
                      {isCooldownActive
                        ? `ส่งรหัสใหม่อีกครั้งใน ${cooldown} วิ`
                        : "ส่งรหัสใหม่อีกครั้ง"}
                    </button>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 transition-all duration-300 ease-in-out animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center max-w-md w-full mx-4 transition-all duration-300 ease-in-out scale-100 opacity-100">
            <div className="rounded-full bg-blue-100 p-4 mb-4">
              <svg width="64" height="64" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="12" fill="#3B82F6" />
                <path
                  d="M8 12.5l2.5 2.5L16 9.5"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-2xl font-bold text-blue-700 mb-2 text-center">
              ยืนยันตัวตนสำเร็จ!
            </div>
            <div className="text-gray-600 mb-6 text-center">
              ยินดีด้วยคุณได้ยืนยันตัวตนสำเร็จแล้ว
              <br />
              คลิกปุ่มยืนยันเพื่อกลับเข้าสู่เว็บไซต์
            </div>
            <Button
              className="w-full h-14 text-lg bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => {
                // ป้องกันการเรียก onSuccess ซ้ำ
                if (onSuccess && !onSuccessCalledRef.current) {
                  onSuccessCalledRef.current = true;
                  setShowSuccessModal(false);
                  onClose();
                  onSuccess();
                }
              }}
            >
              ยืนยัน
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
