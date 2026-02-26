import React from "react";
import { useRouter } from "next/navigation";

interface LoginSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginSuccessModal = ({ isOpen, onClose }: LoginSuccessModalProps) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleConfirm = () => {
    onClose();
    router.push("/add-property");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-medium mb-2">ล็อกอินสำเร็จ!</h2>
        <p className="text-gray-600 mb-6">
          ยินดีต้อนรับ คุณสามารถลงประกาศได้แล้ว
        </p>

        <div className="space-y-3">
          <button
            onClick={handleConfirm}
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            เริ่มลงประกาศ
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            กลับไปหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginSuccessModal;
