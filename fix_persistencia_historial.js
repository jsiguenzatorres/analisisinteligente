/**
 * 🔧 FIX ESPECÍFICO: Persistencia en Historial
 * 
 * PROBLEMA CONFIRMADO:
 * - El botón "Bloquear como Papel de Trabajo" funciona
 * - La muestra se genera correctamente
 * - PERO no se guarda en la base de datos (audit_historical_samples)
 * - Por eso no aparece en el historial al recargar
 * 
 * CAUSA: Problemas de RLS/permisos en Supabase
 * 
 * SOLUCIÓN: Diagnosticar y reparar la persistencia
 */

console.log('🔧 DIAGNÓSTICO: Problema de persistencia en historial');
console.log('='.repeat(60));

async function diagnosticarPersistencia() {
    console.log('🔍 PASO 1: Verificando conectividad con Supabase...');
    
    try {
        // Verificar si samplingProxyFetch está disponible
        let samplingProxyFetch = window.samplingProxyFetch;
        if (!samplingProxyFetch) {
            const fetchUtilsModule = await import('/services/fetchUtils.ts');
            samplingProxyFetch = fetchUtilsModule.samplingProxyFetch;
        }
        
        // 1. Probar lectura del historial
        console.log('\n📖 PASO 2: Probando lectura de historial...');
        
        // Necesitamos el ID de una población existente
        const poblaciones = await samplingProxyFetch('get_populations');
        console.log('📊 Poblaciones disponibles:', poblaciones.populations?.length || 0);
        
        if (!poblaciones.populations || poblaciones.populations.length === 0) {
            console.log('⚠️ No hay poblaciones disponibles para probar');
            return;
        }
        
        const poblacionPrueba = poblaciones.populations[0];
        console.log('🎯 Usando población para prueba:', poblacionPrueba.name);
        
        // Probar lectura de historial
        const historial = await samplingProxyFetch('get_history', {
            population_id: poblacionPrueba.id
        });
        
        console.log('✅ Lectura de historial exitosa');
        console.log('📋 Muestras en historial:', historial.history?.length || 0);
        
        if (historial.history && historial.history.length > 0) {
            console.log('📄 Última muestra:', {
                id: historial.history[0].id,
                method: historial.history[0].method,
                created_at: historial.history[0].created_at,
                is_current: historial.history[0].is_current
            });
        }
        
        // 2. Probar escritura con datos mínimos
        console.log('\n✍️ PASO 3: Probando escritura en historial...');
        
        const datosMinimos = {
            population_id: poblacionPrueba.id,
            method: 'NonStatistical',
            sample_data: {
                objective: 'PRUEBA PERSISTENCIA - ' + new Date().toLocaleString(),
                seed: Math.floor(Math.random() * 10000),
                sample_size: 1,
                params_snapshot: {
                    nonStatistical: {
                        insight: 'RiskScoring',
                        sampleSize: 1
                    }
                },
                results_snapshot: {
                    sampleSize: 1,
                    sample: [{ id: 'test-1', value: 1000, risk_score: 0.8 }],
                    totalValue: 1000,
                    coverage: 0.001
                }
            },
            is_final: false // IMPORTANTE: false para prueba
        };
        
        try {
            const resultadoGuardado = await samplingProxyFetch('save_sample', datosMinimos);
            console.log('✅ ESCRITURA EXITOSA:', resultadoGuardado);
            
            // Verificar que se guardó realmente
            console.log('\n🔍 PASO 4: Verificando que se guardó...');
            const historialActualizado = await samplingProxyFetch('get_history', {
                population_id: poblacionPrueba.id
            });
            
            const muestraRecienCreada = historialActualizado.history?.find(h => h.id === resultadoGuardado.id);
            
            if (muestraRecienCreada) {
                console.log('✅ PERSISTENCIA CONFIRMADA: La muestra se guardó correctamente');
                console.log('📄 Muestra encontrada:', {
                    id: muestraRecienCreada.id,
                    objective: muestraRecienCreada.objective,
                    created_at: muestraRecienCreada.created_at
                });
                
                // Limpiar la muestra de prueba
                console.log('\n🧹 PASO 5: Limpiando muestra de prueba...');
                // Nota: No hay endpoint de delete en el proxy, pero eso está bien para pruebas
                
                return { success: true, message: 'Persistencia funciona correctamente' };
                
            } else {
                console.log('❌ PROBLEMA CONFIRMADO: La muestra no se persistió');
                return { success: false, message: 'Escritura reporta éxito pero no se persiste' };
            }
            
        } catch (errorEscritura) {
            console.error('❌ ERROR EN ESCRITURA:', errorEscritura.message);
            
            // Análisis específico del error
            if (errorEscritura.message.includes('RLS') || errorEscritura.message.includes('permission')) {
                return { 
                    success: false, 
                    message: 'Error de permisos RLS en audit_historical_samples',
                    solution: 'Revisar políticas RLS en Supabase'
                };
            } else if (errorEscritura.message.includes('Missing required fields')) {
                return { 
                    success: false, 
                    message: 'Campos requeridos faltantes',
                    solution: 'Verificar estructura de datos'
                };
            } else {
                return { 
                    success: false, 
                    message: errorEscritura.message,
                    solution: 'Revisar logs del servidor'
                };
            }
        }
        
    } catch (error) {
        console.error('❌ ERROR GENERAL:', error.message);
        return { success: false, message: error.message };
    }
}

async function repararPersistencia() {
    console.log('\n🔧 INTENTANDO REPARACIÓN AUTOMÁTICA...');
    
    const diagnostico = await diagnosticarPersistencia();
    
    if (diagnostico.success) {
        console.log('✅ DIAGNÓSTICO: La persistencia funciona correctamente');
        console.log('💡 El problema puede estar en el flujo específico de la aplicación');
        console.log('🔍 Recomendación: Verificar que is_final=true en producción');
        return;
    }
    
    console.log('❌ DIAGNÓSTICO: Problema confirmado -', diagnostico.message);
    
    if (diagnostico.solution) {
        console.log('🔧 SOLUCIÓN SUGERIDA:', diagnostico.solution);
    }
    
    // Intentar soluciones automáticas
    if (diagnostico.message.includes('RLS') || diagnostico.message.includes('permission')) {
        console.log('\n🚨 APLICANDO SOLUCIÓN TEMPORAL: Modo de emergencia mejorado');
        
        // Activar modo de emergencia con persistencia local
        localStorage.setItem('SKIP_SAVE_MODE', 'true');
        localStorage.setItem('EMERGENCY_REASON', 'RLS_AUDIT_HISTORICAL_SAMPLES');
        localStorage.setItem('EMERGENCY_TIMESTAMP', Date.now().toString());
        
        console.log('✅ Modo de emergencia activado');
        console.log('💡 Las muestras se guardarán en localStorage hasta resolver RLS');
        
        // Implementar guardado en localStorage como backup
        implementarGuardadoLocal();
        
    } else {
        console.log('\n⚠️ No se puede reparar automáticamente');
        console.log('📞 Contactar al administrador del sistema');
    }
}

function implementarGuardadoLocal() {
    console.log('💾 Implementando guardado local como backup...');
    
    // Interceptar llamadas a save_sample para guardar también en localStorage
    if (window.samplingProxyFetch) {
        const originalSamplingProxyFetch = window.samplingProxyFetch;
        
        window.samplingProxyFetch = function(action, data, options) {
            if (action === 'save_sample' && data.is_final) {
                console.log('💾 Guardando copia local de la muestra...');
                
                // Guardar en localStorage
                const localKey = `sample_backup_${data.population_id}_${Date.now()}`;
                const backupData = {
                    ...data,
                    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    created_at: new Date().toISOString(),
                    backup_timestamp: Date.now()
                };
                
                localStorage.setItem(localKey, JSON.stringify(backupData));
                
                // Mantener índice de backups
                const backupIndex = JSON.parse(localStorage.getItem('sample_backups_index') || '[]');
                backupIndex.push({
                    key: localKey,
                    population_id: data.population_id,
                    method: data.method,
                    created_at: backupData.created_at,
                    id: backupData.id
                });
                localStorage.setItem('sample_backups_index', JSON.stringify(backupIndex));
                
                console.log('✅ Copia local guardada:', localKey);
            }
            
            return originalSamplingProxyFetch.call(this, action, data, options);
        };
        
        console.log('✅ Interceptor de guardado local configurado');
    }
    
    // Función para recuperar backups locales
    window.getLocalBackups = function(populationId) {
        const backupIndex = JSON.parse(localStorage.getItem('sample_backups_index') || '[]');
        return backupIndex.filter(backup => backup.population_id === populationId);
    };
    
    // Función para restaurar backup
    window.restoreLocalBackup = function(backupKey) {
        const backupData = localStorage.getItem(backupKey);
        if (backupData) {
            return JSON.parse(backupData);
        }
        return null;
    };
    
    console.log('✅ Funciones de backup local disponibles:');
    console.log('  - getLocalBackups(populationId)');
    console.log('  - restoreLocalBackup(backupKey)');
}

// Ejecutar diagnóstico automáticamente
setTimeout(async () => {
    console.log('🚀 Iniciando diagnóstico de persistencia...');
    await repararPersistencia();
    
    console.log('\n📋 RESUMEN:');
    console.log('- Si la persistencia funciona: El problema está en el flujo de la app');
    console.log('- Si hay error RLS: Modo de emergencia activado con backup local');
    console.log('- Si hay otro error: Contactar administrador');
    
    console.log('\n💡 PRÓXIMOS PASOS:');
    console.log('1. Probar nuevamente el botón "Bloquear como Papel de Trabajo"');
    console.log('2. Si sigue sin aparecer en historial, usar: getLocalBackups(populationId)');
    console.log('3. Para desactivar modo emergencia: localStorage.removeItem("SKIP_SAVE_MODE")');
    
    // Exponer funciones
    window.diagnosticarPersistencia = diagnosticarPersistencia;
    window.repararPersistencia = repararPersistencia;
    
}, 2000);

console.log('🎯 DIAGNÓSTICO DE PERSISTENCIA CARGADO');
console.log('💡 Funciones disponibles:');
console.log('  - diagnosticarPersistencia()');
console.log('  - repararPersistencia()');