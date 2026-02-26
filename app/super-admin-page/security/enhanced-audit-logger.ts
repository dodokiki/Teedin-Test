/**
 * Smart Adaptive Security System - Enhanced Audit Logger
 * รองรับ Database Helper และมีฟังก์ชันครบครัน
 */

"use client";

import { calculateRiskLevel } from "./config";
import {
  securityDB,
  type AuditLogEntry,
  type SecurityEvent,
} from "./database-helper";

// Type for JSON data
type JsonData =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

// ===============================
// Types และ Interfaces
// ===============================

export interface ClientInfo {
  ip_address?: string;
  user_agent?: string;
  device_fingerprint: string;
}

export interface AuditContext {
  userId: string;
  userEmail: string;
  sessionId: string;
}

export interface LogOptions {
  resourceId?: string;
  details?: JsonData;
  success?: boolean;
  errorMessage?: string;
  metadata?: JsonData;
}

// ===============================
// Utility Functions
// ===============================

// สร้าง Device Fingerprint
export const generateDeviceFingerprint = (): string => {
  if (typeof window === "undefined") return "server-side";

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("Security fingerprint", 2, 2);
    }

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height + "x" + screen.colorDepth,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
    ].join("|");

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  } catch (_error) {
    // Fallback fingerprint
    return Date.now().toString(16) + Math.random().toString(16).substring(2);
  }
};

// รับข้อมูล Client
export const getClientInfo = (): ClientInfo => ({
  ip_address:
    typeof window !== "undefined" ? window.location.hostname : undefined,
  user_agent: typeof window !== "undefined" ? navigator.userAgent : undefined,
  device_fingerprint: generateDeviceFingerprint(),
});

// ===============================
// Base Audit Logger
// ===============================

class AuditLogger {
  private static instance: AuditLogger;

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  async log(
    context: AuditContext,
    action: string,
    resourceType: string,
    options: LogOptions = {}
  ): Promise<boolean> {
    try {
      const clientInfo = getClientInfo();
      const riskLevel = calculateRiskLevel(action);

      const logEntry: AuditLogEntry = {
        user_id: context.userId,
        user_email: context.userEmail,
        action,
        resource_type: resourceType,
        resource_id: options.resourceId,
        details: options.details || {},
        ...clientInfo,
        session_id: context.sessionId,
        risk_level: riskLevel,
        success: options.success ?? true,
        error_message: options.errorMessage,
        metadata: {
          ...(typeof options.metadata === "object" &&
          options.metadata !== null &&
          !Array.isArray(options.metadata)
            ? options.metadata
            : {}),
          timestamp: new Date().toISOString(),
          source: "super-admin-page",
          risk_factors: this.analyzeRiskFactors(
            action,
            resourceType,
            clientInfo
          ),
        },
      };

      const result = await securityDB.insertAuditLog(logEntry);

      if (!result.success) {
        console.error("❌ Failed to log audit entry:", result.error);
        // Fallback to local storage for critical logs
        this.fallbackLog(logEntry);
      }

      return result.success;
    } catch (error) {
      console.error("❌ Error in audit log:", error);
      return false;
    }
  }

  private analyzeRiskFactors(
    action: string,
    resourceType: string,
    _clientInfo: ClientInfo
  ) {
    const factors = [];

    // Time-based risk
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) factors.push("outside_business_hours");

    // Action risk
    if (action.includes("delete") || action.includes("remove"))
      factors.push("destructive_action");
    if (action.includes("bulk")) factors.push("bulk_operation");

    // Resource risk
    if (resourceType === "system" || resourceType === "security")
      factors.push("critical_resource");

    return factors;
  }

  private fallbackLog(logEntry: AuditLogEntry) {
    try {
      const fallbackKey = "audit_logs_fallback";
      const existing = JSON.parse(localStorage.getItem(fallbackKey) || "[]");
      existing.push(logEntry);
      // Keep only last 50 entries
      localStorage.setItem(fallbackKey, JSON.stringify(existing.slice(-50)));
    } catch (error) {
      console.error("❌ Fallback logging failed:", error);
    }
  }

  async logSecurityEvent(
    event_type: string,
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    event_data?: JsonData,
    userId?: string
  ): Promise<boolean> {
    try {
      const clientInfo = getClientInfo();

      const securityEvent: SecurityEvent = {
        user_id: userId,
        event_type,
        severity,
        ...clientInfo,
        event_data: event_data || {},
      };

      const result = await securityDB.insertSecurityEvent(securityEvent);
      return result.success;
    } catch (error) {
      console.error("❌ Error logging security event:", error);
      return false;
    }
  }
}

// ===============================
// Specific Logging Functions
// ===============================

const logger = AuditLogger.getInstance();

// Authentication Events
export const logLogin = (context: AuditContext, method: string = "password") =>
  logger.log(context, "LOGIN", "authentication", {
    details: { method, login_time: new Date().toISOString() },
  });

export const logLogout = (context: AuditContext, reason: string = "manual") =>
  logger.log(context, "LOGOUT", "authentication", {
    details: { reason, logout_time: new Date().toISOString() },
  });

export const logFailedLogin = (userEmail: string, reason: string) =>
  logger.logSecurityEvent("FAILED_LOGIN", "MEDIUM", {
    email: userEmail,
    reason,
    attempt_time: new Date().toISOString(),
  });

// User Management
export const logUserView = (context: AuditContext, targetUserId: string) =>
  logger.log(context, "VIEW_USER", "users", { resourceId: targetUserId });

export const logUserEdit = (
  context: AuditContext,
  targetUserId: string,
  changes: JsonData
) =>
  logger.log(context, "EDIT_USER", "users", {
    resourceId: targetUserId,
    details: {
      changes,
      modified_fields:
        typeof changes === "object" &&
        changes !== null &&
        !Array.isArray(changes)
          ? Object.keys(changes)
          : [],
    },
  });

export const logUserDelete = (
  context: AuditContext,
  targetUserId: string,
  userInfo: JsonData
) =>
  logger.log(context, "DELETE_USER", "users", {
    resourceId: targetUserId,
    details: { deleted_user: userInfo },
  });

export const logUserBulkOperation = (
  context: AuditContext,
  operation: string,
  userIds: string[],
  details?: JsonData
) =>
  logger.log(context, `BULK_${operation.toUpperCase()}`, "users", {
    details: {
      operation,
      affected_users: userIds,
      count: userIds.length,
      ...(typeof details === "object" &&
      details !== null &&
      !Array.isArray(details)
        ? details
        : {}),
    },
  });

// Property Management
export const logPropertyView = (context: AuditContext, propertyId: string) =>
  logger.log(context, "VIEW_PROPERTY", "properties", {
    resourceId: propertyId,
  });

export const logPropertyApprove = (
  context: AuditContext,
  propertyId: string,
  status: "approved" | "rejected",
  reason?: string
) =>
  logger.log(context, "APPROVE_PROPERTY", "properties", {
    resourceId: propertyId,
    details: { status, reason, decision_time: new Date().toISOString() },
  });

export const logPropertyEdit = (
  context: AuditContext,
  propertyId: string,
  changes: JsonData
) =>
  logger.log(context, "EDIT_PROPERTY", "properties", {
    resourceId: propertyId,
    details: {
      changes,
      modified_fields:
        typeof changes === "object" &&
        changes !== null &&
        !Array.isArray(changes)
          ? Object.keys(changes)
          : [],
    },
  });

export const logPropertyDelete = (
  context: AuditContext,
  propertyId: string,
  propertyInfo: JsonData
) =>
  logger.log(context, "DELETE_PROPERTY", "properties", {
    resourceId: propertyId,
    details: { deleted_property: propertyInfo },
  });

// System Management
export const logSystemSettingChange = (
  context: AuditContext,
  setting: string,
  oldValue: JsonData,
  newValue: JsonData
) =>
  logger.log(context, "CHANGE_SYSTEM_SETTING", "system", {
    details: {
      setting,
      old_value: oldValue,
      new_value: newValue,
      change_time: new Date().toISOString(),
    },
  });

export const logDataExport = (
  context: AuditContext,
  exportType: string,
  recordCount: number,
  filters?: JsonData
) =>
  logger.log(context, "EXPORT_DATA", "system", {
    details: {
      export_type: exportType,
      record_count: recordCount,
      filters,
      export_time: new Date().toISOString(),
    },
  });

export const logPageView = (
  context: AuditContext,
  page: string,
  duration?: number
) =>
  logger.log(context, "VIEW_PAGE", "navigation", {
    details: {
      page,
      duration,
      view_time: new Date().toISOString(),
    },
  });

// Security Events
export const logSuspiciousActivity = (
  context: AuditContext,
  activity: string,
  details: JsonData
) =>
  logger.logSecurityEvent("SUSPICIOUS_ACTIVITY", "HIGH", {
    activity,
    user_id: context.userId,
    details,
    detected_time: new Date().toISOString(),
  });

export const logSecurityViolation = (
  context: AuditContext,
  violation: string,
  severity: "MEDIUM" | "HIGH" | "CRITICAL"
) =>
  logger.logSecurityEvent("SECURITY_VIOLATION", severity, {
    violation,
    user_id: context.userId,
    violation_time: new Date().toISOString(),
  });

export const logSessionTimeout = (context: AuditContext, reason: string) =>
  logger.log(context, "SESSION_TIMEOUT", "security", {
    details: { reason, timeout_time: new Date().toISOString() },
  });

// ===============================
// Analytics และ Statistics
// ===============================

export const getAuditStatistics = async (days: number = 30) => {
  try {
    const result = await securityDB.getAuditLogStats(days);

    if (!result.success || !result.data) {
      return {
        success: false,
        data: null,
      };
    }

    const logs = result.data;

    // คำนวณสถิติ
    const stats = {
      totalLogs: logs.length,
      successRate:
        logs.length > 0
          ? (logs
              .filter(
                (log: { count?: number; success?: boolean }) =>
                  log.count && log.success
              )
              .reduce(
                (sum: number, log: { count?: number }) =>
                  sum + (log.count || 0),
                0
              ) /
              logs.reduce(
                (sum: number, log: { count?: number }) =>
                  sum + (log.count || 0),
                0
              )) *
            100
          : 0,
      riskLevelBreakdown: logs.reduce(
        (
          acc: Record<string, number>,
          log: { risk_level: string; count?: number }
        ) => {
          acc[log.risk_level] = (acc[log.risk_level] || 0) + (log.count || 0);
          return acc;
        },
        {}
      ),
      topActions: logs.reduce(
        (
          acc: Record<string, number>,
          log: { action: string; count?: number }
        ) => {
          acc[log.action] = (acc[log.action] || 0) + (log.count || 0);
          return acc;
        },
        {}
      ),
    };

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("❌ Error getting audit statistics:", error);
    return {
      success: false,
      error,
    };
  }
};

export const getRecentActivity = async (limit: number = 50) => {
  try {
    const result = await securityDB.getAuditLogs({
      limit,
      offset: 0,
    });

    return result;
  } catch (error) {
    console.error("❌ Error getting recent activity:", error);
    return { success: false, error };
  }
};

// ===============================
// Export default logger
// ===============================

export default logger;
export { AuditLogger };
