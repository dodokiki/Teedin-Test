/**
 * Super Admin Session Manager Hook
 * จัดการ JWT tokens และ adaptive timeout สำหรับ Super Admin
 */

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { debugLog, debugError } from "@/lib/debug-logger";
import SUPER_ADMIN_SECURITY_CONFIG, {
  calculateRiskLevel,
  getTimeBasedConfig,
} from "../config";
import {
  generateAccessToken,
  generateDeviceFingerprint,
  generateRefreshToken,
  generateSessionId,
  getTokenTimeRemaining,
  isTokenExpiringSoon,
  verifyAccessToken,
  verifyRefreshToken,
  type RefreshTokenPayload,
  type SuperAdminTokenPayload,
} from "../utils/jwt-utils";

export interface SessionState {
  isAuthenticated: boolean;
  user: SuperAdminTokenPayload | null;
  sessionId: string | null;
  lastActivity: number;
  timeRemaining: number;
  isWarningShown: boolean;
  currentRiskLevel: string;
  deviceFingerprint: string;
}

export interface SessionActions {
  login: (email: string, userId: string) => Promise<boolean>;
  logout: () => void;
  extendSession: (minutes?: number) => Promise<boolean>;
  trackActivity: (action?: string) => void;
  refreshTokens: () => Promise<boolean>;
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: "super_admin_access_token",
  REFRESH_TOKEN: "super_admin_refresh_token",
  SESSION_DATA: "super_admin_session_data",
  DEVICE_FINGERPRINT: "super_admin_device_fingerprint",
};

export function useSuperAdminSession(): SessionState & SessionActions {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>({
    isAuthenticated: false,
    user: null,
    sessionId: null,
    lastActivity: Date.now(),
    timeRemaining: 0,
    isWarningShown: false,
    currentRiskLevel: "MEDIUM",
    deviceFingerprint: "",
  });

  // Refs for intervals and timeouts
  const activityCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const tokenRefreshTimeout = useRef<NodeJS.Timeout | null>(null);
  const warningTimeout = useRef<NodeJS.Timeout | null>(null);

  /**
   * Get client IP address (simplified version)
   */
  const getClientIP = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch("/api/get-ip");
      const data = await response.json();
      return data.ip || "127.0.0.1";
    } catch (error) {
      console.error("❌ Error getting client IP:", error);
      return "127.0.0.1";
    }
  }, []);

  /**
   * Initialize session from stored data
   */
  const initializeSession = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const deviceFingerprint =
        localStorage.getItem(STORAGE_KEYS.DEVICE_FINGERPRINT) ||
        generateDeviceFingerprint();

      // Store device fingerprint if not exists
      if (!localStorage.getItem(STORAGE_KEYS.DEVICE_FINGERPRINT)) {
        localStorage.setItem(
          STORAGE_KEYS.DEVICE_FINGERPRINT,
          deviceFingerprint
        );
      }

      if (!accessToken) {
        setSessionState(prev => ({
          ...prev,
          isAuthenticated: false,
          deviceFingerprint,
        }));
        return;
      }

      const tokenPayload = await verifyAccessToken(accessToken);
      if (!tokenPayload) {
        // Try to refresh token
        const refreshed = await refreshTokens();
        if (!refreshed) {
          logout();
        }
        return;
      }

      // Verify device fingerprint matches
      if (tokenPayload.deviceFingerprint !== deviceFingerprint) {
        console.warn("⚠️ Device fingerprint mismatch");
        logout();
        return;
      }

      const timeRemaining = getTokenTimeRemaining(accessToken);

      setSessionState(prev => ({
        ...prev,
        isAuthenticated: true,
        user: tokenPayload,
        sessionId: tokenPayload.sessionId,
        lastActivity: tokenPayload.lastActivity,
        timeRemaining,
        deviceFingerprint,
      }));

      // Setup token refresh if needed
      setupTokenRefresh(timeRemaining);
    } catch (error) {
      console.error("❌ Error initializing session:", error);
      logout();
    }
  }, []);

  /**
   * Login function
   */
  const login = useCallback(
    async (email: string, userId: string): Promise<boolean> => {
      try {
        const deviceFingerprint = generateDeviceFingerprint();
        const sessionId = generateSessionId();
        const ipAddress = await getClientIP();
        const loginTime = Date.now();

        const accessTokenPayload: SuperAdminTokenPayload = {
          userId,
          email,
          role: "super_admin",
          sessionId,
          deviceFingerprint,
          ipAddress,
          loginTime,
          lastActivity: loginTime,
        };

        const refreshTokenPayload: RefreshTokenPayload = {
          userId,
          sessionId,
          deviceFingerprint,
          type: "refresh",
        };

        const [accessToken, refreshToken] = await Promise.all([
          generateAccessToken(accessTokenPayload),
          generateRefreshToken(refreshTokenPayload),
        ]);

        // Store tokens
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        localStorage.setItem(
          STORAGE_KEYS.DEVICE_FINGERPRINT,
          deviceFingerprint
        );

        const timeRemaining =
          SUPER_ADMIN_SECURITY_CONFIG.JWT.ACCESS_TOKEN_EXPIRY;

        setSessionState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: accessTokenPayload,
          sessionId,
          lastActivity: loginTime,
          timeRemaining,
          deviceFingerprint,
        }));

        // Setup monitoring
        setupActivityMonitoring();
        setupTokenRefresh(timeRemaining);

        console.log("✅ Super Admin login successful");
        return true;
      } catch (error) {
        console.error("❌ Error during login:", error);
        return false;
      }
    },
    [getClientIP]
  );

  /**
   * Logout function
   */
  const logout = useCallback(() => {
    try {
      // Clear all stored data
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.SESSION_DATA);
      // Keep device fingerprint for next login

      // Clear intervals and timeouts
      if (activityCheckInterval.current) {
        clearInterval(activityCheckInterval.current);
      }
      if (tokenRefreshTimeout.current) {
        clearTimeout(tokenRefreshTimeout.current);
      }
      if (warningTimeout.current) {
        clearTimeout(warningTimeout.current);
      }

      setSessionState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        sessionId: null,
        timeRemaining: 0,
        isWarningShown: false,
      }));

      // Redirect to login
      router.push("/super-admin-login");
      console.log("✅ Super Admin logout successful");
    } catch (error) {
      console.error("❌ Error during logout:", error);
    }
  }, [router]);

  /**
   * Refresh tokens
   */
  const refreshTokens = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        console.error("❌ No refresh token available");
        return false;
      }

      const refreshPayload = await verifyRefreshToken(refreshToken);
      if (!refreshPayload) {
        console.error("❌ Invalid refresh token");
        return false;
      }

      // Verify device fingerprint
      const deviceFingerprint = localStorage.getItem(
        STORAGE_KEYS.DEVICE_FINGERPRINT
      );
      if (refreshPayload.deviceFingerprint !== deviceFingerprint) {
        console.error("❌ Device fingerprint mismatch during refresh");
        return false;
      }

      const ipAddress = await getClientIP();
      const currentTime = Date.now();

      const newAccessTokenPayload: SuperAdminTokenPayload = {
        userId: refreshPayload.userId,
        email: sessionState.user?.email || "",
        role: "super_admin",
        sessionId: refreshPayload.sessionId,
        deviceFingerprint,
        ipAddress,
        loginTime: sessionState.user?.loginTime || currentTime,
        lastActivity: currentTime,
      };

      const newAccessToken = await generateAccessToken(newAccessTokenPayload);
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);

      const timeRemaining = SUPER_ADMIN_SECURITY_CONFIG.JWT.ACCESS_TOKEN_EXPIRY;

      setSessionState(prev => ({
        ...prev,
        user: newAccessTokenPayload,
        lastActivity: currentTime,
        timeRemaining,
        isWarningShown: false,
      }));

      setupTokenRefresh(timeRemaining);
      debugLog("✅ Tokens refreshed successfully");
      return true;
    } catch (error) {
      debugError("❌ Error refreshing tokens:", error);
      return false;
    }
  }, [getClientIP, sessionState.user]);

  /**
   * Extend session manually
   */
  const extendSession = useCallback(
    async (minutes: number = 30): Promise<boolean> => {
      try {
        const success = await refreshTokens();
        if (success) {
          debugLog(`✅ Session extended by ${minutes} minutes`);
          trackActivity("EXTEND_SESSION");
        }
        return success;
      } catch (error) {
        debugError("❌ Error extending session:", error);
        return false;
      }
    },
    [refreshTokens]
  );

  /**
   * Track user activity and adjust timeout based on risk
   */
  const trackActivity = useCallback((action: string = "GENERAL_ACTIVITY") => {
    const currentTime = Date.now();
    const riskLevel = calculateRiskLevel(action);

    setSessionState(prev => ({
      ...prev,
      lastActivity: currentTime,
      currentRiskLevel: riskLevel,
      isWarningShown: false, // Reset warning when there's activity
    }));

    // Log activity (could be sent to server)
    debugLog(`📊 Activity tracked: ${action} (Risk: ${riskLevel})`);
  }, []);

  /**
   * Setup activity monitoring
   */
  const setupActivityMonitoring = useCallback(() => {
    if (activityCheckInterval.current) {
      clearInterval(activityCheckInterval.current);
    }

    activityCheckInterval.current = setInterval(() => {
      const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!accessToken || !sessionState.isAuthenticated) return;

      const timeRemaining = getTokenTimeRemaining(accessToken);
      const timeBasedConfig = getTimeBasedConfig();

      setSessionState(prev => ({ ...prev, timeRemaining }));

      // Check if token is expiring soon
      if (isTokenExpiringSoon(accessToken, timeBasedConfig.warningTime)) {
        if (!sessionState.isWarningShown) {
          setSessionState(prev => ({ ...prev, isWarningShown: true }));
        }
      }

      // Check if token is expired
      if (timeRemaining <= 0) {
        debugLog("⏰ Access token expired");
        refreshTokens();
      }
    }, SUPER_ADMIN_SECURITY_CONFIG.SECURITY.SESSION_INACTIVITY_CHECK);
  }, [
    refreshTokens,
    sessionState.isAuthenticated,
    sessionState.isWarningShown,
  ]);

  /**
   * Setup automatic token refresh
   */
  const setupTokenRefresh = useCallback(
    (timeRemaining: number) => {
      if (tokenRefreshTimeout.current) {
        clearTimeout(tokenRefreshTimeout.current);
      }

      // Refresh token 5 minutes before expiry
      const refreshTime = Math.max(0, timeRemaining - 5 * 60 * 1000);

      tokenRefreshTimeout.current = setTimeout(() => {
        refreshTokens();
      }, refreshTime);
    },
    [refreshTokens]
  );

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
    return () => {
      // Cleanup intervals on unmount
      if (activityCheckInterval.current) {
        clearInterval(activityCheckInterval.current);
      }
      if (tokenRefreshTimeout.current) {
        clearTimeout(tokenRefreshTimeout.current);
      }
    };
  }, [initializeSession]);

  // Setup activity monitoring when authenticated
  useEffect(() => {
    if (sessionState.isAuthenticated) {
      setupActivityMonitoring();
    }
  }, [sessionState.isAuthenticated, setupActivityMonitoring]);

  return {
    ...sessionState,
    login,
    logout,
    extendSession,
    trackActivity,
    refreshTokens,
  };
}
