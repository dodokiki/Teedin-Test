"use client";

import { useLanguage } from "@/contexts/language-context";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../contexts/auth-context";
import { supabase } from "../../../lib/supabaseClient";

interface NotificationRow {
  id: string;
  message: string;
  sent_at: string;
  headder: string | null;
  read: string;
  receiver_id: string;
  sender_id: string | null;
  sender_first_name?: string;
  sender_last_name?: string;
  displayHeadder?: string; // For translated headder
  displayMessage?: string; // For translated message
}

// Mapping of notification headder to translation keys
// Supports both Thai and English versions of the same notification
const notificationHeadderMap: Record<string, string> = {
  เช่าสำเร็จ: "customer_notification_title",
  "Rental Successful": "customer_notification_title",
};

const notificationMessageMap: Record<string, string> = {
  เช่าสำเร็จ: "customer_notification_message",
  "You have been added as the owner of this property":
    "customer_notification_message",
  คุณได้รับการเพิ่มเป็นเจ้าของรายการนี้แล้ว: "customer_notification_message",
};

function translateNotification(
  headder: string | null,
  message: string,
  t: (key: string) => string
): { displayHeadder: string; displayMessage: string } {
  if (!headder) {
    return { displayHeadder: headder || "", displayMessage: message };
  }

  // Check if we have a translation key for this headder
  const headderKey = notificationHeadderMap[headder];
  const messageKey =
    notificationMessageMap[message] || notificationMessageMap[headder];

  if (headderKey && messageKey) {
    return {
      displayHeadder: t(headderKey),
      displayMessage: t(messageKey),
    };
  }

  return { displayHeadder: headder, displayMessage: message };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstBoxRef = useRef<HTMLDivElement>(null);
  const [firstHidden, setFirstHidden] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Get current user from auth context
  const { user, isLoggedIn } = useAuth();
  const { t, language } = useLanguage();

  // Update read status to 'complete' for a single notification
  const updateReadStatusSingle = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read: "complete" })
      .eq("id", id);
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);

      const useMockData = false; // Use real data from Supabase

      if (useMockData) {
        const mockNotifications: NotificationRow[] = [
          {
            id: "1",
            message: "Your listing ‘Luxury Condo’ will expire in 7 days",
            sent_at: new Date().toISOString(),
            headder: "Listing expiring soon",
            read: "false",
            receiver_id: user?.id || "",
            sender_id: "system",
          },
          {
            id: "2",
            message: "You received a new offer for ‘Modern House’",
            sent_at: new Date(
              new Date().setDate(new Date().getDate() - 1)
            ).toISOString(),
            headder: "New offer",
            read: "false",
            receiver_id: user?.id || "",
            sender_id: "user-123",
            sender_first_name: "John",
            sender_last_name: "Doe",
          },
          {
            id: "3",
            message: "The appointment for ‘Beachfront Villa’ is confirmed",
            sent_at: new Date(
              new Date().setDate(new Date().getDate() - 2)
            ).toISOString(),
            headder: "Appointment confirmed",
            read: "complete",
            receiver_id: user?.id || "",
            sender_id: "user-456",
            sender_first_name: "Jane",
            sender_last_name: "Smith",
          },
          {
            id: "4",
            message: "Someone requested your phone number for 'Luxury Condo'",
            sent_at: new Date().toISOString(),
            headder: "Lead interested in your listing",
            read: "false",
            receiver_id: user?.id || "",
            sender_id: "user-789",
            sender_first_name: "Peter",
            sender_last_name: "Jones",
          },
          // Notifications for other users - should be filtered out
          {
            id: "5",
            message: "This notification is for another user",
            sent_at: new Date().toISOString(),
            headder: "Other user notification",
            read: "false",
            receiver_id: "other-user-id",
            sender_id: "system",
          },
          {
            id: "6",
            message: "Another notification for different user",
            sent_at: new Date().toISOString(),
            headder: "Different user notification",
            read: "false",
            receiver_id: "another-user-id",
            sender_id: "user-999",
            sender_first_name: "Tom",
            sender_last_name: "Brown",
          },
        ];

        // Filter notifications to show only those for the current logged-in user
        const filteredNotifications = mockNotifications.filter(
          notif => notif.receiver_id === user?.id
        );

        setNotifications(filteredNotifications);
        setLoading(false);
        return;
      }

      try {
        // Check if user is logged in via auth context
        if (!isLoggedIn || !user) {
          setError(t("you_are_not_logged_in_description"));
          setNotifications([]);
          setLoading(false);
          return;
        }

        // Get notifications only for the current user (filter by receiver_id)
        const { data: notificationsData, error: notificationsError } =
          await supabase
            .from("notifications")
            .select(
              "id, message, sent_at, headder, read, receiver_id, sender_id"
            )
            .eq("receiver_id", user.id) // Filter by current user's ID
            .order("sent_at", { ascending: false });

        if (notificationsError) {
          setError(notificationsError.message);
          setNotifications([]);
          setLoading(false);
          return;
        }

        // Get unique sender IDs from notifications to fetch sender information
        const senderIds = [
          ...new Set(
            notificationsData
              ?.map((notif: { sender_id: string | null }) => notif.sender_id)
              .filter(Boolean) || []
          ),
        ];

        // Fetch sender data for notifications
        let sendersMap: {
          [key: string]: { first_name: string; last_name: string };
        } = {};
        if (senderIds.length > 0) {
          try {
            const { data: senders, error: sendersError } = await supabase
              .from("users")
              .select("id, first_name, last_name")
              .in("id", senderIds);

            if (!sendersError && senders) {
              // Create a map for quick lookup
              sendersMap = senders.reduce(
                (
                  acc: {
                    [key: string]: { first_name: string; last_name: string };
                  },
                  sender: { id: string; first_name: string; last_name: string }
                ) => {
                  acc[sender.id] = {
                    first_name: sender.first_name,
                    last_name: sender.last_name,
                  };
                  return acc;
                },
                {} as {
                  [key: string]: { first_name: string; last_name: string };
                }
              );
            }
          } catch (err) {
            console.warn("Could not fetch sender data:", err);
          }
        }

        // Map notifications with sender data and translations
        const notificationsWithUsers =
          notificationsData?.map(
            (notif: {
              id: string;
              message: string;
              sent_at: string;
              headder: string | null;
              read: string;
              receiver_id: string;
              sender_id: string | null;
            }) => {
              const sender = notif.sender_id
                ? sendersMap[notif.sender_id]
                : null;

              const { displayHeadder, displayMessage } = translateNotification(
                notif.headder,
                notif.message,
                t
              );

              return {
                id: notif.id,
                message: notif.message,
                sent_at: notif.sent_at,
                headder: notif.headder,
                read: notif.read,
                receiver_id: notif.receiver_id,
                sender_id: notif.sender_id,
                sender_first_name: sender?.first_name || "",
                sender_last_name: sender?.last_name || "",
                displayHeadder,
                displayMessage,
              };
            }
          ) || [];

        setNotifications(notificationsWithUsers);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError(t("error_loading"));
        setNotifications([]);
      }

      setLoading(false);
    };
    fetchNotifications();
  }, [isLoggedIn, user, t, language]); // Add language to refetch when language changes

  // Re-translate notifications when language changes
  useEffect(() => {
    if (notifications.length > 0) {
      const updatedNotifications = notifications.map(notif => {
        const { displayHeadder, displayMessage } = translateNotification(
          notif.headder,
          notif.message,
          t
        );
        return {
          ...notif,
          displayHeadder,
          displayMessage,
        };
      });
      setNotifications(updatedNotifications);
    }
  }, [language, t]);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current || !firstBoxRef.current) return;
      const scrollRect = scrollRef.current.getBoundingClientRect();
      const firstRect = firstBoxRef.current.getBoundingClientRect();
      setFirstHidden(firstRect.bottom < scrollRect.top + 1);
    };
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener("scroll", handleScroll);
      handleScroll();
    }
    return () => {
      if (scrollEl) scrollEl.removeEventListener("scroll", handleScroll);
    };
  }, [notifications.length]);

  // Removed duplicate and unused state/hooks

  // Mark all unread notifications as complete
  // const updateReadStatus = async () => {
  //   const unreadIds = notifications
  //     .filter(n => n.read !== "complete")
  //     .map(n => n.id);
  //   if (unreadIds.length === 0) return;
  //   await supabase
  //     .from("notifications")
  //     .update({ read: "complete" })
  //     .in("id", unreadIds);
  // };

  // Handle tab change without auto-marking notifications as read
  const handleTabChange = (tab: "all" | "unread") => {
    setActiveTab(tab);
    // ไม่ควร mark complete อัตโนมัติเมื่อเปลี่ยน tab
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-white">
      <div className="w-full max-w-xl mx-auto pt-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 ml-2">
          {t("notifications")}
        </h1>
        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6 ml-2">
          <button
            className={`px-5 py-1.5 rounded-lg border text-base font-medium transition-all focus:outline-none ${activeTab === "all" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-600 hover:bg-blue-50"}`}
            onClick={() => handleTabChange("all")}
          >
            {t("all")}
          </button>
          <button
            className={`px-5 py-1.5 rounded-lg border text-base font-medium transition-all focus:outline-none ${activeTab === "unread" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-600 hover:bg-blue-50"}`}
            onClick={() => handleTabChange("unread")}
          >
            {t("unread")}
          </button>
        </div>
        {loading && <div className="text-center py-8">{t("loading")}</div>}
        {error && <div className="text-center text-red-500 py-8">{error}</div>}
        <div
          className={`bg-white rounded-lg shadow-none divide-y divide-gray-100 overflow-y-auto ${activeTab === "unread" && showAllNotifications ? "max-h-none" : "max-h-[400px]"}`}
          ref={scrollRef}
        >
          {notifications.length === 0 && !loading && !error && (
            <div className="text-center py-8 text-gray-400">
              {t("no_notifications")}
            </div>
          )}
          {(activeTab === "unread"
            ? notifications.filter(notif => notif.read !== "complete")
            : notifications
          ).map((notif, idx) => {
            const isRead = notif.read === "complete";
            return (
              <div
                key={notif.id}
                ref={idx === 0 ? firstBoxRef : undefined}
                className={`flex items-start w-full px-4 py-4 group relative border-0 outline-none cursor-pointer transition-colors ${isRead ? "bg-gray-100" : "bg-white hover:bg-blue-50 focus:bg-blue-100"}`}
                onClick={async () => {
                  const willExpand = expandedId !== notif.id;
                  setExpandedId(willExpand ? notif.id : null);
                  if (willExpand) await updateReadStatusSingle(notif.id);
                }}
              >
                {/* Icon */}
                <div className="mr-4 mt-1">
                  <div
                    className={`w-10 h-10 rounded-full overflow-hidden relative flex items-center justify-center ${
                      notif.sender_id ? "bg-blue-500" : "bg-gray-500"
                    }`}
                  >
                    {notif.sender_first_name ? (
                      <span className="text-white font-semibold text-lg">
                        {notif.sender_first_name.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-white font-semibold text-lg">
                        {notif.sender_id ? "U" : "S"}
                      </span>
                    )}
                  </div>
                </div>
                {/* Header, Message (expand), and Date */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-base text-[#202224] break-words">
                      {notif.displayHeadder || notif.headder || ""}
                    </div>
                    <button
                      className="ml-2 text-gray-400 hover:text-gray-700 focus:outline-none"
                      tabIndex={-1}
                      onClick={e => {
                        e.stopPropagation();
                        setExpandedId(
                          expandedId === notif.id ? null : notif.id
                        );
                      }}
                    >
                      {expandedId === notif.id ? (
                        <svg
                          width="20"
                          height="20"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 15l6-6 6 6"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 9l6 6 6-6"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  {expandedId === notif.id && (
                    <div className="text-gray-700 text-sm mt-2 whitespace-pre-line">
                      {notif.displayMessage || notif.message}
                    </div>
                  )}
                  <div className="flex items-end justify-between mt-1">
                    <div className="flex flex-col">
                      <div className="text-gray-400 text-xs">
                        {notif.sent_at
                          ? format(new Date(notif.sent_at), "MMMM d, yyyy")
                          : ""}
                      </div>
                      {notif.sender_first_name && notif.sender_id && (
                        <div className="text-gray-500 text-xs mt-0.5">
                          {t("from")} {notif.sender_first_name}{" "}
                          {notif.sender_last_name}
                        </div>
                      )}
                      {!notif.sender_id && (
                        <div className="text-gray-500 text-xs mt-0.5">
                          {t("from")} {t("system")}
                        </div>
                      )}
                    </div>
                    {isRead && (
                      <div className="text-gray-400 text-[10px] ml-2 mb-0.5">
                        {t("read_label")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center mt-8">
          {activeTab === "all" ? (
            <button
              className={`rounded-lg px-8 py-2 font-medium text-base border border-blue-600 transition-all ${firstHidden ? "bg-blue-600 text-white" : "bg-white text-blue-600"}`}
              onClick={() => {
                if (firstBoxRef.current) {
                  firstBoxRef.current.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }
              }}
            >
              {t("previous_notifications")}
            </button>
          ) : (
            <button
              className={`rounded-lg px-8 py-2 font-medium text-base border border-blue-600 transition-all ${showAllNotifications ? "bg-blue-600 text-white" : "bg-white text-blue-600"}`}
              onClick={() => setShowAllNotifications(prev => !prev)}
            >
              {showAllNotifications
                ? t("collapse_notifications")
                : t("show_all_notifications")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
