-- SCRIPT DE CORRECCIÓN DE BASE DE DATOS
-- Ejecuta este script en el "SQL Editor" de tu proyecto en Supabase

-- 1. Corregir tabla de Poblaciones (audit_populations)
ALTER TABLE public.audit_populations 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'uploaded',
ADD COLUMN IF NOT EXISTS upload_timestamp timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS total_rows integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS file_name text;

-- 2. Corregir tabla de Datos (audit_data_rows)
ALTER TABLE public.audit_data_rows
ADD COLUMN IF NOT EXISTS unique_id_col text,
ADD COLUMN IF NOT EXISTS monetary_value_col numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS category_col text,
ADD COLUMN IF NOT EXISTS subcategory_col text,
ADD COLUMN IF NOT EXISTS raw_data jsonb;

-- 3. Habilitar permisos (por si acaso faltan)
GRANT ALL ON public.audit_populations TO authenticated;
GRANT ALL ON public.audit_populations TO anon;
GRANT ALL ON public.audit_data_rows TO authenticated;
GRANT ALL ON public.audit_data_rows TO anon;

-- Confirmación visual
SELECT 'Base de datos actualizada correctamente' as status;
