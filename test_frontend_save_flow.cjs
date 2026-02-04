/**
 * 🧪 TEST: FLUJO COMPLETO DE GUARDADO DESDE FRONTEND
 * 
 * Simula el flujo exacto que usa SamplingWorkspace.tsx
 * incluyendo el proxy fetch y timeout
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

// Simular el samplingProxyFetch del frontend
async function samplingProxyFetch(endpoint, body, options = {}) {
    const timeout = options.timeout || 8000;
    const method = options.method || 'POST';
    
    console.log(`🔄 Llamando endpoint: ${endpoint} (timeout: ${timeout}ms)`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Timeout después de ${timeout}ms`);
        }
        throw error;
    }
}

async function testFrontendSaveFlow() {
    console.log('🧪 INICIANDO TEST DE FLUJO FRONTEND\n');
    
    try {
        // 1. Obtener población
        console.log('📊 1. Obteniendo población de prueba...');
        const { data: population, error: popError } = await supabase
            .from('audit_populations')
            .select('*')
            .limit(1)
            .single();
        
        if (popError) throw popError;
        console.log(`✅ Población: ${population.file_name}`);
        
        // 2. Simular generación de muestra (como lo hace el frontend)
        console.log('\n🎲 2. Simulando generación de muestra...');
        const results = {
            sampleSize: 75,
            sample: Array.from({ length: 75 }, (_, i) => ({
                id: `ITEM-${String(i + 1).padStart(4, '0')}`,
                value: Math.random() * 50000,
                risk_score: Math.random() * 100,
                compliance_status: Math.random() > 0.85 ? 'EXCEPCION' : 'OK',
                is_pilot_item: i < 30,
                stratum_label: i < 25 ? 'E1' : i < 50 ? 'E2' : 'E3',
                risk_factors: ['Test']
            })),
            totalErrorProjection: 0,
            upperErrorLimit: 0,
            findings: [],
            methodologyNotes: ['Test de flujo frontend completo']
        };
        
        console.log(`✅ Muestra generada: ${results.sampleSize} ítems`);
        console.log(`   - Piloto: ${results.sample.filter(i => i.is_pilot_item).length}`);
        console.log(`   - Ampliación: ${results.sample.filter(i => !i.is_pilot_item).length}`);
        console.log(`   - Excepciones: ${results.sample.filter(i => i.compliance_status === 'EXCEPCION').length}`);
        
        // 3. Preparar datos históricos (como lo hace SamplingWorkspace)
        console.log('\n📝 3. Preparando datos históricos...');
        const appState = {
            selectedPopulation: population,
            samplingMethod: 'attribute',
            generalParams: {
                objective: 'Test de flujo completo desde frontend',
                seed: 12345
            },
            samplingParams: {
                attribute: {
                    NC: 95,
                    ET: 5,
                    PE: 1,
                    useSequential: false
                }
            }
        };
        
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
        
        console.log('✅ Datos históricos preparados');
        
        // 4. Intentar guardar vía proxy (simulando el frontend)
        console.log('\n💾 4. Guardando vía proxy (como frontend)...');
        const saveStartTime = Date.now();
        
        try {
            // Primero intentar con el endpoint proxy
            console.log('   Intentando con endpoint proxy...');
            const savedSample = await samplingProxyFetch('save_sample', {
                population_id: appState.selectedPopulation.id,
                method: appState.samplingMethod,
                sample_data: historicalData,
                is_final: true
            }, { 
                method: 'POST',
                timeout: 8000
            });
            
            const saveTime = Date.now() - saveStartTime;
            console.log(`✅ Guardado vía proxy exitoso en ${saveTime}ms`);
            console.log(`   ID: ${savedSample.id}`);
            
            // Verificar
            const { data: verifyData } = await supabase
                .from('audit_historical_samples')
                .select('*')
                .eq('id', savedSample.id)
                .single();
            
            console.log('\n✅ Verificación:');
            console.log(`   - Método: ${verifyData.method}`);
            console.log(`   - Tamaño: ${verifyData.sample_size}`);
            console.log(`   - Items: ${verifyData.results_snapshot.sample.length}`);
            
            // Limpiar
            await supabase
                .from('audit_historical_samples')
                .delete()
                .eq('id', savedSample.id);
            
            console.log('\n' + '='.repeat(60));
            console.log('✅ TEST COMPLETADO - FLUJO FRONTEND FUNCIONA');
            console.log('='.repeat(60));
            console.log(`⏱️  Tiempo total: ${saveTime}ms`);
            console.log('✅ El guardado desde frontend funciona correctamente');
            
        } catch (proxyError) {
            console.warn(`⚠️ Proxy falló: ${proxyError.message}`);
            console.log('\n   Intentando guardado directo como fallback...');
            
            // Fallback: guardado directo
            const { data: savedSample, error: saveError } = await supabase
                .from('audit_historical_samples')
                .insert(historicalData)
                .select()
                .single();
            
            if (saveError) throw saveError;
            
            const saveTime = Date.now() - saveStartTime;
            console.log(`✅ Guardado directo exitoso en ${saveTime}ms`);
            
            // Limpiar
            await supabase
                .from('audit_historical_samples')
                .delete()
                .eq('id', savedSample.id);
            
            console.log('\n' + '='.repeat(60));
            console.log('⚠️ TEST COMPLETADO - PROXY NO DISPONIBLE');
            console.log('='.repeat(60));
            console.log('⚠️ El endpoint proxy no está disponible');
            console.log('✅ Pero el guardado directo funciona como fallback');
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
testFrontendSaveFlow();
