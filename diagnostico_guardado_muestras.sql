-- 🔍 DIAGNÓSTICO RÁPIDO: Verificar dónde se están guardando las muestras

-- PASO 1: Ver TODAS las muestras recientes (últimos 10 minutos)
SELECT 
    hs.id,
    hs.method,
    hs.sample_size,
    hs.is_current,
    hs.is_final,
    hs.created_at,
    ap.audit_name as "Población",
    ap.id as "PopulationID"
FROM audit_historical_samples hs
LEFT JOIN audit_populations ap ON hs.population_id = ap.id
WHERE hs.created_at > NOW() - INTERVAL '10 minutes'
ORDER BY hs.created_at DESC;

-- PASO 2: Contar muestras por población
SELECT 
    ap.audit_name as "Población",
    ap.id as "PopulationID",
    COUNT(hs.id) as "Total Muestras",
    COUNT(CASE WHEN hs.is_current = TRUE THEN 1 END) as "Muestras Actuales",
    MAX(hs.created_at) as "Última Muestra"
FROM audit_populations ap
LEFT JOIN audit_historical_samples hs ON ap.id = hs.population_id
GROUP BY ap.id, ap.audit_name
ORDER BY MAX(hs.created_at) DESC NULLS LAST;

-- PASO 3: Ver población "Registro" específicamente
SELECT 
    id as "PopulationID",
    audit_name,
    total_rows,
    created_at
FROM audit_populations
WHERE audit_name ILIKE '%registro%'
ORDER BY created_at DESC;

-- PASO 4: Verificar si hay muestras huérfanas (sin población asociada)
SELECT 
    hs.id,
    hs.method,
    hs.population_id,
    hs.created_at,
    'HUÉRFANA - Population ID no existe' as "Estado"
FROM audit_historical_samples hs
LEFT JOIN audit_populations ap ON hs.population_id = ap.id
WHERE ap.id IS NULL
  AND hs.created_at > NOW() - INTERVAL '1 day'
ORDER BY hs.created_at DESC;

-- 🎯 RESULTADO ESPERADO:
-- - PASO 1: Debe mostrar las muestras que acabas de guardar
-- - PASO 2: Debe mostrar "Registro" con al menos 1 muestra
-- - PASO 3: Debe mostrar el ID de la población "Registro"
-- - PASO 4: No debe mostrar ninguna fila (no debe haber huérfanas)
