
const { createClient } = require('@supabase/supabase-js');

// Credenciales recuperadas vía MCP/Tooling - Hardcoded para test de aislamiento
const supabaseUrl = 'https://lodeqleukaoshzarebxu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZGVxbGV1a2Fvc2h6YXJlYnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjE3NzQsImV4cCI6MjA4MTEzNzc3NH0.ql-JBWcxWRnnQsHoSCuBsodyVP4SuJiCWRTJxkSTNDc';

console.log("🔍 [DIAGNÓSTICO] Iniciando prueba de conexión aislada...");
console.log(`📡 URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyConnection() {
    try {
        console.log("⏳ Intentando consultar la tabla 'profiles'...");

        // 1. Consulta simple
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .limit(5);

        if (error) {
            console.error("❌ ERROR SUPABASE:", error.message);
            console.error("   Detalles:", error);
        } else {
            console.log(`✅ CONEXIÓN EXITOSA. Se encontraron ${data.length} perfiles.`);
            if (data.length > 0) {
                console.log("📝 Muestra de datos:", data.map(u => ({ id: u.id, name: u.full_name, role: u.role })));
            } else {
                console.warn("⚠️ La tabla 'profiles' está vacía o el RLS sigue ocultando datos.");
            }
        }

    } catch (err) {
        console.error("💥 EXCEPCIÓN NO CONTROLADA:", err.message);
    }
}

verifyConnection();
