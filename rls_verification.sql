-- ============================================================================
-- VERIFICACIÓN COMPLETA - RLS por Usuario
-- ============================================================================
-- Ejecutar DESPUÉS de completar Fases 1, 2 y 3
-- Propósito: Validar que la implementación RLS funciona correctamente
-- ============================================================================

-- ============================================================================
-- PASO 1: Verificar que todas las columnas user_id existen y están pobladas
-- ============================================================================

SELECT 
    'audit_populations' as tabla,
    COUNT(*) as total_registros,
    COUNT(user_id) as con_user_id,
    COUNT(*) - COUNT(user_id) as sin_user_id,
    ROUND(100.0 * COUNT(user_id) / NULLIF(COUNT(*), 0), 2) || '%' as porcentaje_poblado,
    CASE 
        WHEN COUNT(*) = 0 THEN '⚠️ TABLA VACÍA'
        WHEN COUNT(*) = COUNT(user_id) THEN '✅ 100% POBLADO'
        WHEN COUNT(user_id) > 0 THEN '⚠️ PARCIALMENTE POBLADO'
        ELSE '❌ SIN POBLAR'
    END as estado
FROM public.audit_populations

UNION ALL

SELECT 
    'audit_historical_samples',
    COUNT(*),
    COUNT(user_id),
    COUNT(*) - COUNT(user_id),
    ROUND(100.0 * COUNT(user_id) / NULLIF(COUNT(*), 0), 2) || '%',
    CASE 
        WHEN COUNT(*) = 0 THEN '⚠️ TABLA VACÍA'
        WHEN COUNT(*) = COUNT(user_id) THEN '✅ 100% POBLADO'
        WHEN COUNT(user_id) > 0 THEN '⚠️ PARCIALMENTE POBLADO'
        ELSE '❌ SIN POBLAR'
    END
FROM public.audit_historical_samples

UNION ALL

SELECT 
    'audit_results',
    COUNT(*),
    COUNT(user_id),
    COUNT(*) - COUNT(user_id),
    ROUND(100.0 * COUNT(user_id) / NULLIF(COUNT(*), 0), 2) || '%',
    CASE 
        WHEN COUNT(*) = 0 THEN '⚠️ TABLA VACÍA'
        WHEN COUNT(*) = COUNT(user_id) THEN '✅ 100% POBLADO'
        WHEN COUNT(user_id) > 0 THEN '⚠️ PARCIALMENTE POBLADO'
        ELSE '❌ SIN POBLAR'
    END
FROM public.audit_results;

-- ============================================================================
-- PASO 2: Verificar índices creados
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
-- PASO 3: Verificar políticas RLS activas
-- ============================================================================

SELECT 
    tablename as "Tabla",
    policyname as "Política",
    cmd as "Comando",
    CASE 
        WHEN qual LIKE '%user_id = auth.uid()%' THEN '🔒 user_id directo'
        WHEN qual LIKE '%EXISTS%audit_populations%' THEN '🔒 JOIN populations'
        ELSE '⚠️ Otra'
    END as "Tipo Filtro",
    CASE 
        WHEN policyname LIKE '%user%' THEN '✅ Nueva'
        WHEN policyname LIKE '%BACKUP%' THEN '📦 Backup'
        ELSE '⚠️ Antigua'
    END as "Versión"
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
-- PASO 4: Contar políticas por tabla
-- ============================================================================

SELECT 
    tablename as "Tabla",
    COUNT(*) as "Total Políticas",
    COUNT(*) FILTER (WHERE policyname LIKE '%user%') as "Políticas RLS Usuario",
    COUNT(*) FILTER (WHERE policyname LIKE '%BACKUP%') as "Políticas Backup",
    CASE 
        WHEN COUNT(*) FILTER (WHERE policyname LIKE '%user%') = 4 THEN '✅ COMPLETO'
        WHEN COUNT(*) FILTER (WHERE policyname LIKE '%user%') > 0 THEN '⚠️ PARCIAL'
        ELSE '❌ SIN RLS'
    END as "Estado"
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
    'audit_populations',
    'audit_historical_samples',
    'audit_results',
    'audit_data_rows'
)
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- PASO 5: Verificar que RLS está habilitado
-- ============================================================================

SELECT 
    schemaname,
    tablename, 
    rowsecurity as "RLS Habilitado"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'audit_populations',
    'audit_historical_samples',
    'audit_results',
    'audit_data_rows'
)
ORDER BY tablename;

-- ============================================================================
-- PASO 6: Test de aislamiento (MANUAL - ejecutar como diferentes usuarios)
-- ============================================================================

/*
-- INSTRUCCIONES PARA TEST MANUAL:
-- 1. Iniciar sesión como Usuario A en la aplicación
-- 2. Ejecutar en Supabase SQL Editor (con RLS habilitado):

SELECT COUNT(*) as mis_poblaciones 
FROM audit_populations;
-- Debe mostrar solo las poblaciones del Usuario A

SELECT COUNT(*) as mis_muestras 
FROM audit_historical_samples;
-- Debe mostrar solo las muestras del Usuario A

SELECT COUNT(*) as mis_resultados 
FROM audit_results;
-- Debe mostrar solo los resultados del Usuario A

-- 3. Cerrar sesión e iniciar como Usuario B
-- 4. Repetir las queries anteriores
-- 5. Los conteos deben ser DIFERENTES (cada usuario ve solo lo suyo)

-- NOTA: Si ejecutas desde SQL Editor sin autenticación, verás TODO
-- porque el SQL Editor usa service_role que bypasea RLS
*/

-- ============================================================================
-- PASO 7: Verificar consistencia de user_id entre tablas relacionadas
-- ============================================================================

-- Verificar que audit_historical_samples tiene el mismo user_id que su población
SELECT 
    'audit_historical_samples vs audit_populations' as verificacion,
    COUNT(*) as total_muestras,
    COUNT(*) FILTER (WHERE ahs.user_id = ap.user_id) as user_id_coincide,
    COUNT(*) FILTER (WHERE ahs.user_id IS NULL OR ap.user_id IS NULL) as con_nulls,
    COUNT(*) FILTER (WHERE ahs.user_id != ap.user_id) as user_id_diferente,
    CASE 
        WHEN COUNT(*) = COUNT(*) FILTER (WHERE ahs.user_id = ap.user_id) THEN '✅ CONSISTENTE'
        ELSE '❌ INCONSISTENTE'
    END as estado
FROM audit_historical_samples ahs
JOIN audit_populations ap ON ahs.population_id = ap.id;

-- Verificar que audit_results tiene el mismo user_id que su población
SELECT 
    'audit_results vs audit_populations' as verificacion,
    COUNT(*) as total_resultados,
    COUNT(*) FILTER (WHERE ar.user_id = ap.user_id) as user_id_coincide,
    COUNT(*) FILTER (WHERE ar.user_id IS NULL OR ap.user_id IS NULL) as con_nulls,
    COUNT(*) FILTER (WHERE ar.user_id != ap.user_id) as user_id_diferente,
    CASE 
        WHEN COUNT(*) = COUNT(*) FILTER (WHERE ar.user_id = ap.user_id) THEN '✅ CONSISTENTE'
        ELSE '❌ INCONSISTENTE'
    END as estado
FROM audit_results ar
JOIN audit_populations ap ON ar.population_id = ap.id;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================

DO $$
DECLARE
    v_pop_total INT;
    v_pop_with_user INT;
    v_hist_total INT;
    v_hist_with_user INT;
    v_results_total INT;
    v_results_with_user INT;
    v_total_policies INT;
    v_user_policies INT;
BEGIN
    -- Contar registros
    SELECT COUNT(*), COUNT(user_id) INTO v_pop_total, v_pop_with_user
    FROM audit_populations;
    
    SELECT COUNT(*), COUNT(user_id) INTO v_hist_total, v_hist_with_user
    FROM audit_historical_samples;
    
    SELECT COUNT(*), COUNT(user_id) INTO v_results_total, v_results_with_user
    FROM audit_results;
    
    -- Contar políticas
    SELECT COUNT(*), COUNT(*) FILTER (WHERE policyname LIKE '%user%')
    INTO v_total_policies, v_user_policies
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename IN (
        'audit_populations',
        'audit_historical_samples',
        'audit_results',
        'audit_data_rows'
    );
    
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '📊 RESUMEN DE VERIFICACIÓN RLS';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '1️⃣ DATOS POBLADOS:';
    RAISE NOTICE '   audit_populations: %/% (%%)', 
        v_pop_with_user, v_pop_total, 
        ROUND(100.0 * v_pop_with_user / NULLIF(v_pop_total, 0), 1);
    RAISE NOTICE '   audit_historical_samples: %/% (%%)', 
        v_hist_with_user, v_hist_total,
        ROUND(100.0 * v_hist_with_user / NULLIF(v_hist_total, 0), 1);
    RAISE NOTICE '   audit_results: %/% (%%)', 
        v_results_with_user, v_results_total,
        ROUND(100.0 * v_results_with_user / NULLIF(v_results_total, 0), 1);
    RAISE NOTICE '';
    RAISE NOTICE '2️⃣ POLÍTICAS RLS:';
    RAISE NOTICE '   Total políticas: %', v_total_policies;
    RAISE NOTICE '   Políticas por usuario: %', v_user_policies;
    RAISE NOTICE '   Esperadas: 16 (4 tablas × 4 operaciones)';
    RAISE NOTICE '';
    
    IF v_user_policies = 16 THEN
        RAISE NOTICE '✅ TODAS LAS POLÍTICAS RLS CONFIGURADAS CORRECTAMENTE';
    ELSE
        RAISE WARNING '⚠️ Faltan políticas RLS (esperadas: 16, encontradas: %)', v_user_policies;
    END IF;
    
    IF (v_pop_total = v_pop_with_user) AND 
       (v_hist_total = v_hist_with_user) AND 
       (v_results_total = v_results_with_user) THEN
        RAISE NOTICE '✅ TODOS LOS DATOS TIENEN user_id POBLADO';
    ELSE
        RAISE WARNING '⚠️ Algunos registros sin user_id';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🚀 SIGUIENTE PASO: Probar en la aplicación';
    RAISE NOTICE '   1. Guardar trabajo (GUARDAR TRABAJO)';
    RAISE NOTICE '   2. Ver Historial';
    RAISE NOTICE '   3. Crear nueva población';
    RAISE NOTICE '   4. Verificar con otro usuario (debe ver solo lo suyo)';
    RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- FIN DE VERIFICACIÓN
-- ============================================================================
