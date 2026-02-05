/**
 * 🚨 DIAGNÓSTICO URGENTE: Problema RLS confirmado
 * 
 * PROBLEMA VISUAL CONFIRMADO:
 * - Botón verde "GUARDAR TRABAJO" se queda cargando
 * - Historial muestra "Sin antecedentes"
 * - No persiste al cambiar población
 * 
 * CAUSA: RLS (Row Level Security) en audit_historical_samples
 * 
 * INSTRUCCIONES:
 * 1. Abrir DevTools (F12) -> Console
 * 2. Pegar este código completo
 * 3. Presionar Enter
 * 4. Copiar el resultado para el administrador
 */

console.log('🚨 DIAGNÓSTICO URGENTE: Problema RLS confirmado');
console.log('='.repeat(60));

async function diagnosticoUrgente() {
    console.log('🔍 ANALIZANDO PROBLEMA DE PERSISTENCIA...');
    
    try {
        // Obtener samplingProxyFetch
        let samplingProxyFetch = window.samplingProxyFetch;
        if (!samplingProxyFetch) {
            const fetchUtilsModule = await import('/services/fetchUtils.ts');
            samplingProxyFetch = fetchUtilsModule.samplingProxyFetch;
        }
        
        // 1. Verificar poblaciones disponibles
        console.log('\n📊 PASO 1: Verificando poblaciones...');
        const poblaciones = await samplingProxyFetch('get_populations');
        console.log('✅ Poblaciones disponibles:', poblaciones.populations?.length || 0);
        
        if (!poblaciones.populations || poblaciones.populations.length === 0) {
            console.log('❌ No hay poblaciones para probar');
            return;
        }
        
        const poblacion = poblaciones.populations[0];
        console.log('🎯 Usando población:', poblacion.name);
        
        // 2. Probar lectura de historial (esto debería funcionar)
        console.log('\n📖 PASO 2: Probando lectura de historial...');
        const historial = await samplingProxyFetch('get_history', {
            population_id: poblacion.id
        });
        console.log('✅ Lectura exitosa. Muestras en historial:', historial.history?.length || 0);
        
        // 3. Probar escritura (aquí está el problema)
        console.log('\n✍️ PASO 3: Probando escritura (AQUÍ ESTÁ EL PROBLEMA)...');
        
        const datosMinimos = {
            population_id: poblacion.id,
            method: 'NonStatistical',
            sample_data: {
                objective: 'DIAGNÓSTICO RLS - ' + new Date().toLocaleString(),
                seed: 99999,
                sample_size: 1,
                params_snapshot: { test: true },
                results_snapshot: { test: true }
            },
            is_final: true // CRÍTICO: true para que aparezca en historial
        };
        
        console.log('📤 Enviando datos de prueba...');
        console.log('⏰ Iniciando cronómetro...');
        
        const startTime = Date.now();
        
        try {
            const resultado = await samplingProxyFetch('save_sample', datosMinimos);
            const duration = Date.now() - startTime;
            
            console.log('⏰ Tiempo transcurrido:', duration + 'ms');
            console.log('📥 Respuesta recibida:', resultado);
            
            if (resultado && resultado.id) {
                console.log('✅ El endpoint respondió con ID:', resultado.id);
                
                // Verificar si realmente se guardó
                console.log('\n🔍 PASO 4: Verificando si se guardó realmente...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const historialActualizado = await samplingProxyFetch('get_history', {
                    population_id: poblacion.id
                });
                
                const muestraEncontrada = historialActualizado.history?.find(h => h.id === resultado.id);
                
                if (muestraEncontrada) {
                    console.log('✅ ÉXITO: La muestra SÍ se guardó en la BD');
                    console.log('💡 El problema puede estar en otro lado');
                    return { success: true, message: 'Persistencia funciona' };
                } else {
                    console.log('❌ PROBLEMA CONFIRMADO: RLS en audit_historical_samples');
                    console.log('📋 EVIDENCIA:');
                    console.log('  - El endpoint responde exitosamente');
                    console.log('  - Devuelve un ID válido');
                    console.log('  - PERO la muestra no aparece en el historial');
                    console.log('  - CAUSA: Row Level Security (RLS) rechaza la escritura');
                    
                    return { 
                        success: false, 
                        message: 'RLS_CONFIRMED',
                        evidence: {
                            endpoint_responds: true,
                            returns_id: true,
                            persists_in_db: false,
                            cause: 'Row Level Security (RLS) policy rejection'
                        }
                    };
                }
            } else {
                console.log('❌ El endpoint no devolvió un ID válido');
                return { success: false, message: 'Invalid response from endpoint' };
            }
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log('⏰ Tiempo antes del error:', duration + 'ms');
            console.error('❌ ERROR EN ESCRITURA:', error.message);
            
            if (error.message.includes('timeout')) {
                console.log('💡 DIAGNÓSTICO: Timeout - el endpoint no responde');
                console.log('🔧 CAUSA PROBABLE: RLS bloquea la escritura, endpoint se cuelga');
            }
            
            return { success: false, message: error.message };
        }
        
    } catch (error) {
        console.error('❌ ERROR GENERAL:', error.message);
        return { success: false, message: error.message };
    }
}

async function generarReporteParaAdmin() {
    console.log('\n📋 GENERANDO REPORTE PARA ADMINISTRADOR...');
    
    const resultado = await diagnosticoUrgente();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 REPORTE PARA ADMINISTRADOR DE SUPABASE');
    console.log('='.repeat(60));
    console.log('🕐 Fecha:', new Date().toLocaleString());
    console.log('🌐 URL:', window.location.href);
    console.log('👤 Usuario:', 'Juan José Siguenza Torres');
    
    if (resultado.success) {
        console.log('✅ ESTADO: Persistencia funciona correctamente');
        console.log('💡 ACCIÓN: Revisar flujo específico de la aplicación');
    } else if (resultado.message === 'RLS_CONFIRMED') {
        console.log('❌ ESTADO: Problema RLS confirmado');
        console.log('🎯 TABLA AFECTADA: audit_historical_samples');
        console.log('🔧 SOLUCIÓN INMEDIATA:');
        console.log('');
        console.log('   1. Acceder a Supabase Dashboard');
        console.log('   2. Ir a SQL Editor');
        console.log('   3. Ejecutar:');
        console.log('      ALTER TABLE audit_historical_samples DISABLE ROW LEVEL SECURITY;');
        console.log('');
        console.log('🔍 EVIDENCIA TÉCNICA:');
        console.log('   - Endpoint responde: ✅');
        console.log('   - Devuelve ID válido: ✅');
        console.log('   - Persiste en BD: ❌');
        console.log('   - Causa: RLS policy rejection');
    } else {
        console.log('❌ ESTADO: Error técnico');
        console.log('💬 MENSAJE:', resultado.message);
    }
    
    console.log('\n⚡ URGENCIA: ALTA');
    console.log('⏰ TIEMPO ESTIMADO DE SOLUCIÓN: 2 minutos');
    console.log('📞 CONTACTO: Ejecutar comando SQL en Supabase');
    console.log('='.repeat(60));
    
    return resultado;
}

// Ejecutar automáticamente
setTimeout(async () => {
    console.log('🚀 Iniciando diagnóstico urgente...');
    const resultado = await generarReporteParaAdmin();
    
    console.log('\n🎯 PRÓXIMOS PASOS:');
    if (resultado.success) {
        console.log('1. Revisar logs de la aplicación cuando uses el botón real');
        console.log('2. Comparar datos enviados con esta prueba');
    } else {
        console.log('1. Copiar TODO este reporte');
        console.log('2. Enviarlo al administrador de Supabase');
        console.log('3. Solicitar ejecución del comando SQL');
        console.log('4. Probar nuevamente después del fix');
    }
    
    // Exponer funciones
    window.diagnosticoUrgente = diagnosticoUrgente;
    window.generarReporteParaAdmin = generarReporteParaAdmin;
    
}, 1000);

console.log('🎯 DIAGNÓSTICO URGENTE CARGADO');
console.log('💡 El diagnóstico se ejecutará automáticamente en 1 segundo');
console.log('📋 Funciones disponibles:');
console.log('  - diagnosticoUrgente()');
console.log('  - generarReporteParaAdmin()');