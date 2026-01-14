// Debug script para diagnosticar el bucle infinito en selección de muestras
const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnosticando bucle infinito en selección de muestras...\n');

// Leer .env.local manualmente
const envPath = path.join(__dirname, '.env.local');
let envVars = {};

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#') && line.includes('=')) {
            const [key, ...valueParts] = line.split('=');
            const value = valueParts.join('=');
            envVars[key.trim()] = value.trim();
        }
    });
} catch (err) {
    console.error('❌ Error leyendo .env.local:', err.message);
    process.exit(1);
}

async function testGetUniverse() {
    console.log('🧪 Test: Probando get_universe que causa el bucle infinito...');
    
    // Primero obtener las poblaciones para usar un ID real
    try {
        const popResponse = await fetch('http://localhost:3000/api/sampling_proxy?action=get_populations');
        const popData = await popResponse.json();
        
        if (!popData.populations || popData.populations.length === 0) {
            console.error('❌ No hay poblaciones disponibles para probar');
            return false;
        }
        
        const population = popData.populations[0]; // Usar la primera población
        console.log(`   Usando población: ${population.audit_name} (ID: ${population.id})`);
        console.log(`   Registros esperados: ${population.total_rows}`);
        
        // Ahora probar get_universe con el ID real
        const response = await fetch(`http://localhost:3000/api/sampling_proxy?action=get_universe&population_id=${population.id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('   Status:', response.status);
        console.log('   Status Text:', response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error en get_universe:', errorText);
            return false;
        }

        const data = await response.json();
        console.log('✅ get_universe exitoso');
        console.log(`   Registros devueltos: ${data.rows?.length || 0}`);
        console.log(`   Registros esperados: ${population.total_rows}`);
        
        // DIAGNÓSTICO CRÍTICO: Verificar si devuelve demasiados registros
        if (data.rows && data.rows.length > 0) {
            console.log(`   Primer registro:`, JSON.stringify(data.rows[0], null, 2));
            
            // Comparar con lo esperado
            const expected = population.total_rows;
            const actual = data.rows.length;
            const ratio = actual / expected;
            
            console.log(`   Ratio actual/esperado: ${ratio.toFixed(2)}`);
            
            if (ratio > 2) {
                console.log('🚨 PROBLEMA DETECTADO: Demasiados registros (ratio > 2)');
                console.log('   Esto puede causar bucle infinito en el frontend');
            } else if (ratio > 1.5) {
                console.log('⚠️ ADVERTENCIA: Más registros de los esperados (ratio > 1.5)');
            } else {
                console.log('✅ Cantidad de registros parece normal');
            }
            
            // Verificar si hay registros duplicados
            const uniqueIds = new Set(data.rows.map(row => row.unique_id_col));
            if (uniqueIds.size !== data.rows.length) {
                console.log('🚨 PROBLEMA: Registros duplicados detectados');
                console.log(`   Total registros: ${data.rows.length}`);
                console.log(`   IDs únicos: ${uniqueIds.size}`);
                console.log(`   Duplicados: ${data.rows.length - uniqueIds.size}`);
            } else {
                console.log('✅ No hay registros duplicados');
            }
        }
        
        return { success: true, population, actual: data.rows?.length || 0 };
        
    } catch (err) {
        console.error('❌ Error en get_universe:', err.message);
        return false;
    }
}

async function testWithLimit(populationId) {
    console.log('\n🧪 Test: Probando get_universe con límite...');
    
    try {
        const response = await fetch(`http://localhost:3000/api/sampling_proxy?action=get_universe&population_id=${populationId}&limit=100`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error con límite:', errorText);
            return false;
        }

        const data = await response.json();
        console.log('✅ get_universe con límite exitoso');
        console.log(`   Registros devueltos: ${data.rows?.length || 0}`);
        
        return true;
        
    } catch (err) {
        console.error('❌ Error con límite:', err.message);
        return false;
    }
}

async function runDiagnostics() {
    const normalTest = await testGetUniverse();
    
    if (!normalTest || !normalTest.success) {
        console.log('\n❌ No se pudo completar el diagnóstico');
        return;
    }
    
    const limitTest = await testWithLimit(normalTest.population.id);
    
    console.log('\n🎯 Diagnóstico del bucle infinito:');
    console.log(`   Población: ${normalTest.population.audit_name}`);
    console.log(`   Esperados: ${normalTest.population.total_rows} registros`);
    console.log(`   Obtenidos: ${normalTest.actual} registros`);
    
    const ratio = normalTest.actual / normalTest.population.total_rows;
    
    if (ratio > 2) {
        console.log('🚨 CAUSA DEL BUCLE INFINITO IDENTIFICADA:');
        console.log(`   El API devuelve ${ratio.toFixed(1)}x más registros de los esperados`);
        console.log('   Esto sobrecarga el navegador y causa el bucle infinito');
        console.log('\n💡 SOLUCIÓN INMEDIATA:');
        console.log('   1. Implementar límite estricto en SamplingWorkspace');
        console.log('   2. Validar coherencia de datos antes de procesar');
        console.log('   3. Mostrar advertencia al usuario si hay inconsistencias');
    } else if (ratio > 1.5) {
        console.log('⚠️ POSIBLE CAUSA DEL BUCLE:');
        console.log(`   El API devuelve ${ratio.toFixed(1)}x más registros de los esperados`);
        console.log('   Esto puede causar lentitud y bucles en poblaciones grandes');
    } else {
        console.log('✅ La cantidad de registros parece normal');
        console.log('   El bucle infinito puede tener otra causa:');
        console.log('   - Timeout muy largo');
        console.log('   - Procesamiento ineficiente en el frontend');
        console.log('   - Problema en calculateSampleSize()');
    }
    
    console.log('\n📋 Recomendaciones específicas:');
    console.log('1. Limitar a máximo 25,000 registros siempre');
    console.log('2. Timeout de máximo 45 segundos');
    console.log('3. Validar ratio esperado/obtenido < 1.5');
    console.log('4. Mostrar progreso al usuario durante la carga');
}

runDiagnostics().catch(console.error);