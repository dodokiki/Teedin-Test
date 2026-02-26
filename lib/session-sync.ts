// lib/session-sync.ts
// ระบบสำหรับ sync session state ระหว่างแท็บต่างๆ

export interface SessionState {
  isAuthenticated: boolean;
  userRole?: string;
  timestamp: number;
}

export class SessionSync {
  private static readonly STORAGE_KEY = "tedin_session_state";
  private static readonly LOGOUT_EVENT = "tedin_logout";

  // บันทึก session state
  static setSessionState(state: SessionState) {
    const stateWithTimestamp = {
      ...state,
      timestamp: Date.now(),
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateWithTimestamp));

    // ส่ง event ไปยังแท็บอื่นๆ
    window.dispatchEvent(
      new CustomEvent("session_change", {
        detail: stateWithTimestamp,
      })
    );
  }

  // ดึง session state ปัจจุบัน
  static getSessionState(): SessionState | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const state = JSON.parse(stored);

      // ตรวจสอบว่า state ไม่เก่าเกินไป (5 นาที)
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (now - state.timestamp > maxAge) {
        localStorage.removeItem(this.STORAGE_KEY);
        return null;
      }

      return state;
    } catch {
      return null;
    }
  }

  // ล้าง session state และแจ้งแท็บอื่นๆ
  static clearSessionState() {
    localStorage.removeItem(this.STORAGE_KEY);

    // แจ้ง logout event ไปยังแท็บอื่นๆ
    localStorage.setItem(this.LOGOUT_EVENT, Date.now().toString());
    localStorage.removeItem(this.LOGOUT_EVENT);

    window.dispatchEvent(new CustomEvent("session_logout"));
  }

  // ฟังการเปลี่ยนแปลง session ใน storage
  static onSessionChange(callback: (state: SessionState | null) => void) {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === this.STORAGE_KEY) {
        const newState = e.newValue ? JSON.parse(e.newValue) : null;
        callback(newState);
      } else if (e.key === this.LOGOUT_EVENT) {
        // มีการ logout ในแท็บอื่น
        callback(null);
      }
    };

    const handleCustomEvent = (e: CustomEvent) => {
      if (e.type === "session_change") {
        callback(e.detail);
      } else if (e.type === "session_logout") {
        callback(null);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(
      "session_change",
      handleCustomEvent as EventListener
    );
    window.addEventListener(
      "session_logout",
      handleCustomEvent as EventListener
    );

    // Return cleanup function
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "session_change",
        handleCustomEvent as EventListener
      );
      window.removeEventListener(
        "session_logout",
        handleCustomEvent as EventListener
      );
    };
  }

  // ตรวจสอบว่าควร redirect ไปไหนเมื่อไม่มี session
  static getRedirectPath(currentPath: string): string {
    // ถ้าอยู่ในหน้า super-admin ไป super-admin-login
    if (currentPath.startsWith("/super-admin")) {
      return "/super-admin-login";
    }

    // ถ้าอยู่ในหน้าอื่นๆ ไปหน้าแรก
    return "/";
  }
}
