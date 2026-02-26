
"use client";


import { LoginDrawer } from "@/components/auth/login-drawer";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context"; // Import useAuth
import { supabase } from "@/lib/supabase"; // Import supabase
import { TopLoader } from "@/components/lightswind/top-loader"; // Import TopLoader
import BeamGridBackground from "@/components/ui/beam-grid-background"; // Import BeamGridBackground
import { motion } from "framer-motion"; // Import motion

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addAccount = searchParams.get("add_account") === "true";
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false); // New state for closing/cancelling animation
  const [addingAccountName, setAddingAccountName] = useState<string | null>(
    null
  );
  const { user, isLoggedIn, reActivateCurrentSession } = useAuth(); // ดึงข้อมูล user, isLoggedIn, และ reActivateCurrentSession

  useEffect(() => {
    // Open the drawer after mount
    setIsOpen(true);
    if (typeof window !== "undefined") {
      const name = localStorage.getItem("addingAccountName");
      if (name) setAddingAccountName(name);
    }
  }, []);

  const handleClose = async () => {
    if (addAccount) {
      setIsClosing(true); // Start showing closing/cancelling UI immediately
    }
    setIsOpen(false);
    // Allow animation to finish
    await new Promise(resolve => setTimeout(resolve, 300));

    if (addAccount) {
      // If cancelling add account, restore the original session
      if (typeof window !== "undefined") {
        try {
          const addingAccountFrom = localStorage.getItem("addingAccountFrom");
          const returnToPath =
            localStorage.getItem("return_to_after_add_account") ||
            "/dashboard/agent"; // Default to /dashboard/agent as requested

          if (addingAccountFrom) {
            console.log(
              "Cancelling add account. Attempting to re-activate original session:",
              addingAccountFrom
            );
            const success = await reActivateCurrentSession(
              addingAccountFrom,
              returnToPath
            ); // Call the new function

            if (success) {
              return; // Redirect handled by reActivateCurrentSession
            }
          }

          // Fallback if session restoration fails or no previous session
          localStorage.removeItem("isAddingAccount");
          localStorage.removeItem("addingAccountFrom");
          localStorage.removeItem("addingAccountName"); // Clean up name
          localStorage.removeItem("return_to_after_add_account"); // Clean up return path

          window.location.href = returnToPath; // Redirect to the saved path
          return;
        } catch (e) {
          console.error(
            "Error cancelling add account or restoring session:",
            e
          );
          // Fallback if session restoration fails
          router.push("/auth/login");
        }
      }
    } else {
      router.push("/");
    }
  };

  const handleLoginSuccess = () => {
    // The auth context handles the state update
    // We just need to redirect
    router.push("/dashboard");
  };

  if (addAccount) {
    // Render split-screen layout for "add account" mode
    return (
      <div className="min-h-screen flex relative">
        {/* TopLoader when closing/cancelling */}
        <TopLoader isLoading={isClosing} color="#007AFF" showSpinner={false} />

        {/* Invisible overlay to block interactions while loading */}
        {isClosing && (
          <div className="absolute inset-0 z-[100] bg-white/10 backdrop-blur-[1px] cursor-wait" />
        )}

        {/* Left Panel: User Context */}
        <div className="relative flex-1 hidden lg:flex items-center justify-center overflow-hidden bg-black">
          {" "}
          {/* Set bg-black for better beam contrast */}
          {/* Beam Grid Background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <BeamGridBackground
              gridColor="rgba(255, 255, 255, 0.1)"
              beamColor="rgba(0, 122, 255, 0.8)" // Tedin Blue
              gridSize={50}
              beamCount={15}
              interactive={true}
              showFade={false}
            />
          </motion.div>
          {/* Overlay Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="z-10 text-center space-y-4 max-w-md text-white p-8 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <h1 className="text-5xl font-bold mb-4 drop-shadow-lg tracking-tight">
                TEEDIN EASY
              </h1>
              {isLoggedIn && user ? (
                <>
                  <p className="text-xl font-semibold">
                    สวัสดีคุณ {user.user_metadata?.first_name || user.email}
                  </p>
                  <p className="text-lg opacity-90">
                    คุณกำลังเข้าสู่ระบบอยู่ในขณะนี้
                  </p>
                  <p className="text-md opacity-80 mt-2">
                    เพิ่มบัญชีอื่นเพื่อสลับใช้งานได้ง่ายขึ้น
                  </p>
                </>
              ) : addingAccountName ? (
                <>
                  <p className="text-lg opacity-80 mb-2">
                    เชื่อมต่อกับบัญชีหลักของคุณ:
                  </p>
                  <p className="text-2xl font-bold text-blue-400 mb-4">
                    {addingAccountName}
                  </p>
                  <div className="h-px w-20 bg-white/20 mx-auto my-4" />
                  <p className="text-xl font-semibold">กำลังเพิ่มบัญชีใหม่...</p>
                </>
              ) : (
                <p className="text-xl font-semibold">
                  เพิ่มบัญชีเพื่อจัดการทรัพย์สินของคุณ
                </p>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* Right Panel: Login Drawer */}
        <div className="relative w-full lg:w-[450px] bg-gray-50">
          <LoginDrawer
            isOpen={isOpen}
            onClose={handleClose}
            onLoginSuccess={handleLoginSuccess}
            isAddAccountMode={addAccount}
          />
        </div>
      </div>
    );
  }

  // Default rendering for normal login
  return (
    <div className="min-h-screen bg-gray-50">
      <LoginDrawer
        isOpen={isOpen}
        onClose={handleClose}
        onLoginSuccess={handleLoginSuccess}
        isAddAccountMode={addAccount}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginPageContent />
    </Suspense>
  );
}
