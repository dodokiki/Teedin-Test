/**
 * Smart Session Warning Component
 * แสดงการแจ้งเตือนเมื่อ session ใกล้หมดอายุ
 */

"use client";

import React, { useEffect, useState } from "react";
import SUPER_ADMIN_SECURITY_CONFIG from "../config";

interface SessionWarningProps {
  isVisible: boolean;
  timeRemaining: number;
  onExtendSession: (minutes: number) => void;
  onLogout: () => void;
  onDismiss: () => void;
  riskLevel: string;
}

export const SessionWarning: React.FC<SessionWarningProps> = ({
  isVisible,
  timeRemaining,
  onExtendSession,
  onLogout,
  onDismiss,
  riskLevel,
}) => {
  const [countdown, setCountdown] = useState(timeRemaining);
  const [soundPlayed, setSoundPlayed] = useState(false);

  useEffect(() => {
    setCountdown(timeRemaining);
  }, [timeRemaining]);

  useEffect(() => {
    if (!isVisible) {
      setSoundPlayed(false);
      return;
    }

    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1000));
    }, 1000);

    // Play warning sound
    if (
      !soundPlayed &&
      SUPER_ADMIN_SECURITY_CONFIG.NOTIFICATIONS.SOUND_ENABLED
    ) {
      playWarningSound();
      setSoundPlayed(true);
    }

    return () => clearInterval(interval);
  }, [isVisible, soundPlayed]);

  const playWarningSound = () => {
    try {
      const audio = new Audio(
        SUPER_ADMIN_SECURITY_CONFIG.NOTIFICATIONS.WARNING_SOUND_URL
      );
      audio.volume = 0.3; // Gentle volume
      audio.play().catch(error => {
        console.log("🔇 Could not play warning sound:", error);
      });
    } catch (error) {
      console.log("🔇 Warning sound not available");
    }
  };

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "LOW":
        return "from-green-500 to-green-600";
      case "MEDIUM":
        return "from-yellow-500 to-orange-500";
      case "HIGH":
        return "from-orange-500 to-red-500";
      case "CRITICAL":
        return "from-red-500 to-red-600";
      default:
        return "from-blue-500 to-purple-500";
    }
  };

  const getRiskMessage = (risk: string) => {
    switch (risk) {
      case "LOW":
        return "การใช้งานปกติ";
      case "MEDIUM":
        return "กิจกรรมปานกลาง";
      case "HIGH":
        return "กิจกรรมเสี่ยงสูง";
      case "CRITICAL":
        return "กิจกรรมวิกฤต";
      default:
        return "ตรวจสอบความปลอดภัย";
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
          {/* Header */}
          <div
            className={`bg-gradient-to-r ${getRiskColor(riskLevel)} px-6 py-4`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-30 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  แจ้งเตือนความปลอดภัย
                </h3>
                <p className="text-white text-opacity-90 text-sm">
                  {getRiskMessage(riskLevel)}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Countdown Display */}
            <div className="text-center mb-6">
              <div className="text-4xl font-mono font-bold text-gray-800 mb-2">
                {formatTime(countdown)}
              </div>
              <p className="text-gray-600">
                {countdown > 0
                  ? "Session จะหมดอายุในอีก"
                  : "Session หมดอายุแล้ว"}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div
                className={`bg-gradient-to-r ${getRiskColor(riskLevel)} h-2 rounded-full transition-all duration-1000`}
                style={{
                  width: `${Math.max(0, (countdown / timeRemaining) * 100)}%`,
                }}
              />
            </div>

            {/* Warning Message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-yellow-800 text-sm">
                    เพื่อความปลอดภัย กรุณาต่ออายุ session
                    หรือบันทึกงานที่กำลังทำ
                  </p>
                  {riskLevel === "HIGH" || riskLevel === "CRITICAL" ? (
                    <p className="text-yellow-900 text-xs mt-1 font-medium">
                      ⚠️ ระบบตรวจพบกิจกรรมเสี่ยง - เวลาถูกจำกัดเพิ่มเติม
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-3">
              {/* Quick Extend Options */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onExtendSession(30)}
                  className="flex items-center justify-center px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  ต่อเวลา 30 นาที
                </button>
                <button
                  onClick={() => onExtendSession(120)}
                  className="flex items-center justify-center px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  ต่อเวลา 2 ชั่วโมง
                </button>
              </div>

              {/* Secondary Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  เตือนใหม่อีก 5 นาที
                </button>
                <button
                  onClick={onLogout}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  ออกจากระบบ
                </button>
              </div>
            </div>

            {/* Auto-save Status */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <svg
                  className="w-4 h-4 text-green-500"
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
                <span>งานของคุณถูกบันทึกอัตโนมัติแล้ว</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default SessionWarning;
