"use client";

import { ForgotPasswordDrawer } from "@/components/auth/forgot-password-drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { Eye, EyeOff, X } from "lucide-react";
import { useEffect, useState } from "react";

interface LoginDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  showSuccessModal?: boolean;
  onSwitchToRegister?: () => void;
  isAddAccountMode?: boolean;
}

export function LoginDrawer({
  isOpen,
  onClose,
  onLoginSuccess,
  showSuccessModal = false,
  onSwitchToRegister,
  isAddAccountMode = false,
}: LoginDrawerProps) {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Reset state when drawer is closed
  useEffect(() => {
    if (isOpen) {
      // Reset all fields
      setEmailOrPhone("");
      setPassword("");
      setShowPassword(false);
      setRememberMe(false);
      setError("");
      setIsLoading(false);
      // Use requestAnimationFrame to ensure DOM is ready for animation
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
      // Delay unmount for animation
      const timeout = setTimeout(() => { }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Import useAuth here
  const { login: authLogin, loginWithGoogle, loginWithLine } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate input
    if (!emailOrPhone || !password) {
      setError("กรุณากรอกอีเมลหรือเบอร์โทรและรหัสผ่าน");
      setIsLoading(false);
      return;
    }

    // Normal login logic with Supabase
    try {
      const result = await authLogin(emailOrPhone, password, rememberMe);

      if (result.error) {
        // แปลข้อความ error เป็นภาษาไทยที่เข้าใจง่าย
        let userFriendlyMessage = "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";

        if (
          result.error.message?.includes("สมัครด้วย Google") ||
          result.error.message?.includes("เข้าสู่ระบบด้วย Google")
        ) {
          userFriendlyMessage =
            "บัญชีนี้ถูกลงชื่อเข้าใช้ด้วย Google กรุณาเข้าสู่ระบบด้วย Google";
          console.warn("⚠️ Login blocked - Google SSO-only account");
        } else if (
          result.error.message?.includes("สมัครด้วย LINE") ||
          result.error.message?.includes("เข้าสู่ระบบด้วย LINE")
        ) {
          userFriendlyMessage =
            "บัญชีนี้ถูกลงชื่อเข้าใช้ด้วย LINE กรุณาเข้าสู่ระบบด้วย LINE";
          console.warn("⚠️ Login blocked - LINE SSO-only account");
        } else if (
          result.error.message?.includes("Invalid login credentials")
        ) {
          userFriendlyMessage =
            "อีเมล/เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง";
          // ใช้ warn สำหรับ expected errors (ไม่ใช่ system error จริงๆ)
          console.warn("⚠️ Login failed - Invalid credentials");
        } else if (result.error.message?.includes("Email not confirmed")) {
          userFriendlyMessage = "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ";
          console.warn("⚠️ Login failed - Email not confirmed");
        } else if (result.error.message?.includes("too many requests")) {
          userFriendlyMessage =
            "มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่";
          console.warn("⚠️ Login failed - Rate limited");
        } else if (result.error.message?.includes("ไม่พบเบอร์โทร")) {
          userFriendlyMessage = result.error.message;
          console.warn("⚠️ Login failed - Phone not found");
        } else if (result.error.message?.includes("รหัสผ่านไม่ถูกต้อง")) {
          // NEW: Handle incorrect password specifically
          userFriendlyMessage = "รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง";
          console.warn("⚠️ Login failed - Incorrect password");
        } else {
          // เฉพาะ unexpected errors ถึงใช้ console.error
          console.error("❌ Unexpected login error:", result.error.message);
        }

        setError(userFriendlyMessage);
        setIsLoading(false);
        return;
      }

      console.log("Login successful");

      // Call login success callback
      if (onLoginSuccess) {
        onLoginSuccess();
      }

      // Close the drawer
      onClose();
      setIsLoading(false);
    } catch (error) {
      console.error("Login exception:", error);
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await loginWithGoogle();
      if (result.error) {
        setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google");
        setIsLoading(false);
      }
      // ถ้าไม่มี error จะ redirect ไป Google OAuth page
    } catch (error) {
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google");
      setIsLoading(false);
    }
  };

  const handleLineLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await loginWithLine();
      if (result.error) {
        setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย LINE");
        setIsLoading(false);
      }
      // ถ้าไม่มี error จะ redirect ไป LINE OAuth page
    } catch (error) {
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย LINE");
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      {isOpen && !isAddAccountMode && (
        <div
          className="fixed inset-0 bg-black/50 z-50 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[450px] bg-gradient-to-br from-white via-gray-50 to-blue-50 backdrop-blur-sm z-[60] transform transition-all duration-300 ease-in-out shadow-2xl rounded-l-2xl
          ${isOpen && isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
        style={{ marginTop: 0, paddingTop: 0 }}
      >
        <div className="h-full flex flex-col p-6 overflow-y-auto">
          <div className="flex justify-end mb-4">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/60 backdrop-blur-sm transition-all duration-200"
              disabled={isLoading}
              title="Close"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>

          <div className="flex-1 mt-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-black mb-2">
                {isAddAccountMode ? "เพิ่มบัญชีผู้ใช้" : "ล็อกอิน เข้าสู่ระบบ"}
              </h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="login-email-or-phone"
                    className="text-gray-700 text-sm font-medium"
                  >
                    อีเมลหรือเบอร์โทร
                  </Label>
                  <input
                    id="login-email-or-phone"
                    type="text"
                    placeholder="Example@email.com หรือ 0812345678"
                    value={emailOrPhone}
                    onChange={e => setEmailOrPhone(e.target.value)}
                    className="h-10 w-full text-sm text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 outline-none transition-colors duration-200"
                    style={{ backgroundColor: "#ffffff" }}
                    disabled={isLoading}
                    suppressHydrationWarning={true}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="login-password"
                    className="text-gray-700 text-sm font-medium"
                  >
                    รหัสผ่าน
                  </Label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="กรอกรหัสผ่าน"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="h-10 w-full text-sm pr-10 text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 outline-none transition-colors duration-200"
                      style={{ backgroundColor: "#ffffff" }}
                      disabled={isLoading}
                      suppressHydrationWarning={true}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      disabled={isLoading}
                      suppressHydrationWarning={true}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={checked =>
                        setRememberMe(checked as boolean)
                      }
                      disabled={isLoading}
                      className="w-4 h-4"
                    />
                    <Label
                      htmlFor="remember"
                      className="text-sm text-gray-600 cursor-pointer"
                    >
                      จดจำฉันในระบบ
                    </Label>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200 font-medium"
                    onClick={() => setIsForgotOpen(true)}
                    disabled={isLoading}
                  >
                    ลืมรหัสผ่าน?
                  </button>
                </div>

                {error && (
                  <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-10 text-base bg-[#007AFF] hover:bg-[#0066d6] text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 font-semibold focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      กำลังดำเนินการ...
                    </div>
                  ) : (
                    "ยืนยัน"
                  )}
                </Button>
              </div>
            </form>

            <div className="relative flex items-center my-4">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-4 text-gray-500 text-sm">
                หรือ
              </span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 text-sm bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-start pl-4"
                disabled={isLoading}
                onClick={handleGoogleLogin}
              >
                <div className="flex items-center justify-center w-6 h-6 mr-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                <span className="flex-1 text-center pr-8">
                  {isAddAccountMode
                    ? "เพิ่มบัญชีด้วย Google"
                    : "เข้าสู่ระบบด้วย Google"}
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-10 text-sm bg-[#06C755] hover:bg-[#05B54A] text-white border-0 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-start pl-4"
                disabled={isLoading}
                onClick={handleLineLogin}
              >
                <div className="flex items-center justify-center w-6 h-6 mr-3">
                  <img
                    src="/LINE_New_App_Icon_(2020-12) (1).png"
                    alt="LINE"
                    className="w-6 h-6"
                  />
                </div>
                <span className="flex-1 text-center pr-8">
                  {isAddAccountMode
                    ? "เพิ่มบัญชีด้วย LINE"
                    : "เข้าสู่ระบบด้วย LINE"}
                </span>
              </Button>
            </div>

            {!isAddAccountMode && (
              <div className="mt-4 text-center">
                <p className="text-gray-600 text-sm">
                  คุณยังไม่มีบัญชีใช่ไหม?{" "}
                  <button
                    type="button"
                    className="text-blue-500 hover:text-blue-700 hover:underline transition-colors duration-200 font-medium"
                    onClick={onSwitchToRegister}
                    disabled={isLoading}
                  >
                    สมัครสมาชิก
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <ForgotPasswordDrawer
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
      />
    </>
  );
}

// Render the Forgot Password Drawer at the root of this component tree
export function LoginDrawerWithForgot(props: LoginDrawerProps) {
  return (
    <>
      <LoginDrawer {...props} />
    </>
  );
}
