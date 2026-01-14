#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO COMPLETO DEL FLUJO DE GUARDADO
 * 
 * Este script prueba cada paso del proceso para identificar
 * exactamente dónde se cuelga el sistema.
 */

const https = require('https');

const SUPABASE_URL = 'https://lodeqleukaoshzarebxu.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_Y41PUF_8KWKeKnEJ6W8YIw_0ugk2aDO';

// Función helper para hacer requests
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const req = https.request(options, (res) => {
            const duration = Date.now() - startTime;
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const totalTime = Date.now() - startTime;
                resolve({ 
                    statusCode: res.statusCode, 
                    data: data, 
                    duration: totalTime,
                    headers: res.headers 
                });
            });
        });

        req.on('error', (err) => {
            const duration = Date.now() - startTime;
            reject({ error: err.message, duration });
        });

        req.on('timeout', () => {
            const duration = Date.now() - startTime;
            req.destroy();
            reject({ error: `Timeout después de ${duration}ms`, duration });
        });

        req.setTimeout(15000); // 15 segundos timeout
        
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

async function testStep(stepName, testFunction) {
    console.log(`\n🔍 PASO ${stepName}:`);
    console.log('⏰ Inicio:', new Date().toLocaleString());
    
    try {
        const result = await testFunction();
        console.log(`✅ ${stepName} - ÉXITO en ${result.duration}ms`);
        return { success: true, result };
    } catch (error) {
        console.log(`❌ ${stepName} - FALLO en ${error.duration || 0}ms`);
        console.log(`   Error: ${error.error || error.message}`);
        return { success: false, error };
    }
}

async function main() {
    console.log('🚀 DIAGNÓSTICO COMPLETO DEL FLUJO DE GUARDADO\n');
    
    // PASO 1: Probar conexión básica
    await testStep('1 - Conexión básica', async () => {
        const options = {
            hostname: 'analisisinteligente.vercel.app',
            port: 443,
            path: '/api/sampling_proxy?action=get_populations',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        return await makeRequest(options);
    });
    
    // PASO 2: Probar get_universe (carga de datos)
    await testStep('2 - Carga de datos (get_universe)', async () => {
        const options = {
            hostname: 'analisisinteligente.vercel.app',
            port: 443,
            path: '/api/sampling_proxy?action=get_universe&population_id=f02804d1-1d1d-43bd-ba38-8c1cea65a5ad',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        return await makeRequest(options);
    });
    
    // PASO 3: Probar save_sample (el que falla)
    await testStep('3 - Guardado (save_sample)', async () => {
        const testData = {
            population_id: 'f02804d1-1d1d-43bd-ba38-8c1cea65a5ad',
            method: 'MUS',
            sample_data: {
                population_id: 'f02804d1-1d1d-43bd-ba38-8c1cea65a5ad',
                method: 'MUS',
                objective: 'Test diagnóstico',
                seed: 12345,
                sample_size: 50,
                params_snapshot: { mus: { TE: 100000, EE: 0, V: 1000000 } },
                results_snapshot: { 
                    sampleSize: 50, 
                    sample: [],
                    totalErrorProjection: 0,
                    upperErrorLimit: 0,
                    findings: [],
                    methodologyNotes: ['Test']
                },
                is_final: true,
                is_current: true
            },
            is_final: true
        };

        const postData = JSON.stringify(testData);
        
        const options = {
            hostname: 'analisisinteligente.vercel.app',
            port: 443,
            path: '/api/sampling_proxy?action=save_sample',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        return await makeRequest(options, postData);
    });
    
    // PASO 4: Probar conexión directa a Supabase
    await testStep('4 - Conexión directa Supabase', async () => {
        const options = {
            hostname: 'lodeqleukaoshzarebxu.supabase.co',
            port: 443,
            path: '/rest/v1/audit_populations?select=id,file_name&limit=1',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'apikey': SERVICE_ROLE_KEY,
                'Content-Type': 'application/json'
            }
        };
        
        return await makeRequest(options);
    });
    
    console.log('\n📊 DIAGNÓSTICO COMPLETADO');
    console.log('=====================================');
    console.log('Si el PASO 3 (save_sample) falla o es muy lento,');
    console.log('ese es el problema que causa el botón pegado.');
}

main().catch(console.error);