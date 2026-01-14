#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO: ¿Por qué se cuelga save_sample?
 * 
 * Este script prueba específicamente el endpoint save_sample
 * que está causando que el botón se quede pegado.
 */

const https = require('https');

const SUPABASE_URL = 'https://lodeqleukaoshzarebxu.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_Y41PUF_8KWKeKnEJ6W8YIw_0ugk2aDO';

async function testSaveSample() {
    console.log('🔍 DIAGNÓSTICO: Probando save_sample endpoint...');
    console.log('⏰ Inicio:', new Date().toLocaleString());
    
    const testData = {
        population_id: 'test-population-id',
        method: 'MUS',
        sample_data: {
            population_id: 'test-population-id',
            method: 'MUS',
            objective: 'Test objetivo',
            seed: 12345,
            sample_size: 100,
            params_snapshot: { mus: { TE: 100000, EE: 0, V: 1000000 } },
            results_snapshot: { sampleSize: 100, sample: [] },
            is_final: true,
            is_current: true
        },
        is_final: true
    };

    const postData = JSON.stringify(testData);
    
    const options = {
        hostname: 'lodeqleukaoshzarebxu.supabase.co',
        port: 443,
        path: '/functions/v1/sampling_proxy',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'x-proxy-action': 'save_sample'
        },
        timeout: 10000 // 10 segundos timeout
    };

    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const req = https.request(options, (res) => {
            const duration = Date.now() - startTime;
            console.log(`📡 Respuesta recibida en ${duration}ms`);
            console.log(`📊 Status: ${res.statusCode}`);
            console.log(`📋 Headers:`, res.headers);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
                console.log(`📥 Chunk recibido: ${chunk.length} bytes`);
            });
            
            res.on('end', () => {
                const totalTime = Date.now() - startTime;
                console.log(`✅ Respuesta completa en ${totalTime}ms`);
                console.log(`📄 Data:`, data.substring(0, 500));
                resolve({ statusCode: res.statusCode, data, duration: totalTime });
            });
        });

        req.on('error', (err) => {
            const duration = Date.now() - startTime;
            console.error(`❌ Error en ${duration}ms:`, err.message);
            reject(err);
        });

        req.on('timeout', () => {
            const duration = Date.now() - startTime;
            console.error(`⏰ TIMEOUT en ${duration}ms`);
            req.destroy();
            reject(new Error(`Timeout después de ${duration}ms`));
        });

        req.setTimeout(10000); // 10 segundos
        
        console.log('📤 Enviando request...');
        req.write(postData);
        req.end();
    });
}

async function main() {
    try {
        console.log('🚀 Iniciando diagnóstico de save_sample...\n');
        
        const result = await testSaveSample();
        
        console.log('\n✅ RESULTADO:');
        console.log(`   Status: ${result.statusCode}`);
        console.log(`   Duración: ${result.duration}ms`);
        
        if (result.duration > 5000) {
            console.log('⚠️  PROBLEMA DETECTADO: Respuesta muy lenta (>5s)');
        } else {
            console.log('✅ Respuesta normal');
        }
        
    } catch (error) {
        console.log('\n❌ ERROR DETECTADO:');
        console.log(`   Tipo: ${error.name}`);
        console.log(`   Mensaje: ${error.message}`);
        
        if (error.message.includes('Timeout')) {
            console.log('\n🔍 DIAGNÓSTICO: El endpoint save_sample está colgándose');
            console.log('   - Esto explica por qué el botón se queda pegado');
            console.log('   - La llamada nunca termina, por lo que onComplete() nunca se ejecuta');
            console.log('   - Solución: Usar modo simulación o arreglar el endpoint');
        }
    }
}

main();