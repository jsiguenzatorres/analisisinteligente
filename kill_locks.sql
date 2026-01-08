-- Detectar bloqueos
SELECT * FROM pg_locks pl JOIN pg_stat_activity psa ON pl.pid = psa.pid;

-- Matar conexiones "idle in transaction" (que suelen bloquear todo)
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle in transaction' 
AND datname = 'postgres'; -- O el nombre de tu BD si es diferente

-- Limpieza general de conexiones viejas (opcional, ajusta el tiempo)
-- SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < current_timestamp - INTERVAL '10 minutes';
