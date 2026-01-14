#!/usr/bin/env node

/**
 * 🧪 PRUEBA DE GUARDADO EN PRODUCCIÓN
 * 
 * Este script simula el flujo completo de guardado
 * para verificar que funciona correctamente.
 */

const https = require('https');

const PRODUCTION_URL = 'https://analisisinteligente.vercel.app';

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const postData = data ? JSON.stringify(data) : null;
        
        const options = {
            hostname: 'analisisinteligente.vercel.app',
            port: 443,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = data ? JSON.parse(data) : {};
                    resolve({ 
                        statusCode: res.statusCode, 
                        data: result
                    });
                } catch (e) {
                    resolve({ 
                        statusCode: res.statusCode, 
                        data: data
                    });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.setTimeout(15000);
        
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

async function testProductionSave() {
    console.log('🧪 PRUEBA DE GUARDADO EN PRODUCCIÓN\n');
    
    try {
        // PASO 1: Verificar que el endpoint está disponible
        console.log('🔍 1. Verificando endpoint de producción...');
        const healthCheck = await makeRequest('/api/sampling_proxy?action=get_populations');
        
        if (healthCheck.statusCode === 200) {
            console.log('✅ Endpoint disponible');
        } else {
            console.log(`⚠️ Endpoint responde con status ${healthCheck.statusCode}`);
        }
        
        // PASO 2: Probar guardado de muestra
        console.log('\n🔍 2. Probando guardado de muestra...');
        
        const testSampleData = {
            population_id: 'f02804d1-1d1d-43bd-ba38-8c1cea65a5ad',
            method: 'MUS',
            sample_data: {
                population_id: 'f02804d1-1d1d-43bd-ba38-8c1cea65a5ad',
                method: 'MUS',
                objective: 'Prueba de guardado en producción',
                seed: 99999,
                sample_size: 100,
                params_snapshot: {
                    mus: {
                        TE: 100000,
                        EE: 0,
                        V: 1000000,
                        RIA: 5,
                        handleNegatives: 'Absolute',
                        optimizeTopStratum: true,
                        usePilotSample: false
                    }
                },
                results_snapshot: {
                    sampleSize: 100,
                    sample: [],
                    totalErrorProjection: 0,
                    upperErrorLimit: 0,
                    findings: [],
                    methodologyNotes: ['Prueba de guardado en producción - RLS corregido']
                },
                is_final: true,
                is_current: true
            },
            is_final: true
        };
        
        const saveResult = await makeRequest('/api/sampling_proxy?action=save_sample', 'POST', testSampleData);
        
        if (saveResult.statusCode === 200) {
            console.log('✅ Guardado exitoso en producción');
            console.log(`   ID generado: ${saveResult.data.id || 'N/A'}`);
            
            // PASO 3: Verificar que se guardó consultando el historial
            console.log('\n🔍 3. Verificando que se guardó en historial...');
            const historyResult = await makeRequest(`/api/sampling_proxy?action=get_history&population_id=f02804d1-1d1d-43bd-ba38-8c1cea65a5ad`);
            
            if (historyResult.statusCode === 200 && historyResult.data.history) {
                const testEntry = historyResult.data.history.find(h => h.seed === 99999);
                if (testEntry) {
                    console.log('✅ Entrada encontrada en historial');
                    console.log(`   Método: ${testEntry.method}`);
                    console.log(`   Objetivo: ${testEntry.objective}`);
                    console.log(`   Fecha: ${testEntry.created_at}`);
                } else {
                    console.log('⚠️ Entrada no encontrada en historial');
                }
            } else {
                console.log('⚠️ No se pudo verificar el historial');
            }
            
        } else {
            console.log(`❌ Error en guardado: Status ${saveResult.statusCode}`);
            console.log(`   Respuesta: ${JSON.stringify(saveResult.data).substring(0, 200)}`);
        }
        
        console.log('\n🎉 PRUEBA COMPLETADA');
        console.log('=====================================');
        
        if (saveResult.statusCode === 200) {
            console.log('✅ EL GUARDADO EN PRODUCCIÓN FUNCIONA CORRECTAMENTE');
            console.log('   Puedes desactivar el modo emergencia con seguridad.');
        } else {
            console.log('❌ EL GUARDADO AÚN TIENE PROBLEMAS');
            console.log('   Mantén el modo emergencia activado hasta resolver.');
        }
        
    } catch (error) {
        console.log('\n❌ ERROR EN LA PRUEBA:');
        console.log(`   ${error.message}`);
        console.log('\n⚠️ RECOMENDACIÓN: Mantener modo emergencia activado');
    }
}

testProductionSave();