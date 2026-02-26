-- Smart Adaptive Security System - Database Schema
-- เพิ่มเติมในระบบที่มีอยู่ โดยใช้โครงสร้าง public schema

-- ===============================
-- Audit Logs Table (รวมกับ admin_logs ที่มีอยู่)
-- ===============================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  session_id VARCHAR(255) NOT NULL,
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Indexes สำหรับประสิทธิภาพ
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON public.audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON public.audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON public.audit_logs(session_id);

-- ===============================
-- Super Admin Sessions Table
-- ===============================
CREATE TABLE IF NOT EXISTS public.super_admin_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  device_fingerprint VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  logout_reason VARCHAR(50),
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_user_id ON public.super_admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_session_id ON public.super_admin_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_is_active ON public.super_admin_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_expires_at ON public.super_admin_sessions(expires_at);

-- ===============================
-- Roles and Permissions (RBAC) - เพิ่มเติมจากระบบเดิม
-- ===============================
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- เพิ่มข้อมูล roles เริ่มต้น
INSERT INTO public.admin_roles (name, display_name, description, is_system_role) VALUES
  ('super_admin', 'Super Administrator', 'Full system access with all permissions', true),
  ('admin', 'Administrator', 'Standard admin access with most permissions', true),
  ('agent_manager', 'Agent Manager', 'Manage agents and their properties', false),
  ('content_manager', 'Content Manager', 'Manage website content and marketing materials', false),
  ('report_viewer', 'Report Viewer', 'View reports and analytics only', false)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- เพิ่มข้อมูล permissions เริ่มต้น
INSERT INTO public.admin_permissions (name, display_name, description, resource, action) VALUES
  -- User Management
  ('users.view', 'View Users', 'View user lists and details', 'users', 'view'),
  ('users.create', 'Create Users', 'Create new user accounts', 'users', 'create'),
  ('users.edit', 'Edit Users', 'Edit user profiles and settings', 'users', 'edit'),
  ('users.delete', 'Delete Users', 'Delete user accounts', 'users', 'delete'),
  ('users.bulk_operations', 'Bulk User Operations', 'Perform bulk operations on users', 'users', 'bulk'),
  
  -- Property Management
  ('properties.view', 'View Properties', 'View property listings and details', 'properties', 'view'),
  ('properties.create', 'Create Properties', 'Create new property listings', 'properties', 'create'),
  ('properties.edit', 'Edit Properties', 'Edit property information', 'properties', 'edit'),
  ('properties.delete', 'Delete Properties', 'Delete property listings', 'properties', 'delete'),
  ('properties.approve', 'Approve Properties', 'Approve or reject property listings', 'properties', 'approve'),
  
  -- System Management
  ('system.settings', 'System Settings', 'Access and modify system settings', 'system', 'settings'),
  ('system.backup', 'Database Backup', 'Create and restore database backups', 'system', 'backup'),
  ('system.logs', 'View System Logs', 'Access system and audit logs', 'system', 'logs'),
  ('system.export', 'Export Data', 'Export system data and reports', 'system', 'export'),
  
  -- Reports and Analytics
  ('reports.view', 'View Reports', 'Access reports and analytics', 'reports', 'view'),
  ('reports.create', 'Create Reports', 'Create custom reports', 'reports', 'create'),
  ('reports.export', 'Export Reports', 'Export report data', 'reports', 'export'),
  
  -- Security Management
  ('security.sessions', 'Manage Sessions', 'View and manage user sessions', 'security', 'sessions'),
  ('security.audit', 'Security Audit', 'Access security audit features', 'security', 'audit'),
  ('security.config', 'Security Configuration', 'Configure security settings', 'security', 'config')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.admin_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- กำหนด permissions สำหรับ Super Admin (ทุกอย่าง)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM public.admin_roles WHERE name = 'super_admin'),
  ap.id
FROM public.admin_permissions ap
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- กำหนด permissions สำหรับ Admin (ยกเว้น system critical)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM public.admin_roles WHERE name = 'admin'),
  ap.id
FROM public.admin_permissions ap
WHERE ap.name NOT IN ('system.backup', 'security.config', 'system.settings')
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, role_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON public.user_roles(is_active);

-- ===============================
-- Security Events Table
-- ===============================
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  event_data JSONB DEFAULT '{}',
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON public.security_events(resolved);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);

-- ===============================
-- RLS (Row Level Security) Policies - ไม่ใช้เนื่องจากไม่ใช่ Supabase Auth
-- แต่เก็บ comments สำหรับ reference
-- ===============================

/*
-- Audit Logs - เฉพาะ Super Admin เท่านั้น
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Super Admin Sessions - เฉพาะตัวเองหรือ Super Admin  
ALTER TABLE public.super_admin_sessions ENABLE ROW LEVEL SECURITY;

-- Security Events - เฉพาะ Super Admin และผู้ที่มีสิทธิ์ security.audit
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
*/

-- ===============================
-- Functions and Triggers
-- ===============================

-- Function เพื่ออัพเดต updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger สำหรับ admin_roles
CREATE TRIGGER update_admin_roles_updated_at 
  BEFORE UPDATE ON public.admin_roles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function สำหรับทำความสะอาด session เก่า
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE public.super_admin_sessions 
  SET is_active = false, logout_reason = 'EXPIRED'
  WHERE expires_at < NOW() AND is_active = true;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================
-- Views สำหรับการ Query ที่ซับซ้อน
-- ===============================

-- View สำหรับดู User พร้อม Roles และ Permissions
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT DISTINCT
  u.id as user_id,
  u.email,
  ar.name as role_name,
  ar.display_name as role_display_name,
  ap.name as permission_name,
  ap.display_name as permission_display_name,
  ap.resource,
  ap.action
FROM public.users u
JOIN public.user_roles ur ON u.id = ur.user_id AND ur.is_active = true
JOIN public.admin_roles ar ON ur.role_id = ar.id
JOIN public.role_permissions rp ON ar.id = rp.role_id
JOIN public.admin_permissions ap ON rp.permission_id = ap.id
ORDER BY u.email, ar.name, ap.name;

-- View สำหรับ Audit Log Summary
CREATE OR REPLACE VIEW audit_log_summary AS
SELECT
  DATE_TRUNC('day', timestamp) as date,
  action,
  resource_type,
  risk_level,
  success,
  COUNT(*) as count
FROM public.audit_logs
GROUP BY DATE_TRUNC('day', timestamp), action, resource_type, risk_level, success
ORDER BY date DESC, count DESC;

-- ===============================
-- Sample Data (สำหรับทดสอบ)
-- ===============================

-- ใส่ comment สำหรับการทดสอบ
/*
-- สร้าง Super Admin user (ต้องทำใน application)
-- INSERT INTO user_roles (user_id, role_id) VALUES
--   ('your-super-admin-user-id', (SELECT id FROM admin_roles WHERE name = 'super_admin'));
*/
