-- ============================================================================
-- TEST DE POLÍTICAS RLS PARA audit_results
-- Ejecuta esto en Supabase SQL Editor para verificar que las políticas funcionan
-- ============================================================================

-- 1. Verificar que RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'audit_results';

-- 2. Ver todas las políticas actuales
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'audit_results';

-- 3. TEST: Intentar INSERT como usuario authenticated
-- Esto simula lo que está haciendo el cliente
SET ROLE authenticated;

-- Ver el rol actual
SELECT current_user, current_role;

-- Intentar insertar (esto debería funcionar si las políticas están bien)
INSERT INTO audit_results (population_id, results_json, sample_size, updated_at)
VALUES (
    '47c3d9f8-34cd-463f-b6a7-1db86ebfb34a'::uuid,
    '{"test": "data"}'::jsonb,
    30,
    NOW()
)
ON CONFLICT (population_id) DO UPDATE SET
    results_json = EXCLUDED.results_json,
    sample_size = EXCLUDED.sample_size,
    updated_at = EXCLUDED.updated_at;

-- Volver a rol normal
RESET ROLE;

-- 4. Verificar que se insertó
SELECT * FROM audit_results WHERE population_id = '47c3d9f8-34cd-463f-b6a7-1db86ebfb34a';

-- 5. Limpiar test
DELETE FROM audit_results WHERE population_id = '47c3d9f8-34cd-463f-b6a7-1db86ebfb34a';
