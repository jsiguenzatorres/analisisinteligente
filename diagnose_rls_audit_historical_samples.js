/**
 * 🔍 DIAGNÓSTICO ESPECÍFICO: Problemas RLS con audit_historical_samples
 * 
 * Este script diagnostica problemas específicos con la tabla audit_historical_samples
 * que está causando que el botón "Bloquear como Papel de Trabajo" no funcione.
 * 
 * INSTRUCCIONES:
 * 1. Abrir DevTools (F12) -> Console
 * 2. Pegar este código y presionar Enter
 * 3. El script ejecutará diagnósticos automáticos
 */

console.log('🔍 DIAGNÓSTICO RLS: audit_historical_samples');
console.log('='.repeat(60));

async function diagnoseRLSIssues() {
    try {
        // 1. Verificar si samplingProxyFetch está disponible
        let samplingProxyFetch;
        
        if (typeof window.samplingProxyFetch !== 'undefined') {
            samplingProxyFetch = window.samplingProxyFetch;
        } else {
            console.log('⚠️ samplingProxyFetch no disponible en window, intentando importar...');
            try {
                const fetchUtilsModule = await import('/services/fetchUtils.ts');
                samplingProxyFetch = fetchUtilsModule.samplingProxyFetch;
                console.log('✅ samplingProxyFetch importado exitosamente');
            } catch (importError) {
                console.error('❌ No se pudo importar samplingProxyFetch:', importError);
                return;
            }
        }

        // 2. Probar acceso de lectura a audit_historical_samples
        console.log('\n📖 PRUEBA 1: Acceso de lectura');
        try {
            const historyResult = await samplingProxyFetch('get_history', {
                population_id: 'test-population-' + Date.now()
            });
            console.log('✅ Lectura exitosa:', historyResult);
        } catch (readError) {
            console.error('❌ Error de lectura:', readError.message);
            
            if (readError.message.includes('RLS') || readError.message.includes('permission')) {
                console.log('💡 DIAGNÓSTICO: Problema de RLS en lectura');
            }
        }

        // 3. Probar acceso de escritura con datos mínimos
        console.log('\n✍️ PRUEBA 2: Acceso de escritura (datos mínimos)');
        const minimalTestData = {
            population_id: 'test-rls-' + Date.now(),
            method: 'NonStatistical',
            sample_data: {
                objective: 'Prueba RLS - ' + new Date().toLocaleString(),
                seed: 12345,
                sample_size: 1,
                params_snapshot: { test: true },
                results_snapshot: { test: true }
            },
            is_final: false // Importante: false para prueba
        };

        try {
            const saveResult = await samplingProxyFetch('save_sample', minimalTestData);
            console.log('✅ Escritura exitosa:', saveResult);
            
            // Si la escritura fue exitosa, intentar leer el registro creado
            if (saveResult && saveResult.id) {
                console.log('\n🔍 PRUEBA 3: Verificar registro creado');
                try {
                    const verifyResult = await samplingProxyFetch('get_history', {
                        population_id: minimalTestData.population_id
                    });
                    console.log('✅ Verificación exitosa:', verifyResult);
                    
                    if (verifyResult.history && verifyResult.history.length > 0) {
                        console.log('✅ Registro encontrado en historial');
                    } else {
                        console.log('⚠️ Registro no encontrado en historial (posible problema de RLS en lectura)');
                    }
                } catch (verifyError) {
                    console.error('❌ Error en verificación:', verifyError.message);
                }
            }
            
        } catch (writeError) {
            console.error('❌ Error de escritura:', writeError.message);
            
            // Análisis específico del error
            if (writeError.message.includes('RLS') || writeError.message.includes('permission')) {
                console.log('💡 DIAGNÓSTICO: Problema de RLS en escritura');
                console.log('🔧 SOLUCIÓN SUGERIDA: Revisar políticas RLS en Supabase');
            } else if (writeError.message.includes('Missing required fields')) {
                console.log('💡 DIAGNÓSTICO: Campos requeridos faltantes');
                console.log('🔧 SOLUCIÓN SUGERIDA: Verificar estructura de datos');
            } else if (writeError.message.includes('duplicate') || writeError.message.includes('unique')) {
                console.log('💡 DIAGNÓSTICO: Violación de restricción única');
                console.log('🔧 SOLUCIÓN SUGERIDA: Verificar duplicados');
            } else if (writeError.message.includes('timeout')) {
                console.log('💡 DIAGNÓSTICO: Timeout en operación');
                console.log('🔧 SOLUCIÓN SUGERIDA: Optimizar consulta o aumentar timeout');
            } else {
                console.log('💡 DIAGNÓSTICO: Error desconocido');
                console.log('🔧 SOLUCIÓN SUGERIDA: Revisar logs del servidor');
            }
        }

        // 4. Verificar configuración del usuario actual
        console.log('\n👤 PRUEBA 4: Información del usuario actual');
        try {
            // Intentar obtener información del usuario desde Supabase
            if (window.supabase) {
                const { data: { user }, error } = await window.supabase.auth.getUser();
                if (user) {
                    console.log('✅ Usuario autenticado:', {
                        id: user.id,
                        email: user.email,
                        role: user.role || 'No definido'
                    });
                } else {
                    console.log('⚠️ No hay usuario autenticado');
                }
            } else {
                console.log('⚠️ Supabase client no disponible en window');
            }
        } catch (userError) {
            console.error('❌ Error obteniendo información del usuario:', userError);
        }

        // 5. Verificar variables de entorno (solo las que son públicas)
        console.log('\n🔧 PRUEBA 5: Configuración del entorno');
        console.log('🌐 Hostname:', window.location.hostname);
        console.log('🔗 Protocol:', window.location.protocol);
        console.log('📍 Environment:', window.location.hostname === 'localhost' ? 'Development' : 'Production');
        
        // Verificar si hay configuración de modo emergencia
        const skipSaveMode = localStorage.getItem('SKIP_SAVE_MODE');
        console.log('🚨 Modo emergencia:', skipSaveMode === 'true' ? 'ACTIVO' : 'Inactivo');

    } catch (generalError) {
        console.error('❌ Error general en diagnóstico:', generalError);
    }
}

// Función para generar reporte de RLS
function generateRLSReport() {
    console.log('\n📋 REPORTE DE DIAGNÓSTICO RLS');
    console.log('='.repeat(60));
    console.log('🕐 Timestamp:', new Date().toLocaleString());
    console.log('🌐 URL:', window.location.href);
    console.log('👤 User Agent:', navigator.userAgent.substring(0, 100) + '...');
    
    // Verificar localStorage relevante
    const relevantKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth') || key.includes('SKIP'))) {
            relevantKeys.push({
                key,
                hasValue: !!localStorage.getItem(key),
                length: localStorage.getItem(key)?.length || 0
            });
        }
    }
    console.log('💾 Claves relevantes en localStorage:', relevantKeys);
    
    console.log('\n🎯 PRÓXIMOS PASOS RECOMENDADOS:');
    console.log('1. Revisar políticas RLS en Supabase Dashboard');
    console.log('2. Verificar que el usuario tenga permisos de escritura');
    console.log('3. Comprobar configuración de service_role_key');
    console.log('4. Revisar logs del servidor en Vercel/Netlify');
    console.log('5. Considerar usar modo emergencia temporalmente');
    
    console.log('\n📞 PARA SOPORTE TÉCNICO:');
    console.log('- Copiar toda la información de esta consola');
    console.log('- Incluir screenshots de errores específicos');
    console.log('- Mencionar pasos exactos para reproducir el problema');
}

// Ejecutar diagnóstico automáticamente
console.log('🚀 Iniciando diagnóstico automático...');
setTimeout(async () => {
    await diagnoseRLSIssues();
    generateRLSReport();
    
    console.log('\n✅ DIAGNÓSTICO COMPLETADO');
    console.log('💡 Para ejecutar nuevamente: diagnoseRLSIssues()');
    
    // Exponer funciones para uso manual
    window.diagnoseRLSIssues = diagnoseRLSIssues;
    window.generateRLSReport = generateRLSReport;
    
}, 1000);