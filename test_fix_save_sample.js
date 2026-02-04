/**
 * 🧪 PRUEBA DEL FIX: Botón "Bloquear como Papel de Trabajo"
 * 
 * Este script prueba el fix aplicado al problema del guardado de muestras.
 * 
 * INSTRUCCIONES:
 * 1. Cargar una población en la aplicación
 * 2. Configurar cualquier método de muestreo
 * 3. Abrir DevTools (F12) -> Console
 * 4. Pegar este código y presionar Enter
 * 5. Hacer clic en "Bloquear como Papel de Trabajo"
 * 6. Observar los logs detallados
 */

console.log('🧪 INICIANDO PRUEBA DEL FIX: Guardado de muestras');
console.log('='.repeat(50));

// Función para monitorear el comportamiento del botón
function monitorSaveButton() {
    console.log('👀 Monitoreando botón "Bloquear como Papel de Trabajo"...');
    
    // Interceptar todas las llamadas a samplingProxyFetch
    if (window.samplingProxyFetch) {
        const originalSamplingProxyFetch = window.samplingProxyFetch;
        
        window.samplingProxyFetch = function(action, data, options) {
            if (action === 'save_sample') {
                console.log('🎯 INTERCEPTADO: Llamada a save_sample');
                console.log('📤 Datos enviados:', {
                    action,
                    population_id: data.population_id,
                    method: data.method,
                    is_final: data.is_final,
                    sample_size: data.sample_data?.sample_size,
                    timestamp: new Date().toLocaleTimeString()
                });
                
                const startTime = Date.now();
                
                return originalSamplingProxyFetch.call(this, action, data, options)
                    .then(result => {
                        const duration = Date.now() - startTime;
                        console.log('✅ SAVE_SAMPLE EXITOSO:', {
                            duration: duration + 'ms',
                            result_id: result?.id,
                            result_type: typeof result,
                            timestamp: new Date().toLocaleTimeString()
                        });
                        
                        // Verificar la estructura de la respuesta
                        if (result && result.id) {
                            console.log('✅ Respuesta válida con ID:', result.id);
                            
                            if (result.id.startsWith('temp-')) {
                                console.log('⚠️ ID temporal detectado - guardado solo en memoria');
                            } else {
                                console.log('✅ ID persistente - guardado en base de datos');
                            }
                        } else {
                            console.log('⚠️ Respuesta sin ID válido');
                        }
                        
                        return result;
                    })
                    .catch(error => {
                        const duration = Date.now() - startTime;
                        console.error('❌ SAVE_SAMPLE FALLÓ:', {
                            duration: duration + 'ms',
                            error: error.message,
                            error_type: error.constructor.name,
                            timestamp: new Date().toLocaleTimeString()
                        });
                        
                        // Análisis del error
                        if (error.message.includes('RLS') || error.message.includes('permission')) {
                            console.log('💡 ANÁLISIS: Error de permisos RLS');
                            console.log('🔧 ACCIÓN: El fix debería manejar esto y continuar');
                        } else if (error.message.includes('timeout')) {
                            console.log('💡 ANÁLISIS: Timeout en la operación');
                            console.log('🔧 ACCIÓN: El fix debería manejar esto y continuar');
                        } else if (error.message.includes('network')) {
                            console.log('💡 ANÁLISIS: Error de red');
                            console.log('🔧 ACCIÓN: El fix debería manejar esto y continuar');
                        }
                        
                        throw error;
                    });
            }
            
            return originalSamplingProxyFetch.call(this, action, data, options);
        };
        
        console.log('✅ Interceptor de samplingProxyFetch configurado');
    } else {
        console.log('⚠️ samplingProxyFetch no disponible - el interceptor no se pudo configurar');
    }
}

// Función para monitorear cambios en el estado de la aplicación
function monitorAppState() {
    console.log('📊 Monitoreando cambios en el estado de la aplicación...');
    
    // Interceptar llamadas a setAppState (esto es más complejo en React)
    // Por ahora, monitoreamos cambios en localStorage
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        if (key.includes('SKIP_SAVE_MODE') || key.includes('EMERGENCY')) {
            console.log('🔧 CAMBIO EN CONFIGURACIÓN:', {
                key,
                value,
                timestamp: new Date().toLocaleTimeString()
            });
        }
        return originalSetItem.call(this, key, value);
    };
    
    console.log('✅ Monitor de localStorage configurado');
}

// Función para verificar el estado actual del sistema
function checkCurrentState() {
    console.log('🔍 VERIFICANDO ESTADO ACTUAL:');
    
    // Verificar modo emergencia
    const skipSaveMode = localStorage.getItem('SKIP_SAVE_MODE');
    console.log('🚨 Modo emergencia:', skipSaveMode === 'true' ? 'ACTIVO' : 'Inactivo');
    
    // Verificar población seleccionada
    const hasPopulation = document.querySelector('[data-testid="population"]') || 
                         document.querySelector('.selected-population') ||
                         document.querySelector('.population-info');
    console.log('📊 Población detectada:', !!hasPopulation);
    
    // Verificar botones de guardado
    const buttons = Array.from(document.querySelectorAll('button'));
    const saveButtons = buttons.filter(btn => 
        btn.textContent && btn.textContent.toLowerCase().includes('bloquear')
    );
    console.log('🔒 Botones "Bloquear" encontrados:', saveButtons.length);
    
    if (saveButtons.length > 0) {
        saveButtons.forEach((btn, index) => {
            console.log(`   Botón ${index + 1}:`, {
                text: btn.textContent.trim().substring(0, 50),
                disabled: btn.disabled,
                visible: btn.offsetParent !== null
            });
        });
    }
    
    // Verificar funciones disponibles
    console.log('🛠️ Funciones disponibles:');
    console.log('   - samplingProxyFetch:', typeof window.samplingProxyFetch);
    console.log('   - addToast:', typeof window.addToast);
    console.log('   - supabase:', typeof window.supabase);
}

// Función para simular el proceso de guardado
async function simulateSaveProcess() {
    console.log('🎭 SIMULANDO PROCESO DE GUARDADO...');
    
    if (!window.samplingProxyFetch) {
        console.log('❌ samplingProxyFetch no disponible - no se puede simular');
        return;
    }
    
    const testData = {
        population_id: 'test-simulation-' + Date.now(),
        method: 'NonStatistical',
        sample_data: {
            objective: 'Simulación de prueba - ' + new Date().toLocaleString(),
            seed: 12345,
            sample_size: 5,
            params_snapshot: { test: true },
            results_snapshot: { test: true }
        },
        is_final: false // Usar false para simulación
    };
    
    try {
        console.log('📤 Enviando datos de simulación...');
        const result = await window.samplingProxyFetch('save_sample', testData);
        console.log('✅ Simulación exitosa:', result);
        return true;
    } catch (error) {
        console.error('❌ Error en simulación:', error.message);
        return false;
    }
}

// Función principal de prueba
async function runFullTest() {
    console.log('🚀 EJECUTANDO PRUEBA COMPLETA...');
    
    // 1. Verificar estado actual
    checkCurrentState();
    
    // 2. Configurar monitores
    monitorSaveButton();
    monitorAppState();
    
    // 3. Simular guardado
    const simulationSuccess = await simulateSaveProcess();
    
    // 4. Generar reporte
    console.log('\n📋 REPORTE DE PRUEBA:');
    console.log('='.repeat(30));
    console.log('🕐 Timestamp:', new Date().toLocaleString());
    console.log('🎭 Simulación exitosa:', simulationSuccess ? 'SÍ' : 'NO');
    console.log('🚨 Modo emergencia:', localStorage.getItem('SKIP_SAVE_MODE') === 'true' ? 'ACTIVO' : 'Inactivo');
    
    console.log('\n🎯 PRÓXIMOS PASOS:');
    if (simulationSuccess) {
        console.log('✅ El sistema parece funcionar correctamente');
        console.log('💡 Intente usar el botón "Bloquear como Papel de Trabajo" en la aplicación');
    } else {
        console.log('⚠️ La simulación falló');
        console.log('💡 Considere activar el modo emergencia: localStorage.setItem("SKIP_SAVE_MODE", "true")');
    }
    
    console.log('\n📞 PARA SOPORTE:');
    console.log('- Copie todos los logs de esta consola');
    console.log('- Incluya screenshots del error específico');
    console.log('- Mencione los pasos exactos que siguió');
}

// Ejecutar automáticamente
setTimeout(runFullTest, 1000);

// Exponer funciones para uso manual
window.monitorSaveButton = monitorSaveButton;
window.simulateSaveProcess = simulateSaveProcess;
window.checkCurrentState = checkCurrentState;
window.runFullTest = runFullTest;

console.log('🎯 PRUEBA DEL FIX CARGADA');
console.log('💡 Funciones disponibles:');
console.log('  - runFullTest()');
console.log('  - simulateSaveProcess()');
console.log('  - checkCurrentState()');
console.log('  - monitorSaveButton()');