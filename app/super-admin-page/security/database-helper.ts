// Smart Adaptive Security System - Database Helper Functions
import { getSuperAdminServerClient } from "@/lib/super-admin-supabase";

// Type for JSON data that can be anything
type JsonData =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

export interface AuditLogEntry {
  id?: string;
  user_id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: JsonData;
  ip_address?: string;
  user_agent?: string;
  device_fingerprint?: string;
  session_id: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  success?: boolean;
  error_message?: string;
  metadata?: JsonData;
  timestamp?: string;
}

export interface SuperAdminSession {
  id?: string;
  user_id: string;
  session_id: string;
  device_fingerprint: string;
  ip_address?: string;
  user_agent?: string;
  login_time?: string;
  last_activity?: string;
  expires_at: string;
  is_active?: boolean;
  logout_reason?: string;
  metadata?: JsonData;
}

export interface SecurityEvent {
  id?: string;
  user_id?: string;
  event_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  ip_address?: string;
  user_agent?: string;
  device_fingerprint?: string;
  event_data?: JsonData;
  resolved?: boolean;
  resolved_by?: string;
  resolved_at?: string;
  resolution_note?: string;
}

export interface UserRole {
  id?: string;
  user_id: string;
  role_id: string;
  assigned_by?: string;
  assigned_at?: string;
  is_active?: boolean;
}

export interface AdminRole {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_system_role: boolean;
}

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  resource: string;
  action: string;
}

export class SecurityDatabaseHelper {
  private supabasePromise: Promise<
    ReturnType<typeof getSuperAdminServerClient>
  > | null = null;

  private async getSupabase() {
    if (!this.supabasePromise) {
      this.supabasePromise = getSuperAdminServerClient();
    }
    return this.supabasePromise;
  }

  // ===============================
  // Audit Logs Methods
  // ===============================

  async insertAuditLog(log: AuditLogEntry) {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("audit_logs")
        .insert([log])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("❌ Error inserting audit log:", error);
      return { success: false, error };
    }
  }

  async getAuditLogs(
    filters: {
      user_id?: string;
      action?: string;
      resource_type?: string;
      risk_level?: string;
      start_date?: string;
      end_date?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    try {
      const supabase = await this.getSupabase();
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false });

      if (filters.user_id) query = query.eq("user_id", filters.user_id);
      if (filters.action) query = query.eq("action", filters.action);
      if (filters.resource_type)
        query = query.eq("resource_type", filters.resource_type);
      if (filters.risk_level)
        query = query.eq("risk_level", filters.risk_level);
      if (filters.start_date)
        query = query.gte("timestamp", filters.start_date);
      if (filters.end_date) query = query.lte("timestamp", filters.end_date);
      if (filters.limit) query = query.limit(filters.limit);
      if (filters.offset)
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 50) - 1
        );

      const { data, error, count } = await query;

      if (error) throw error;
      return { success: true, data, total: count || data?.length || 0 };
    } catch (error) {
      console.error("❌ Error getting audit logs:", error);
      return { success: false, error };
    }
  }

  async getAuditLogStats(days: number = 30) {
    try {
      const supabase = await this.getSupabase();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("audit_log_summary")
        .select("*")
        .gte("date", startDate.toISOString());

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("❌ Error getting audit log stats:", error);
      return { success: false, error };
    }
  }

  // ===============================
  // Session Management Methods
  // ===============================

  async createSession(session: SuperAdminSession) {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("super_admin_sessions")
        .insert([session])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("❌ Error creating session:", error);
      return { success: false, error };
    }
  }

  async updateSessionActivity(sessionId: string) {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("super_admin_sessions")
        .update({ last_activity: new Date().toISOString() })
        .eq("session_id", sessionId)
        .eq("is_active", true)
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("❌ Error updating session activity:", error);
      return { success: false, error };
    }
  }

  async deactivateSession(sessionId: string, logoutReason: string) {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("super_admin_sessions")
        .update({
          is_active: false,
          logout_reason: logoutReason,
        })
        .eq("session_id", sessionId)
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("❌ Error deactivating session:", error);
      return { success: false, error };
    }
  }

  async getActiveSessions(userId?: string) {
    try {
      const supabase = await this.getSupabase();
      let query = supabase
        .from("super_admin_sessions")
        .select("*")
        .eq("is_active", true)
        .order("last_activity", { ascending: false });

      if (userId) query = query.eq("user_id", userId);

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("❌ Error getting active sessions:", error);
      return { success: false, error };
    }
  }

  async cleanupExpiredSessions() {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase.rpc("cleanup_expired_sessions");

      if (error) throw error;
      return { success: true, cleanedCount: data };
    } catch (error) {
      console.error("❌ Error cleaning up expired sessions:", error);
      return { success: false, error };
    }
  }

  // ===============================
  // Security Events Methods
  // ===============================

  async insertSecurityEvent(event: SecurityEvent) {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("security_events")
        .insert([event])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("❌ Error inserting security event:", error);
      return { success: false, error };
    }
  }

  async getSecurityEvents(
    filters: {
      user_id?: string;
      event_type?: string;
      severity?: string;
      resolved?: boolean;
      limit?: number;
    } = {}
  ) {
    try {
      const supabase = await this.getSupabase();
      let query = supabase
        .from("security_events")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters.user_id) query = query.eq("user_id", filters.user_id);
      if (filters.event_type)
        query = query.eq("event_type", filters.event_type);
      if (filters.severity) query = query.eq("severity", filters.severity);
      if (filters.resolved !== undefined)
        query = query.eq("resolved", filters.resolved);
      if (filters.limit) query = query.limit(filters.limit);

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("❌ Error getting security events:", error);
      return { success: false, error };
    }
  }

  async resolveSecurityEvent(
    eventId: string,
    resolvedBy: string,
    note?: string
  ) {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("security_events")
        .update({
          resolved: true,
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString(),
          resolution_note: note,
        })
        .eq("id", eventId)
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("❌ Error resolving security event:", error);
      return { success: false, error };
    }
  }

  // ===============================
  // RBAC Methods
  // ===============================

  async getUserRoles(userId: string) {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("user_roles")
        .select(
          `
          *,
          admin_roles (
            id,
            name,
            display_name,
            description
          )
        `
        )
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("❌ Error getting user roles:", error);
      return { success: false, error };
    }
  }

  async getUserPermissions(userId: string) {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("user_permissions_view")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("❌ Error getting user permissions:", error);
      return { success: false, error };
    }
  }

  async assignUserRole(userId: string, roleId: string, assignedBy: string) {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("user_roles")
        .insert([
          {
            user_id: userId,
            role_id: roleId,
            assigned_by: assignedBy,
          },
        ])
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("❌ Error assigning user role:", error);
      return { success: false, error };
    }
  }

  async removeUserRole(userId: string, roleId: string) {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("user_roles")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("role_id", roleId)
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("❌ Error removing user role:", error);
      return { success: false, error };
    }
  }

  async getAllRoles() {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("admin_roles")
        .select("*")
        .order("name");

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("❌ Error getting all roles:", error);
      return { success: false, error };
    }
  }

  async checkUserPermission(
    userId: string,
    permission: string
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("user_permissions_view")
        .select("permission_name")
        .eq("user_id", userId)
        .eq("permission_name", permission)
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error("❌ Error checking user permission:", error);
      return false;
    }
  }

  // ===============================
  // Utility Methods
  // ===============================

  async getSystemStats() {
    try {
      const [auditStats, sessionStats, eventStats] = await Promise.all([
        this.getAuditLogStats(7), // Last 7 days
        this.getActiveSessions(),
        this.getSecurityEvents({ resolved: false, limit: 10 }),
      ]);

      return {
        success: true,
        data: {
          auditLogs: auditStats.data || [],
          activeSessions: sessionStats.data || [],
          unresolvedEvents: eventStats.data || [],
        },
      };
    } catch (error) {
      console.error("❌ Error getting system stats:", error);
      return { success: false, error };
    }
  }
}

// Singleton instance
export const securityDB = new SecurityDatabaseHelper();
