"use client";

import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OAuthSignUp() {
  const router = useRouter();
  const { setIsLoggedIn, setUserRole, setUser, setSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    role: "customer" as "customer" | "agent",
  });

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        console.log("🔍 OAuth Sign Up - Checking auth state...");

        // Check if user is authenticated with Supabase Auth
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        console.log("OAuth Sign Up - Session check:", {
          session,
          sessionError,
        });

        // Only check user if we have a session
        let user = null;
        let userError = null;

        if (session?.user) {
          const {
            data: { user: authUser },
            error: authUserError,
          } = await supabase.auth.getUser();
          user = authUser;
          userError = authUserError;
          console.log("OAuth Sign Up - User check:", { user, userError });
        }

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError("เกิดข้อผิดพลาดในการตรวจสอบสถานะการเข้าสู่ระบบ");
          return;
        }

        if (!session?.user) {
          console.log("No session found, redirecting to login");
          router.push("/");
          return;
        }

        const currentUser = session.user;
        console.log("OAuth user found:", currentUser);
        setUserInfo(currentUser);

        // Pre-fill form with OAuth data
        const userMetadata = currentUser.user_metadata;
        setFormData({
          first_name:
            userMetadata?.full_name?.split(" ")[0] ||
            userMetadata?.given_name ||
            "",
          last_name:
            userMetadata?.full_name?.split(" ").slice(1).join(" ") ||
            userMetadata?.family_name ||
            "",
          phone: userMetadata?.phone || "",
          role: "customer",
        });
      } catch (error) {
        console.error("Auth state check error:", error);
        setError("เกิดข้อผิดพลาดในการตรวจสอบสถานะการเข้าสู่ระบบ");
      }
    };

    checkAuthState();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!userInfo) {
        setError("ไม่พบข้อมูลผู้ใช้");
        setLoading(false);
        return;
      }

      console.log("Creating OAuth user account...");
      console.log("User ID:", userInfo.id);
      console.log("Form data:", formData);

      // Create user record in database
      const now = new Date().toISOString();
      const userData = {
        id: userInfo.id,
        role: formData.role,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: userInfo.email,
        phone: formData.phone,
        created_at: now,
        updated_at: now,
      };

      console.log("Creating user with data:", userData);

      const { data: insertedUser, error: userError } = await supabase
        .from("users")
        .insert(userData)
        .select();

      if (userError) {
        console.error("User creation error:", userError);
        setError("ไม่สามารถสร้างบัญชีผู้ใช้ได้: " + userError.message);
        setLoading(false);
        return;
      }

      console.log("✅ User created successfully:", insertedUser);

      // Create role-specific record
      if (formData.role === "customer") {
        const customerData = {
          user_id: userInfo.id,
          full_name: `${formData.first_name} ${formData.last_name}`.trim(),
          created_at: now,
        };

        console.log("Creating customer with data:", customerData);

        const { data: insertedCustomer, error: customerError } = await supabase
          .from("customers")
          .insert(customerData)
          .select();

        if (customerError && !customerError.message.includes("duplicate")) {
          console.error("Customer creation error:", customerError);
          // Don't fail the whole process for customer record error
        } else {
          console.log("✅ Customer created successfully:", insertedCustomer);
        }
      } else if (formData.role === "agent") {
        const agentData = {
          user_id: userInfo.id,
          company_name: "",
          business_license_id: "",
          address: "",
          property_types: [],
          service_areas: [],
          created_at: now,
        };

        console.log("Creating agent with data:", agentData);

        const { data: insertedAgent, error: agentError } = await supabase
          .from("agens")
          .insert(agentData)
          .select();

        if (agentError && !agentError.message.includes("duplicate")) {
          console.error("Agent creation error:", agentError);
          // Don't fail the whole process for agent record error
        } else {
          console.log("✅ Agent created successfully:", insertedAgent);
        }
      }

      // Set auth state
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userRole", formData.role);
      localStorage.setItem(
        "userData",
        JSON.stringify({
          user: userInfo,
          session: { user: userInfo },
        })
      );

      setIsLoggedIn(true);
      setUserRole(formData.role as any);
      setUser(userInfo);
      setSession({ user: userInfo } as any);

      console.log("✅ OAuth sign up successful:", {
        email: userInfo.email,
        role: formData.role,
        userId: userInfo.id,
      });

      // Redirect to home page
      router.push("/");
    } catch (error) {
      console.error("Sign up error:", error);
      setError("เกิดข้อผิดพลาดในการสมัครสมาชิก");
      setLoading(false);
    }
  };

  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังตรวจสอบข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            สมัครสมาชิกด้วย Google
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            กรุณากรอกข้อมูลเพิ่มเติมเพื่อสร้างบัญชี
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="first_name"
                className="block text-sm font-medium text-gray-700"
              >
                ชื่อ
              </label>
              <input
                id="first_name"
                type="text"
                required
                value={formData.first_name}
                onChange={e =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="last_name"
                className="block text-sm font-medium text-gray-700"
              >
                นามสกุล
              </label>
              <input
                id="last_name"
                type="text"
                required
                value={formData.last_name}
                onChange={e =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                เบอร์โทรศัพท์
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={e =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700"
              >
                ประเภทบัญชี
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={e =>
                  setFormData({
                    ...formData,
                    role: e.target.value as "customer" | "agent",
                  })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="customer">ลูกค้า</option>
                <option value="agent">นายหน้า</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
