-- CORRECCIÓN DE POLÍTICAS DE SEGURIDAD (RLS)
-- El problema actual es que el Admin no tiene permiso real para ver todos los perfiles.

-- 1. Eliminar política defectuosa anterior (si existe)
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- 2. Crear nueva política de LECTURA robusta
-- Permite ver perfiles si:
-- A) Eres el dueño del perfil (auth.uid() = id)
-- B) Eres ADMIN (verificado por metadatos del JWT)
CREATE POLICY "profiles_select_policy" 
ON public.profiles 
FOR SELECT 
USING (
    auth.uid() = id 
    OR 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
);

-- 3. Crear nueva política de ACTUALIZACIÓN robusta (Solo Admins)
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

CREATE POLICY "profiles_update_policy" 
ON public.profiles 
FOR UPDATE
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
);

-- 4. Asegurar que RLS esté activo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Confirmación
SELECT 'Políticas RLS actualizadas correctamente' as status;
