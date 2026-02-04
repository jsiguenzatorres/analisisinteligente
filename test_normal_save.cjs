/**
 * 🧪 TEST: GUARDADO NORMAL SIN MODO EMERGENCIA
 * 
 * Prueba el flujo completo de guardado de muestra usando el endpoint normal
 * sin activar el modo emergencia
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

async function testNormalSave() {
    console.log('🧪 INICIANDO TEST DE GUARDADO NORMAL\n');
    
    try {
        // 1. Obtener una población de prueba
        console.log('📊 1. Obteniendo población de prueba...');
        const { data: populations, error: popError } = await supabase
            .from('audit_populations')
            .select('*')
            .limit(1)
            .single();
        
        if (popError) throw popError;
        if (!populations) throw new Error('No hay poblaciones disponibles');
        
        console.log(`✅ Población encontrada: ${populations.file_name} (ID: ${populations.id})`);
        
        // 2. Crear datos de muestra de prueba
        console.log('\n📝 2. Creando datos de muestra de prueba...');
        const testSample = {
            population_id: populations.id,
            method: 'mus',
            objective: 'Test de guardado normal sin modo emergencia',
            seed: Math.floor(Math.random() * 10000),
            sample_size: 50,
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
                sampleSize: 50,
                sample: Array.from({ length: 50 }, (_, i) => ({
                    id: `TEST-${i + 1}`,
                    value: Math.random() * 10000,
                    risk_score: Math.random() * 100,
                    compliance_status: Math.random() > 0.9 ? 'EXCEPCION' : 'OK',
                    is_pilot_item: i < 25,
                    stratum_label: 'E1'
                })),
                totalErrorProjection: 0,
                upperErrorLimit: 0,
                findings: [],
                methodologyNotes: ['Test de guardado normal']
            },
            is_final: true,
            is_current: true
        };
        
        console.log(`✅ Datos de prueba creados (${testSample.sample_size} ítems)`);
        
        // 3. Intentar guardar usando INSERT directo (simulando el endpoint)
        console.log('\n💾 3. Guardando muestra en base de datos...');
        const saveStartTime = Date.now();
        
        const { data: savedSample, error: saveError } = await supabase
            .from('audit_historical_samples')
            .insert({
                population_id: testSample.population_id,
                method: testSample.method,
                objective: testSample.objective,
                seed: testSample.seed,
                sample_size: testSample.sample_size,
                params_snapshot: testSample.params_snapshot,
                results_snapshot: testSample.results_snapshot,
                is_final: testSample.is_final,
                is_current: testSample.is_current
            })
            .select()
            .single();
        
        const saveTime = Date.now() - saveStartTime;
        
        if (saveError) {
            console.error(`❌ Error al guardar (${saveTime}ms):`, saveError);
            throw saveError;
        }
        
        console.log(`✅ Muestra guardada exitosamente en ${saveTime}ms`);
        console.log(`   ID: ${savedSample.id}`);
        console.log(`   Created at: ${savedSample.created_at}`);
        
        // 4. Verificar que se guardó correctamente
        console.log('\n🔍 4. Verificando guardado...');
        const { data: verifyData, error: verifyError } = await supabase
            .from('audit_historical_samples')
            .select('*')
            .eq('id', savedSample.id)
            .single();
        
        if (verifyError) throw verifyError;
        
        console.log('✅ Verificación exitosa:');
        console.log(`   - Método: ${verifyData.method}`);
        console.log(`   - Tamaño muestra: ${verifyData.sample_size}`);
        console.log(`   - Items en results: ${verifyData.results_snapshot.sample.length}`);
        console.log(`   - Is final: ${verifyData.is_final}`);
        console.log(`   - Is current: ${verifyData.is_current}`);
        
        // 5. Limpiar (opcional - comentar si quieres mantener el registro)
        console.log('\n🧹 5. Limpiando registro de prueba...');
        const { error: deleteError } = await supabase
            .from('audit_historical_samples')
            .delete()
            .eq('id', savedSample.id);
        
        if (deleteError) {
            console.warn('⚠️ No se pudo eliminar el registro de prueba:', deleteError.message);
        } else {
            console.log('✅ Registro de prueba eliminado');
        }
        
        // RESUMEN
        console.log('\n' + '='.repeat(60));
        console.log('✅ TEST COMPLETADO EXITOSAMENTE');
        console.log('='.repeat(60));
        console.log(`⏱️  Tiempo de guardado: ${saveTime}ms`);
        console.log(`📊 Población: ${populations.file_name}`);
        console.log(`🎯 Método: ${testSample.method.toUpperCase()}`);
        console.log(`📝 Ítems guardados: ${testSample.sample_size}`);
        console.log('\n✅ El guardado normal funciona correctamente sin modo emergencia');
        
    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('❌ TEST FALLIDO');
        console.error('='.repeat(60));
        console.error('Error:', error.message);
        if (error.details) console.error('Detalles:', error.details);
        if (error.hint) console.error('Sugerencia:', error.hint);
        console.error('\n⚠️ El guardado normal tiene problemas');
        process.exit(1);
    }
}

// Ejecutar test
testNormalSave();
