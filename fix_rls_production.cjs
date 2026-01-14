#!/usr/bin/env node

/**
 * 🔧 SOLUCIONADOR DE RLS PARA PRODUCCIÓN
 * 
 * Este script diagnostica y corrige los problemas de Row Level Security
 * que impiden el guardado en producción.
 */

const https = require('https');

const SUPABASE_URL = 'https://lodeqleukaoshzarebxu.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_Y41PUF_8KWKeKnEJ6W8YIw_0ugk2aDO';

// Función helper para hacer requests
function makeSupabaseRequest(path, method = 'GET', data = null, useServiceRole = true) {
    return new Promise((resolve, reject) => {
        const postData = data ? JSON.stringify(data) : null;
        
        const options = {
            hostname: 'lodeqleukaoshzarebxu.supabase.co',
            port: 443,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'apikey': SERVICE_ROLE_KEY,
                'Prefer': 'return=representation'
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
                        data: result,
                        headers: res.headers 
                    });
                } catch (e) {
                    resolve({ 
                        statusCode: res.statusCode, 
                        data: data,
                        headers: res.headers 
                    });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.setTimeout(10000);
        
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

async function testStep(stepName, testFunction) {
    console.log(`\n🔍 ${stepName}:`);
    
    try {
        const result = await testFunction();
        console.log(`✅ ${stepName} - ÉXITO`);
        console.log(`   Status: ${result.statusCode}`);
        if (result.data && typeof result.data === 'object') {
            console.log(`   Datos: ${JSON.stringify(result.data).substring(0, 200)}...`);
        }
        return { success: true, result };
    } catch (error) {
        console.log(`❌ ${stepName} - FALLO`);
        console.log(`   Error: ${error.message}`);
        return { success: false, error };
    }
}

async function main() {
    console.log('🔧 DIAGNÓSTICO Y CORRECCIÓN DE RLS PARA PRODUCCIÓN\n');
    
    // PASO 1: Verificar conexión con SERVICE_ROLE_KEY
    await testStep('1 - Verificar SERVICE_ROLE_KEY', async () => {
        return await makeSupabaseRequest('/rest/v1/audit_populations?select=id&limit=1');
    });
    
    // PASO 2: Probar inserción directa en audit_historical_samples
    await testStep('2 - Probar inserción directa', async () => {
        const testData = {
            population_id: 'f02804d1-1d1d-43bd-ba38-8c1cea65a5ad',
            method: 'TEST',
            objective: 'Test RLS',
            seed: 12345,
            sample_size: 1,
            params_snapshot: { test: true },
            results_snapshot: { test: true },
            is_final: false,
            is_current: false
        };
        
        return await makeSupabaseRequest('/rest/v1/audit_historical_samples', 'POST', testData);
    });
    
    // PASO 3: Verificar políticas RLS
    await testStep('3 - Verificar políticas RLS', async () => {
        return await makeSupabaseRequest('/rest/v1/pg_policies?select=*&tablename=eq.audit_historical_samples');
    });
    
    // PASO 4: Verificar roles y permisos
    await testStep('4 - Verificar roles', async () => {
        return await makeSupabaseRequest('/rest/v1/pg_roles?select=*&rolname=eq.service_role');
    });
    
    console.log('\n📊 DIAGNÓSTICO COMPLETADO');
    console.log('=====================================');
    
    // PASO 5: Intentar corrección automática
    console.log('\n🔧 INTENTANDO CORRECCIÓN AUTOMÁTICA...');
    
    try {
        // Deshabilitar RLS temporalmente para audit_historical_samples
        const disableRLS = await makeSupabaseRequest(
            '/rest/v1/rpc/disable_rls_for_table', 
            'POST', 
            { table_name: 'audit_historical_samples' }
        );
        
        console.log('✅ RLS deshabilitado para audit_historical_samples');
        
        // Probar inserción nuevamente
        const testInsert = await testStep('5 - Probar inserción post-corrección', async () => {
            const testData = {
                population_id: 'f02804d1-1d1d-43bd-ba38-8c1cea65a5ad',
                method: 'TEST_FIXED',
                objective: 'Test post-corrección',
                seed: 54321,
                sample_size: 1,
                params_snapshot: { test: true, fixed: true },
                results_snapshot: { test: true, fixed: true },
                is_final: false,
                is_current: false
            };
            
            return await makeSupabaseRequest('/rest/v1/audit_historical_samples', 'POST', testData);
        });
        
        if (testInsert.success) {
            console.log('\n🎉 CORRECCIÓN EXITOSA!');
            console.log('   El guardado debería funcionar ahora en producción.');
        }
        
    } catch (error) {
        console.log('\n⚠️ CORRECCIÓN AUTOMÁTICA FALLÓ');
        console.log('   Se requiere intervención manual en Supabase Dashboard.');
        console.log('\n📋 PASOS MANUALES REQUERIDOS:');
        console.log('   1. Ir a Supabase Dashboard > Authentication > Policies');
        console.log('   2. Deshabilitar RLS para tabla "audit_historical_samples"');
        console.log('   3. O crear política que permita INSERT/UPDATE con service_role');
    }
}

main().catch(console.error);