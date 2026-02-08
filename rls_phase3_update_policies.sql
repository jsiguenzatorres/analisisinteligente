-- ============================================================================
-- FASE 3: ACTUALIZAR POLÍTICAS RLS - Filtrado por Usuario
-- ============================================================================
-- IMPORTANTE: Ejecutar SOLO DESPUÉS de:
--   1. Fase 1 completada (columnas user_id agregadas y pobladas)
--   2. Fase 2 completada (código backend modificado)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Tiempo estimado: 15 segundos
-- ============================================================================

-- ============================================================================
-- PASO 1: audit_populations - Filtrar por user_id
-- ============================================================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "populations_insert_policy" ON public.audit_populations;
DROP POLICY IF EXISTS "populations_select_policy" ON public.audit_populations;
DROP POLICY IF EXISTS "populations_update_policy" ON public.audit_populations;
DROP POLICY IF EXISTS "populations_delete_policy" ON public.audit_populations;

-- SELECT: Solo ver poblaciones propias
CREATE POLICY "populations_user_select" 
ON public.audit_populations 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid()::text);

-- INSERT: Solo crear poblaciones asociadas al usuario
CREATE POLICY "populations_user_insert" 
ON public.audit_populations 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

-- UPDATE: Solo modificar poblaciones propias
CREATE POLICY "populations_user_update" 
ON public.audit_populations 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- DELETE: Solo eliminar poblaciones propias
CREATE POLICY "populations_user_delete" 
ON public.audit_populations 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid()::text);

-- ============================================================================
-- PASO 2: audit_historical_samples - Filtrar por user_id
-- ============================================================================

-- Eliminar políticas antiguas (si existen)
DROP POLICY IF EXISTS "historical_samples_select_policy" ON public.audit_historical_samples;
DROP POLICY IF EXISTS "historical_samples_insert_policy" ON public.audit_historical_samples;
DROP POLICY IF EXISTS "historical_samples_update_policy" ON public.audit_historical_samples;
DROP POLICY IF EXISTS "historical_samples_delete_policy" ON public.audit_historical_samples;

-- SELECT: Solo ver muestras históricas propias
CREATE POLICY "historical_samples_user_select" 
ON public.audit_historical_samples 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid()::text);

-- INSERT: Solo crear muestras asociadas al usuario
CREATE POLICY "historical_samples_user_insert" 
ON public.audit_historical_samples 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

-- UPDATE: Solo modificar muestras propias
CREATE POLICY "historical_samples_user_update" 
ON public.audit_historical_samples 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- DELETE: Solo eliminar muestras propias
CREATE POLICY "historical_samples_user_delete" 
ON public.audit_historical_samples 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid()::text);

-- ============================================================================
-- PASO 3: audit_results - Filtrar por user_id
-- ============================================================================

-- Eliminar políticas antiguas (si existen)
DROP POLICY IF EXISTS "audit_results_select_policy" ON public.audit_results;
DROP POLICY IF EXISTS "audit_results_insert_policy" ON public.audit_results;
DROP POLICY IF EXISTS "audit_results_update_policy" ON public.audit_results;
DROP POLICY IF EXISTS "audit_results_delete_policy" ON public.audit_results;

-- SELECT: Solo ver resultados propios
CREATE POLICY "audit_results_user_select" 
ON public.audit_results 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid()::text);

-- INSERT: Solo crear resultados asociados al usuario
CREATE POLICY "audit_results_user_insert" 
ON public.audit_results 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

-- UPDATE: Solo modificar resultados propios
CREATE POLICY "audit_results_user_update" 
ON public.audit_results 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- DELETE: Solo eliminar resultados propios
CREATE POLICY "audit_results_user_delete" 
ON public.audit_results 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid()::text);

-- ============================================================================
-- PASO 4: audit_data_rows - Filtrar mediante JOIN con audit_populations
-- ============================================================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "data_rows_insert_policy" ON public.audit_data_rows;
DROP POLICY IF EXISTS "data_rows_select_policy" ON public.audit_data_rows;
DROP POLICY IF EXISTS "data_rows_update_policy" ON public.audit_data_rows;
DROP POLICY IF EXISTS "data_rows_delete_policy" ON public.audit_data_rows;

-- SELECT: Solo ver filas de poblaciones propias
CREATE POLICY "data_rows_user_select" 
ON public.audit_data_rows 
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.audit_populations 
        WHERE id = audit_data_rows.population_id 
        AND user_id = auth.uid()::text
    )
);

-- INSERT: Solo insertar filas en poblaciones propias
CREATE POLICY "data_rows_user_insert" 
ON public.audit_data_rows 
FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.audit_populations 
        WHERE id = audit_data_rows.population_id 
        AND user_id = auth.uid()::text
    )
);

-- UPDATE: Solo modificar filas de poblaciones propias
CREATE POLICY "data_rows_user_update" 
ON public.audit_data_rows 
FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.audit_populations 
        WHERE id = audit_data_rows.population_id 
        AND user_id = auth.uid()::text
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.audit_populations 
        WHERE id = audit_data_rows.population_id 
        AND user_id = auth.uid()::text
    )
);

-- DELETE: Solo eliminar filas de poblaciones propias
CREATE POLICY "data_rows_user_delete" 
ON public.audit_data_rows 
FOR DELETE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.audit_populations 
        WHERE id = audit_data_rows.population_id 
        AND user_id = auth.uid()::text
    )
);

-- ============================================================================
-- VERIFICACIÓN: Comprobar que las políticas se crearon correctamente
-- ============================================================================

SELECT 
    tablename as "Tabla",
    policyname as "✅ Política Creada",
    cmd as "Comando",
    CASE 
        WHEN qual LIKE '%user_id = auth.uid()%' THEN '🔒 Filtrado por user_id'
        WHEN qual LIKE '%EXISTS%audit_populations%' THEN '🔒 Filtrado por JOIN'
        ELSE '⚠️ Otra condición'
    END as "Tipo de Filtro"
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
    'audit_populations',
    'audit_historical_samples',
    'audit_results',
    'audit_data_rows'
)
ORDER BY tablename, policyname;

-- ============================================================================
-- MENSAJE DE CONFIRMACIÓN
-- ============================================================================

DO $$
DECLARE
    v_total_policies INT;
BEGIN
    SELECT COUNT(*) INTO v_total_policies
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename IN (
        'audit_populations',
        'audit_historical_samples',
        'audit_results',
        'audit_data_rows'
    )
    AND policyname LIKE '%user%';
    
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ FASE 3 COMPLETADA - Políticas RLS Actualizadas';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Total de políticas RLS por usuario creadas: %', v_total_policies;
    RAISE NOTICE '';
    RAISE NOTICE '📋 Políticas aplicadas a:';
    RAISE NOTICE '   ✅ audit_populations (4 políticas)';
    RAISE NOTICE '   ✅ audit_historical_samples (4 políticas)';
    RAISE NOTICE '   ✅ audit_results (4 políticas)';
    RAISE NOTICE '   ✅ audit_data_rows (4 políticas con JOIN)';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 SIGUIENTE PASO: Verificar funcionamiento';
    RAISE NOTICE '   1. Probar guardado en desarrollo';
    RAISE NOTICE '   2. Probar "Ver Historial"';
    RAISE NOTICE '   3. Verificar aislamiento entre usuarios';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANTE: El backend usa service_role y NO es afectado por RLS';
    RAISE NOTICE '   Las políticas solo afectan queries directas con anon_key';
    RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 1. Estas políticas filtran por user_id = auth.uid()::text
-- 2. audit_data_rows usa EXISTS con JOIN a audit_populations
-- 3. El backend con service_role BYPASEA estas políticas (sigue funcionando)
-- 4. Solo afecta queries directas desde frontend (que no existen en tu app)
-- 5. Para rollback, ejecutar rls_backup_policies.sql
-- ============================================================================
