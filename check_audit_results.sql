-- Verificar si hay datos en audit_results
SELECT 
    id,
    population_id,
    sample_size,
    created_at,
    updated_at,
    LENGTH(results_json::text) as json_size_bytes
FROM public.audit_results
WHERE population_id = '47c3d9f8-34cd-463f-b6a7-1db86ebfb34a'
ORDER BY updated_at DESC
LIMIT 5;
