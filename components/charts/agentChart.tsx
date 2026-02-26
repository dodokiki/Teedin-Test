"use client";

import { supabase } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import "chart.js/auto";
import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";

const defaultChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" },
  },
  scales: {
    x: { ticks: { maxRotation: 45, minRotation: 45 } },
  },
};

type Props = {
  agentId: string;
  agentName?: string;
};

function monthsList(last = 11) {
  const now = new Date();
  const months: string[] = [];
  for (let i = last; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7)); // YYYY-MM
  }
  return months;
}

export default function AgentChart({ agentId, agentName }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const [properties, setProperties] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Cache key for localStorage
  const cacheKey = `agent_dashboard_${agentId}`;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    if (!agentId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check if cached data exists and is still valid
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const now = Date.now();
          if (now - timestamp < CACHE_DURATION) {
            // Cache is still valid
            setProperties(data.properties || []);
            setNotifications(data.notifications || []);
            setLoading(false);
            return;
          }
        }

        // Fetch fresh data from Supabase
        const [pRes, notifRes] = await Promise.all([
          supabase
            .from("properties")
            .select("id, status, created_at, property_category")
            .eq("agent_id", agentId),
          supabase
            .from("notifications")
            .select("id, sent_at, is_read, role")
            .eq("receiver_id", agentId),
        ]);

        if (pRes.error) throw pRes.error;
        if (notifRes.error) throw notifRes.error;

        const properties = pRes.data || [];
        const notifications = notifRes.data || [];

        // Store in cache with timestamp
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: { properties, notifications },
            timestamp: Date.now(),
          })
        );

        setProperties(properties);
        setNotifications(notifications);
      } catch (err: any) {
        console.error(err);
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [agentId, cacheKey]);

  const months = useMemo(() => monthsList(11), []);

  // สรุปจำนวน properties ตามสถานะ (ใช้สำหรับ Pie / Doughnut)
  const propertiesByStatus = useMemo(() => {
    const map = new Map<string, number>();
    properties.forEach(p => {
      const s = (p.status || "unknown").toString();
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map.entries()).map(([status, total]) => ({
      status,
      total,
    }));
  }, [properties]);

  // จำนวน properties ต่อเดือน (last 12 months)
  const propertiesPerMonth = useMemo(() => {
    const counts = new Map<string, number>();
    months.forEach(m => counts.set(m, 0));
    properties.forEach(p => {
      const created = p.created_at || null;
      if (!created) return;
      const key = new Date(created).toISOString().slice(0, 7);
      if (counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return months.map(m => counts.get(m) || 0);
  }, [properties, months]);

  // ประเภทอสังหายอดนิยม (Top categories)
  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    properties.forEach(p => {
      const cat = (p.property_category || "unknown").toString();
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [properties]);

  // จำนวน notifications ต่อวัน (last 30 days)
  const notificationsPerDay = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = 0;
    }
    notifications.forEach(n => {
      const key = n.sent_at
        ? new Date(n.sent_at).toISOString().slice(0, 10)
        : null;
      if (key && key in days) days[key] = days[key] + 1;
    });
    return Object.entries(days).map(([day, total]) => ({ day, total }));
  }, [notifications]);

  if (!agentId)
    return <div className="p-4">{t("agent_dashboard_missing_id")}</div>;

  // Function to clear cache and refresh data
  const handleRefresh = () => {
    localStorage.removeItem(cacheKey);
    window.location.reload();
  };

  return (
    <div className="p-4 font-sukhumvit">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{t("agent_dashboard_title")}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-2 text-muted-foreground hover:text-foreground"
          title="Refresh data and clear cache"
        >
          <RefreshCw className="h-4 w-4" />
          {t("refresh_data")}
        </Button>
      </div>

      {loading && <div>{t("agent_dashboard_loading")}</div>}
      {error && (
        <div className="text-red-600">
          {t("error_loading")}: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">
                {t("agent_dashboard_properties_status")}
              </h3>
              <div className="h-56">
                <Doughnut
                  data={{
                    labels: propertiesByStatus.map(r => r.status),
                    datasets: [
                      {
                        data: propertiesByStatus.map(r => r.total),
                        backgroundColor: [
                          "#6C63FF",
                          "#BDBDBD",
                          "#D6C7F7",
                          "#F2F2F2",
                          "#FFA726",
                        ],
                      },
                    ],
                  }}
                  options={defaultChartOptions}
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm md:col-span-2">
              <h3 className="font-semibold mb-2">
                {t("agent_dashboard_properties_posted")}
              </h3>
              <div className="h-56">
                <Line
                  data={{
                    labels: months,
                    datasets: [
                      {
                        label: t("agent_dashboard_properties_dataset"),
                        data: propertiesPerMonth,
                        borderColor: "#6C63FF",
                        backgroundColor: "rgba(108,99,255,0.1)",
                        fill: true,
                      },
                    ],
                  }}
                  options={defaultChartOptions}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">
                {t("agent_dashboard_top_categories")}
              </h3>
              <div>
                {topCategories.map(([cat, cnt]) => (
                  <div key={cat} className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-6 bg-[#6C63FF] rounded" />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span>{cat}</span>
                        <span className="font-semibold">{cnt}</span>
                      </div>
                      <div className="h-2 bg-[#F2F2F2] rounded mt-1">
                        <div
                          style={{
                            width: `${Math.min(100, (cnt / (topCategories[0]?.[1] || 1)) * 100)}%`,
                          }}
                          className="h-2 bg-[#6C63FF] rounded"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">
                {t("agent_dashboard_notifications_last_30d")}
              </h3>
              <div className="h-56">
                <Bar
                  data={{
                    labels: notificationsPerDay.map(d => d.day),
                    datasets: [
                      {
                        data: notificationsPerDay.map(d => d.total),
                        backgroundColor: "#FFA726",
                      },
                    ],
                  }}
                  options={defaultChartOptions}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
