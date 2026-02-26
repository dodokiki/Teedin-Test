import React from "react";
import { useRouter } from "next/router";

const SuccessModal = () => {
  const router = useRouter();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-blue-600"
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

        <h2 className="text-xl font-medium mb-2">ลงประกาศ สำเร็จ!</h2>
        <p className="text-gray-600 mb-6">ยินดีด้วยคุณลงประกาศสำเร็จแล้ว</p>
        <p className="text-gray-500 mb-6">กลับไปยังเมนูหน้าหลัก</p>

        <div className="space-y-3">
          <button
            onClick={() => router.push("/all-properties")}
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ยืนยัน
          </button>
          <button
            onClick={() => router.push("/my-listings")}
            className="w-full py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ดูประกาศของฉัน
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
