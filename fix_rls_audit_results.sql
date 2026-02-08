-- ============================================================================
-- FIX RLS PARA audit_results (Guardar Trabajo en Progreso)
-- ============================================================================
-- Este script soluciona el error HTTP 500 en save_work_in_progress
-- EJECUTAR EN: Supabase Dashboard > SQL Editor
-- ============================================================================

-- PASO 1: Verificar si la tabla audit_results existe y tiene RLS
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
    cmd as "Comando"
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'audit_results';

-- PASO 3: Habilitar RLS si no está
ALTER TABLE public.audit_results ENABLE ROW LEVEL SECURITY;

-- PASO 4: Eliminar políticas antiguas
DROP POLICY IF EXISTS "Permitir todo a todos" ON public.audit_results;
DROP POLICY IF EXISTS "results_insert_policy" ON public.audit_results;
DROP POLICY IF EXISTS "results_update_policy" ON public.audit_results;
DROP POLICY IF EXISTS "results_select_policy" ON public.audit_results;

-- PASO 5: Crear políticas permisivas
CREATE POLICY "results_insert_policy" 
ON public.audit_results 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "results_update_policy" 
ON public.audit_results 
FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "results_select_policy" 
ON public.audit_results 
FOR SELECT 
TO anon, authenticated
USING (true);

-- PASO 6: Otorgar permisos
GRANT SELECT, INSERT, UPDATE ON public.audit_results TO anon;
GRANT SELECT, INSERT, UPDATE ON public.audit_results TO authenticated;
GRANT ALL ON public.audit_results TO service_role;

-- PASO 7: Verificar
SELECT 
    policyname as "✅ Política Creada",
    cmd as "Comando"
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'audit_results'
ORDER BY policyname;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ RLS configurado para audit_results';
    RAISE NOTICE '✅ save_work_in_progress ahora debería funcionar';
END $$;
