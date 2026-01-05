-- SCRIPT DE INSPECCIÓN DE BASE DE DATOS
-- Ejecuta esto y envíame los resultados (puedes copiar y pegar la salida de "Results")

-- CONSULTA 1: Estructura de Tablas y Columnas
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public'
ORDER BY 
    table_name, ordinal_position;

-- CONSULTA 2: Valores válidos para ENUMs (Listas desplegables en BD)
SELECT 
    t.typname as nombre_tipo, 
    e.enumlabel as valor_permitido
FROM 
    pg_type t 
JOIN 
    pg_enum e ON t.oid = e.enumtypid
ORDER BY 
    t.typname, e.enumsortorder;
