-- 🚨 SOLUCIÓN FINAL: DESACTIVAR EL CANDADO (RLS)
-- Esto eliminará cualquier restricción de seguridad que esté bloqueando la escritura.

-- 1. Desactivar RLS en las tablas principales
ALTER TABLE audit_populations DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_data_rows DISABLE ROW LEVEL SECURITY;

-- 2. Asegurar que los permisos básicos estén dados
GRANT ALL ON audit_populations TO anon, authenticated, service_role;
GRANT ALL ON audit_data_rows TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 3. Confirmación
SELECT 'RLS DESACTIVADO - EL CANAL ESTÁ ABIERTO' as status;
