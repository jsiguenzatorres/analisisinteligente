const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://lodeqleukaoshzarebxu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZGVxbGV1a2Fvc2h6YXJlYnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjE3NzQsImV4cCI6MjA4MTEzNzc3NH0.ql-JBWcxWRnnQsHoSCuBsodyVP4SuJiCWRTJxkSTNDc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false
    }
});

async function simulateUpload() {
    console.log("🚀 Iniciando Simulación de Subida (Backend Script)...");
    console.log(`🔗 Conectando a: ${SUPABASE_URL}`);

    const dummyPopulation = {
        file_name: 'simulacion_backend.xlsx',
        audit_name: 'Simulacion Backend ' + new Date().toISOString(),
        area: 'TI',
        status: 'PENDIENTE',
        upload_timestamp: new Date().toISOString(),
        total_rows: 100,
        total_monetary_value: 5000.00
        // user_id lo dejamos null o ponemos uno fijo si es necesario, 
        // pero con RLS abierto debería funcionar sin él o con uno fake si no hay FK constraint estricta
    };

    try {
        // 1. Insertar Población
        console.log("⏳ Insertando en 'audit_populations'...");

        // NOTA: Si user_id es obligatorio en la DB, esto podría fallar si no tenemos un ID real.
        // Intentaremos sin user_id primero (ya que es nullable según el esquema visto).

        const { data, error } = await supabase
            .from('audit_populations')
            .insert(dummyPopulation)
            .select()
            .single();

        if (error) {
            throw new Error(`Error en Insert Population: ${error.message} (${error.code})`);
        }

        if (!data) {
            throw new Error("No se devolvieron datos tras la inserción.");
        }

        const popId = data.id;
        console.log(`✅ Población Creada con Éxito. ID: ${popId}`);

        // 2. Insertar Fila de Prueba
        console.log("⏳ Insertando 1 fila de prueba en 'audit_data_rows'...");

        const dummyRow = {
            population_id: popId,
            unique_id_col: 'ID-TEST-001',
            monetary_value_col: 150.50,
            category_col: 'Test',
            subcategory_col: 'Backend',
            raw_json: { test: true, origin: 'script' }
        };

        const { error: rowError } = await supabase
            .from('audit_data_rows')
            .insert([dummyRow]);

        if (rowError) {
            // Si falla aquí, al menos la población se creó
            throw new Error(`Error en Insert Data Row: ${rowError.message}`);
        }

        console.log("✅ Fila de datos insertada correctamente.");
        console.log("🎉 PRUEBA DE CAMPO COMPLETADA: El servidor Supabase acepta escrituras perfectamente.");

    } catch (err) {
        console.error("💥 LA SIMULACIÓN FALLÓ:");
        console.error(err.message);
    }
}

simulateUpload();
