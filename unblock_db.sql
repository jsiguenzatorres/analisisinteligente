-- Versión Segura (Solo mata transacciones "zombie")
-- Esto evitará el error de permisos al no tocar procesos del sistema.

SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle in transaction' -- <--- La clave: Solo matamos las que están estorbando
AND pid <> pg_backend_pid(); 

-- Si después de esto sigue bloqueado, corre esta otra para ver qué queda:
-- SELECT pid, state, query FROM pg_stat_activity WHERE state != 'idle';
