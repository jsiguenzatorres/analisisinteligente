-- SCRIPT PARA CREAR TABLA DE RESULTADOS
-- Ejecuta este script en el "SQL Editor" de Supabase para corregir el error de guardado.

CREATE TABLE IF NOT EXISTS public.audit_results (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    population_id uuid REFERENCES public.audit_populations(id) ON DELETE CASCADE,
    results_json jsonb,
    sample_size integer,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(population_id)
);

-- Habilitar seguridad (RLS)
ALTER TABLE public.audit_results ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (Permitir todo para desarrollo)
CREATE POLICY "Permitir todo a todos" ON public.audit_results
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Permisos
GRANT ALL ON public.audit_results TO authenticated;
GRANT ALL ON public.audit_results TO anon;
GRANT ALL ON public.audit_results TO service_role;

SELECT 'Tabla audit_results creada correctamente' as estado;
