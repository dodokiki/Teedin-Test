/**
 * Smart Adaptive Security System Index
 * เฉพาะสำหรับ Super Admin Page
 *
 * การใช้งาน:
 * import { useSuperAdminSession, SessionWarning } from './security';
 */

// Configuration
export {
  default as SUPER_ADMIN_SECURITY_CONFIG,
  calculateRiskLevel,
  getTimeBasedConfig,
} from "./config";

// Hooks
export { useSuperAdminSession } from "./hooks/useSuperAdminSession";
export type {
  SessionActions,
  SessionState,
} from "./hooks/useSuperAdminSession";

// Components
export { SessionWarning } from "./components/SessionWarning";

// Utils
export {
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
} from "./utils/jwt-utils";

/**
 * Quick Setup Guide:
 *
 * 1. Wrap your Super Admin pages with security:
 *    const { isAuthenticated, user, trackActivity, extendSession, logout } = useSuperAdminSession();
 *
 * 2. Track activities:
 *    onClick={() => trackActivity('DELETE_USER')}
 *
 * 3. Add session warning:
 *    <SessionWarning
 *      isVisible={isWarningShown}
 *      timeRemaining={timeRemaining}
 *      onExtendSession={extendSession}
 *      onLogout={logout}
 *    />
 */
