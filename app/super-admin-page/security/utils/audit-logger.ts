/**
 * Smart Adaptive Security System - Audit Logger
 * บันทึกทุกการกระทำสำคัญเพื่อการตรวจสอบและความปลอดภัย
 */

"use client";

import { getSuperAdminBrowserClient } from "@/lib/super-admin-supabase";

// Type for JSON data
type JsonData = Record<string, unknown>;

export interface AuditLog {
  id?: string;
  user_id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: JsonData;
  ip_address: string;
  user_agent: string;
  device_fingerprint: string;
  session_id: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  success: boolean;
  error_message?: string;
  timestamp: string;
  metadata?: JsonData;
}

export interface AuditLogFilter {
  user_id?: string;
  action?: string;
  resource_type?: string;
  risk_level?: string;
  success?: boolean;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

/**
 * สร้าง Audit Log ใหม่
 */

export async function createAuditLog(
  logData: Omit<AuditLog, "id" | "timestamp">
): Promise<boolean> {
  try {
    const auditLog: AuditLog = {
      ...logData,
      timestamp: new Date().toISOString(),
    };

    const superAdminSupabase = getSuperAdminBrowserClient();
    // บันทึกในฐานข้อมูล
    const { error } = await superAdminSupabase
      .from("audit_logs")
      .insert([auditLog]);

    if (error) {
      console.error("❌ Error creating audit log:", error);

      // Fallback: บันทึกในฐานข้อมูลภายใน browser สำรอง
      const localLogs = JSON.parse(
        localStorage.getItem("audit_logs_backup") || "[]"
      );
      localLogs.push(auditLog);
      localStorage.setItem(
        "audit_logs_backup",
        JSON.stringify(localLogs.slice(-100))
      ); // เก็บแค่ 100 รายการล่าสุด

      return false;
    }

    console.log("✅ Audit log created successfully:", auditLog.action);
    return true;
  } catch (error) {
    console.error("❌ Error in createAuditLog:", error);
    return false;
  }
}

/**
 * ค้นหา Audit Logs
 */
export async function getAuditLogs(
  filter: AuditLogFilter = {}
): Promise<AuditLog[]> {
  try {
    const superAdminSupabase = getSuperAdminBrowserClient();
    let query = superAdminSupabase
      .from("audit_logs")
      .select("*")
      .order("timestamp", { ascending: false });

    // Apply filters
    if (filter.user_id) {
      query = query.eq("user_id", filter.user_id);
    }
    if (filter.action) {
      query = query.eq("action", filter.action);
    }
    if (filter.resource_type) {
      query = query.eq("resource_type", filter.resource_type);
    }
    if (filter.risk_level) {
      query = query.eq("risk_level", filter.risk_level);
    }
    if (filter.success !== undefined) {
      query = query.eq("success", filter.success);
    }
    if (filter.date_from) {
      query = query.gte("timestamp", filter.date_from);
    }
    if (filter.date_to) {
      query = query.lte("timestamp", filter.date_to);
    }

    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching audit logs:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("❌ Error in getAuditLogs:", error);
    return [];
  }
}

/**
 * สร้าง Audit Log สำหรับการ Login
 */
export async function logLoginActivity(
  userId: string,
  userEmail: string,
  success: boolean,
  ipAddress: string,
  userAgent: string,
  deviceFingerprint: string,
  sessionId: string,
  errorMessage?: string
): Promise<void> {
  await createAuditLog({
    user_id: userId,
    user_email: userEmail,
    action: "LOGIN",
    resource_type: "AUTHENTICATION",
    details: {
      login_method: "super_admin_jwt",
      device_info: {
        user_agent: userAgent,
        fingerprint: deviceFingerprint,
      },
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    device_fingerprint: deviceFingerprint,
    session_id: sessionId,
    risk_level: "HIGH", // Login เป็น HIGH risk
    success,
    error_message: errorMessage,
  });
}

/**
 * สร้าง Audit Log สำหรับการ Logout
 */
export async function logLogoutActivity(
  userId: string,
  userEmail: string,
  sessionId: string,
  reason:
    | "USER_INITIATED"
    | "SESSION_TIMEOUT"
    | "FORCED_LOGOUT"
    | "SECURITY_VIOLATION"
): Promise<void> {
  await createAuditLog({
    user_id: userId,
    user_email: userEmail,
    action: "LOGOUT",
    resource_type: "AUTHENTICATION",
    details: {
      logout_reason: reason,
      session_duration: "calculated_in_frontend",
    },
    ip_address: "N/A",
    user_agent: navigator.userAgent,
    device_fingerprint: "N/A",
    session_id: sessionId,
    risk_level: reason === "SECURITY_VIOLATION" ? "CRITICAL" : "MEDIUM",
    success: true,
  });
}

/**
 * สร้าง Audit Log สำหรับการจัดการ Users
 */
export async function logUserManagementActivity(
  adminUserId: string,
  adminEmail: string,
  action: "VIEW_USERS" | "EDIT_USER" | "DELETE_USER" | "BULK_DELETE",
  targetUserId: string,
  details: JsonData,
  sessionInfo: {
    ipAddress: string;
    userAgent: string;
    deviceFingerprint: string;
    sessionId: string;
  },
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const riskLevels = {
    VIEW_USERS: "LOW" as const,
    EDIT_USER: "MEDIUM" as const,
    DELETE_USER: "HIGH" as const,
    BULK_DELETE: "CRITICAL" as const,
  };

  await createAuditLog({
    user_id: adminUserId,
    user_email: adminEmail,
    action,
    resource_type: "USER_MANAGEMENT",
    resource_id: targetUserId,
    details,
    ip_address: sessionInfo.ipAddress,
    user_agent: sessionInfo.userAgent,
    device_fingerprint: sessionInfo.deviceFingerprint,
    session_id: sessionInfo.sessionId,
    risk_level: riskLevels[action],
    success,
    error_message: errorMessage,
  });
}

/**
 * สร้าง Audit Log สำหรับการจัดการ Properties
 */
export async function logPropertyManagementActivity(
  adminUserId: string,
  adminEmail: string,
  action:
    | "VIEW_PROPERTIES"
    | "EDIT_PROPERTY"
    | "DELETE_PROPERTY"
    | "APPROVE_PROPERTY",
  propertyId: string,
  details: JsonData,
  sessionInfo: {
    ipAddress: string;
    userAgent: string;
    deviceFingerprint: string;
    sessionId: string;
  },
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const riskLevels = {
    VIEW_PROPERTIES: "LOW" as const,
    EDIT_PROPERTY: "MEDIUM" as const,
    DELETE_PROPERTY: "HIGH" as const,
    APPROVE_PROPERTY: "MEDIUM" as const,
  };

  await createAuditLog({
    user_id: adminUserId,
    user_email: adminEmail,
    action,
    resource_type: "PROPERTY_MANAGEMENT",
    resource_id: propertyId,
    details,
    ip_address: sessionInfo.ipAddress,
    user_agent: sessionInfo.userAgent,
    device_fingerprint: sessionInfo.deviceFingerprint,
    session_id: sessionInfo.sessionId,
    risk_level: riskLevels[action],
    success,
    error_message: errorMessage,
  });
}

/**
 * สร้าง Audit Log สำหรับการเข้าถึงข้อมูลระบบ
 */
export async function logSystemActivity(
  adminUserId: string,
  adminEmail: string,
  action:
    | "VIEW_DASHBOARD"
    | "EXPORT_DATA"
    | "SYSTEM_SETTINGS"
    | "DATABASE_BACKUP",
  details: JsonData,
  sessionInfo: {
    ipAddress: string;
    userAgent: string;
    deviceFingerprint: string;
    sessionId: string;
  },
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const riskLevels = {
    VIEW_DASHBOARD: "LOW" as const,
    EXPORT_DATA: "MEDIUM" as const,
    SYSTEM_SETTINGS: "CRITICAL" as const,
    DATABASE_BACKUP: "CRITICAL" as const,
  };

  await createAuditLog({
    user_id: adminUserId,
    user_email: adminEmail,
    action,
    resource_type: "SYSTEM",
    details,
    ip_address: sessionInfo.ipAddress,
    user_agent: sessionInfo.userAgent,
    device_fingerprint: sessionInfo.deviceFingerprint,
    session_id: sessionInfo.sessionId,
    risk_level: riskLevels[action],
    success,
    error_message: errorMessage,
  });
}

/**
 * สร้าง Audit Log สำหรับกิจกรรมที่น่าสงสัย
 */
export async function logSecurityEvent(
  userId: string,
  userEmail: string,
  event:
    | "SUSPICIOUS_IP"
    | "DEVICE_MISMATCH"
    | "MULTIPLE_FAILED_ATTEMPTS"
    | "TOKEN_TAMPERING",
  details: JsonData,
  sessionInfo: {
    ipAddress: string;
    userAgent: string;
    deviceFingerprint: string;
    sessionId: string;
  }
): Promise<void> {
  await createAuditLog({
    user_id: userId,
    user_email: userEmail,
    action: `SECURITY_${event}`,
    resource_type: "SECURITY",
    details: {
      ...details,
      auto_detected: true,
      alert_level: "HIGH",
    },
    ip_address: sessionInfo.ipAddress,
    user_agent: sessionInfo.userAgent,
    device_fingerprint: sessionInfo.deviceFingerprint,
    session_id: sessionInfo.sessionId,
    risk_level: "CRITICAL",
    success: false, // Security events are always flagged as unsuccessful
  });
}

/**
 * แสดงสถิติ Audit Logs
 */
export async function getAuditLogStats(days: number = 7): Promise<{
  totalLogs: number;
  successRate: number;
  riskLevelBreakdown: Record<string, number>;
  topActions: Array<{ action: string; count: number }>;
  topUsers: Array<{ user_email: string; count: number }>;
}> {
  try {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const superAdminSupabase = getSuperAdminBrowserClient();
    const { data: logs } = await superAdminSupabase
      .from("audit_logs")
      .select("*")
      .gte("timestamp", dateFrom.toISOString());

    if (!logs) {
      return {
        totalLogs: 0,
        successRate: 0,
        riskLevelBreakdown: {},
        topActions: [],
        topUsers: [],
      };
    }

    const totalLogs = logs.length;
    const successfulLogs = logs.filter((log: AuditLog) => log.success).length;
    const successRate = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0;

    // Risk level breakdown
    const riskLevelBreakdown = logs.reduce(
      (acc: Record<string, number>, log: AuditLog) => {
        acc[log.risk_level] = (acc[log.risk_level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Top actions
    const actionCounts = logs.reduce(
      (acc: Record<string, number>, log: AuditLog) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const topActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([action, count]) => ({ action, count: count as number }));

    // Top users
    const userCounts = logs.reduce(
      (acc: Record<string, number>, log: AuditLog) => {
        acc[log.user_email] = (acc[log.user_email] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const topUsers = Object.entries(userCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([user_email, count]) => ({ user_email, count: count as number }));

    return {
      totalLogs,
      successRate,
      riskLevelBreakdown,
      topActions,
      topUsers,
    };
  } catch (error) {
    console.error("❌ Error getting audit log stats:", error);
    return {
      totalLogs: 0,
      successRate: 0,
      riskLevelBreakdown: {},
      topActions: [],
      topUsers: [],
    };
  }
}
