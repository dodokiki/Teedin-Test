/**
 * Enhanced Session Hook - Fixed TypeScript Issues
 * จัดการ JWT sessions และ adaptive timeout สำหรับ Super Admin
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTimeBasedConfig } from "./config";
import { securityDB } from "./database-helper";
import {
  generateDeviceFingerprint,
  logLogin,
  logLogout,
  type AuditContext,
} from "./enhanced-audit-logger";
import {
  generateSessionId,
  verifyAccessToken as verifyToken,
  type SuperAdminTokenPayload as TokenPayload,
} from "./utils/jwt-utils";

// Types
interface SessionState {
  isAuthenticated: boolean;
  user: TokenPayload | null;
  sessionId: string | null;
  timeRemaining: number;
  showWarning: boolean;
  warningCountdown: number;
  isLoading: boolean;
}

export interface SuperAdminSessionHook {
  isAuthenticated: boolean;
  user: TokenPayload | null;
  sessionId: string | null;
  timeRemaining: number;
  showWarning: boolean;
  warningCountdown: number;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  extendSession: () => void;
  refreshSession: () => Promise<boolean>;
}

export function useSuperAdminSession(): SuperAdminSessionHook {
  // State
  const [state, setState] = useState<SessionState>({
    isAuthenticated: false,
    user: null,
    sessionId: null,
    timeRemaining: 0,
    showWarning: false,
    warningCountdown: 0,
    isLoading: true,
  });

  // Refs for timeouts and intervals
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const warningTimeout = useRef<NodeJS.Timeout | null>(null);
  const logoutTimeout = useRef<NodeJS.Timeout | null>(null);

  // Get current time-based configuration
  const getConfig = useCallback(() => {
    return getTimeBasedConfig();
  }, []);

  // Clear all timeouts
  const clearAllTimeouts = useCallback(() => {
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current);
      sessionCheckInterval.current = null;
    }
    if (warningTimeout.current) {
      clearTimeout(warningTimeout.current);
      warningTimeout.current = null;
    }
    if (logoutTimeout.current) {
      clearTimeout(logoutTimeout.current);
      logoutTimeout.current = null;
    }
  }, []);

  // Update session activity in database
  const updateSessionActivity = useCallback(async (sessionId: string) => {
    try {
      await securityDB.updateSessionActivity(sessionId);
    } catch (error) {
      console.error("❌ Failed to update session activity:", error);
    }
  }, []);

  // Check token validity
  const checkTokenValidity = useCallback(
    async (token: string): Promise<TokenPayload | null> => {
      try {
        const payload = await verifyToken(token);
        return payload;
      } catch (error) {
        console.error("❌ Token verification failed:", error);
        return null;
      }
    },
    []
  );

  // Start session timeout management
  const startSessionTimeout = useCallback(
    (sessionId: string) => {
      const config = getConfig();
      const { idleTimeout, warningTime } = config;

      clearAllTimeouts();

      // Warning timeout
      warningTimeout.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          showWarning: true,
          warningCountdown: warningTime / 1000,
        }));

        // Countdown for warning
        let countdown = warningTime / 1000;
        const countdownInterval = setInterval(() => {
          countdown -= 1;
          setState(prev => ({ ...prev, warningCountdown: countdown }));

          if (countdown <= 0) {
            clearInterval(countdownInterval);
          }
        }, 1000);

        // Auto logout after warning time
        logoutTimeout.current = setTimeout(() => {
          logout();
        }, warningTime);
      }, idleTimeout - warningTime);

      // Update time remaining
      let remaining = idleTimeout / 1000;
      sessionCheckInterval.current = setInterval(() => {
        remaining -= 1;
        setState(prev => ({ ...prev, timeRemaining: remaining }));

        if (remaining <= 0) {
          clearInterval(sessionCheckInterval.current!);
        }
      }, 1000);
    },
    [getConfig, clearAllTimeouts]
  );

  // Login function
  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));

        // TODO: Implement actual authentication logic
        // For now, simulate login
        if (email && password) {
          const sessionId = generateSessionId();
          const deviceFingerprint = generateDeviceFingerprint();

          // Create mock user payload
          const user: TokenPayload = {
            userId: "mock-user-id",
            email: email,
            role: "super_admin",
            sessionId,
            deviceFingerprint,
            ipAddress: "127.0.0.1",
            loginTime: Math.floor(Date.now() / 1000),
            lastActivity: Math.floor(Date.now() / 1000),
          };

          // Create session in database
          const expiresAt = new Date(Date.now() + getConfig().idleTimeout);
          await securityDB.createSession({
            user_id: user.userId,
            session_id: sessionId,
            device_fingerprint: deviceFingerprint,
            expires_at: expiresAt.toISOString(),
          });

          // Log successful login
          const auditContext: AuditContext = {
            userId: user.userId,
            userEmail: user.email,
            sessionId,
          };
          await logLogin(auditContext, "password");

          setState(prev => ({
            ...prev,
            isAuthenticated: true,
            user,
            sessionId,
            isLoading: false,
          }));

          startSessionTimeout(sessionId);
          return true;
        }

        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      } catch (error) {
        console.error("❌ Login failed:", error);
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
    },
    [startSessionTimeout, getConfig]
  );

  // Logout function
  const logout = useCallback(async () => {
    try {
      clearAllTimeouts();

      if (state.sessionId && state.user) {
        // Deactivate session in database
        await securityDB.deactivateSession(state.sessionId, "MANUAL_LOGOUT");

        // Log logout
        const auditContext: AuditContext = {
          userId: state.user.userId,
          userEmail: state.user.email,
          sessionId: state.sessionId,
        };
        await logLogout(auditContext, "manual");
      }

      setState({
        isAuthenticated: false,
        user: null,
        sessionId: null,
        timeRemaining: 0,
        showWarning: false,
        warningCountdown: 0,
        isLoading: false,
      });
    } catch (error) {
      console.error("❌ Logout failed:", error);
    }
  }, [state.sessionId, state.user, clearAllTimeouts]);

  // Extend session
  const extendSession = useCallback(() => {
    if (state.sessionId) {
      setState(prev => ({
        ...prev,
        showWarning: false,
        warningCountdown: 0,
      }));
      startSessionTimeout(state.sessionId);
      updateSessionActivity(state.sessionId);
    }
  }, [state.sessionId, startSessionTimeout, updateSessionActivity]);

  // Refresh session
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      // TODO: Implement token refresh logic
      return true;
    } catch (error) {
      console.error("❌ Session refresh failed:", error);
      return false;
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const token = localStorage.getItem("super_admin_token");
        if (token) {
          const payload = await checkTokenValidity(token);
          if (payload) {
            setState(prev => ({
              ...prev,
              isAuthenticated: true,
              user: payload,
              sessionId: payload.sessionId,
              isLoading: false,
            }));
            startSessionTimeout(payload.sessionId);
            return;
          }
        }
      } catch (error) {
        console.error("❌ Session initialization failed:", error);
      }

      setState(prev => ({ ...prev, isLoading: false }));
    };

    initializeSession();

    return () => {
      clearAllTimeouts();
    };
  }, [checkTokenValidity, startSessionTimeout, clearAllTimeouts]);

  return {
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    sessionId: state.sessionId,
    timeRemaining: state.timeRemaining,
    showWarning: state.showWarning,
    warningCountdown: state.warningCountdown,
    isLoading: state.isLoading,
    login,
    logout,
    extendSession,
    refreshSession,
  };
}
