"use client";

import { OtpDrawer } from "@/components/auth/otp-drawer";
import { TermsModal } from "@/components/common/terms-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { Eye, EyeOff, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RegisterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export function RegisterDrawer({
  isOpen,
  onClose,
  onSwitchToLogin,
}: RegisterDrawerProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [showOtpDrawer, setShowOtpDrawer] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const isFinalizingRef = React.useRef(false); // ป้องกันการเรียก finalizeRegistration ซ้ำ
  const router = useRouter();
  const {
    loginWithOtp,
    finalizeRegistration,
    loginWithGoogle,
    loginWithLine,
    isLoggedIn,
  } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Reset all fields
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setConfirmPassword("");
      setAgree(false);
      setError("");
      setShowOtpDrawer(false);
      setShowTermsModal(false);
      setIsLoading(false);
      isFinalizingRef.current = false; // รีเซ็ตเมื่อเปิด drawer ใหม่
    } else {
      // Delay unmount for animation
      const timeout = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^0[0-9]{9}$/;
    return phoneRegex.test(phone);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setPhone(numericValue.slice(0, 10));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Basic validation
      if (
        !firstName ||
        !lastName ||
        !email ||
        !phone ||
        !password ||
        !confirmPassword
      ) {
        setError("กรุณากรอกข้อมูลให้ครบถ้วน");
        setIsLoading(false);
        return;
      }

      if (!validateEmail(email)) {
        setError("รูปแบบอีเมลไม่ถูกต้อง");
        setIsLoading(false);
        return;
      }

      if (!validatePhone(phone)) {
        setError("รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง");
        setIsLoading(false);
        return;
      }

      if (password && password.length < 8) {
        setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
        setIsLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError("รหัสผ่านไม่ตรงกัน");
        setIsLoading(false);
        return;
      }

      if (!agree) {
        setError("กรุณายอมรับเงื่อนไขและข้อตกลง");
        setIsLoading(false);
        return;
      }

      // ตรวจสอบข้อมูลซ้ำก่อนส่ง OTP
      const duplicateResponse = await fetch("/api/check-user-exists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // ตรวจสอบเฉพาะอีเมลซ้ำเท่านั้น ตามนโยบายใหม่
        body: JSON.stringify({ email }),
      });

      const duplicateData = await duplicateResponse.json();

      if (duplicateData.exists) {
        setError(duplicateData.message);
        setIsLoading(false);
        return;
      }

      if (!duplicateResponse.ok) {
        setError(duplicateData.error || "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล");
        setIsLoading(false);
        return;
      }

      // ขั้นตอนใหม่: ส่ง OTP ทาง SMS ก่อนสร้างข้อมูลในตารางผู้ใช้ใดๆ
      const { error: otpError } = await loginWithOtp(phone);
      if (otpError) {
        setError(otpError.message || "ไม่สามารถส่งรหัส OTP ได้");
        setIsLoading(false);
        return;
      }

      // แสดงหน้ากรอก OTP
      setSuccessMessage(
        "ส่งรหัส OTP ไปยังเบอร์ของคุณแล้ว กรุณายืนยันเพื่อสร้างบัญชี"
      );
      setShowOtpDrawer(true);
      setIsLoading(false);
    } catch (error: unknown) {
      console.error("Registration exception:", error);
      const message =
        error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลงทะเบียน";
      setError(message);
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await loginWithGoogle();
      if (result.error) {
        setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google");
        setIsLoading(false);
      }
      // ถ้าไม่มี error จะ redirect ไป Google OAuth page
    } catch (error) {
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google");
      setIsLoading(false);
    }
  };

  const handleLineLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await loginWithLine();
      if (result.error) {
        setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย LINE");
        setIsLoading(false);
      }
      // ถ้าไม่มี error จะ redirect ไป LINE OAuth page
    } catch (error) {
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย LINE");
      setIsLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 transition-opacity"
          aria-hidden="true"
        ></div>
      )}
      <TermsModal
        isOpen={showTermsModal}
        onAccept={() => {
          setShowTermsModal(false);
          setAgree(true);
        }}
        onClose={() => setShowTermsModal(false)}
      />
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 transition-all duration-300 ease-in-out animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center max-w-md w-full mx-4 transition-all duration-300 ease-in-out scale-100 opacity-100">
            <div className="rounded-full bg-green-100 p-4 mb-4">
              <svg width="64" height="64" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="12" fill="#10B981" />
                <path
                  d="M8 12.5l2.5 2.5L16 9.5"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-2xl font-bold text-black mb-2 text-center">
              ลงทะเบียนสำเร็จ!
            </div>
            <div className="text-gray-600 mb-6 text-center">
              {successMessage}
            </div>
            <Button
              className="w-full h-14 text-lg bg-[#007AFF] hover:bg-[#0066d6] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
              onClick={() => {
                setShowSuccessModal(false);
                // เปลี่ยนไปหน้าเข้าสู่ระบบ โดยไม่ล็อกอินอัตโนมัติ
                onSwitchToLogin();
              }}
            >
              เข้าสู่ระบบ
            </Button>
          </div>
        </div>
      )}
      {!showTermsModal && !showSuccessModal && (
        <>
          {" "}
          <div
            className={`fixed inset-y-0 right-0 w-full sm:w-[450px] bg-gradient-to-br from-white via-gray-50 to-blue-50 backdrop-blur-sm z-[60] transform transition-all duration-300 ease-in-out shadow-2xl rounded-l-2xl
              ${isOpen && isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
            style={{ marginTop: 0, paddingTop: 0 }}
          >
            <div className="h-full flex flex-col p-6 overflow-y-auto">
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/60 backdrop-blur-sm transition-all duration-200"
                  disabled={isLoading}
                  title="Close"
                >
                  <X size={24} className="text-gray-600" />
                </button>
              </div>
              <div className="flex-1 mt-4">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-black mb-2">
                    ลงทะเบียนใช้งาน
                  </h2>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label
                          htmlFor="firstName"
                          className="text-sm font-medium"
                        >
                          ชื่อ
                        </Label>
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="กรอกชื่อ"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          className="h-10 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor="lastName"
                          className="text-sm font-medium"
                        >
                          นามสกุล
                        </Label>
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="กรอกนามสกุล"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          className="h-10 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor="register-email"
                        className="text-sm font-medium"
                      >
                        อีเมล
                      </Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="Example@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="h-10 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="phone" className="text-sm font-medium">
                        เบอร์โทร
                      </Label>
                      <Input
                        id="phone"
                        type="text"
                        pattern="[0-9]*"
                        maxLength={10}
                        placeholder="0812345678"
                        value={phone}
                        onChange={handlePhoneChange}
                        className="h-10 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor="register-password"
                        className="text-sm font-medium"
                      >
                        รหัสผ่าน
                      </Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="อย่างน้อย 8 ตัวอักษร"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="h-10 text-sm pr-10 text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-colors duration-200"
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor="register-confirmPassword"
                        className="text-sm font-medium"
                      >
                        ยืนยันรหัสผ่าน
                      </Label>
                      <div className="relative">
                        <Input
                          id="register-confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="อย่างน้อย 8 ตัวอักษร"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="h-10 text-sm pr-10 text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-colors duration-200"
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-3 mb-2">
                      <Checkbox
                        id="agree"
                        checked={agree}
                        onCheckedChange={checked =>
                          setAgree(checked as boolean)
                        }
                        disabled={isLoading}
                      />
                      <Label
                        htmlFor="agree"
                        className="text-xs text-gray-600 leading-relaxed"
                      >
                        ยอมรับ{" "}
                        <button
                          type="button"
                          className="text-blue-600 hover:text-purple-600 font-semibold transition-colors duration-200 hover:underline"
                          onClick={() => setShowTermsModal(true)}
                        >
                          ข้อกำหนดเเละนโยบายความเป็นส่วนตัว
                        </button>{" "}
                        ทั้งหมด
                      </Label>
                    </div>
                    {error && (
                      <div className="text-red-500 text-sm mt-1">{error}</div>
                    )}{" "}
                    <Button
                      type="submit"
                      className="w-full h-10 text-base bg-[#007AFF] hover:bg-[#0066d6] text-white mt-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 font-semibold focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          กำลังดำเนินการ...
                        </div>
                      ) : (
                        "ยืนยัน"
                      )}
                    </Button>
                  </div>
                </form>
                <div className="relative flex items-center my-4">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink mx-4 text-gray-600">หรือ</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 text-sm bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 flex items-center justify-start pl-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                    disabled={isLoading}
                    onClick={handleGoogleLogin}
                  >
                    <div className="flex items-center justify-center w-6 h-6 mr-3">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    </div>
                    <span className="flex-1 text-center pr-8">
                      ลงทะเบียนด้วย Google
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 text-sm bg-[#06C755] hover:bg-[#05B54A] text-white flex items-center justify-start pl-4 border-0 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                    disabled={isLoading}
                    onClick={handleLineLogin}
                  >
                    <div className="flex items-center justify-center w-6 h-6 mr-3">
                      <img
                        src="/LINE_New_App_Icon_(2020-12) (1).png"
                        alt="LINE"
                        className="w-6 h-6"
                      />
                    </div>
                    <span className="flex-1 text-center pr-8">
                      ลงทะเบียนด้วย LINE
                    </span>
                  </Button>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-gray-600">
                    มีบัญชีอยู่แล้ว?{" "}
                    <button
                      type="button"
                      className="text-blue-600 hover:text-purple-600 font-semibold transition-colors duration-200 hover:underline"
                      onClick={onSwitchToLogin}
                      disabled={isLoading}
                    >
                      เข้าสู่ระบบ
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
          <OtpDrawer
            isOpen={showOtpDrawer}
            phone={phone}
            onClose={() => {
              setShowOtpDrawer(false);
            }}
            onSuccess={() => {
              // ป้องกันการเรียก finalizeRegistration ซ้ำ
              if (isFinalizingRef.current) {
                console.log(
                  "⚠️ finalizeRegistration กำลังดำเนินการอยู่แล้ว ข้ามการเรียกซ้ำ"
                );
                return;
              }

              // เมื่อ OTP ยืนยันสำเร็จ ค่อย finalize การสมัคร
              (async () => {
                isFinalizingRef.current = true;
                setIsLoading(true);
                setShowOtpDrawer(false);

                try {
                  const { error } = await finalizeRegistration({
                    firstName,
                    lastName,
                    email,
                    phone,
                    password,
                    role: "customer",
                  });

                  if (error) {
                    console.error("Finalize registration error:", error);

                    // จัดการข้อความ error ให้เข้าใจง่าย
                    let errorMessage =
                      "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

                    if (error?.message) {
                      const message = error.message.toLowerCase();
                      // ถ้า user ถูกสร้างแล้ว แต่มี error อาจหมายความว่าสร้างสำเร็จแล้ว
                      // แต่มีปัญหาตอนสร้าง record อื่นๆ
                      if (
                        message.includes("email") &&
                        (message.includes("already") ||
                          message.includes("ถูกใช้") ||
                          message.includes("already registered"))
                      ) {
                        // ตรวจสอบว่าบัญชีถูกสร้างจริงหรือไม่
                        // ถ้าเป็น "already registered" อาจหมายความว่าสร้างสำเร็จแล้ว
                        // ให้ไปหน้า login แทน
                        console.log(
                          "ℹ️ User may already be registered, redirecting to login"
                        );
                        errorMessage = "";
                        // ไม่แสดง error แต่ให้ไปหน้า login
                      } else if (
                        message.includes("duplicate") ||
                        message.includes("ซ้ำ")
                      ) {
                        errorMessage =
                          "ข้อมูลนี้ถูกใช้งานแล้ว กรุณาตรวจสอบและลองใหม่";
                      } else if (message.includes("users_email_key")) {
                        // Duplicate key อาจหมายความว่าสร้างสำเร็จแล้ว
                        console.log(
                          "ℹ️ Duplicate key error, user may already exist, redirecting to login"
                        );
                        errorMessage = "";
                      } else {
                        errorMessage = error.message;
                      }
                    }

                    if (errorMessage) {
                      setError(errorMessage);
                      isFinalizingRef.current = false;
                      setIsLoading(false);
                      return; // อย่าย้ายไปหน้าเข้าสู่ระบบเมื่อเกิดข้อผิดพลาดจริง
                    }
                  }

                  // สำเร็จ: เข้าสู่ระบบอัตโนมัติและ redirect ไปหน้า dashboard
                  isFinalizingRef.current = false;
                  setIsLoading(false);

                  // รอสักครู่เพื่อให้ state updates เสร็จก่อน redirect
                  setTimeout(() => {
                    // ปิด drawer
                    onClose();
                    // Redirect to home page
                    router.push("/");
                  }, 500);
                } catch (err) {
                  console.error(
                    "Unexpected error in finalizeRegistration:",
                    err
                  );
                  setError("เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง");
                  isFinalizingRef.current = false;
                  setIsLoading(false);
                }
              })();
            }}
          />
        </>
      )}
    </>
  );
}
