/**
 * 🧪 PRUEBA ESPECÍFICA: Endpoint save_sample
 * 
 * Este script prueba directamente el endpoint save_sample para verificar si funciona.
 * 
 * INSTRUCCIONES:
 * 1. Asegúrese de tener una población cargada en la aplicación
 * 2. Abrir DevTools (F12) -> Console
 * 3. Pegar este código y presionar Enter
 * 4. El script probará el endpoint automáticamente
 */

async function testSaveSampleEndpoint() {
    console.log('🧪 INICIANDO PRUEBA DEL ENDPOINT save_sample');
    console.log('='.repeat(50));
    
    try {
        // 1. Verificar si samplingProxyFetch está disponible
        if (typeof window.samplingProxyFetch === 'undefined') {
            console.error('❌ samplingProxyFetch no está disponible en window');
            console.log('💡 Intentando importar desde fetchUtils...');
            
            // Intentar acceder a través del módulo
            const fetchUtilsModule = await import('/services/fetchUtils.ts');
            if (fetchUtilsModule && fetchUtilsModule.samplingProxyFetch) {
                window.samplingProxyFetch = fetchUtilsModule.samplingProxyFetch;
                console.log('✅ samplingProxyFetch importado exitosamente');
            } else {
                throw new Error('No se pudo importar samplingProxyFetch');
            }
        }
        
        // 2. Crear datos de prueba
        const testData = {
            population_id: 'test-population-' + Date.now(),
            method: 'NonStatistical',
            sample_data: {
                objective: 'Prueba de endpoint save_sample',
                seed: 12345,
                sample_size: 10,
                params_snapshot: {
                    nonStatistical: {
                        insight: 'RiskScoring',
                        sampleSize: 10
                    }
                },
                results_snapshot: {
                    sampleSize: 10,
                    sample: [
                        { id: 'test-1', value: 1000, risk_score: 0.8 },
                        { id: 'test-2', value: 2000, risk_score: 0.7 }
                    ],
                    totalValue: 3000,
                    coverage: 0.1
                }
            },
            is_final: false // Usar false para prueba
        };
        
        console.log('📤 Enviando datos de prueba:', testData);
        
        // 3. Realizar la llamada al endpoint
        const startTime = Date.now();
        const response = await window.samplingProxyFetch('save_sample', testData);
        const duration = Date.now() - startTime;
        
        console.log('✅ RESPUESTA EXITOSA:');
        console.log('   Duración:', duration + 'ms');
        console.log('   Respuesta:', response);
        
        // 4. Verificar la estructura de la respuesta
        if (response && response.id) {
            console.log('✅ Respuesta válida con ID:', response.id);
        } else {
            console.warn('⚠️ Respuesta sin ID válido');
        }
        
        console.log('🎉 PRUEBA COMPLETADA EXITOSAMENTE');
        return { success: true, response, duration };
        
    } catch (error) {
        console.error('❌ ERROR EN LA PRUEBA:');
        console.error('   Mensaje:', error.message);
        console.error('   Stack:', error.stack);
        
        // Análisis específico del error
        if (error.message.includes('Missing required fields')) {
            console.log('💡 DIAGNÓSTICO: Faltan campos requeridos en la petición');
        } else if (error.message.includes('fetch')) {
            console.log('💡 DIAGNÓSTICO: Error de red o conectividad');
        } else if (error.message.includes('RLS') || error.message.includes('permission')) {
            console.log('💡 DIAGNÓSTICO: Problema de permisos en Supabase (RLS)');
        } else if (error.message.includes('timeout')) {
            console.log('💡 DIAGNÓSTICO: Timeout en la operación');
        }
        
        return { success: false, error: error.message };
    }
}

// Función para probar con datos reales de la aplicación
async function testWithRealData() {
    console.log('🔍 INTENTANDO USAR DATOS REALES DE LA APLICACIÓN...');
    
    try {
        // Intentar obtener el estado de la aplicación desde React
        const reactFiberKey = Object.keys(document.querySelector('#root')).find(key => 
            key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')
        );
        
        if (reactFiberKey) {
            console.log('⚛️ React detectado, intentando obtener estado...');
            // Esto es complejo y puede no funcionar en todas las versiones de React
            console.log('💡 Para usar datos reales, ejecute la prueba desde dentro de la aplicación');
        }
        
        // Alternativa: buscar datos en localStorage
        const populationData = localStorage.getItem('selectedPopulation');
        if (populationData) {
            console.log('📊 Datos de población encontrados en localStorage');
            const population = JSON.parse(populationData);
            console.log('   ID de población:', population.id);
            
            // Usar datos reales para la prueba
            const realTestData = {
                population_id: population.id,
                method: 'NonStatistical',
                sample_data: {
                    objective: 'Prueba con datos reales - ' + new Date().toLocaleString(),
                    seed: Math.floor(Math.random() * 10000),
                    sample_size: 5,
                    params_snapshot: {
                        nonStatistical: {
                            insight: 'RiskScoring',
                            sampleSize: 5
                        }
                    },
                    results_snapshot: {
                        sampleSize: 5,
                        sample: [],
                        totalValue: 0,
                        coverage: 0
                    }
                },
                is_final: false
            };
            
            console.log('📤 Probando con datos reales...');
            return await window.samplingProxyFetch('save_sample', realTestData);
        }
        
        console.log('⚠️ No se encontraron datos reales, usando datos de prueba');
        return await testSaveSampleEndpoint();
        
    } catch (error) {
        console.error('❌ Error al usar datos reales:', error);
        return await testSaveSampleEndpoint();
    }
}

// Ejecutar la prueba automáticamente
console.log('🚀 Iniciando prueba automática en 2 segundos...');
setTimeout(async () => {
    const result = await testSaveSampleEndpoint();
    
    if (result.success) {
        console.log('🎯 CONCLUSIÓN: El endpoint save_sample FUNCIONA correctamente');
        console.log('💡 Si el botón sigue sin funcionar, el problema está en la UI o en el flujo de datos');
    } else {
        console.log('🚨 CONCLUSIÓN: El endpoint save_sample tiene problemas');
        console.log('💡 Revisar configuración de Supabase y permisos RLS');
    }
    
    // Ofrecer prueba con datos reales
    console.log('');
    console.log('🔄 Para probar con datos reales, ejecute: testWithRealData()');
    window.testWithRealData = testWithRealData;
    
}, 2000);

// Exponer funciones para uso manual
window.testSaveSampleEndpoint = testSaveSampleEndpoint;
window.testWithRealData = testWithRealData;