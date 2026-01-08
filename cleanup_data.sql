-- ⚠️ ADVERTENCIA: Este script ELIMINARÁ TODOS LOS DATOS de las tablas de auditoría.
-- Úsalo solo si quieres reiniciar completamente la base de datos de pruebas.

-- 1. Limpiar resultados de análisis previos
TRUNCATE TABLE audit_results CASCADE;

-- 2. Limpiar filas de datos importadas (la tabla más pesada)
TRUNCATE TABLE audit_data_rows CASCADE;

-- 3. Limpiar poblaciones/proyectos (con CASCADE se lleva todo lo asociado si hay FKs)
TRUNCATE TABLE audit_populations CASCADE;

-- Si tienes tabla de muestras específica:
-- TRUNCATE TABLE audit_samples CASCADE; 

-- Verificación final (debería dar 0 en todas)
SELECT count(*) as total_poblaciones FROM audit_populations;
