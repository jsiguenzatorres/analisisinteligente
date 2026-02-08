-- DESHABILITAR RLS TEMPORALMENTE para audit_results
-- ⚠️ SOLO PARA PRUEBAS LOCALES - NO USAR EN PRODUCCIÓN

ALTER TABLE public.audit_results DISABLE ROW LEVEL SECURITY;

-- Verificar que se deshabilitó
SELECT 
    tablename, 
    rowsecurity as "RLS Habilitado"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'audit_results';
