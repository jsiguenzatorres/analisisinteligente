-- ============================================================================
-- MIGRACIÓN DE DATOS DE SEGURIDAD DESDE LOCALSTORAGE A SUPABASE
-- Para ejecutar DESPUÉS de crear el schema de seguridad
-- ============================================================================

-- IMPORTANTE: Este script migra datos desde auditLogService.ts (localStorage) a Supabase
-- NO EJECUTAR hasta resolver los problemas actuales de Supabase
-- Fecha: 19 enero 2026
-- Versión: AAMA v4.1

-- ============================================================================
-- 1. PREPARACIÓN PARA MIGRACIÓN
-- ============================================================================

-- Crear tabla temporal para importar datos de localStorage
CREATE TEMP TABLE temp_audit_logs_import (
    id TEXT,
    timestamp BIGINT,
    user_id TEXT,
    user_email TEXT,
    action TEXT,
    module TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    severity TEXT,
    success BOOLEAN,
    error_message TEXT
);

-- ============================================================================
-- 2. FUNCIONES DE MIGRACIÓN
-- ============================================================================

-- Función para migrar logs desde localStorage
CREATE OR REPLACE FUNCTION migrate_audit_logs_from_localstorage(
    p_logs_json TEXT
) RETURNS INTEGER AS $$
DECLARE
    log_record RECORD;
    migrated_count INTEGER := 0;
    logs_array JSONB;
BEGIN
    -- Parsear JSON de logs
    logs_array := p_logs_json::JSONB;
    
    -- Iterar sobre cada log
    FOR log_record IN 
        SELECT * FROM jsonb_to_recordset(logs_array) AS x(
            id TEXT,
            timestamp BIGINT,
            userId TEXT,
            userEmail TEXT,
            action TEXT,
            module TEXT,
            details JSONB,
            ipAddress TEXT,
            userAgent TEXT,
            sessionId TEXT,
            severity TEXT,
            success BOOLEAN,
            errorMessage TEXT
        )
    LOOP
        -- Insertar en tabla definitiva
        INSERT INTO audit_logs (
            id,
            timestamp,
            user_id,
            user_email,
            action,
            module,
            details,
            ip_address,
            user_agent,
            session_id,
            severity,
            success,
            error_message,
            created_at
        ) VALUES (
            COALESCE(log_record.id::UUID, gen_random_uuid()),
            log_record.timestamp,
            COALESCE(log_record.userId, 'migrated_user'),
            COALESCE(log_record.userEmail, 'migrated@local'),
            log_record.action,
            log_record.module,
            COALESCE(log_record.details, '{}'::JSONB),
            log_record.ipAddress,
            log_record.userAgent,
            COALESCE(log_record.sessionId, 'migrated_session'),
            COALESCE(log_record.severity, 'medium'),
            COALESCE(log_record.success, true),
            log_record.errorMessage,
            to_timestamp(log_record.timestamp / 1000.0)
        )
        ON CONFLICT (id) DO NOTHING; -- Evitar duplicados
        
        migrated_count := migrated_count + 1;
    END LOOP;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear usuario administrador inicial
CREATE OR REPLACE FUNCTION create_initial_admin_user(
    p_email TEXT,
    p_full_name TEXT DEFAULT 'Administrador Sistema',
    p_department TEXT DEFAULT 'IT',
    p_position TEXT DEFAULT 'Administrador'
) RETURNS UUID AS $$
DECLARE
    user_id UUID;
    admin_role_id UUID;
BEGIN
    -- Obtener ID del rol de super_admin
    SELECT id INTO admin_role_id 
    FROM user_roles 
    WHERE name = 'super_admin';
    
    IF admin_role_id IS NULL THEN
        RAISE EXCEPTION 'Rol super_admin no encontrado. Ejecutar schema de seguridad primero.';
    END IF;
    
    -- Buscar usuario existente en auth.users
    SELECT id INTO user_id 
    FROM auth.users 
    WHERE email = p_email;
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario % no encontrado en auth.users. Crear usuario primero.', p_email;
    END IF;
    
    -- Crear perfil de usuario
    INSERT INTO user_profiles (
        id,
        role_id,
        full_name,
        department,
        position,
        is_active,
        created_at
    ) VALUES (
        user_id,
        admin_role_id,
        p_full_name,
        p_department,
        p_position,
        true,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        role_id = admin_role_id,
        full_name = p_full_name,
        department = p_department,
        position = p_position,
        is_active = true,
        updated_at = NOW();
    
    -- Log de creación
    INSERT INTO audit_logs (
        timestamp,
        user_id,
        user_email,
        action,
        module,
        details,
        session_id,
        severity,
        success
    ) VALUES (
        EXTRACT(EPOCH FROM NOW()) * 1000,
        user_id::TEXT,
        p_email,
        'admin_user_created',
        'system',
        jsonb_build_object(
            'full_name', p_full_name,
            'role', 'super_admin',
            'migration', true
        ),
        'migration_session',
        'high',
        true
    );
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para asignar permisos completos a super_admin
CREATE OR REPLACE FUNCTION assign_admin_permissions() RETURNS INTEGER AS $$
DECLARE
    admin_role_id UUID;
    permission_record RECORD;
    assigned_count INTEGER := 0;
BEGIN
    -- Obtener ID del rol super_admin
    SELECT id INTO admin_role_id 
    FROM user_roles 
    WHERE name = 'super_admin';
    
    IF admin_role_id IS NULL THEN
        RAISE EXCEPTION 'Rol super_admin no encontrado';
    END IF;
    
    -- Asignar todos los permisos al super_admin
    FOR permission_record IN 
        SELECT id FROM permissions
    LOOP
        INSERT INTO role_permissions (role_id, permission_id, granted_by)
        VALUES (admin_role_id, permission_record.id, NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        
        assigned_count := assigned_count + 1;
    END LOOP;
    
    RETURN assigned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para configurar permisos por rol
CREATE OR REPLACE FUNCTION setup_role_permissions() RETURNS VOID AS $$
DECLARE
    role_record RECORD;
    permission_mappings JSONB;
BEGIN
    -- Definir mapeo de permisos por rol
    permission_mappings := '{
        "auditor_senior": [
            "populations:create", "populations:read", "populations:update", "populations:export",
            "risk_analysis:create", "risk_analysis:read", "risk_analysis:update", "risk_analysis:export", "risk_analysis:share",
            "sampling:create", "sampling:read", "sampling:update", "sampling:export",
            "reports:create", "reports:read", "reports:update", "reports:export", "reports:share",
            "settings:read", "settings:audit"
        ],
        "auditor": [
            "populations:create", "populations:read", "populations:update", "populations:export",
            "risk_analysis:create", "risk_analysis:read", "risk_analysis:update", "risk_analysis:export",
            "sampling:create", "sampling:read", "sampling:update", "sampling:export",
            "reports:create", "reports:read", "reports:export"
        ],
        "auditor_junior": [
            "populations:read", "populations:export",
            "risk_analysis:read", "risk_analysis:export",
            "sampling:read", "sampling:export",
            "reports:read", "reports:export"
        ],
        "viewer": [
            "populations:read",
            "risk_analysis:read",
            "sampling:read",
            "reports:read"
        ],
        "admin": [
            "populations:create", "populations:read", "populations:update", "populations:delete", "populations:export",
            "risk_analysis:create", "risk_analysis:read", "risk_analysis:update", "risk_analysis:delete", "risk_analysis:export", "risk_analysis:share",
            "sampling:create", "sampling:read", "sampling:update", "sampling:delete", "sampling:export",
            "reports:create", "reports:read", "reports:update", "reports:delete", "reports:export", "reports:share",
            "settings:read", "settings:update", "settings:users", "settings:roles", "settings:audit",
            "system:backup", "system:maintenance"
        ]
    }'::JSONB;
    
    -- Iterar sobre cada rol
    FOR role_record IN 
        SELECT id, name FROM user_roles WHERE name != 'super_admin'
    LOOP
        -- Asignar permisos según el mapeo
        IF permission_mappings ? role_record.name THEN
            INSERT INTO role_permissions (role_id, permission_id, granted_by)
            SELECT 
                role_record.id,
                p.id,
                NULL
            FROM permissions p
            WHERE p.name = ANY(
                SELECT jsonb_array_elements_text(permission_mappings->role_record.name)
            )
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. SCRIPT DE MIGRACIÓN PRINCIPAL
-- ============================================================================

-- Función principal de migración
CREATE OR REPLACE FUNCTION execute_security_migration(
    p_admin_email TEXT,
    p_admin_name TEXT DEFAULT 'Administrador Sistema',
    p_logs_json TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
    admin_user_id UUID;
    migrated_logs INTEGER := 0;
    assigned_permissions INTEGER := 0;
BEGIN
    result := '{}'::JSONB;
    
    -- 1. Crear usuario administrador inicial
    BEGIN
        admin_user_id := create_initial_admin_user(p_admin_email, p_admin_name);
        result := result || jsonb_build_object('admin_user_created', admin_user_id);
    EXCEPTION WHEN OTHERS THEN
        result := result || jsonb_build_object('admin_user_error', SQLERRM);
    END;
    
    -- 2. Asignar permisos completos a super_admin
    BEGIN
        assigned_permissions := assign_admin_permissions();
        result := result || jsonb_build_object('admin_permissions_assigned', assigned_permissions);
    EXCEPTION WHEN OTHERS THEN
        result := result || jsonb_build_object('admin_permissions_error', SQLERRM);
    END;
    
    -- 3. Configurar permisos para otros roles
    BEGIN
        PERFORM setup_role_permissions();
        result := result || jsonb_build_object('role_permissions_configured', true);
    EXCEPTION WHEN OTHERS THEN
        result := result || jsonb_build_object('role_permissions_error', SQLERRM);
    END;
    
    -- 4. Migrar logs si se proporcionan
    IF p_logs_json IS NOT NULL THEN
        BEGIN
            migrated_logs := migrate_audit_logs_from_localstorage(p_logs_json);
            result := result || jsonb_build_object('migrated_logs', migrated_logs);
        EXCEPTION WHEN OTHERS THEN
            result := result || jsonb_build_object('logs_migration_error', SQLERRM);
        END;
    END IF;
    
    -- 5. Log de migración completada
    INSERT INTO audit_logs (
        timestamp,
        user_id,
        user_email,
        action,
        module,
        details,
        session_id,
        severity,
        success
    ) VALUES (
        EXTRACT(EPOCH FROM NOW()) * 1000,
        COALESCE(admin_user_id::TEXT, 'system'),
        p_admin_email,
        'security_migration_completed',
        'system',
        result,
        'migration_session',
        'critical',
        true
    );
    
    result := result || jsonb_build_object(
        'migration_completed_at', NOW(),
        'success', true
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================

-- Función para verificar integridad de la migración
CREATE OR REPLACE FUNCTION verify_security_migration() RETURNS JSONB AS $$
DECLARE
    result JSONB;
    roles_count INTEGER;
    permissions_count INTEGER;
    role_permissions_count INTEGER;
    admin_users_count INTEGER;
    audit_logs_count INTEGER;
BEGIN
    result := '{}'::JSONB;
    
    -- Contar elementos creados
    SELECT COUNT(*) INTO roles_count FROM user_roles;
    SELECT COUNT(*) INTO permissions_count FROM permissions;
    SELECT COUNT(*) INTO role_permissions_count FROM role_permissions;
    SELECT COUNT(*) INTO admin_users_count FROM user_profiles up 
        JOIN user_roles ur ON up.role_id = ur.id 
        WHERE ur.name = 'super_admin';
    SELECT COUNT(*) INTO audit_logs_count FROM audit_logs;
    
    result := jsonb_build_object(
        'verification_date', NOW(),
        'roles_created', roles_count,
        'permissions_created', permissions_count,
        'role_permissions_assigned', role_permissions_count,
        'admin_users', admin_users_count,
        'audit_logs_total', audit_logs_count,
        'rls_enabled', (
            SELECT COUNT(*) FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename IN ('audit_logs', 'user_profiles', 'user_2fa')
        ),
        'functions_created', (
            SELECT COUNT(*) FROM pg_proc 
            WHERE proname LIKE '%security%' OR proname LIKE '%audit%'
        )
    );
    
    -- Verificar que el super_admin tiene todos los permisos
    result := result || jsonb_build_object(
        'super_admin_has_all_permissions', (
            SELECT COUNT(*) = (SELECT COUNT(*) FROM permissions)
            FROM role_permissions rp
            JOIN user_roles ur ON rp.role_id = ur.id
            WHERE ur.name = 'super_admin'
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. INSTRUCCIONES DE USO
-- ============================================================================

/*
INSTRUCCIONES PARA EJECUTAR LA MIGRACIÓN:

1. PREREQUISITOS:
   - Resolver problemas de conexión con Supabase
   - Ejecutar security_schema.sql completamente
   - Tener usuario creado en auth.users de Supabase

2. MIGRACIÓN BÁSICA (sin logs):
   SELECT execute_security_migration('admin@tuempresa.com', 'Tu Nombre');

3. MIGRACIÓN CON LOGS DE LOCALSTORAGE:
   -- Primero, exportar logs desde auditLogService.ts:
   -- auditLogService.exportLogs('json');
   -- Luego usar el contenido del archivo JSON:
   
   SELECT execute_security_migration(
       'admin@tuempresa.com', 
       'Tu Nombre',
       '[{"id":"log_123","timestamp":1642678800000,"userId":"user1",...}]'
   );

4. VERIFICAR MIGRACIÓN:
   SELECT verify_security_migration();

5. LIMPIAR FUNCIONES TEMPORALES (opcional):
   DROP FUNCTION IF EXISTS migrate_audit_logs_from_localstorage(TEXT);
   DROP FUNCTION IF EXISTS create_initial_admin_user(TEXT, TEXT, TEXT, TEXT);
   DROP FUNCTION IF EXISTS assign_admin_permissions();
   DROP FUNCTION IF EXISTS setup_role_permissions();
   DROP FUNCTION IF EXISTS execute_security_migration(TEXT, TEXT, TEXT);

NOTAS IMPORTANTES:
- Hacer backup completo antes de ejecutar
- Probar primero en ambiente de desarrollo
- Verificar que todos los usuarios existentes tengan roles asignados
- Configurar claves de encriptación después de la migración
- Configurar proveedores de 2FA (Twilio, etc.)
*/

-- ============================================================================
-- FIN DEL SCRIPT DE MIGRACIÓN
-- ============================================================================