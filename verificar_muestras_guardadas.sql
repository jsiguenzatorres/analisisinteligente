-- ============================================================================
-- QUERIES PARA VERIFICAR DATOS GUARDADOS
-- ============================================================================
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Para verificar que tus muestras se guardaron correctamente
-- ============================================================================

-- ===========================================================================
-- 1. VERIFICAR TRABAJO EN PROGRESO (audit_results)
-- ===========================================================================
-- Esta tabla guarda cuando haces "Guardar Trabajo"
-- Población: "Registro" del 21/1/2026

SELECT 
    id,
    population_id,
    sample_size,
    updated_at as "Fecha Actualización",
    LEFT(results_json::text, 100) as "Vista Previa JSON"
FROM audit_results
WHERE population_id IN (
    SELECT id 
    FROM audit_populations 
    WHERE audit_name = 'Registro'
)
ORDER BY updated_at DESC
LIMIT 5;

-- ===========================================================================
-- 2. VERIFICAR MUESTRAS DEFINITIVAS (audit_historical_samples)
-- ===========================================================================
-- Esta tabla guarda cuando bloqueas como "Papel de Trabajo definitivo"
-- Aquí es donde debería aparecer en el "Archivo Histórico"

SELECT 
    id,
    population_id,
    method as "Método",
    sample_size as "Tamaño Muestra",
    is_final as "Es Final?",
    is_current as "Es Actual?",
    created_at as "Fecha Creación",
    objective as "Objetivo"
FROM audit_historical_samples
WHERE population_id IN (
    SELECT id 
    FROM audit_populations 
    WHERE audit_name = 'Registro'
)
ORDER BY created_at DESC
LIMIT 10;

-- ===========================================================================
-- 3. VERIFICAR TODAS LAS POBLACIONES
-- ===========================================================================
-- Para ver el ID exacto de tu población "Registro"

SELECT 
    id as "UUID Población",
    audit_name as "Nombre",
    area,
    total_records as "Registros",
    total_value as "Valor Total",
    created_at as "Fecha Carga"
FROM audit_populations
WHERE audit_name ILIKE '%registro%'
   OR total_records = 298
ORDER BY created_at DESC;

-- ===========================================================================
-- 4. RESUMEN GENERAL - ¿QUÉ TENGO EN CADA TABLA?
-- ===========================================================================

-- Contar registros en audit_results
SELECT 
    'audit_results' as tabla,
    COUNT(*) as total_registros,
    MAX(updated_at) as ultima_actualizacion
FROM audit_results

UNION ALL

-- Contar registros en audit_historical_samples
SELECT 
    'audit_historical_samples' as tabla,
    COUNT(*) as total_registros,
    MAX(created_at) as ultima_actualizacion
FROM audit_historical_samples;

-- ===========================================================================
-- 5. QUERY ESPECÍFICA PARA TU POBLACIÓN "Registro"
-- ===========================================================================
-- Usa el UUID que obtuviste del query #3

-- PASO A: Primero obtén el UUID de tu población
-- (Ejecuta el query #3 y copia el UUID)

-- PASO B: Reemplaza 'TU-UUID-AQUI' con el UUID real
SELECT 
    'Trabajo en Progreso' as tipo,
    id::text as id,
    sample_size as tamaño,
    updated_at as fecha
FROM audit_results
WHERE population_id = 'TU-UUID-AQUI' -- ⚠️ REEMPLAZAR CON UUID REAL

UNION ALL

SELECT 
    'Muestra Definitiva' as tipo,
    id::text as id,
    sample_size as tamaño,
    created_at as fecha
FROM audit_historical_samples
WHERE population_id = 'TU-UUID-AQUI' -- ⚠️ REEMPLAZAR CON UUID REAL
ORDER BY fecha DESC;

-- ===========================================================================
-- 6. VERIFICAR POLÍTICAS RLS (si hay problemas de permisos)
-- ===========================================================================

-- Ver políticas de audit_historical_samples
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as comando,
    roles
FROM pg_policies 
WHERE tablename IN ('audit_historical_samples', 'audit_results')
ORDER BY tablename, policyname;

-- ===========================================================================
-- INTERPRETACIÓN DE RESULTADOS
-- ===========================================================================

/*
CASO 1: audit_results tiene datos, audit_historical_samples vacío
  → El "Guardar Trabajo" funciona ✅
  → El "Bloquear como Papel Definitivo" NO funciona ❌
  → Solución: Arreglar el componente que guarda en audit_historical_samples

CASO 2: Ambas tablas tienen datos
  → Todo funciona ✅
  → El problema es el componente que MUESTRA el historial
  → Solución: Arreglar SampleHistoryManager.tsx

CASO 3: Ambas tablas vacías
  → RLS bloqueando las queries SELECT ❌
  → Solución: Verificar políticas RLS con query #6
*/

-- ===========================================================================
-- PRÓXIMOS PASOS SEGÚN EL RESULTADO
-- ===========================================================================

/*
DESPUÉS DE EJECUTAR ESTOS QUERIES:

1. Ejecuta query #4 primero → Te dice cuántos registros tienes
2. Ejecuta query #3 → Te da el UUID de tu población "Registro"
3. Copia el UUID y ejecuta query #5 (reemplazando el UUID)
4. Comparte los resultados

Con eso sabré exactamente dónde están tus datos y qué arreglar.
*/
