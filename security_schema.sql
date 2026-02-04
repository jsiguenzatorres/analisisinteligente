-- ============================================================================
-- SCHEMA DE SEGURIDAD AVANZADA PARA AAMA
-- Para ejecutar DESPUÉS de resolver problemas de conexión con Supabase
-- ============================================================================

-- IMPORTANTE: Este archivo contiene el schema completo para las mejoras de seguridad
-- NO EJECUTAR hasta resolver los problemas actuales de Supabase
-- Fecha: 19 enero 2026
-- Versión: AAMA v4.1

-- ============================================================================
-- 1. TABLA DE AUDIT LOGS (Migración desde auditLogService.ts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp BIGINT NOT NULL,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para consultas rápidas
    INDEX idx_audit_logs_timestamp (timestamp),
    INDEX idx_audit_logs_user_id (user_id),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_module (module),
    INDEX idx_audit_logs_severity (severity),
    INDEX idx_audit_logs_session (session_id),
    INDEX idx_audit_logs_created_at (created_at)
);

-- Comentarios para documentación
COMMENT ON TABLE audit_logs IS 'Registro completo de todas las acciones del sistema para auditoría y compliance';
COMMENT ON COLUMN audit_logs.timestamp IS 'Timestamp en milisegundos (compatible con auditLogService.ts)';
COMMENT ON COLUMN audit_logs.details IS 'Detalles adicionales de la acción en formato JSON';
COMMENT ON COLUMN audit_logs.severity IS 'Nivel de criticidad: low, medium, high, critical';

-- ============================================================================
-- 2. SISTEMA DE ROLES Y PERMISOS GRANULARES
-- ============================================================================

-- Tabla de roles del sistema
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Roles predefinidos del sistema
    CHECK (name ~ '^[a-z_]+$') -- Solo minúsculas y guiones bajos
);

-- Insertar roles predefinidos
INSERT INTO user_roles (name, display_name, description, is_system_role) VALUES
('super_admin', 'Super Administrador', 'Acceso completo al sistema', true),
('admin', 'Administrador', 'Administración general del sistema', true),
('auditor_senior', 'Auditor Senior', 'Auditor con permisos de supervisión', true),
('auditor', 'Auditor', 'Auditor estándar', true),
('auditor_junior', 'Auditor Junior', 'Auditor con permisos limitados', true),
('viewer', 'Visualizador', 'Solo lectura de reportes', true),
('guest', 'Invitado', 'Acceso muy limitado', true)
ON CONFLICT (name) DO NOTHING;

-- Tabla de permisos específicos
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    module TEXT NOT NULL, -- populations, risk_analysis, sampling, reports, settings, etc.
    action TEXT NOT NULL, -- create, read, update, delete, export, share, etc.
    resource TEXT, -- Recurso específico (opcional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Formato estándar: module:action:resource
    CHECK (name ~ '^[a-z_]+:[a-z_]+(:([a-z_]+|\*))?$')
);

-- Insertar permisos base del sistema
INSERT INTO permissions (name, display_name, description, module, action) VALUES
-- Poblaciones
('populations:create', 'Crear Poblaciones', 'Crear nuevas poblaciones de auditoría', 'populations', 'create'),
('populations:read', 'Ver Poblaciones', 'Visualizar poblaciones existentes', 'populations', 'read'),
('populations:update', 'Editar Poblaciones', 'Modificar poblaciones existentes', 'populations', 'update'),
('populations:delete', 'Eliminar Poblaciones', 'Eliminar poblaciones', 'populations', 'delete'),
('populations:export', 'Exportar Poblaciones', 'Exportar datos de poblaciones', 'populations', 'export'),

-- Análisis de Riesgo
('risk_analysis:create', 'Crear Análisis', 'Iniciar nuevos análisis de riesgo', 'risk_analysis', 'create'),
('risk_analysis:read', 'Ver Análisis', 'Visualizar análisis de riesgo', 'risk_analysis', 'read'),
('risk_analysis:update', 'Editar Análisis', 'Modificar análisis existentes', 'risk_analysis', 'update'),
('risk_analysis:delete', 'Eliminar Análisis', 'Eliminar análisis de riesgo', 'risk_analysis', 'delete'),
('risk_analysis:export', 'Exportar Análisis', 'Generar reportes de análisis', 'risk_analysis', 'export'),
('risk_analysis:share', 'Compartir Análisis', 'Compartir análisis con otros', 'risk_analysis', 'share'),

-- Muestreo
('sampling:create', 'Crear Muestras', 'Generar nuevas muestras', 'sampling', 'create'),
('sampling:read', 'Ver Muestras', 'Visualizar muestras existentes', 'sampling', 'read'),
('sampling:update', 'Editar Muestras', 'Modificar muestras', 'sampling', 'update'),
('sampling:delete', 'Eliminar Muestras', 'Eliminar muestras', 'sampling', 'delete'),
('sampling:export', 'Exportar Muestras', 'Exportar datos de muestras', 'sampling', 'export'),

-- Reportes
('reports:create', 'Crear Reportes', 'Generar nuevos reportes', 'reports', 'create'),
('reports:read', 'Ver Reportes', 'Visualizar reportes', 'reports', 'read'),
('reports:update', 'Editar Reportes', 'Modificar reportes', 'reports', 'update'),
('reports:delete', 'Eliminar Reportes', 'Eliminar reportes', 'reports', 'delete'),
('reports:export', 'Exportar Reportes', 'Descargar reportes en PDF/Excel', 'reports', 'export'),
('reports:share', 'Compartir Reportes', 'Compartir reportes con terceros', 'reports', 'share'),

-- Configuración del Sistema
('settings:read', 'Ver Configuración', 'Ver configuración del sistema', 'settings', 'read'),
('settings:update', 'Editar Configuración', 'Modificar configuración', 'settings', 'update'),
('settings:users', 'Gestionar Usuarios', 'Crear/editar usuarios', 'settings', 'users'),
('settings:roles', 'Gestionar Roles', 'Administrar roles y permisos', 'settings', 'roles'),
('settings:audit', 'Ver Logs de Auditoría', 'Acceder a logs del sistema', 'settings', 'audit'),

-- Sistema
('system:backup', 'Crear Backups', 'Generar respaldos del sistema', 'system', 'backup'),
('system:restore', 'Restaurar Sistema', 'Restaurar desde backups', 'system', 'restore'),
('system:maintenance', 'Modo Mantenimiento', 'Activar modo mantenimiento', 'system', 'maintenance')

ON CONFLICT (name) DO NOTHING;

-- Tabla de relación roles-permisos
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    
    UNIQUE(role_id, permission_id)
);

-- Tabla de usuarios con roles (extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES user_roles(id),
    full_name TEXT,
    department TEXT,
    position TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Índices
    INDEX idx_user_profiles_role (role_id),
    INDEX idx_user_profiles_active (is_active),
    INDEX idx_user_profiles_last_login (last_login_at)
);

-- ============================================================================
-- 3. AUTENTICACIÓN DE DOS FACTORES (2FA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_2fa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    method TEXT CHECK (method IN ('totp', 'sms', 'email')) NOT NULL,
    secret_key TEXT, -- Para TOTP (encriptado)
    phone_number TEXT, -- Para SMS
    backup_codes TEXT[], -- Códigos de respaldo (encriptados)
    is_enabled BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(user_id, method)
);

-- Tabla de intentos de 2FA (para prevenir ataques de fuerza bruta)
CREATE TABLE IF NOT EXISTS user_2fa_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    method TEXT NOT NULL,
    code_attempted TEXT,
    success BOOLEAN DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para consultas de seguridad
    INDEX idx_2fa_attempts_user_time (user_id, attempted_at),
    INDEX idx_2fa_attempts_ip_time (ip_address, attempted_at)
);

-- ============================================================================
-- 4. ENCRIPTACIÓN DE DATOS SENSIBLES
-- ============================================================================

-- Tabla para almacenar claves de encriptación por usuario/sesión
CREATE TABLE IF NOT EXISTS encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_type TEXT CHECK (key_type IN ('session', 'data', 'backup')) NOT NULL,
    encrypted_key TEXT NOT NULL, -- Clave encriptada con master key
    salt TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_encryption_keys_user (user_id),
    INDEX idx_encryption_keys_type (key_type),
    INDEX idx_encryption_keys_expires (expires_at)
);

-- Tabla para datos encriptados (campos sensibles de otras tablas)
CREATE TABLE IF NOT EXISTS encrypted_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    field_name TEXT NOT NULL,
    encrypted_value TEXT NOT NULL,
    encryption_method TEXT DEFAULT 'AES-256-GCM',
    key_id UUID REFERENCES encryption_keys(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(table_name, record_id, field_name),
    INDEX idx_encrypted_data_table_record (table_name, record_id),
    INDEX idx_encrypted_data_key (key_id)
);

-- ============================================================================
-- 5. SESIONES Y TOKENS SEGUROS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE,
    ip_address INET,
    user_agent TEXT,
    device_fingerprint TEXT,
    is_mobile BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Índices para consultas frecuentes
    INDEX idx_user_sessions_user (user_id),
    INDEX idx_user_sessions_token (session_token),
    INDEX idx_user_sessions_active (is_active, expires_at),
    INDEX idx_user_sessions_activity (last_activity_at)
);

-- Tabla de tokens de acceso temporal (para compartir análisis)
CREATE TABLE IF NOT EXISTS access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    resource_type TEXT NOT NULL, -- 'analysis', 'report', 'population'
    resource_id UUID NOT NULL,
    permissions TEXT[] DEFAULT '{}', -- ['read', 'export', etc.]
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    password_hash TEXT, -- Opcional: protección adicional con contraseña
    
    INDEX idx_access_tokens_token (token),
    INDEX idx_access_tokens_resource (resource_type, resource_id),
    INDEX idx_access_tokens_expires (expires_at),
    INDEX idx_access_tokens_active (is_active)
);

-- ============================================================================
-- 6. POLÍTICAS DE SEGURIDAD (RLS - Row Level Security)
-- ============================================================================

-- Habilitar RLS en todas las tablas sensibles
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_2fa_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas para audit_logs
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            JOIN user_roles ur ON up.role_id = ur.id 
            WHERE up.id = auth.uid() AND ur.name IN ('super_admin', 'admin')
        )
    );

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Políticas para user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            JOIN user_roles ur ON up.role_id = ur.id 
            WHERE up.id = auth.uid() AND ur.name IN ('super_admin', 'admin')
        )
    );

-- Políticas para user_2fa
CREATE POLICY "Users can manage their own 2FA" ON user_2fa
    FOR ALL USING (user_id = auth.uid());

-- Políticas para encryption_keys
CREATE POLICY "Users can access their own encryption keys" ON encryption_keys
    FOR ALL USING (user_id = auth.uid());

-- Políticas para user_sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions" ON user_sessions
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- 7. FUNCIONES DE UTILIDAD PARA SEGURIDAD
-- ============================================================================

-- Función para verificar permisos de usuario
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_permission_name TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_profiles up
        JOIN role_permissions rp ON up.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE up.id = p_user_id 
        AND p.name = p_permission_name
        AND up.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para registrar intento de 2FA
CREATE OR REPLACE FUNCTION log_2fa_attempt(
    p_user_id UUID,
    p_method TEXT,
    p_code TEXT,
    p_success BOOLEAN,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO user_2fa_attempts (
        user_id, method, code_attempted, success, 
        ip_address, user_agent
    ) VALUES (
        p_user_id, p_method, p_code, p_success,
        p_ip_address, p_user_agent
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR last_activity_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar tokens de acceso expirados
CREATE OR REPLACE FUNCTION cleanup_expired_tokens() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM access_tokens 
    WHERE expires_at < NOW() OR current_uses >= max_uses;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. TRIGGERS PARA AUDITORÍA AUTOMÁTICA
-- ============================================================================

-- Función para trigger de auditoría automática
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS TRIGGER AS $$
BEGIN
    -- Solo para operaciones que no sean SELECT
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (
            timestamp, user_id, user_email, action, module, 
            details, session_id, severity
        ) VALUES (
            EXTRACT(EPOCH FROM NOW()) * 1000,
            COALESCE(auth.uid()::text, 'system'),
            COALESCE(auth.email(), 'system@aama.local'),
            TG_OP || '_' || TG_TABLE_NAME,
            'database',
            jsonb_build_object('table', TG_TABLE_NAME, 'new_record', to_jsonb(NEW)),
            COALESCE(current_setting('app.session_id', true), 'system_session'),
            'medium'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (
            timestamp, user_id, user_email, action, module, 
            details, session_id, severity
        ) VALUES (
            EXTRACT(EPOCH FROM NOW()) * 1000,
            COALESCE(auth.uid()::text, 'system'),
            COALESCE(auth.email(), 'system@aama.local'),
            TG_OP || '_' || TG_TABLE_NAME,
            'database',
            jsonb_build_object(
                'table', TG_TABLE_NAME, 
                'old_record', to_jsonb(OLD),
                'new_record', to_jsonb(NEW)
            ),
            COALESCE(current_setting('app.session_id', true), 'system_session'),
            'medium'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            timestamp, user_id, user_email, action, module, 
            details, session_id, severity
        ) VALUES (
            EXTRACT(EPOCH FROM NOW()) * 1000,
            COALESCE(auth.uid()::text, 'system'),
            COALESCE(auth.email(), 'system@aama.local'),
            TG_OP || '_' || TG_TABLE_NAME,
            'database',
            jsonb_build_object('table', TG_TABLE_NAME, 'deleted_record', to_jsonb(OLD)),
            COALESCE(current_setting('app.session_id', true), 'system_session'),
            'high'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. CONFIGURACIÓN DE LIMPIEZA AUTOMÁTICA
-- ============================================================================

-- Crear extensión para cron jobs (si está disponible)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programar limpieza automática (descomentear cuando pg_cron esté disponible)
-- SELECT cron.schedule('cleanup-sessions', '0 2 * * *', 'SELECT cleanup_expired_sessions();');
-- SELECT cron.schedule('cleanup-tokens', '0 3 * * *', 'SELECT cleanup_expired_tokens();');

-- ============================================================================
-- 10. COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE user_roles IS 'Roles del sistema con permisos granulares';
COMMENT ON TABLE permissions IS 'Permisos específicos por módulo y acción';
COMMENT ON TABLE role_permissions IS 'Relación muchos a muchos entre roles y permisos';
COMMENT ON TABLE user_profiles IS 'Perfiles de usuario extendidos con roles';
COMMENT ON TABLE user_2fa IS 'Configuración de autenticación de dos factores';
COMMENT ON TABLE user_2fa_attempts IS 'Log de intentos de 2FA para seguridad';
COMMENT ON TABLE encryption_keys IS 'Claves de encriptación por usuario';
COMMENT ON TABLE encrypted_data IS 'Datos sensibles encriptados';
COMMENT ON TABLE user_sessions IS 'Sesiones activas de usuarios';
COMMENT ON TABLE access_tokens IS 'Tokens temporales para compartir recursos';

-- ============================================================================
-- FIN DEL SCHEMA DE SEGURIDAD
-- ============================================================================

-- NOTAS IMPORTANTES:
-- 1. Este schema debe ejecutarse DESPUÉS de resolver problemas de Supabase
-- 2. Requiere migración de datos desde auditLogService.ts
-- 3. Necesita configuración de claves de encriptación
-- 4. Debe configurarse integración con proveedores 2FA
-- 5. Revisar y ajustar políticas RLS según necesidades específicas