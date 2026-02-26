"use client";

import CustomerChart from "@/components/charts/customerChart";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

export default function CustomerDashboardPage() {
  const { loading, userRole, isLoggedIn } = useAuth();
  const router = useRouter();

  if (loading) return <div className="p-4">Loading...</div>;

  // If not logged in or not a customer, show a small message and a link back
  if (!isLoggedIn || userRole !== "customer") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">ไม่พบสิทธิ์เข้าใช้งาน</h2>
          <p className="text-sm text-gray-600 mb-4">
            หน้าแดชบอร์ดลูกค้าสำหรับผู้ใช้งานที่มี role เป็น{" "}
            <strong>customer</strong> เท่านั้น
          </p>
          <div className="flex justify-center">
            <Button onClick={() => router.push("/dashboard")}>
              กลับไปที่แดชบอร์ด
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // For customers, render the customerChart component
  return <CustomerChart />;
}
