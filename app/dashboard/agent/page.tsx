"use client";

import AgentChart from "@/components/charts/agentChart";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";

export default function AgentDashboardPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const agentId = user?.id ?? "";

  return (
    <div className="p-4 space-y-6">
     

      <AgentChart agentId={agentId} agentName={user?.email ?? undefined} />
    </div>
  );
}
