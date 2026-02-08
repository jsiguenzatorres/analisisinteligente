-- ============================================================================
-- FASE 1: PREPARACIÓN DE ESQUEMA - Agregar user_id a Tablas
-- ============================================================================
-- IMPORTANTE: Este script es SEGURO de ejecutar. NO rompe funcionalidad existente.
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Tiempo estimado: 30 segundos
-- ============================================================================

-- PASO 1: Agregar columnas user_id (si no existen)
-- ============================================================================

-- Tabla: audit_historical_samples
ALTER TABLE public.audit_historical_samples 
ADD COLUMN IF NOT EXISTS user_id TEXT;

COMMENT ON COLUMN public.audit_historical_samples.user_id 
IS 'ID del usuario propietario de la muestra histórica';

-- Tabla: audit_results
ALTER TABLE public.audit_results 
ADD COLUMN IF NOT EXISTS user_id TEXT;

COMMENT ON COLUMN public.audit_results.user_id 
IS 'ID del usuario propietario del trabajo en progreso';

-- ============================================================================
-- PASO 2: Poblar user_id en registros existentes desde audit_populations
-- ============================================================================

-- Poblar audit_historical_samples
UPDATE public.audit_historical_samples ahs
SET user_id = ap.user_id
FROM public.audit_populations ap
WHERE ahs.population_id = ap.id
AND ahs.user_id IS NULL;

-- Poblar audit_results
UPDATE public.audit_results ar
SET user_id = ap.user_id
FROM public.audit_populations ap
WHERE ar.population_id = ap.id
AND ar.user_id IS NULL;

-- ============================================================================
-- PASO 3: Crear índices para performance
-- ============================================================================

-- Índice para audit_historical_samples
CREATE INDEX IF NOT EXISTS idx_historical_samples_user_id 
ON public.audit_historical_samples(user_id);

CREATE INDEX IF NOT EXISTS idx_historical_samples_population_user 
ON public.audit_historical_samples(population_id, user_id);

-- Índice para audit_results
CREATE INDEX IF NOT EXISTS idx_audit_results_user_id 
ON public.audit_results(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_results_population_user 
ON public.audit_results(population_id, user_id);

-- ============================================================================
-- VERIFICACIÓN: Comprobar que las columnas se crearon y poblaron
-- ============================================================================

SELECT 
    'audit_historical_samples' as tabla,
    COUNT(*) as total_registros,
    COUNT(user_id) as con_user_id,
    COUNT(*) - COUNT(user_id) as sin_user_id,
    CASE 
        WHEN COUNT(*) = COUNT(user_id) THEN '✅ COMPLETO'
        WHEN COUNT(user_id) > 0 THEN '⚠️ PARCIAL'
        ELSE '❌ VACÍO'
    END as estado
FROM public.audit_historical_samples

UNION ALL

SELECT 
    'audit_results',
    COUNT(*),
    COUNT(user_id),
    COUNT(*) - COUNT(user_id),
    CASE 
        WHEN COUNT(*) = COUNT(user_id) THEN '✅ COMPLETO'
        WHEN COUNT(user_id) > 0 THEN '⚠️ PARCIAL'
        ELSE '❌ VACÍO'
    END
FROM public.audit_results

UNION ALL

SELECT 
    'audit_populations (referencia)',
    COUNT(*),
    COUNT(user_id),
    COUNT(*) - COUNT(user_id),
    CASE 
        WHEN COUNT(*) = COUNT(user_id) THEN '✅ COMPLETO'
        WHEN COUNT(user_id) > 0 THEN '⚠️ PARCIAL'
        ELSE '❌ VACÍO'
    END
FROM public.audit_populations;

-- ============================================================================
-- VERIFICAR ÍNDICES CREADOS
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('audit_historical_samples', 'audit_results')
AND indexname LIKE '%user%'
ORDER BY tablename, indexname;

-- ============================================================================
-- MENSAJE DE CONFIRMACIÓN
-- ============================================================================

DO $$
DECLARE
    v_hist_total INT;
    v_hist_with_user INT;
    v_results_total INT;
    v_results_with_user INT;
BEGIN
    SELECT COUNT(*), COUNT(user_id) INTO v_hist_total, v_hist_with_user
    FROM public.audit_historical_samples;
    
    SELECT COUNT(*), COUNT(user_id) INTO v_results_total, v_results_with_user
    FROM public.audit_results;
    
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ FASE 1 COMPLETADA - Esquema Preparado';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 audit_historical_samples:';
    RAISE NOTICE '   Total: %, Con user_id: %, Sin user_id: %', 
        v_hist_total, v_hist_with_user, v_hist_total - v_hist_with_user;
    RAISE NOTICE '';
    RAISE NOTICE '📊 audit_results:';
    RAISE NOTICE '   Total: %, Con user_id: %, Sin user_id: %', 
        v_results_total, v_results_with_user, v_results_total - v_results_with_user;
    RAISE NOTICE '';
    
    IF (v_hist_total = v_hist_with_user) AND (v_results_total = v_results_with_user) THEN
        RAISE NOTICE '✅ TODOS los registros tienen user_id poblado';
        RAISE NOTICE '🚀 LISTO PARA FASE 2: Modificar código backend';
    ELSE
        RAISE WARNING '⚠️ Algunos registros NO tienen user_id';
        RAISE WARNING '   Esto puede ser normal si las tablas estaban vacías';
        RAISE WARNING '   Verifica que audit_populations tenga user_id poblado';
    END IF;
    
    RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 1. Este script es IDEMPOTENTE: Se puede ejecutar múltiples veces sin problemas
-- 2. NO afecta funcionalidad existente: Solo agrega columnas e índices
-- 3. Las políticas RLS actuales siguen funcionando (USING true)
-- 4. El código backend seguirá funcionando sin cambios
-- 5. SIGUIENTE PASO: Modificar api/sampling_proxy.js para incluir user_id en saves
-- ============================================================================
