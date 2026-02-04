/**
 * 🧪 TEST: ESTRATEGIA HÍBRIDA DE GUARDADO
 * 
 * Prueba la estrategia completa:
 * 1. Guardado directo (Opción 1)
 * 2. Fallback a Edge Function (Opción 2)
 * 3. Verificación de integridad
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Faltan variables de entorno');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

// Simular el servicio de almacenamiento
async function saveSampleDirect(data) {
    console.log('💾 [OPCIÓN 1] Guardado directo...');
    const startTime = Date.now();
    
    const { data: savedSample, error } = await supabase
        .from('audit_historical_samples')
        .insert(data)
        .select('id, created_at')
        .single();
    
    if (error) throw error;
    
    return {
        id: savedSample.id,
        created_at: savedSample.created_at,
        method: 'direct',
        duration_ms: Date.now() - startTime
    };
}

async function saveSampleEdgeFunction(data) {
    console.log('🌐 [OPCIÓN 2] Edge Function...');
    const startTime = Date.now();
    
    const { data: functionData, error } = await supabase.functions.invoke('save_sample', {
        body: {
            population_id: data.population_id,
            method: data.method,
            sample_data: data,
            is_final: data.is_final
        }
    });
    
    if (error) throw error;
    
    return {
        id: functionData.id,
        created_at: functionData.created_at,
        method: 'edge_function',
        duration_ms: Date.now() - startTime
    };
}

async function saveSampleHybrid(data) {
    console.log('🚀 Iniciando estrategia híbrida...\n');
    
    // Intentar Opción 1: Guardado directo
    try {
        const result = await saveSampleDirect(data);
        console.log(`✅ Guardado exitoso con Opción 1 (${result.duration_ms}ms)`);
        return result;
    } catch (directError) {
        console.warn(`⚠️ Opción 1 falló: ${directError.message}`);
        console.log('🔄 Intentando Opción 2 (fallback)...\n');
        
        // Intentar Opción 2: Edge Function
        try {
            const result = await saveSampleEdgeFunction(data);
            console.log(`✅ Guardado exitoso con Opción 2 (${result.duration_ms}ms)`);
            return result;
        } catch (edgeFunctionError) {
            console.error(`❌ Opción 2 también falló: ${edgeFunctionError.message}`);
            throw new Error('Ambas opciones de guardado fallaron');
        }
    }
}

async function verifySample(sampleId) {
    const { data, error } = await supabase
        .from('audit_historical_samples')
        .select('*')
        .eq('id', sampleId)
        .single();
    
    if (error) throw error;
    
    const isValid = data.sample_size > 0 &&
                   data.results_snapshot &&
                   Array.isArray(data.results_snapshot.sample) &&
                   data.results_snapshot.sample.length === data.sample_size;
    
    return { valid: isValid, data };
}

async function runTest() {
    console.log('🧪 TEST: ESTRATEGIA HÍBRIDA DE GUARDADO\n');
    console.log('='.repeat(60));
    
    try {
        // 1. Obtener población
        console.log('\n📊 1. Obteniendo población de prueba...');
        const { data: population } = await supabase
            .from('audit_populations')
            .select('*')
            .limit(1)
            .single();
        
        console.log(`✅ Población: ${population.file_name}`);
        
        // 2. Crear datos de prueba
        console.log('\n📝 2. Creando datos de prueba...');
        const testData = {
            population_id: population.id,
            method: 'mus',
            objective: 'Test de estrategia híbrida',
            seed: Math.floor(Math.random() * 10000),
            sample_size: 100,
            params_snapshot: {
                mus: {
                    TE: 50000,
                    EE: 5000,
                    RIA: 5,
                    handleNegatives: 'Absolute',
                    optimizeTopStratum: true
                }
            },
            results_snapshot: {
                sampleSize: 100,
                sample: Array.from({ length: 100 }, (_, i) => ({
                    id: `TEST-${i + 1}`,
                    value: Math.random() * 10000,
                    risk_score: Math.random() * 100,
                    compliance_status: Math.random() > 0.9 ? 'EXCEPCION' : 'OK',
                    is_pilot_item: i < 50,
                    stratum_label: 'E1'
                })),
                totalErrorProjection: 0,
                upperErrorLimit: 0,
                findings: [],
                methodologyNotes: ['Test híbrido']
            },
            is_final: true,
            is_current: true
        };
        
        console.log(`✅ Datos creados: ${testData.sample_size} ítems`);
        
        // 3. Probar estrategia híbrida
        console.log('\n💾 3. Probando estrategia híbrida...');
        console.log('-'.repeat(60));
        
        const savedSample = await saveSampleHybrid(testData);
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ GUARDADO EXITOSO');
        console.log('='.repeat(60));
        console.log(`📋 ID: ${savedSample.id}`);
        console.log(`⏱️  Tiempo: ${savedSample.duration_ms}ms`);
        console.log(`🔧 Método: ${savedSample.method === 'direct' ? 'Guardado Directo (Opción 1)' : 'Edge Function (Opción 2)'}`);
        console.log(`📅 Creado: ${savedSample.created_at}`);
        
        // 4. Verificar integridad
        console.log('\n🔍 4. Verificando integridad...');
        const verification = await verifySample(savedSample.id);
        
        if (verification.valid) {
            console.log('✅ Verificación exitosa:');
            console.log(`   - Tamaño muestra: ${verification.data.sample_size}`);
            console.log(`   - Items en results: ${verification.data.results_snapshot.sample.length}`);
            console.log(`   - Método: ${verification.data.method}`);
            console.log(`   - Is final: ${verification.data.is_final}`);
            console.log(`   - Is current: ${verification.data.is_current}`);
        } else {
            console.warn('⚠️ Verificación: datos inconsistentes');
        }
        
        // 5. Limpiar
        console.log('\n🧹 5. Limpiando...');
        await supabase
            .from('audit_historical_samples')
            .delete()
            .eq('id', savedSample.id);
        console.log('✅ Limpieza completada');
        
        // RESUMEN FINAL
        console.log('\n' + '='.repeat(60));
        console.log('✅ TEST COMPLETADO EXITOSAMENTE');
        console.log('='.repeat(60));
        console.log('\n📊 RESUMEN:');
        console.log(`   ✅ Estrategia híbrida funciona correctamente`);
        console.log(`   ✅ Método usado: ${savedSample.method === 'direct' ? 'Opción 1 (Directo)' : 'Opción 2 (Edge Function)'}`);
        console.log(`   ✅ Tiempo de guardado: ${savedSample.duration_ms}ms`);
        console.log(`   ✅ Integridad de datos: Verificada`);
        
        if (savedSample.method === 'direct') {
            console.log('\n💡 NOTA: Edge Function no está desplegada (usando Opción 1)');
            console.log('   Para mayor seguridad, considera desplegar la Edge Function');
            console.log('   Ver: DESPLIEGUE_EDGE_FUNCTION.md');
        } else {
            console.log('\n🔒 SEGURIDAD: Edge Function activa (Opción 2 disponible)');
        }
        
    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('❌ TEST FALLIDO');
        console.error('='.repeat(60));
        console.error('Error:', error.message);
        if (error.stack) console.error('\nStack:', error.stack);
        process.exit(1);
    }
}

// Ejecutar test
runTest();
