// hooks/use-session-sync.ts
import { SessionState, SessionSync } from "@/lib/session-sync";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useSessionSync() {
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // โหลด session state ปัจจุบัน
    const currentState = SessionSync.getSessionState();
    setSessionState(currentState);
    setIsLoaded(true);

    // ฟังการเปลี่ยนแปลง session จากแท็บอื่นๆ
    const cleanup = SessionSync.onSessionChange(newState => {
      // ✅ ลบ console.log ออก (ช้าใน production)
      if (process.env.NODE_ENV === "development") {
        console.log("Session state changed:", newState);
      }
      setSessionState(newState);

      // ถ้าไม่มี session (logout) ให้ redirect
      if (!newState) {
        const currentPath = window.location.pathname;
        const redirectPath = SessionSync.getRedirectPath(currentPath);

        if (process.env.NODE_ENV === "development") {
          console.log(
            `Session cleared, redirecting from ${currentPath} to ${redirectPath}`
          );
        }
        router.replace(redirectPath);
      }
    });

    return cleanup;
  }, [router]);

  const updateSession = (state: SessionState) => {
    SessionSync.setSessionState(state);
    setSessionState(state);
  };

  const clearSession = () => {
    SessionSync.clearSessionState();
    setSessionState(null);
  };

  return {
    sessionState,
    isLoaded,
    updateSession,
    clearSession,
    isAuthenticated: sessionState?.isAuthenticated || false,
    userRole: sessionState?.userRole,
  };
}
