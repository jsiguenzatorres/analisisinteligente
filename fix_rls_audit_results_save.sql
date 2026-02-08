-- ============================================================================
-- FIX RLS PARA TABLA audit_results (Guardado de trabajo en progreso)
-- Este script habilita el guardado de resultados desde el cliente
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
  AND tablename = 'audit_results';

-- PASO 2: Verificar políticas existentes
SELECT 
    policyname as "Política",
    cmd as "Comando",
    roles as "Roles"
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'audit_results';

-- ============================================================================
-- TABLA: audit_results
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.audit_results ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas conflictivas (si existen)
DROP POLICY IF EXISTS "results_insert_policy" ON public.audit_results;
DROP POLICY IF EXISTS "results_select_policy" ON public.audit_results;
DROP POLICY IF EXISTS "results_update_policy" ON public.audit_results;
DROP POLICY IF EXISTS "results_delete_policy" ON public.audit_results;

-- Política INSERT: Permitir a usuarios autenticados insertar resultados
CREATE POLICY "results_insert_policy" 
ON public.audit_results 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Política SELECT: Permitir a usuarios autenticados ver resultados
CREATE POLICY "results_select_policy" 
ON public.audit_results 
FOR SELECT 
TO authenticated
USING (true);

-- Política UPDATE: Permitir a usuarios autenticados actualizar resultados
CREATE POLICY "results_update_policy" 
ON public.audit_results 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Política DELETE: Permitir a usuarios autenticados eliminar resultados
CREATE POLICY "results_delete_policy" 
ON public.audit_results 
FOR DELETE 
TO authenticated
USING (true);

-- Otorgar permisos explícitos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_results TO authenticated;
GRANT ALL ON public.audit_results TO service_role;

-- ============================================================================
-- VERIFICACIÓN: Comprobar que las políticas se crearon correctamente
-- ============================================================================

SELECT 
    policyname as "✅ Política Creada",
    cmd as "Comando",
    qual as "Condición USING",
    with_check as "Condición CHECK"
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'audit_results'
ORDER BY policyname;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ RLS configurado correctamente para audit_results';
    RAISE NOTICE '✅ Políticas creadas: results_insert_policy, results_select_policy, results_update_policy, results_delete_policy';
    RAISE NOTICE '✅ Permisos otorgados a: authenticated, service_role';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 SIGUIENTE PASO: Probar guardado de trabajo en progreso';
END $$;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Esta política permite a CUALQUIER usuario AUTENTICADO guardar resultados
-- 2. Compatible con anon_key (API key pública)
-- 3. NO requiere service_role_key en el cliente (seguro)
-- 4. Para producción, considera políticas más restrictivas basadas en user_id
-- ============================================================================
