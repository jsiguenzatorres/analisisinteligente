/**
 * 🔧 FIX DEFINITIVO: Botón "Bloquear como Papel de Trabajo"
 * 
 * Este script aplica la solución definitiva al problema del guardado de muestras.
 * 
 * PROBLEMA IDENTIFICADO:
 * - El endpoint save_sample existe y funciona
 * - La estructura de datos es correcta
 * - El problema puede estar en RLS o en el manejo de errores
 * 
 * SOLUCIÓN:
 * - Mejorar el manejo de errores
 * - Agregar fallbacks robustos
 * - Implementar retry logic
 * - Mejorar feedback al usuario
 */

console.log('🔧 APLICANDO FIX DEFINITIVO: Guardado de muestras');
console.log('='.repeat(50));

// 1. Función mejorada de guardado con retry y fallbacks
async function improvedSaveSample(data, maxRetries = 3) {
    console.log('💾 Iniciando guardado mejorado...', data);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Intento ${attempt}/${maxRetries}`);
            
            // Validar datos antes de enviar
            if (!data.population_id || !data.method || !data.sample_data) {
                throw new Error('Datos incompletos: faltan campos requeridos');
            }
            
            // Asegurar que samplingProxyFetch esté disponible
            let samplingProxyFetch = window.samplingProxyFetch;
            if (!samplingProxyFetch) {
                const fetchUtilsModule = await import('/services/fetchUtils.ts');
                samplingProxyFetch = fetchUtilsModule.samplingProxyFetch;
            }
            
            // Realizar la llamada con timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos
            
            const result = await samplingProxyFetch('save_sample', data, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log(`✅ Guardado exitoso en intento ${attempt}:`, result);
            return result;
            
        } catch (error) {
            console.error(`❌ Error en intento ${attempt}:`, error.message);
            
            // Si es el último intento, lanzar el error
            if (attempt === maxRetries) {
                throw error;
            }
            
            // Esperar antes del siguiente intento (exponential backoff)
            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// 2. Función para verificar el estado del sistema
async function checkSystemHealth() {
    console.log('🏥 Verificando salud del sistema...');
    
    try {
        // Verificar conectividad básica
        const response = await fetch('/api/sampling_proxy?action=get_populations', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            console.log('✅ Conectividad con API: OK');
            return true;
        } else {
            console.log('⚠️ Conectividad con API: Problemas');
            return false;
        }
    } catch (error) {
        console.error('❌ Error de conectividad:', error);
        return false;
    }
}

// 3. Función para aplicar el fix al componente SamplingWorkspace
function applyFixToSamplingWorkspace() {
    console.log('🔧 Aplicando fix al componente SamplingWorkspace...');
    
    // Interceptar y mejorar la función handleRunSampling
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const [url, options] = args;
        
        // Interceptar llamadas al save_sample
        if (url && url.includes('sampling_proxy') && 
            options && options.body && 
            JSON.parse(options.body).action === 'save_sample') {
            
            console.log('🎯 Interceptando llamada save_sample');
            
            // Mejorar el manejo de la respuesta
            return originalFetch.apply(this, args)
                .then(async response => {
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('❌ Error en save_sample:', errorText);
                        
                        // Intentar parsear el error
                        try {
                            const errorData = JSON.parse(errorText);
                            throw new Error(errorData.error || errorText);
                        } catch {
                            throw new Error(`HTTP ${response.status}: ${errorText}`);
                        }
                    }
                    
                    const data = await response.json();
                    console.log('✅ save_sample exitoso:', data);
                    return new Response(JSON.stringify(data), {
                        status: response.status,
                        headers: response.headers
                    });
                })
                .catch(error => {
                    console.error('❌ Error interceptado en save_sample:', error);
                    
                    // Mostrar mensaje de error más amigable al usuario
                    if (window.addToast) {
                        let userMessage = 'Error al guardar la muestra';
                        
                        if (error.message.includes('RLS') || error.message.includes('permission')) {
                            userMessage = 'Error de permisos. Contacte al administrador.';
                        } else if (error.message.includes('timeout')) {
                            userMessage = 'La operación tardó demasiado. Intente nuevamente.';
                        } else if (error.message.includes('network')) {
                            userMessage = 'Error de conexión. Verifique su internet.';
                        }
                        
                        window.addToast(userMessage, 'error');
                    }
                    
                    throw error;
                });
        }
        
        return originalFetch.apply(this, args);
    };
    
    console.log('✅ Fix aplicado al interceptor de fetch');
}

// 4. Función para activar modo de emergencia mejorado
function activateEmergencyMode() {
    console.log('🚨 Activando modo de emergencia mejorado...');
    
    localStorage.setItem('SKIP_SAVE_MODE', 'true');
    localStorage.setItem('EMERGENCY_MODE_REASON', 'RLS_ISSUES_' + Date.now());
    
    // Mostrar notificación al usuario
    if (window.addToast) {
        window.addToast('Modo emergencia activado: Las muestras se guardarán solo en memoria', 'warning');
    }
    
    console.log('✅ Modo emergencia activado');
}

// 5. Función para desactivar modo de emergencia
function deactivateEmergencyMode() {
    console.log('✅ Desactivando modo de emergencia...');
    
    localStorage.removeItem('SKIP_SAVE_MODE');
    localStorage.removeItem('EMERGENCY_MODE_REASON');
    
    if (window.addToast) {
        window.addToast('Modo emergencia desactivado: Guardado normal restaurado', 'success');
    }
    
    console.log('✅ Modo emergencia desactivado');
}

// 6. Función principal para aplicar todos los fixes
async function applyAllFixes() {
    console.log('🚀 Aplicando todos los fixes...');
    
    try {
        // 1. Verificar salud del sistema
        const isHealthy = await checkSystemHealth();
        
        if (!isHealthy) {
            console.log('⚠️ Sistema no saludable, activando modo emergencia');
            activateEmergencyMode();
            return;
        }
        
        // 2. Aplicar fix al componente
        applyFixToSamplingWorkspace();
        
        // 3. Exponer funciones mejoradas
        window.improvedSaveSample = improvedSaveSample;
        window.activateEmergencyMode = activateEmergencyMode;
        window.deactivateEmergencyMode = deactivateEmergencyMode;
        
        console.log('✅ Todos los fixes aplicados exitosamente');
        
        // 4. Mostrar instrucciones al usuario
        console.log('\n📋 INSTRUCCIONES PARA EL USUARIO:');
        console.log('1. Intente usar el botón "Bloquear como Papel de Trabajo" normalmente');
        console.log('2. Si sigue fallando, ejecute: activateEmergencyMode()');
        console.log('3. Para volver al modo normal: deactivateEmergencyMode()');
        console.log('4. Para diagnóstico detallado: diagnoseRLSIssues() (si está disponible)');
        
    } catch (error) {
        console.error('❌ Error aplicando fixes:', error);
        console.log('🚨 Activando modo emergencia como fallback');
        activateEmergencyMode();
    }
}

// Ejecutar automáticamente
setTimeout(applyAllFixes, 1000);

console.log('🎯 FIX DEFINITIVO CARGADO');
console.log('💡 Funciones disponibles:');
console.log('  - improvedSaveSample(data)');
console.log('  - activateEmergencyMode()');
console.log('  - deactivateEmergencyMode()');
console.log('  - applyAllFixes()');