#!/usr/bin/env node

/**
 * 🧪 PRUEBA DE TODOS LOS MÉTODOS DE MUESTREO
 * 
 * Este script verifica que la solución funcione
 * para todos los métodos de muestreo disponibles.
 */

const https = require('https');

const PRODUCTION_URL = 'https://analisisinteligente.vercel.app';
const POPULATION_ID = 'f02804d1-1d1d-43bd-ba38-8c1cea65a5ad';

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

// Configuraciones de prueba para cada método
const testConfigs = {
    'MUS': {
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
        sample_size: 100
    },
    'Attribute': {
        params_snapshot: {
            attribute: {
                NC: 95,
                ET: 5,
                PE: 1,
                N: 1000,
                useSequential: false
            }
        },
        sample_size: 60
    },
    'CAV': {
        params_snapshot: {
            cav: {
                NC: 95,
                TE: 50000,
                sigma: 25000,
                estimationTechnique: 'Media',
                usePilotSample: false
            }
        },
        sample_size: 80
    },
    'Stratified': {
        params_snapshot: {
            stratified: {
                basis: 'Monetary',
                strataCount: 3,
                allocationMethod: 'Proporcional',
                sampleSize: 90,
                certaintyStratumThreshold: 100000
            }
        },
        sample_size: 90
    },
    'NonStatistical': {
        params_snapshot: {
            nonStatistical: {
                sampleSize: 50,
                selectedInsight: 'Default'
            }
        },
        sample_size: 50
    }
};

async function testMethod(methodName, config) {
    console.log(`\n🔍 PROBANDO: ${methodName}`);
    console.log('⏰ Inicio:', new Date().toLocaleTimeString());
    
    try {
        const testSampleData = {
            population_id: POPULATION_ID,
            method: methodName,
            sample_data: {
                population_id: POPULATION_ID,
                method: methodName,
                objective: `Prueba automatizada - ${methodName}`,
                seed: Math.floor(Math.random() * 100000),
                sample_size: config.sample_size,
                params_snapshot: config.params_snapshot,
                results_snapshot: {
                    sampleSize: config.sample_size,
                    sample: [],
                    totalErrorProjection: 0,
                    upperErrorLimit: 0,
                    findings: [],
                    methodologyNotes: [`Prueba automatizada de ${methodName} - Solución aplicada`]
                },
                is_final: true,
                is_current: false // No marcar como current para no interferir
            },
            is_final: true
        };
        
        const startTime = Date.now();
        const result = await makeRequest('/api/sampling_proxy?action=save_sample', 'POST', testSampleData);
        const duration = Date.now() - startTime;
        
        if (result.statusCode === 200) {
            console.log(`✅ ${methodName} - ÉXITO en ${duration}ms`);
            console.log(`   ID: ${result.data.id || 'N/A'}`);
            return { method: methodName, success: true, duration, id: result.data.id };
        } else {
            console.log(`❌ ${methodName} - FALLO (Status: ${result.statusCode})`);
            console.log(`   Error: ${JSON.stringify(result.data).substring(0, 100)}`);
            return { method: methodName, success: false, duration, error: result.data };
        }
        
    } catch (error) {
        console.log(`❌ ${methodName} - ERROR: ${error.message}`);
        return { method: methodName, success: false, error: error.message };
    }
}

async function main() {
    console.log('🧪 PRUEBA COMPLETA DE TODOS LOS MÉTODOS DE MUESTREO');
    console.log('====================================================\n');
    
    const results = [];
    
    // Probar cada método
    for (const [methodName, config] of Object.entries(testConfigs)) {
        const result = await testMethod(methodName, config);
        results.push(result);
        
        // Pausa entre pruebas para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Resumen final
    console.log('\n📊 RESUMEN DE RESULTADOS');
    console.log('========================');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Métodos exitosos: ${successful.length}/${results.length}`);
    successful.forEach(r => {
        console.log(`   • ${r.method}: ${r.duration}ms`);
    });
    
    if (failed.length > 0) {
        console.log(`\n❌ Métodos fallidos: ${failed.length}/${results.length}`);
        failed.forEach(r => {
            console.log(`   • ${r.method}: ${r.error}`);
        });
    }
    
    console.log('\n🎯 CONCLUSIÓN:');
    if (successful.length === results.length) {
        console.log('🎉 TODOS LOS MÉTODOS FUNCIONAN CORRECTAMENTE');
        console.log('   La solución es universal y funciona para todos los métodos.');
    } else if (successful.length > 0) {
        console.log('⚠️ SOLUCIÓN PARCIAL');
        console.log(`   ${successful.length} métodos funcionan, ${failed.length} requieren atención adicional.`);
    } else {
        console.log('❌ LA SOLUCIÓN NO FUNCIONA');
        console.log('   Todos los métodos fallan. Se requiere revisión completa.');
    }
}

main().catch(console.error);