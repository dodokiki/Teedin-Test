import React from "react";

const ThreeMonthUpdateCard: React.FC = () => {
  return (
    <div className="max-w-xs bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
      <div className="relative">
        <img
          src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80"
          alt="SKYLINE CONDO"
          className="w-full h-40 object-cover"
        />
        <span className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
          ให้เช่า
        </span>
        <button className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h2 className="text-lg font-bold text-gray-800">SKYLINE CONDO</h2>
        <div className="text-gray-500 text-sm">สุขุมวิท - กรุงเทพฯ</div>
        <div className="text-blue-600 text-xl font-semibold mt-1 mb-2">
          5,000,000 บาท
        </div>
        <div className="flex items-center text-gray-400 text-xs mb-2 gap-4">
          <span className="flex items-center gap-1">
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
            </svg>{" "}
            850 ตร.ม.
          </span>
          <span className="flex items-center gap-1">
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect x="3" y="11" width="18" height="7" rx="2" />
            </svg>{" "}
            2 ห้องน้ำ
          </span>
          <span className="flex items-center gap-1">
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect x="3" y="7" width="18" height="13" rx="2" />
            </svg>{" "}
            4 ห้องนอน
          </span>
          <span className="flex items-center gap-1">
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect x="3" y="11" width="18" height="7" rx="2" />
            </svg>{" "}
            2 จอดรถ
          </span>
        </div>
        <div className="text-xs text-gray-700 mb-1">ชื่อ : นายทิณ สูงเนิน</div>
        <div className="text-xs text-gray-700 mb-1">วันที่ : 10/3/2568</div>
        <div className="text-xs text-gray-700 mb-1">เวลา : 10.00 น.</div>
        <div className="text-xs text-gray-700 mb-1">
          เบอร์ติดต่อ : 0123456789
        </div>
        <div className="text-xs text-gray-700 mb-2">
          อีเมล : AASSDD@GMAIL.COM
        </div>
        <button className="mt-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 w-full font-semibold transition">
          ดูทั้งหมด
        </button>
      </div>
    </div>
  );
};

export default ThreeMonthUpdateCard;
