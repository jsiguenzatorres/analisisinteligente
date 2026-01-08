-- DIAGNÓSTICO PROFUNDO (Basado en recomendaciones de IA Experta)

-- 1. ¿HAY TRIGGERS OCULTOS?
-- Si sale algo aquí que no sea sistema, es el culpable.
SELECT tgname as nombre_trigger, tgfoid::regprocedure as funcion_conectada
FROM pg_trigger
WHERE tgrelid = 'audit_populations'::regclass;

-- 2. PRUEBA NUCLEAR (Insert directo ignorando PostgREST)
-- Si esto se cuelga aquí en el editor => Es culpa de Postgres (Deadlock o Trigger).
-- Si esto funciona rápido => Es culpa del Navegador/Red.

DO $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Buscamos cualquier usuario válido para no romper la FK
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    INSERT INTO audit_populations (
        file_name, audit_name, area, status, user_id, column_mapping, upload_timestamp
    ) VALUES (
        'TEST_NUCLEAR_DB.xlsx', 
        'TEST_NUCLEAR', 
        'TI', 
        'PENDIENTE', 
        v_user_id, 
        '{}'::jsonb,
        now()
    );
END $$;

-- 3. VERIFICAR
SELECT id, audit_name, created_at FROM audit_populations WHERE audit_name = 'TEST_NUCLEAR';
