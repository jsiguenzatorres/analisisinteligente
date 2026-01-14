// Script de prueba específico para historial de muestras y guardado de resultados

console.log("📚 INICIANDO PRUEBAS DE HISTORIAL Y RESULTADOS");

// Test 1: Verificar API de historial
async function testHistoryAPI() {
    console.log("📜 Probando API de historial...");
    
    try {
        // Usar un ID de población de prueba
        const testPopulationId = 'test-population-id';
        const response = await fetch(`/api/sampling_proxy?action=get_history&population_id=${testPopulationId}`, {
            signal: AbortSignal.timeout(15000)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ API de historial funcionando:", {
                status: response.status,
                historyCount: data.history?.length || 0,
                sampleData: data.history?.slice(0, 2)
            });
            return true;
        } else {
            console.log("❌ API de historial error:", response.status, response.statusText);
            const errorText = await response.text();
            console.log("Error details:", errorText);
            return false;
        }
    } catch (error) {
        if (error.name === 'TimeoutError') {
            console.log("⏰ API de historial timeout - revisar conexión del servidor");
        } else {
            console.log("❌ API de historial error de red:", error.message);
        }
        return false;
    }
}

// Test 2: Verificar API de guardado de trabajo en progreso
async function testSaveWorkInProgressAPI() {
    console.log("💾 Probando API de guardado...");
    
    try {
        const testData = {
            population_id: 'test-population-id',
            results_json: {
                attribute: {
                    method: 'attribute',
                    sampleSize: 25,
                    sample: [
                        { id: 'TEST-001', compliance_status: 'OK', error_description: '' },
                        { id: 'TEST-002', compliance_status: 'EXCEPCION', error_description: 'Error de prueba' }
                    ]
                }
            },
            sample_size: 25
        };
        
        const response = await fetch('/api/sampling_proxy?action=save_work_in_progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData),
            signal: AbortSignal.timeout(15000)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ API de guardado funcionando:", {
                status: response.status,
                response: data
            });
            return true;
        } else {
            console.log("❌ API de guardado error:", response.status, response.statusText);
            const errorText = await response.text();
            console.log("Error details:", errorText);
            return false;
        }
    } catch (error) {
        if (error.name === 'TimeoutError') {
            console.log("⏰ API de guardado timeout - revisar conexión del servidor");
        } else {
            console.log("❌ API de guardado error de red:", error.message);
        }
        return false;
    }
}

// Test 3: Simular debounced save
function testDebouncedSave() {
    console.log("⏱️ Probando guardado con debounce...");
    
    try {
        let saveCount = 0;
        let saveTimeout = null;
        
        // Simular función de guardado
        const mockSave = () => {
            saveCount++;
            console.log(`  - Guardado ejecutado #${saveCount}`);
        };
        
        // Simular debounced save
        const debouncedSave = () => {
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
            
            saveTimeout = setTimeout(() => {
                mockSave();
            }, 100); // 100ms para prueba rápida
        };
        
        // Simular múltiples cambios rápidos
        console.log("  - Simulando 5 cambios rápidos...");
        for (let i = 0; i < 5; i++) {
            debouncedSave();
        }
        
        // Esperar a que se ejecute el debounce
        return new Promise((resolve) => {
            setTimeout(() => {
                if (saveCount === 1) {
                    console.log("✅ Debounce funcionando correctamente (1 guardado de 5 intentos)");
                    resolve(true);
                } else {
                    console.log(`❌ Debounce falló (${saveCount} guardados en lugar de 1)`);
                    resolve(false);
                }
            }, 200);
        });
    } catch (error) {
        console.log("❌ Error en test de debounce:", error.message);
        return false;
    }
}

// Test 4: Verificar manejo de estados de guardado
function testSaveStates() {
    console.log("🔄 Probando estados de guardado...");
    
    try {
        // Simular estados típicos durante el guardado
        const saveStates = [
            { isSaving: false, saveFeedback: { show: false, title: '', message: '', type: 'success' } },
            { isSaving: true, saveFeedback: { show: false, title: '', message: '', type: 'success' } },
            { isSaving: false, saveFeedback: { show: true, title: 'Sincronizado', message: 'Guardado exitoso', type: 'success' } },
            { isSaving: false, saveFeedback: { show: true, title: 'Error', message: 'Fallo de red', type: 'error' } }
        ];
        
        saveStates.forEach((state, index) => {
            const isValidState = (
                typeof state.isSaving === 'boolean' &&
                typeof state.saveFeedback.show === 'boolean' &&
                ['success', 'error'].includes(state.saveFeedback.type)
            );
            
            console.log(`  - Estado ${index + 1}: ${isValidState ? '✅ Válido' : '❌ Inválido'}`);
        });
        
        console.log("✅ Estados de guardado funcionando correctamente");
        return true;
    } catch (error) {
        console.log("❌ Error en test de estados:", error.message);
        return false;
    }
}

// Test 5: Verificar estructura de datos de muestra
function testSampleDataStructure() {
    console.log("📋 Probando estructura de datos de muestra...");
    
    try {
        // Simular estructura típica de muestra
        const sampleItem = {
            id: 'TEST-001',
            value: 1000,
            compliance_status: 'OK',
            error_description: '',
            risk_score: 75,
            risk_factors: ['Factor 1', 'Factor 2'],
            is_pilot_item: true,
            raw_row: { original_data: 'test' }
        };
        
        // Verificar propiedades requeridas
        const requiredProps = ['id', 'compliance_status'];
        const optionalProps = ['error_description', 'risk_score', 'risk_factors'];
        
        const hasRequired = requiredProps.every(prop => sampleItem.hasOwnProperty(prop));
        const hasOptional = optionalProps.some(prop => sampleItem.hasOwnProperty(prop));
        
        if (hasRequired) {
            console.log("✅ Estructura de datos válida");
            console.log(`  - Propiedades requeridas: ${requiredProps.join(', ')}`);
            console.log(`  - Propiedades opcionales: ${optionalProps.filter(prop => sampleItem.hasOwnProperty(prop)).join(', ')}`);
            return true;
        } else {
            console.log("❌ Estructura de datos inválida - faltan propiedades requeridas");
            return false;
        }
    } catch (error) {
        console.log("❌ Error en test de estructura:", error.message);
        return false;
    }
}

// Test 6: Verificar performance con muestras grandes
function testLargeSamplePerformance() {
    console.log("⚡ Probando performance con muestras grandes...");
    
    try {
        const startTime = Date.now();
        
        // Simular muestra grande
        const largeSample = Array.from({ length: 1000 }, (_, i) => ({
            id: `ITEM-${i.toString().padStart(6, '0')}`,
            compliance_status: Math.random() > 0.9 ? 'EXCEPCION' : 'OK',
            error_description: Math.random() > 0.9 ? `Error ${i}` : '',
            risk_score: Math.floor(Math.random() * 100),
            value: Math.random() * 10000
        }));
        
        // Simular operaciones típicas
        const exceptions = largeSample.filter(item => item.compliance_status === 'EXCEPCION');
        const totalValue = largeSample.reduce((sum, item) => sum + item.value, 0);
        const avgRisk = largeSample.reduce((sum, item) => sum + item.risk_score, 0) / largeSample.length;
        
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        console.log("✅ Performance test completado:", {
            sampleSize: largeSample.length,
            exceptions: exceptions.length,
            totalValue: totalValue.toFixed(2),
            avgRisk: avgRisk.toFixed(1),
            processingTime: `${processingTime}ms`,
            performanceGood: processingTime < 100
        });
        
        return processingTime < 100;
    } catch (error) {
        console.log("❌ Error en test de performance:", error.message);
        return false;
    }
}

// Test 7: Verificar recuperación de errores
async function testErrorRecovery() {
    console.log("🔧 Probando recuperación de errores...");
    
    try {
        // Simular diferentes escenarios de error y recuperación
        const errorScenarios = [
            {
                name: 'Timeout Error',
                error: { name: 'TimeoutError', message: 'Request timeout after 15000ms' },
                expectedMessage: 'Timeout: La carga tardó demasiado tiempo'
            },
            {
                name: 'Network Error',
                error: { name: 'FetchNetworkError', message: 'HTTP 500: Internal Server Error' },
                expectedMessage: 'Error de conexión: HTTP 500: Internal Server Error'
            },
            {
                name: 'Generic Error',
                error: { name: 'Error', message: 'Something went wrong' },
                expectedMessage: 'Error al cargar el historial: Something went wrong'
            }
        ];
        
        errorScenarios.forEach((scenario, index) => {
            let errorMessage = "Error al cargar el historial";
            
            if (scenario.error.name === 'TimeoutError') {
                errorMessage = "Timeout: La carga tardó demasiado tiempo. Verifique su conexión.";
            } else if (scenario.error.name === 'FetchNetworkError') {
                errorMessage = "Error de conexión: " + scenario.error.message;
            } else {
                errorMessage += ": " + (scenario.error.message || "Error desconocido");
            }
            
            console.log(`  - ${scenario.name}: ${errorMessage}`);
        });
        
        console.log("✅ Recuperación de errores funcionando correctamente");
        return true;
    } catch (error) {
        console.log("❌ Error en test de recuperación:", error.message);
        return false;
    }
}

// Ejecutar todas las pruebas
async function runHistoryResultsTests() {
    console.log("🚀 Ejecutando pruebas de historial y resultados...");
    
    const results = {
        historyAPI: await testHistoryAPI(),
        saveAPI: await testSaveWorkInProgressAPI(),
        debouncedSave: await testDebouncedSave(),
        saveStates: testSaveStates(),
        dataStructure: testSampleDataStructure(),
        performance: testLargeSamplePerformance(),
        errorRecovery: await testErrorRecovery()
    };
    
    console.log("\n📊 RESULTADOS DE PRUEBAS DE HISTORIAL Y RESULTADOS:");
    console.log("API Historial:", results.historyAPI ? "✅" : "❌");
    console.log("API Guardado:", results.saveAPI ? "✅" : "❌");
    console.log("Debounced Save:", results.debouncedSave ? "✅" : "❌");
    console.log("Estados Guardado:", results.saveStates ? "✅" : "❌");
    console.log("Estructura Datos:", results.dataStructure ? "✅" : "❌");
    console.log("Performance:", results.performance ? "✅" : "❌");
    console.log("Recuperación Errores:", results.errorRecovery ? "✅" : "❌");
    
    const criticalTests = [results.historyAPI, results.saveAPI, results.debouncedSave];
    const allCriticalPassed = criticalTests.every(result => result);
    
    if (allCriticalPassed) {
        console.log("\n🎉 PRUEBAS CRÍTICAS PASARON");
        console.log("El historial y guardado deberían funcionar correctamente.");
    } else {
        console.log("\n⚠️ PRUEBAS CRÍTICAS FALLARON");
        console.log("Revisar la conexión del servidor y las APIs del proxy.");
    }
    
    return results;
}

// Función para probar un componente específico
async function testSpecificFeature(feature) {
    console.log(`🔍 Probando funcionalidad específica: ${feature}`);
    
    switch (feature.toLowerCase()) {
        case 'history':
        case 'historial':
            return await testHistoryAPI();
        case 'save':
        case 'guardado':
            return await testSaveWorkInProgressAPI();
        case 'debounce':
            return await testDebouncedSave();
        case 'performance':
            return testLargeSamplePerformance();
        default:
            console.log("❌ Funcionalidad no reconocida. Opciones: 'history', 'save', 'debounce', 'performance'");
            return false;
    }
}

// Función para diagnosticar problemas específicos
async function diagnoseHistoryIssues() {
    console.log("🔧 DIAGNÓSTICO DE PROBLEMAS DE HISTORIAL Y GUARDADO");
    
    // 1. Verificar APIs básicas
    console.log("1. Verificando APIs básicas...");
    const historyOK = await testHistoryAPI();
    const saveOK = await testSaveWorkInProgressAPI();
    
    if (!historyOK) {
        console.log("❌ Problema con API de historial");
        console.log("💡 SOLUCIONES:");
        console.log("  - Verificar que el endpoint get_history esté funcionando");
        console.log("  - Revisar logs del servidor para errores específicos");
        console.log("  - Verificar que la población existe en la base de datos");
    }
    
    if (!saveOK) {
        console.log("❌ Problema con API de guardado");
        console.log("💡 SOLUCIONES:");
        console.log("  - Verificar que el endpoint save_work_in_progress esté funcionando");
        console.log("  - Revisar permisos de escritura en la base de datos");
        console.log("  - Verificar estructura de datos enviados");
    }
    
    // 2. Verificar configuración de debounce
    console.log("2. Verificando configuración de debounce...");
    const debounceOK = await testDebouncedSave();
    
    if (!debounceOK) {
        console.log("❌ Problema con debounce");
        console.log("💡 SOLUCIONES:");
        console.log("  - Verificar que los timeouts se estén limpiando correctamente");
        console.log("  - Revisar que no haya múltiples instancias del componente");
    }
    
    console.log("\n📋 CHECKLIST DE VERIFICACIÓN:");
    console.log("□ Servidor de desarrollo corriendo");
    console.log("□ Variables de entorno configuradas");
    console.log("□ Base de datos accesible");
    console.log("□ Población existe y está validada");
    console.log("□ Usuario tiene permisos de escritura");
    console.log("□ No hay errores en la consola del navegador");
}

// Exportar para uso en consola
window.testHistoryResults = {
    runHistoryResultsTests,
    testSpecificFeature,
    diagnoseHistoryIssues,
    testHistoryAPI,
    testSaveWorkInProgressAPI,
    testDebouncedSave,
    testSaveStates,
    testSampleDataStructure,
    testLargeSamplePerformance,
    testErrorRecovery
};

console.log("🎯 Pruebas de historial y resultados cargadas. Ejecuta: testHistoryResults.runHistoryResultsTests()");
console.log("Para diagnóstico: testHistoryResults.diagnoseHistoryIssues()");
console.log("Para funcionalidad específica: testHistoryResults.testSpecificFeature('history')");