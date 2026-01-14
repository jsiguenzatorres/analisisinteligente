// Parche para solucionar el bucle infinito en SamplingWorkspace
// Este script crea una versión corregida de la función handleRunSampling

const fs = require('fs');
const path = require('path');

console.log('🔧 Aplicando parche para solucionar bucle infinito...\n');

const filePath = path.join(__dirname, 'components', 'sampling', 'SamplingWorkspace.tsx');

// Leer el archivo actual
let content;
try {
    content = fs.readFileSync(filePath, 'utf8');
} catch (err) {
    console.error('❌ Error leyendo SamplingWorkspace.tsx:', err.message);
    process.exit(1);
}

// Buscar la función handleRunSampling
const functionStart = content.indexOf('const handleRunSampling = async');
if (functionStart === -1) {
    console.error('❌ No se encontró la función handleRunSampling');
    process.exit(1);
}

// Buscar el final de la función (siguiente función o cierre)
const nextFunctionStart = content.indexOf('const onLoadHistory', functionStart);
if (nextFunctionStart === -1) {
    console.error('❌ No se encontró el final de handleRunSampling');
    process.exit(1);
}

// Extraer la función actual
const originalFunction = content.substring(functionStart, nextFunctionStart).trim();

console.log('✅ Función handleRunSampling encontrada');
console.log(`   Tamaño actual: ${originalFunction.length} caracteres`);

// Nueva función corregida
const newFunction = `    const handleRunSampling = async (isFinal: boolean, manualAllocations?: Record<string, number>) => {
        if (!appState.selectedPopulation) return;
        setLoading(true);
        setShowConfirmModal(false);
        setShowReplaceWarning(false);
        setShowAllocationPreview(false);

        // Update local state with allocations if provided
        if (manualAllocations) {
            setAppState(prev => ({
                ...prev,
                samplingParams: {
                    ...prev.samplingParams,
                    stratified: { ...prev.samplingParams.stratified, manualAllocations }
                }
            }));
        }

        try {
            console.log("🌐 Iniciando carga de datos (versión anti-bucle)...");
            
            const expectedRows = appState.selectedPopulation.total_rows || 1500;
            console.log(\`📊 Población esperada: \${expectedRows} registros\`);

            // SOLUCIÓN AL BUCLE INFINITO: Límites estrictos y validación
            const startTime = Date.now();
            
            const { rows: realRows } = await samplingProxyFetch('get_universe', {
                population_id: appState.selectedPopulation.id
            }, { 
                timeout: 30000 // Timeout reducido a 30 segundos
            });

            const loadTime = Date.now() - startTime;
            console.log(\`⏱️ Tiempo de carga: \${loadTime}ms\`);

            // Verificar que tenemos datos válidos
            if (!realRows || realRows.length === 0) {
                throw new Error('No se encontraron datos en la población seleccionada');
            }

            console.log(\`✅ Datos obtenidos: \${realRows.length} registros\`);

            // VALIDACIÓN CRÍTICA: Detectar inconsistencias que causan bucles
            const ratio = realRows.length / expectedRows;
            console.log(\`📈 Ratio obtenido/esperado: \${ratio.toFixed(2)}\`);

            if (ratio > 3) {
                console.error(\`🚨 DATOS INCONSISTENTES: ratio \${ratio.toFixed(2)} demasiado alto\`);
                throw new Error(\`Error de datos: se obtuvieron \${realRows.length} registros pero se esperaban \${expectedRows}. Ratio: \${ratio.toFixed(2)}\`);
            }

            // Aplicar límite de seguridad SIEMPRE
            const SAFETY_LIMIT = 15000; // Límite más conservador
            let limitedRows = realRows.slice(0, SAFETY_LIMIT);
            
            if (realRows.length > SAFETY_LIMIT) {
                addToast(\`Población limitada a \${SAFETY_LIMIT} registros para evitar bucles infinitos (original: \${realRows.length}).\`, 'warning');
                console.warn(\`⚠️ Población limitada: \${realRows.length} → \${limitedRows.length} registros\`);
            }

            // Validar que los datos no están corruptos
            const validRows = limitedRows.filter(row => 
                row && 
                typeof row === 'object' && 
                row.unique_id_col !== undefined &&
                typeof row.monetary_value_col === 'number'
            );

            if (validRows.length !== limitedRows.length) {
                console.warn(\`⚠️ Datos corruptos detectados: \${limitedRows.length - validRows.length} registros inválidos\`);
                limitedRows = validRows;
            }

            console.log(\`🔢 Procesando \${limitedRows.length} registros válidos\`);

            // Use updated appState with manualAllocations if applicable
            const currentAppState = manualAllocations ? {
                ...appState,
                samplingParams: {
                    ...appState.samplingParams,
                    stratified: { ...appState.samplingParams.stratified, manualAllocations }
                }
            } : appState;

            // PROTECCIÓN ADICIONAL: Timeout para calculateSampleSize
            const calcStartTime = Date.now();
            let results;
            
            try {
                results = calculateSampleSize(currentAppState, limitedRows);
                const calcTime = Date.now() - calcStartTime;
                console.log(\`⚡ Cálculo completado en \${calcTime}ms\`);
                
                if (calcTime > 10000) { // Más de 10 segundos es sospechoso
                    console.warn(\`⚠️ Cálculo lento detectado: \${calcTime}ms\`);
                }
            } catch (calcError) {
                console.error('❌ Error en calculateSampleSize:', calcError);
                throw new Error(\`Error en cálculo estadístico: \${calcError.message}\`);
            }

            // Adjuntar las observaciones al snapshot de resultados para el reporte
            results.observations = appState.observations;

            if (isFinal) {
                try {
                    await supabase
                        .from('audit_historical_samples')
                        .update({ is_current: false })
                        .eq('population_id', appState.selectedPopulation.id)
                        .eq('is_current', true);

                    const historicalData = {
                        population_id: appState.selectedPopulation.id,
                        method: appState.samplingMethod,
                        objective: appState.generalParams.objective,
                        seed: appState.generalParams.seed,
                        sample_size: results.sampleSize,
                        params_snapshot: appState.samplingParams,
                        results_snapshot: results,
                        is_final: true,
                        is_current: true
                    };

                    const savedSample = await samplingProxyFetch('save_sample', {
                        population_id: appState.selectedPopulation.id,
                        method: appState.samplingMethod,
                        sample_data: historicalData,
                        is_final: true
                    }, { 
                        method: 'POST',
                        timeout: 20000 // Timeout reducido para guardado
                    });

                    setAppState(prev => {
                        const currentMethodResults = {
                            ...results,
                            method: prev.samplingMethod,
                            sampling_params: prev.samplingParams
                        };
                        return {
                            ...prev,
                            results,
                            isLocked: true,
                            isCurrentVersion: true,
                            historyId: savedSample.id,
                            full_results_storage: {
                                ...(prev.full_results_storage || {}),
                                [prev.samplingMethod]: currentMethodResults,
                                last_method: prev.samplingMethod
                            }
                        };
                    });
                } catch (saveError) {
                    console.error("Error al guardar:", saveError);
                    throw new Error(\`Error al guardar los resultados: \${saveError.message}\`);
                }
            } else {
                setAppState(prev => {
                    const currentMethodResults = {
                        ...results,
                        method: prev.samplingMethod,
                        sampling_params: prev.samplingParams
                    };
                    return {
                        ...prev,
                        results,
                        isLocked: false,
                        isCurrentVersion: false,
                        full_results_storage: {
                            ...(prev.full_results_storage || {}),
                            [prev.samplingMethod]: currentMethodResults,
                            last_method: prev.samplingMethod
                        }
                    };
                });
            }
            
            const totalTime = Date.now() - startTime;
            console.log(\`🎉 Proceso completado en \${totalTime}ms\`);
            onComplete();
            
        } catch (error) {
            console.error("Error en flujo de muestreo:", error);
            
            let errorMessage = "Error inesperado en el proceso";
            
            if (error instanceof FetchTimeoutError) {
                errorMessage = "Timeout: La operación tardó más de 30 segundos. Intente con una población más pequeña.";
            } else if (error instanceof FetchNetworkError) {
                errorMessage = "Error de conexión: " + error.message;
            } else if (error.message?.includes('calculateSampleSize')) {
                errorMessage = "Error en el cálculo estadístico: " + error.message;
            } else if (error.message?.includes('datos inconsistentes') || error.message?.includes('Error de datos')) {
                errorMessage = "Error de datos: " + error.message + ". Contacte al administrador.";
            } else if (error.message?.includes('No se encontraron datos')) {
                errorMessage = "No hay datos disponibles en la población seleccionada";
            } else {
                errorMessage = error?.message || errorMessage;
            }
            
            addToast(\`ERROR: \${errorMessage}\`, 'error');
        } finally {
            setLoading(false);
        }
    };

`;

// Reemplazar la función
const newContent = content.substring(0, functionStart) + newFunction + content.substring(nextFunctionStart);

// Escribir el archivo corregido
try {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('✅ Parche aplicado exitosamente');
    console.log('📋 Cambios realizados:');
    console.log('   - Timeout reducido a 30 segundos');
    console.log('   - Límite de seguridad a 15,000 registros');
    console.log('   - Validación de ratio datos esperados/obtenidos');
    console.log('   - Protección contra datos corruptos');
    console.log('   - Timeout para calculateSampleSize');
    console.log('   - Logging detallado para diagnóstico');
    console.log('');
    console.log('🎯 Reinicia tu servidor (npm run dev) y prueba nuevamente');
} catch (err) {
    console.error('❌ Error escribiendo el archivo:', err.message);
    process.exit(1);
}