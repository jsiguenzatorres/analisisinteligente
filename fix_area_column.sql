-- SQL Script to fix Schema Mismatch
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/analisisinteligente-37b58/sql/new)

-- 1. Agregamos el nuevo estado al ENUM de base de datos
-- Nota: Si da error indicando que ya existe, puedes ignorar esa línea específica.
ALTER TYPE audit_status ADD VALUE IF NOT EXISTS 'PENDIENTE';

-- 2. Aseguramos que existan las columnas de metadatos necesarias
ALTER TABLE audit_populations 
ADD COLUMN IF NOT EXISTS area TEXT DEFAULT 'GENERAL',
ADD COLUMN IF NOT EXISTS audit_name TEXT;

-- 3. Migramos datos antiguos para que no aparezcan vacíos
UPDATE audit_populations SET audit_name = file_name WHERE audit_name IS NULL;

-- Comment: This column is required for the new categorization feature in the Dashboard.
