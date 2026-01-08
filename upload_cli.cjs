const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = 'https://lodeqleukaoshzarebxu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZGVxbGV1a2Fvc2h6YXJlYnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjE3NzQsImV4cCI6MjA4MTEzNzc3NH0.ql-JBWcxWRnnQsHoSCuBsodyVP4SuJiCWRTJxkSTNDc';
const FILE_PATH = './datos2.xlsx'; // CAMBIO: datos2.xlsx

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

async function main() {
    console.log(`🚀 Iniciando Subida Directa desde '${FILE_PATH}'...`);

    // 1. Validar Archivo
    if (!fs.existsSync(FILE_PATH)) {
        console.error(`❌ El archivo ${FILE_PATH} no existe. Por favor copialo a la carpeta.`);
        process.exit(1);
    }

    // 2. Leer Excel
    console.log("📂 Leyendo archivo Excel...");
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    if (rawData.length === 0) {
        console.error("❌ El archivo Excel parece estar vacío.");
        process.exit(1);
    }

    console.log(`✅ Archivo leído. ${rawData.length} filas encontradas.`);
    const headers = Object.keys(rawData[0]);
    console.log("📋 Columnas detectadas:", headers.join(', '));

    // 3. Mapeo Manual (Según instrucciones del usuario para datos2.xlsx)
    console.log("🧩 Configurando Mapeo Manual (datos2.xlsx)...");

    // Normalizamos headers para búsqueda insensible a mayúsculas/tildes
    const cleanHeader = (h) => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const headersMap = headers.reduce((acc, h) => {
        acc[cleanHeader(h)] = h;
        return acc;
    }, {});

    // Búsqueda específica solicitada
    const findCol = (keywords) => headers.find(h => keywords.some(k => h.toLowerCase().includes(k)));

    // ID: "ID_Asiento"
    const colId = headersMap['id_asiento'] ||
        headersMap['id asiento'] ||
        headersMap['idasiento'] ||
        findCol(['id', 'codigo']);

    // MONTO: "Debe"
    const colMonto = headersMap['debe'] ||
        findCol(['monto', 'valor', 'amount']);

    const colCat = findCol(['cat', 'rubro', 'tipo', 'concepto']);
    const colSub = findCol(['sub', 'detalle']);

    console.log(`   - ID Único: ${colId} ${colId ? '✅' : '⚠️ (No encontrado)'}`);
    console.log(`   - Monto:    ${colMonto} ${colMonto ? '✅' : '⚠️ (No encontrado - Se usará 0)'}`);
    console.log(`   - Categoría:${colCat || '(No encontrado)'}`);

    if (!colId) {
        console.error("❌ ERROR CRÍTICO: No se encontró la columna 'ID_Asiento'.");
        console.log("Columnas disponibles:", headers.join(', '));
        process.exit(1);
    }

    // 4. Preparar Datos para Población
    let totalMonto = 0;

    // Calcular totales
    rawData.forEach(row => {
        if (colMonto) {
            const val = parseFloat(String(row[colMonto]).replace(/[^0-9.-]/g, ''));
            if (!isNaN(val)) totalMonto += val;
        }
    });

    const populationPayload = {
        file_name: 'datos.xlsx',
        audit_name: 'Carga Directa CLI ' + new Date().toLocaleDateString(),
        area: 'CARGA_MANUAL',
        status: 'PENDIENTE',
        upload_timestamp: new Date().toISOString(),
        total_rows: rawData.length,
        total_monetary_value: totalMonto,
        // Estadísticas simplificadas
        descriptive_stats: { sum: totalMonto, count: rawData.length }
    };

    try {
        // 5. Insertar Población
        console.log("⏳ Creando registro de Población...");
        const { data: popData, error: popError } = await supabase
            .from('audit_populations')
            .insert(populationPayload)
            .select()
            .single();

        if (popError) throw new Error(`Error creando población: ${popError.message}`);

        const populationId = popData.id;
        console.log(`✅ Población creada ID: ${populationId}`);

        // 6. Insertar Filas (Por lotes de 50)
        console.log("⏳ Subiendo filas de datos...");
        const BATCH_SIZE = 50;
        const batches = [];

        for (let i = 0; i < rawData.length; i += BATCH_SIZE) {
            batches.push(rawData.slice(i, i + BATCH_SIZE));
        }

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            const rowsToInsert = batch.map((row, idx) => {
                let monto = 0;
                if (colMonto) {
                    const val = parseFloat(String(row[colMonto]).replace(/[^0-9.-]/g, ''));
                    if (!isNaN(val)) monto = val;
                }

                return {
                    population_id: populationId,
                    unique_id_col: colId ? String(row[colId]) : `ROW-${i * BATCH_SIZE + idx + 1}`,
                    monetary_value_col: monto,
                    category_col: colCat ? String(row[colCat]) : null,
                    subcategory_col: colSub ? String(row[colSub]) : null,
                    raw_json: row
                };
            });

            const { error: batchError } = await supabase
                .from('audit_data_rows')
                .insert(rowsToInsert);

            if (batchError) {
                console.error(`❌ Error en lote ${i + 1}: ${batchError.message}`);
                // No cancelamos todo, intentamos seguir
            } else {
                process.stdout.write(`.`); // Progreso visual
            }
        }

        console.log("\n✅ CARGA COMPLETADA EXITOSAMENTE.");

    } catch (err) {
        console.error("\n💥 Error Fatal:", err.message);
    }
}

main();
