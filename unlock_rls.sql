-- 🔓 SCRIPT DE DESBLOQUEO DE EMERGENCIA (RLS)
-- Úsalo SOLO si la alerta en pantalla dice "Permission denied" o "new row violates row-level security policy".

-- 1. Desactivar seguridad a nivel de fila en la tabla de datos
ALTER TABLE public.audit_data_rows DISABLE ROW LEVEL SECURITY;

-- 2. Desactivar seguridad en la tabla de poblaciones (opcional, pero recomendado para probar)
ALTER TABLE public.audit_populations DISABLE ROW LEVEL SECURITY;

-- 3. Confirmación
SELECT 'RLS Desactivado temporalmente en audit_data_rows' as status;

-- NOTA: Para reactivar luego, usa: ENABLE ROW LEVEL SECURITY;
