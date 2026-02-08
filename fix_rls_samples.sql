-- ============================================================================
-- FIX RLS PARA TABLA audit_historical_samples
-- Este script habilita el guardado de muestras desde el cliente
-- ============================================================================
-- EJECUTAR EN: Supabase Dashboard > SQL Editor
-- TIEMPO ESTIMADO: 10 segundos
-- ============================================================================

-- PASO 1: Verificar estado actual de RLS
SELECT 
    schemaname,
    tablename, 
    rowsecurity as "RLS Habilitado"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'audit_historical_samples';

-- PASO 2: Verificar políticas existentes
SELECT 
    policyname as "Política",
    cmd as "Comando",
    roles as "Roles"
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'audit_historical_samples';

-- PASO 3: Habilitar RLS (si no está habilitado)
ALTER TABLE public.audit_historical_samples ENABLE ROW LEVEL SECURITY;

-- PASO 4: Eliminar políticas antiguas conflictivas (si existen)
DROP POLICY IF EXISTS "allow_anon_insert" ON public.audit_historical_samples;
DROP POLICY IF EXISTS "allow_anon_select" ON public.audit_historical_samples;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON public.audit_historical_samples;
DROP POLICY IF EXISTS "allow_authenticated_select" ON public.audit_historical_samples;

-- PASO 5: Crear políticas permisivas para desarrollo/producción
-- Política 1: Permitir INSERT a usuarios anónimos y autenticados
CREATE POLICY "samples_insert_policy" 
ON public.audit_historical_samples 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Política 2: Permitir SELECT a usuarios anónimos y autenticados
CREATE POLICY "samples_select_policy" 
ON public.audit_historical_samples 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Política 3: Permitir UPDATE (para marcar muestras como no actuales)
CREATE POLICY "samples_update_policy" 
ON public.audit_historical_samples 
FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- PASO 6: Otorgar permisos explícitos
GRANT SELECT, INSERT, UPDATE ON public.audit_historical_samples TO anon;
GRANT SELECT, INSERT, UPDATE ON public.audit_historical_samples TO authenticated;
GRANT ALL ON public.audit_historical_samples TO service_role;

-- PASO 7: Verificar que las políticas se crearon
SELECT 
    policyname as "✅ Política Creada",
    cmd as "Comando",
    qual as "Condición USING",
    with_check as "Condición CHECK"
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'audit_historical_samples'
ORDER BY policyname;

-- PASO 8: Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ RLS configurado correctamente para audit_historical_samples';
    RAISE NOTICE '✅ Políticas creadas: samples_insert_policy, samples_select_policy, samples_update_policy';
    RAISE NOTICE '✅ Permisos otorgados a: anon, authenticated, service_role';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 SIGUIENTE PASO: Actualizar sampleStorageService.ts';
END $$;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Estas políticas permiten a CUALQUIER usuario insertar/leer muestras
-- 2. Para producción, considera políticas más restrictivas basadas en user_id
-- 3. Ejemplo de política restrictiva (FUTURO):
--    CREATE POLICY "samples_user_insert" 
--    ON audit_historical_samples 
--    FOR INSERT 
--    TO authenticated
--    WITH CHECK (auth.uid()::text = created_by);
-- 4. NO requiere service_role_key en el cliente
-- 5. Compatible con anon_key (seguro)
-- ============================================================================
