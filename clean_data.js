const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

console.log("🧹 INICIANDO LIMPIEZA DE DATOS CORRUPTOS...");

// 1. Cargar variables
const envPath = '.env';
const envLocalPath = '.env.local';
let finalEnv = {};

if (fs.existsSync(envPath)) Object.assign(finalEnv, dotenv.parse(fs.readFileSync(envPath)));
if (fs.existsSync(envLocalPath)) Object.assign(finalEnv, dotenv.parse(fs.readFileSync(envLocalPath)));

const supabaseUrl = finalEnv.VITE_SUPABASE_URL;
const supabaseKey = finalEnv.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Faltan credenciales.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanData() {
    try {
        // 1. Buscar poblaciones 'PENDIENTE' o 'ERROR' o con 0 filas que sean viejas
        console.log("🔍 Buscando registros basura...");

        const { data: badPops, error: searchError } = await supabase
            .from('audit_populations')
            .select('id, file_name, status, created_at')
            .in('status', ['PENDIENTE', 'ERROR', 'uploading'])
            .order('created_at', { ascending: false });

        if (searchError) throw searchError;

        if (!badPops || badPops.length === 0) {
            console.log("✅ No se encontraron registros corruptos. La base está limpia.");
            return;
        }

        console.log(`⚠️ Se encontraron ${badPops.length} cargas fallidas/incompletas.`);
        // Listarlas para el usuario
        badPops.forEach(p => console.log(`   - [${p.status}] ${p.file_name} (${p.id})`));

        // 2. Eliminar (Cascade debería borrar las audit_data_rows asociadas)
        console.log("🗑️ Eliminando registros basura...");

        const idsToDelete = badPops.map(p => p.id);
        const { error: deleteError } = await supabase
            .from('audit_populations')
            .delete()
            .in('id', idsToDelete);

        if (deleteError) throw deleteError;

        console.log("✨ LIMPIEZA COMPLETADA EXTITOSAMENTE.");
        console.log("   Ahora puedes intentar subir el archivo desde cero.");

    } catch (e) {
        console.error("💥 Error durante la limpieza:", e.message);
    }
}

cleanData();
