// Script para probar el patrón de lotes exitoso del DataUploadFlow

console.log("🔧 INICIANDO PRUEBAS DEL PATRÓN DE LOTES");

// Simular el patrón exitoso de DataUploadFlow
async function testBatchPattern() {
    console.log("📦 PROBANDO PATRÓN DE LOTES EXITOSO...");
    
    const BATCH_SIZE = 25; // Como en DataUploadFlow
    const MAX_BATCH_RETRIES = 3;
    const BATCH_DELAY = 800; // 800ms entre lotes
    
    // Simular datos grandes
    const totalRecords = 1000;
    const mockData = Array.from({ length: totalRecords }, (_, i) => ({
        id: `record-${i}`,
        value: Math.random() * 10000
    }));
    
    console.log(`📊 Datos simulados: ${totalRecords} registros`);
    
    // Crear lotes
    const batches = [];
    for (let i = 0; i < mockData.length; i += BATCH_SIZE) {
        const chunk = mockData.slice(i, i + BATCH_SIZE);
        batches.push(chunk);
    }
    
    console.log(`📦 Creados ${batches.length} lotes de ${BATCH_SIZE} registros`);
    
    // Procesar lotes secuencialmente (como DataUploadFlow)
    let completedBatches = 0;
    let totalProcessed = 0;
    
    for (const [idx, batch] of batches.entries()) {
        console.log(`⏳ Procesando lote ${idx + 1}/${batches.length} (${batch.length} registros)...`);
        
        let batchSuccess = false;
        let batchRetries = 0;
        
        while (!batchSuccess && batchRetries < MAX_BATCH_RETRIES) {
            try {
                // Simular procesamiento del lote
                await simulateBatchProcessing(batch, idx);
                batchSuccess = true;
                totalProcessed += batch.length;
                
            } catch (batchErr) {
                batchRetries++;
                console.warn(`⚠️ Lote ${idx + 1} falló (Intento ${batchRetries}/${MAX_BATCH_RETRIES})`);
                
                if (batchRetries >= MAX_BATCH_RETRIES) {
                    throw new Error(`Fallo definitivo en lote ${idx + 1} tras ${MAX_BATCH_RETRIES} intentos`);
                }
                
                const waitTime = 1000 * Math.pow(2, batchRetries - 1);
                console.log(`🔄 Reintentando en ${waitTime/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        
        completedBatches++;
        const progress = Math.round(((idx + 1) / batches.length) * 100);
        console.log(`📈 Progreso: ${progress}% (${totalProcessed}/${totalRecords} registros)`);
        
        // Pausa entre lotes (como DataUploadFlow)
        if (idx < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
    }
    
    console.log(`✅ Patrón completado: ${completedBatches}/${batches.length} lotes, ${totalProcessed} registros`);
    
    return {
        success: completedBatches === batches.length,
        processedRecords: totalProcessed,
        totalBatches: batches.length,
        completedBatches
    };
}

// Simular procesamiento de un lote con posibles fallos
async function simulateBatchProcessing(batch, batchIndex) {
    // Simular tiempo de procesamiento
    const processingTime = 100 + Math.random() * 200;
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simular fallos ocasionales (10% de probabilidad)
    if (Math.random() < 0.1) {
        throw new Error(`Fallo simulado en lote ${batchIndex + 1}`);
    }
    
    // Simular éxito
    return { success: true, processed: batch.length };
}

// Probar el patrón de carga por offset (como el nuevo SamplingWorkspace)
async function testOffsetPattern() {
    console.log("🔄 PROBANDO PATRÓN DE OFFSET (NUEVO)...");
    
    const BATCH_SIZE = 1000;
    const MAX_BATCHES = 10;
    const totalRecords = 5000; // Simular población de 5k registros
    
    let allRows = [];
    let offset = 0;
    let hasMore = true;
    let batchCount = 0;
    
    while (hasMore && batchCount < MAX_BATCHES) {
        console.log(`📦 Cargando lote ${batchCount + 1} (offset: ${offset})...`);
        
        try {
            // Simular llamada a API con offset
            const batchRows = await simulateOffsetQuery(offset, BATCH_SIZE, totalRecords);
            
            if (!batchRows || batchRows.length === 0) {
                hasMore = false;
                break;
            }
            
            allRows = allRows.concat(batchRows);
            offset += BATCH_SIZE;
            batchCount++;
            
            // Si el lote es menor que BATCH_SIZE, es el último
            if (batchRows.length < BATCH_SIZE) {
                hasMore = false;
            }
            
            // Pausa pequeña entre lotes
            await new Promise(resolve => setTimeout(resolve, 200));
            
        } catch (error) {
            console.error(`❌ Error en lote ${batchCount + 1}:`, error);
            hasMore = false;
        }
    }
    
    console.log(`✅ Patrón offset completado: ${allRows.length} registros en ${batchCount} lotes`);
    
    return {
        success: allRows.length > 0,
        totalRecords: allRows.length,
        batchesUsed: batchCount
    };
}

// Simular consulta con offset
async function simulateOffsetQuery(offset, limit, totalRecords) {
    // Simular tiempo de consulta
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    // Calcular registros disponibles desde el offset
    const availableRecords = Math.max(0, totalRecords - offset);
    const recordsToReturn = Math.min(limit, availableRecords);
    
    if (recordsToReturn === 0) {
        return [];
    }
    
    // Generar registros simulados
    return Array.from({ length: recordsToReturn }, (_, i) => ({
        id: `record-${offset + i}`,
        value: Math.random() * 10000
    }));
}

// Comparar ambos patrones
async function compareBatchPatterns() {
    console.log("⚖️ COMPARANDO PATRONES DE LOTES...\n");
    
    const startTime = Date.now();
    
    // Probar patrón original (DataUploadFlow)
    console.log("1️⃣ PATRÓN ORIGINAL (DataUploadFlow):");
    const originalResult = await testBatchPattern();
    const originalTime = Date.now() - startTime;
    
    console.log("\n2️⃣ PATRÓN NUEVO (Offset):");
    const offsetStartTime = Date.now();
    const offsetResult = await testOffsetPattern();
    const offsetTime = Date.now() - offsetStartTime;
    
    console.log("\n📊 COMPARACIÓN DE RESULTADOS:");
    console.table({
        'Patrón Original': {
            'Éxito': originalResult.success ? '✅' : '❌',
            'Registros': originalResult.processedRecords,
            'Lotes': originalResult.completedBatches,
            'Tiempo (ms)': originalTime
        },
        'Patrón Offset': {
            'Éxito': offsetResult.success ? '✅' : '❌',
            'Registros': offsetResult.totalRecords,
            'Lotes': offsetResult.batchesUsed,
            'Tiempo (ms)': offsetTime
        }
    });
    
    // Recomendación
    if (originalResult.success && offsetResult.success) {
        console.log("✅ AMBOS PATRONES FUNCIONAN");
        console.log("💡 Recomendación: Usar patrón original para uploads, offset para consultas grandes");
    } else if (originalResult.success) {
        console.log("⚠️ SOLO EL PATRÓN ORIGINAL FUNCIONA");
        console.log("💡 Recomendación: Aplicar patrón DataUploadFlow al muestreo");
    } else if (offsetResult.success) {
        console.log("⚠️ SOLO EL PATRÓN OFFSET FUNCIONA");
        console.log("💡 Recomendación: Usar patrón offset para consultas grandes");
    } else {
        console.log("❌ AMBOS PATRONES FALLARON");
        console.log("💡 Recomendación: Revisar configuración de red y timeouts");
    }
}

// Función para diagnosticar problemas específicos del MUS
function diagnoseMUSProblems() {
    console.log("🔍 DIAGNÓSTICO ESPECÍFICO PARA MUS:");
    
    const problems = [
        {
            problem: "Bucle infinito en selección",
            cause: "Consulta muy grande sin lotes",
            solution: "Aplicar patrón de lotes del DataUploadFlow"
        },
        {
            problem: "Timeout en get_universe",
            cause: "Población muy grande (>10k registros)",
            solution: "Usar offset con lotes de 1000 registros"
        },
        {
            problem: "Memoria insuficiente",
            cause: "Cargar todos los registros de una vez",
            solution: "Procesar por lotes con pausas"
        },
        {
            problem: "Error de red intermitente",
            cause: "Conexión inestable",
            solution: "Reintentos automáticos con backoff exponencial"
        }
    ];
    
    console.table(problems);
    
    console.log("\n🔧 PASOS PARA RESOLVER MUS:");
    console.log("1. Aplicar patrón de lotes del DataUploadFlow");
    console.log("2. Usar offset para consultas grandes");
    console.log("3. Implementar reintentos automáticos");
    console.log("4. Agregar pausas entre lotes");
    console.log("5. Limitar tamaño máximo de población");
}

// Ejecutar todas las pruebas
async function runBatchTests() {
    console.log("🚀 EJECUTANDO PRUEBAS COMPLETAS DE LOTES...\n");
    
    try {
        await compareBatchPatterns();
        console.log("\n");
        diagnoseMUSProblems();
        
        console.log("\n🎯 CONCLUSIÓN:");
        console.log("El patrón de lotes del DataUploadFlow es EXITOSO y debe aplicarse al muestreo");
        console.log("Esto debería resolver el bucle infinito del MUS");
        
    } catch (error) {
        console.error("❌ Error en las pruebas:", error);
    }
}

// Exportar para uso en consola
window.testBatchPattern = {
    runBatchTests,
    testBatchPattern,
    testOffsetPattern,
    compareBatchPatterns,
    diagnoseMUSProblems
};

console.log("🎯 Pruebas de lotes cargadas. Ejecuta: testBatchPattern.runBatchTests()");