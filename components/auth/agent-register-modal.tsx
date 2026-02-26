"use client";

import { AgentSuccessModal } from "@/components/auth/agent-success-modal";
import { OtpDrawer } from "@/components/auth/otp-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, X } from "lucide-react";
import { useEffect, useState } from "react";

interface AgentRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgentRegisterModal({
  isOpen,
  onClose,
}: AgentRegisterModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showOtpDrawer, setShowOtpDrawer] = useState(false);
  const { user, loginWithOtp } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    propertyTypes: [] as string[],
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrors({});
      setShowOtpDrawer(false);
      // Pre-fill from user data if available
      if (user) {
        setFormData(prev => ({
          ...prev,
          firstName: user.user_metadata?.first_name || "",
          lastName: user.user_metadata?.last_name || "",
          email: user.email || "",
          phone: user.user_metadata?.phone || "",
        }));
      }
    }
  }, [isOpen, user]);

  const validateStep1 = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "กรุณากรอกชื่อ";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "กรุณากรอกนามสกุล";
    }
    if (!formData.email.trim()) {
      newErrors.email = "กรุณากรอกอีเมล";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "กรุณากรอกอีเมลให้ถูกต้อง";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "กรุณากรอกเบอร์โทร";
    } else if (!/^0\d{9}$/.test(formData.phone.trim())) {
      newErrors.phone = "กรุณากรอกเบอร์โทรให้ถูกต้อง (10 หลัก)";
    }
    if (formData.propertyTypes.length === 0) {
      newErrors.propertyTypes = "กรุณาเลือกประเภทอสังหาอย่างน้อย 1 ประเภท";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setFormData(prev => ({ ...prev, phone: numericValue.slice(0, 10) }));
  };

  const handleSendOTP = async () => {
    if (!validateStep1()) {
      toast({
        variant: "destructive",
        title: "กรุณากรอกข้อมูลให้ครบถ้วน",
        description: "กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use the same OTP system as regular registration
      const { error } = await loginWithOtp(formData.phone);

      if (error) {
        toast({
          variant: "destructive",
          title: "เกิดข้อผิดพลาด",
          description: error.message || "ไม่สามารถส่งรหัส OTP ได้ กรุณาลองใหม่อีกครั้ง",
        });
        setIsLoading(false);
        return;
      }

      // Show OTP drawer
      setShowOtpDrawer(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Send OTP error:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งรหัส OTP ได้ กรุณาลองใหม่อีกครั้ง",
      });
      setIsLoading(false);
    }
  };

  const handleOtpSuccess = async () => {
    // OTP verified successfully, now save to database
    setIsLoading(true);
    setShowOtpDrawer(false);

    try {
      if (!user) {
        throw new Error("ไม่พบข้อมูลผู้ใช้");
      }

      toast({
        title: "⏳ กำลังบันทึกข้อมูล",
        description: "กรุณารอสักครู่...",
        duration: 3000,
      });

      // Save to users table
      const { error: saveError } = await supabase
        .from("users")
        .upsert({
          id: user.id,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          role: "agent",
          updated_at: new Date().toISOString(),
        });

      if (saveError) {
        throw new Error("ไม่สามารถบันทึกข้อมูลได้: " + saveError.message);
      }

      // Create agent record with property types
      const { error: agentError } = await supabase
        .from("agents")
        .upsert({
          user_id: user.id,
          property_types: formData.propertyTypes,
          status: "active",
          phone: formData.phone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (agentError) {
        console.warn("Agent record creation:", agentError);
      }

      // Show success modal
      setShowSuccessModal(true);
    } catch (error) {
      console.error("❌ Save error:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description:
          error instanceof Error
            ? error.message
            : "ไม่สามารถบันทึกข้อมูลได้",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    onClose();
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      {!showOtpDrawer && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      )}

      {/* Main Modal */}
      {!showOtpDrawer && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-gradient-to-br from-white via-gray-50 to-blue-50 backdrop-blur-sm z-[60] overflow-y-auto shadow-2xl rounded-l-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <button
                onClick={onClose}
                className="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-white/60 transition-all duration-200"
                aria-label="Close modal"
                type="button"
              >
                <X size={24} />
              </button>
            </div>
            <h2 className="text-2xl font-semibold text-center mt-6 mb-8 text-black">
              ยืนยันตัวตนเพื่อลงประกาศ
            </h2>
            {/* Progress Steps */}
            <div className="relative mb-4">
              <div className="absolute left-0 right-0 top-5 h-1 bg-gray-200 z-0" />
              <div
                className="absolute left-0 top-5 h-1 bg-gradient-to-r from-blue-600 to-purple-600 z-0 transition-all duration-300"
                style={{
                  width: showOtpDrawer ? "100%" : "0%",
                }}
              />
              <div className="relative flex justify-between items-center z-10">
                {[
                  { label: "ข้อมูลส่วนตัว", number: 1 },
                  { label: "ยืนยันตัวตน", number: 2 },
                ].map((step, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200
                        ${(step.number === 1 || showOtpDrawer) ? "bg-gradient-to-r from-blue-600 to-purple-600 border-blue-600 shadow-lg" : "bg-white border-gray-300"}`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full transition-all duration-200 ${(step.number === 1 || showOtpDrawer) ? "bg-white" : "bg-gray-300"}`}
                      />
                    </div>
                    <span
                      className={`mt-2 text-xs text-center ${(step.number === 1 || showOtpDrawer) ? "text-blue-600" : "text-gray-400"}`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6">
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="firstName"
                  className="text-sm text-gray-600 mb-2 block"
                >
                  ชื่อ *
                </label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={e =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  placeholder="กรอกชื่อ"
                  className="h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                  disabled={isLoading}
                />
                {errors.firstName && (
                  <div className="text-red-500 text-sm mt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                    {errors.firstName}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="text-sm text-gray-600 mb-2 block"
                >
                  นามสกุล *
                </label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={e =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  placeholder="กรอกนามสกุล"
                  className="h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                  disabled={isLoading}
                />
                {errors.lastName && (
                  <div className="text-red-500 text-sm mt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                    {errors.lastName}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="text-sm text-gray-600 mb-2 block"
                >
                  อีเมล *
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="example@email.com"
                  className="h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                  disabled={isLoading}
                />
                {errors.email && (
                  <div className="text-red-500 text-sm mt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                    {errors.email}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="text-sm text-gray-600 mb-2 block"
                >
                  เบอร์โทร *
                </label>
                <Input
                  id="phone"
                  type="text"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="0812345678"
                  className="h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                  disabled={isLoading}
                />
                {errors.phone && (
                  <div className="text-red-500 text-sm mt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                    {errors.phone}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  ใช้สำหรับยืนยันตัวตนผ่าน OTP
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-2">
                  ประเภทอสังหาที่ต้องการลงประกาศ *
                </div>
                <div className="space-y-2 p-4 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                  {[
                    { value: "sell", label: "ขาย" },
                    { value: "rent", label: "เช่า" },
                    { value: "auction", label: "ประมูล" },
                  ].map(option => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.propertyTypes.includes(option.value)}
                        onChange={e => {
                          const newTypes = e.target.checked
                            ? [...formData.propertyTypes, option.value]
                            : formData.propertyTypes.filter(
                              t => t !== option.value
                            );
                          setFormData({ ...formData, propertyTypes: newTypes });
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                        disabled={isLoading}
                      />
                      <span className="text-gray-900 font-medium">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.propertyTypes && (
                  <div className="text-red-500 text-sm mt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                    {errors.propertyTypes}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8">
              <Button
                className="w-full h-12 bg-[#007AFF] hover:bg-[#0066d6] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
                onClick={handleSendOTP}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    กำลังส่งรหัส OTP...
                  </div>
                ) : (
                  "ยืนยันและรับรหัส OTP"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* OTP Drawer - Same as register-drawer */}
      <OtpDrawer
        isOpen={showOtpDrawer}
        phone={formData.phone}
        onClose={() => {
          setShowOtpDrawer(false);
        }}
        onSuccess={handleOtpSuccess}
      />

      {/* Success Modal */}
      <AgentSuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        userInfo={{
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: user?.email || "",
        }}
      />
    </>
  );
}
