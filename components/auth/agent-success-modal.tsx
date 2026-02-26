"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  userInfo?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export function AgentSuccessModal({
  isOpen,
  onClose,
  userInfo,
}: AgentSuccessModalProps) {
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      console.log("🎉 Success Modal opening...");
      setShowModal(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setShowModal(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!mounted || !isOpen) {
    console.log("🔍 Success Modal not open or not mounted");
    return null;
  }

  console.log("🎨 Rendering Success Modal...");

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300">
      <div
        className={`bg-white rounded-3xl p-10 max-w-md w-full mx-4 shadow-2xl transform transition-all duration-500 ${
          showModal
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-4"
        }`}
      >
        {/* Success Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-inner">
              <Check className="w-8 h-8 text-white stroke-[3] animate-in zoom-in duration-500 delay-300" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6 tracking-tight">
          สมัครเป็น AGEN สำเร็จ!
        </h2>

        {/* Description */}
        <div className="text-center text-gray-600 mb-10 space-y-3">
          <p className="text-lg font-medium text-gray-800">
            ยินดีด้วย
            {userInfo ? ` คุณ ${userInfo.firstName} ${userInfo.lastName}` : ""}
          </p>
          <p className="text-lg font-medium text-gray-800">
            ยินดีด้วยคุณสมัครเป็น AGEN สำเร็จแล้ว
            <br />
            คลิกปุ่มยืนยันเพื่อกลับเข้าสู่ระบบ
          </p>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleClose}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-2xl text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
        >
          ยืนยัน
        </Button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
