-- ============================================================================
-- FIX RLS PARA CARGA DIRECTA DE DATOS (audit_populations + audit_data_rows)
-- Este script habilita que el cliente browser pueda insertar datos directamente
-- ============================================================================
-- EJECUTAR EN: Supabase Dashboard > SQL Editor
-- TIEMPO ESTIMADO: 15 segundos
-- ============================================================================

-- PASO 1: Verificar estado actual de RLS
SELECT 
    schemaname,
    tablename, 
    rowsecurity as "RLS Habilitado"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('audit_populations', 'audit_data_rows')
ORDER BY tablename;

-- PASO 2: Verificar políticas existentes
SELECT 
    tablename,
    policyname as "Política",
    cmd as "Comando",
    roles as "Roles"
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('audit_populations', 'audit_data_rows')
ORDER BY tablename, policyname;

-- ============================================================================
-- TABLA: audit_populations
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.audit_populations ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas conflictivas (si existen)
DROP POLICY IF EXISTS "populations_insert_policy" ON public.audit_populations;
DROP POLICY IF EXISTS "populations_select_policy" ON public.audit_populations;
DROP POLICY IF EXISTS "populations_update_policy" ON public.audit_populations;
DROP POLICY IF EXISTS "populations_delete_policy" ON public.audit_populations;

-- Política INSERT: Permitir a usuarios autenticados crear poblaciones
CREATE POLICY "populations_insert_policy" 
ON public.audit_populations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Política SELECT: Permitir a usuarios autenticados ver poblaciones
CREATE POLICY "populations_select_policy" 
ON public.audit_populations 
FOR SELECT 
TO authenticated
USING (true);

-- Política UPDATE: Permitir a usuarios autenticados actualizar poblaciones
CREATE POLICY "populations_update_policy" 
ON public.audit_populations 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Política DELETE: Permitir a usuarios autenticados eliminar poblaciones
CREATE POLICY "populations_delete_policy" 
ON public.audit_populations 
FOR DELETE 
TO authenticated
USING (true);

-- Otorgar permisos explícitos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_populations TO authenticated;
GRANT ALL ON public.audit_populations TO service_role;

-- ============================================================================
-- TABLA: audit_data_rows
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.audit_data_rows ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas conflictivas (si existen)
DROP POLICY IF EXISTS "data_rows_insert_policy" ON public.audit_data_rows;
DROP POLICY IF EXISTS "data_rows_select_policy" ON public.audit_data_rows;
DROP POLICY IF EXISTS "data_rows_update_policy" ON public.audit_data_rows;
DROP POLICY IF EXISTS "data_rows_delete_policy" ON public.audit_data_rows;

-- Política INSERT: Permitir a usuarios autenticados insertar datos
CREATE POLICY "data_rows_insert_policy" 
ON public.audit_data_rows 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Política SELECT: Permitir a usuarios autenticados ver datos
CREATE POLICY "data_rows_select_policy" 
ON public.audit_data_rows 
FOR SELECT 
TO authenticated
USING (true);

-- Política UPDATE: Permitir a usuarios autenticados actualizar datos
CREATE POLICY "data_rows_update_policy" 
ON public.audit_data_rows 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Política DELETE: Permitir a usuarios autenticados eliminar datos
CREATE POLICY "data_rows_delete_policy" 
ON public.audit_data_rows 
FOR DELETE 
TO authenticated
USING (true);

-- Otorgar permisos explícitos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_data_rows TO authenticated;
GRANT ALL ON public.audit_data_rows TO service_role;

-- ============================================================================
-- VERIFICACIÓN: Comprobar que las políticas se crearon correctamente
-- ============================================================================

SELECT 
    tablename as "Tabla",
    policyname as "✅ Política Creada",
    cmd as "Comando",
    roles as "Roles"
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('audit_populations', 'audit_data_rows')
ORDER BY tablename, policyname;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ RLS configurado para audit_populations y audit_data_rows';
    RAISE NOTICE '✅ Políticas creadas para: INSERT, SELECT, UPDATE, DELETE';
    RAISE NOTICE '✅ Permisos otorgados a: authenticated, service_role';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 SIGUIENTE PASO: Probar carga directa desde el navegador';
    RAISE NOTICE '⚠️  IMPORTANTE: Estas políticas permiten a CUALQUIER usuario autenticado';
    RAISE NOTICE '    insertar/modificar datos. Para producción, considera políticas';
    RAISE NOTICE '    más restrictivas basadas en user_id o roles específicos.';
END $$;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Estas políticas permiten a CUALQUIER usuario AUTENTICADO insertar/leer datos
-- 2. NO se requiere service_role_key en el cliente (seguro)
-- 3. Compatible con anon_key (API key pública)
-- 4. Para producción, considera políticas más restrictivas:
--    Ejemplo:
--    CREATE POLICY "populations_user_insert" 
--    ON audit_populations 
--    FOR INSERT 
--    TO authenticated
--    WITH CHECK (auth.uid()::text = user_id);
-- ============================================================================
