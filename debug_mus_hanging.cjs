// Debug específico para el colgado de MUS
const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnosticando por qué MUS se queda colgado...\n');

async function testMUSSpecific() {
    console.log('🧪 Test: Simulando exactamente lo que hace MUS...');
    
    try {
        // Primero obtener las poblaciones
        const popResponse = await fetch('http://localhost:3000/api/sampling_proxy?action=get_populations');
        const popData = await popResponse.json();
        
        if (!popData.populations || popData.populations.length === 0) {
            console.error('❌ No hay poblaciones disponibles');
            return;
        }
        
        const population = popData.populations[0];
        console.log(`   Usando población: ${population.audit_name}`);
        console.log(`   ID: ${population.id}`);
        console.log(`   Registros esperados: ${population.total_rows}`);
        console.log(`   Valor total: $${population.total_monetary_value?.toLocaleString()}`);
        
        // Simular la llamada exacta que hace MUS
        console.log('\n🌐 Simulando get_universe (como lo hace MUS)...');
        const startTime = Date.now();
        
        const response = await fetch(`http://localhost:3000/api/sampling_proxy?action=get_universe&population_id=${population.id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const loadTime = Date.now() - startTime;
        console.log(`   Tiempo de respuesta: ${loadTime}ms`);
        console.log(`   Status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error en get_universe:', errorText);
            return;
        }

        const data = await response.json();
        console.log(`   Registros obtenidos: ${data.rows?.length || 0}`);
        
        if (data.rows && data.rows.length > 0) {
            console.log(`   Primer registro:`, {
                id: data.rows[0].unique_id_col,
                value: data.rows[0].monetary_value_col,
                risk_score: data.rows[0].risk_score
            });
            
            // Simular cálculos MUS básicos
            console.log('\n🧮 Simulando cálculos MUS...');
            
            const effectiveV = data.rows.reduce((acc, row) => acc + (row.monetary_value_col || 0), 0);
            console.log(`   Valor efectivo total: $${effectiveV.toLocaleString()}`);
            
            // Parámetros MUS típicos (como en tu imagen)
            const TE = 16666.67;
            const EE = 0;
            const FC = 3.0; // Factor de confiabilidad 95%
            
            const numerator = effectiveV * FC;
            const denominator = TE - EE;
            const calculatedSize = Math.ceil(numerator / denominator);
            
            console.log(`   Tamaño calculado: ${calculatedSize}`);
            console.log(`   Intervalo de muestreo: $${(effectiveV / calculatedSize).toLocaleString()}`);
            
            // Aquí es donde puede estar el problema
            if (calculatedSize > data.rows.length * 2) {
                console.log('🚨 PROBLEMA DETECTADO: Tamaño de muestra excesivo');
                console.log(`   Calculado: ${calculatedSize}`);
                console.log(`   Población: ${data.rows.length}`);
                console.log(`   Ratio: ${(calculatedSize / data.rows.length).toFixed(2)}`);
            }
            
            // Simular selección sistemática problemática
            console.log('\n🎯 Simulando selección sistemática...');
            const N = data.rows.length;
            const sampleSize = Math.min(calculatedSize, 500); // Como en tu imagen
            const step = N / sampleSize;
            
            console.log(`   N (población): ${N}`);
            console.log(`   Muestra objetivo: ${sampleSize}`);
            console.log(`   Step calculado: ${step}`);
            
            if (!isFinite(step) || step <= 0) {
                console.log('🚨 PROBLEMA: Step inválido que causa bucle infinito');
            } else if (step < 0.1) {
                console.log('🚨 PROBLEMA: Step muy pequeño que causa muchas iteraciones');
            } else {
                console.log('✅ Step parece normal');
            }
        }
        
    } catch (err) {
        console.error('❌ Error en test MUS:', err.message);
    }
}

async function testCalculateSampleSize() {
    console.log('\n🧪 Test: Verificando si calculateSampleSize se cuelga...');
    
    // Crear datos de prueba pequeños
    const testRows = [];
    for (let i = 0; i < 100; i++) {
        testRows.push({
            unique_id_col: `TEST-${i}`,
            monetary_value_col: Math.random() * 10000,
            risk_score: 0
        });
    }
    
    console.log(`   Datos de prueba creados: ${testRows.length} registros`);
    
    // Simular parámetros MUS
    const testAppState = {
        samplingMethod: 'MUS',
        samplingParams: {
            mus: {
                TE: 16666.67,
                EE: 0,
                RIA: 5,
                handleNegatives: 'Absolute',
                optimizeTopStratum: true,
                usePilotSample: false
            }
        },
        generalParams: {
            seed: 12345
        }
    };
    
    console.log('   Parámetros MUS configurados');
    console.log('   ⚠️ NOTA: Si este test se cuelga, el problema está en calculateSampleSize');
    
    // Aquí deberíamos llamar calculateSampleSize pero no podemos desde Node.js
    // El usuario debe hacer este test en el navegador
    console.log('   💡 Para probar calculateSampleSize:');
    console.log('   1. Abre la consola del navegador');
    console.log('   2. Ejecuta: console.time("MUS"); // antes de presionar el botón');
    console.log('   3. Presiona "EJECUTAR NUEVA SELECCIÓN"');
    console.log('   4. Si no termina en 10 segundos, el problema está en calculateSampleSize');
}

async function runDiagnostics() {
    await testMUSSpecific();
    await testCalculateSampleSize();
    
    console.log('\n🎯 Diagnóstico del colgado MUS:');
    console.log('1. Si get_universe tarda >5 segundos: problema de API');
    console.log('2. Si step es inválido o muy pequeño: problema de cálculo');
    console.log('3. Si tamaño calculado es excesivo: problema de parámetros');
    console.log('4. Si calculateSampleSize no termina: problema en selectItems');
    
    console.log('\n📋 Próximos pasos:');
    console.log('1. Ejecuta este diagnóstico');
    console.log('2. Revisa los logs en la consola del navegador');
    console.log('3. Identifica dónde exactamente se cuelga el proceso');
}

runDiagnostics().catch(console.error);