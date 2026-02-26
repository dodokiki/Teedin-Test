"use client";

import { getSuperAdminBrowserClient } from "@/lib/super-admin-supabase";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

interface Notification {
  id: string;
  message: string;
  date: string;
  unread?: boolean;
  role?: string | null;
  headder?: string | null;
}

interface NotificationRow {
  id: string;
  message: string;
  sent_at: string | null;
  is_read: boolean | null;
  role: string | null;
  headder: string | null;
}

const SuperAdminNotifications: React.FC = () => {
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleExpand = async (id: string, notification: Notification) => {
    setExpandedId(expandedId === id ? null : id);
    if (expandedId !== id) {
      const superAdminSupabase = getSuperAdminBrowserClient();
      // อัปเดต is_read ในฐานข้อมูล
      await superAdminSupabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      // อัปเดต state ใน React
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, unread: false } : n))
      );

      // ถ้าเป็น notification เกี่ยวกับการ์ดใหม่ ให้ไปหน้า pending properties
      if (
        notification.headder === "การ์ดใหม่รออนุมัติ" ||
        notification.message.includes("การ์ดอสังหาฯใหม่")
      ) {
        router.push("/super-admin-page?tab=pending-properties");
      }
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      const superAdminSupabase = getSuperAdminBrowserClient();
      const { data, error } = await superAdminSupabase
        .from("notifications")
        .select("id, message, sent_at, is_read, role, headder")
        .order("sent_at", { ascending: false });
      if (error || !data) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const formatted = (data as NotificationRow[]).map(notification => ({
        id: notification.id,
        message: notification.message,
        date: notification.sent_at
          ? new Date(notification.sent_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "",
        unread: notification.is_read === false,
        role: notification.role,
        headder: notification.headder,
      }));

      setNotifications(formatted);
      setLoading(false);
    };
    fetchNotifications();
  }, []);

  const filteredNotifications =
    tab === "all" ? notifications : notifications.filter(n => n.unread);

  return (
    <div className="max-w-2xl mx-auto bg-white min-h-screen py-8 px-4">
      {/* Header */}
      <h1 className="text-2xl font-bold mb-6">แจ้งเตือน</h1>
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          className={`px-6 py-2 rounded-full font-medium text-base border transition-all ${
            tab === "all"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-blue-600 border-blue-600"
          }`}
          onClick={() => setTab("all")}
        >
          ทั้งหมด
        </button>
        <button
          className={`px-6 py-2 rounded-full font-medium text-base border transition-all ${
            tab === "unread"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-blue-600 border-blue-600"
          }`}
          onClick={() => setTab("unread")}
        >
          ยังไม่ได้อ่าน
        </button>
      </div>
      {/* Notification List */}
      <div className="overflow-y-auto max-h-[420px] pr-2">
        {loading ? (
          <div className="text-center text-gray-400 py-12">กำลังโหลด...</div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map(n => {
            // ใช้ message 40 ตัวอักษรแรกเป็นหัวข้อ ถ้าไม่มี title จริง
            const header = n.headder
              ? n.headder
              : n.message.slice(0, 40) + (n.message.length > 40 ? "..." : "");
            const isExpanded = expandedId === n.id;
            const isRead = !n.unread;
            return (
              <div
                key={n.id}
                className="flex flex-col border-b last:border-b-0 group cursor-pointer hover:bg-gray-50 transition"
                onClick={() => handleExpand(n.id, n)}
              >
                <div className="flex items-start gap-4 py-4">
                  {/* Avatar is not available in the new schema, so we'll keep the placeholder */}
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mt-1">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="12" fill="#2563eb" />
                      <path
                        d="M9 6l6 6-6 6"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm mb-1 font-medium ${isExpanded || isRead ? "text-gray-400" : "text-gray-900"}`}
                    >
                      {header}
                    </div>
                    <div className="text-xs text-gray-500">{n.date}</div>
                  </div>
                  <div className="flex items-center h-full">
                    {isExpanded ? (
                      <svg
                        width="18"
                        height="18"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M6 9l6 6 6-6"
                          stroke="#222"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M9 6l6 6-6 6"
                          stroke="#222"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className="pl-16 pb-4 text-gray-400 text-sm">
                    {n.message}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center text-gray-400 py-12">
            ไม่มีการแจ้งเตือน
          </div>
        )}
      </div>
      {/* Footer */}
      <div className="flex justify-center mt-6">
        <button className="text-blue-600 text-sm font-medium hover:underline">
          ดูการแจ้งเตือนก่อนหน้า
        </button>
      </div>
    </div>
  );
};

export default SuperAdminNotifications;
