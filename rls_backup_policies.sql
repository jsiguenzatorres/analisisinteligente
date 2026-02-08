-- ============================================================================
-- RESPALDO: Políticas RLS Actuales (ANTES de cambios)
-- ============================================================================
-- Fecha de respaldo: 2026-02-08
-- Propósito: Permitir rollback si las nuevas políticas causan problemas
-- ============================================================================

-- POLÍTICAS ACTUALES: audit_populations
-- ============================================================================

DROP POLICY IF EXISTS "populations_insert_policy_BACKUP" ON public.audit_populations;
DROP POLICY IF EXISTS "populations_select_policy_BACKUP" ON public.audit_populations;
DROP POLICY IF EXISTS "populations_update_policy_BACKUP" ON public.audit_populations;
DROP POLICY IF EXISTS "populations_delete_policy_BACKUP" ON public.audit_populations;

-- Política INSERT actual
CREATE POLICY "populations_insert_policy_BACKUP" 
ON public.audit_populations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Política SELECT actual
CREATE POLICY "populations_select_policy_BACKUP" 
ON public.audit_populations 
FOR SELECT 
TO authenticated
USING (true);

-- Política UPDATE actual
CREATE POLICY "populations_update_policy_BACKUP" 
ON public.audit_populations 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Política DELETE actual
CREATE POLICY "populations_delete_policy_BACKUP" 
ON public.audit_populations 
FOR DELETE 
TO authenticated
USING (true);

-- ============================================================================
-- POLÍTICAS ACTUALES: audit_data_rows
-- ============================================================================

DROP POLICY IF EXISTS "data_rows_insert_policy_BACKUP" ON public.audit_data_rows;
DROP POLICY IF EXISTS "data_rows_select_policy_BACKUP" ON public.audit_data_rows;
DROP POLICY IF EXISTS "data_rows_update_policy_BACKUP" ON public.audit_data_rows;
DROP POLICY IF EXISTS "data_rows_delete_policy_BACKUP" ON public.audit_data_rows;

-- Política INSERT actual
CREATE POLICY "data_rows_insert_policy_BACKUP" 
ON public.audit_data_rows 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Política SELECT actual
CREATE POLICY "data_rows_select_policy_BACKUP" 
ON public.audit_data_rows 
FOR SELECT 
TO authenticated
USING (true);

-- Política UPDATE actual
CREATE POLICY "data_rows_update_policy_BACKUP" 
ON public.audit_data_rows 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Política DELETE actual
CREATE POLICY "data_rows_delete_policy_BACKUP" 
ON public.audit_data_rows 
FOR DELETE 
TO authenticated
USING (true);

-- ============================================================================
-- SCRIPT DE ROLLBACK: Restaurar políticas originales
-- ============================================================================

/*
-- EJECUTAR ESTE BLOQUE PARA VOLVER A LAS POLÍTICAS ORIGINALES:

-- 1. Eliminar nuevas políticas
DROP POLICY IF EXISTS "populations_user_select" ON public.audit_populations;
DROP POLICY IF EXISTS "populations_user_insert" ON public.audit_populations;
DROP POLICY IF EXISTS "populations_user_update" ON public.audit_populations;
DROP POLICY IF EXISTS "populations_user_delete" ON public.audit_populations;

DROP POLICY IF EXISTS "data_rows_user_select" ON public.audit_data_rows;
DROP POLICY IF EXISTS "data_rows_user_insert" ON public.audit_data_rows;
DROP POLICY IF EXISTS "data_rows_user_update" ON public.audit_data_rows;
DROP POLICY IF EXISTS "data_rows_user_delete" ON public.audit_data_rows;

DROP POLICY IF EXISTS "historical_samples_user_select" ON public.audit_historical_samples;
DROP POLICY IF EXISTS "historical_samples_user_insert" ON public.audit_historical_samples;
DROP POLICY IF EXISTS "historical_samples_user_update" ON public.audit_historical_samples;
DROP POLICY IF EXISTS "historical_samples_user_delete" ON public.audit_historical_samples;

DROP POLICY IF EXISTS "audit_results_user_select" ON public.audit_results;
DROP POLICY IF EXISTS "audit_results_user_insert" ON public.audit_results;
DROP POLICY IF EXISTS "audit_results_user_update" ON public.audit_results;
DROP POLICY IF EXISTS "audit_results_user_delete" ON public.audit_results;

-- 2. Restaurar políticas originales
CREATE POLICY "populations_insert_policy" 
ON public.audit_populations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "populations_select_policy" 
ON public.audit_populations FOR SELECT TO authenticated USING (true);

CREATE POLICY "populations_update_policy" 
ON public.audit_populations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "populations_delete_policy" 
ON public.audit_populations FOR DELETE TO authenticated USING (true);

CREATE POLICY "data_rows_insert_policy" 
ON public.audit_data_rows FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "data_rows_select_policy" 
ON public.audit_data_rows FOR SELECT TO authenticated USING (true);

CREATE POLICY "data_rows_update_policy" 
ON public.audit_data_rows FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "data_rows_delete_policy" 
ON public.audit_data_rows FOR DELETE TO authenticated USING (true);

-- 3. Eliminar políticas de backup
DROP POLICY IF EXISTS "populations_insert_policy_BACKUP" ON public.audit_populations;
DROP POLICY IF EXISTS "populations_select_policy_BACKUP" ON public.audit_populations;
DROP POLICY IF EXISTS "populations_update_policy_BACKUP" ON public.audit_populations;
DROP POLICY IF EXISTS "populations_delete_policy_BACKUP" ON public.audit_populations;
DROP POLICY IF EXISTS "data_rows_insert_policy_BACKUP" ON public.audit_data_rows;
DROP POLICY IF EXISTS "data_rows_select_policy_BACKUP" ON public.audit_data_rows;
DROP POLICY IF EXISTS "data_rows_update_policy_BACKUP" ON public.audit_data_rows;
DROP POLICY IF EXISTS "data_rows_delete_policy_BACKUP" ON public.audit_data_rows;

RAISE NOTICE '✅ Políticas RLS restauradas a estado original (USING true)';
*/

-- ============================================================================
-- NOTAS
-- ============================================================================
-- Este archivo contiene respaldo de las políticas RLS actuales
-- Las políticas _BACKUP se crean pero NO se activan
-- Para rollback, ejecutar el bloque comentado arriba
-- ============================================================================
