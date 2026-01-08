const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

console.log("🧹 INICIANDO LIMPIEZA...");

// Cargar variables manualmente
const envPath = path.resolve(__dirname, '.env');
const envLocalPath = path.resolve(__dirname, '.env.local');
let finalEnv = {};

try {
    if (fs.existsSync(envPath)) Object.assign(finalEnv, dotenv.parse(fs.readFileSync(envPath)));
    if (fs.existsSync(envLocalPath)) Object.assign(finalEnv, dotenv.parse(fs.readFileSync(envLocalPath)));
} catch (e) {
    console.error("Error leyendo .env:", e.message);
}

const url = finalEnv.VITE_SUPABASE_URL;
const key = finalEnv.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("❌ Faltan credenciales VITE_SUPABASE_URL / KEY localmente.");
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
    // Borrar todo lo que no sea 'validado' para limpiar basura
    const { error, count } = await supabase
        .from('audit_populations')
        .delete({ count: 'exact' })
        .neq('status', 'validado');

    if (error) console.error("❌ Error DB:", error.message);
    else console.log(`✅ Se eliminaron ${count || 0} registros basura/pendientes.`);
}

run();
