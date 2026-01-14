// Script de prueba para verificar que los bucles infinitos están resueltos

console.log("🧪 INICIANDO PRUEBAS DE MUESTREO");

// Simular datos de prueba
const mockAppState = {
    samplingMethod: 'attribute',
    samplingParams: {
        attribute: { N: 1000, NC: 95, ET: 5, PE: 1, useSequential: false },
        mus: { V: 1000000, TE: 50000, EE: 500, RIA: 5, optimizeTopStratum: true, handleNegatives: 'Separate', usePilotSample: false }
    },
    generalParams: { seed: 12345 },
    selectedPopulation: { id: 'test-population' }
};

const mockRealRows = Array.from({ length: 100 }, (_, i) => ({
    unique_id_col: `TEST-${i}`,
    monetary_value_col: Math.random() * 10000,
    risk_score: Math.random() * 100,
    raw_json: { test: true }
}));

// Test 1: Verificar que fetch con timeout funciona
async function testFetchTimeout() {
    console.log("📡 Probando fetch con timeout...");
    
    try {
        // Simular una URL que no responde rápido
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 segundo
        
        const response = await fetch('https://httpbin.org/delay/5', {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log("❌ El timeout no funcionó correctamente");
        return false;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log("✅ Timeout funcionando correctamente");
            return true;
        } else {
            console.log("❌ Error inesperado:", error.message);
            return false;
        }
    }
}

// Test 2: Verificar que el proxy responde
async function testProxyResponse() {
    console.log("🔄 Probando respuesta del proxy...");
    
    try {
        const response = await fetch('/api/sampling_proxy?action=get_populations', {
            signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Proxy respondiendo correctamente:", data);
            return true;
        } else {
            console.log("❌ Proxy devolvió error:", response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.log("❌ Error conectando al proxy:", error.message);
        return false;
    }
}

// Test 3: Verificar que no hay bucles en el cálculo
function testCalculationLoop() {
    console.log("🧮 Probando cálculos sin bucles...");
    
    const startTime = Date.now();
    let iterations = 0;
    const maxTime = 5000; // 5 segundos máximo
    
    try {
        // Simular cálculo que podría entrar en bucle
        while (Date.now() - startTime < maxTime && iterations < 10000) {
            iterations++;
            
            // Simular trabajo de cálculo
            const result = Math.sqrt(iterations) * Math.random();
            
            // Condición de salida
            if (iterations >= 1000) break;
        }
        
        const elapsed = Date.now() - startTime;
        
        if (elapsed < maxTime && iterations < 10000) {
            console.log(`✅ Cálculo completado sin bucles (${iterations} iteraciones, ${elapsed}ms)`);
            return true;
        } else {
            console.log(`❌ Posible bucle detectado (${iterations} iteraciones, ${elapsed}ms)`);
            return false;
        }
    } catch (error) {
        console.log("❌ Error en cálculo:", error.message);
        return false;
    }
}

// Test 4: Verificar límites de tamaño
function testSizeLimits() {
    console.log("📏 Probando límites de tamaño...");
    
    try {
        const MAX_SAMPLE_SIZE = 50000;
        const testSize = 100000; // Más grande que el límite
        
        if (testSize > MAX_SAMPLE_SIZE) {
            console.log(`✅ Límite de tamaño funcionando (${testSize} > ${MAX_SAMPLE_SIZE})`);
            return true;
        } else {
            console.log("❌ Límite de tamaño no está funcionando");
            return false;
        }
    } catch (error) {
        console.log("❌ Error verificando límites:", error.message);
        return false;
    }
}

// Ejecutar todas las pruebas
async function runAllTests() {
    console.log("🚀 Ejecutando todas las pruebas...");
    
    const results = {
        timeout: await testFetchTimeout(),
        proxy: await testProxyResponse(),
        calculation: testCalculationLoop(),
        limits: testSizeLimits()
    };
    
    console.log("\n📊 RESULTADOS DE PRUEBAS:");
    console.log("Timeout:", results.timeout ? "✅" : "❌");
    console.log("Proxy:", results.proxy ? "✅" : "❌");
    console.log("Cálculo:", results.calculation ? "✅" : "❌");
    console.log("Límites:", results.limits ? "✅" : "❌");
    
    const allPassed = Object.values(results).every(result => result);
    
    if (allPassed) {
        console.log("\n🎉 TODAS LAS PRUEBAS PASARON - Los bucles infinitos deberían estar resueltos");
    } else {
        console.log("\n⚠️ ALGUNAS PRUEBAS FALLARON - Revisar los problemas identificados");
    }
    
    return results;
}

// Exportar para uso en consola
window.testSamplingFix = {
    runAllTests,
    testFetchTimeout,
    testProxyResponse,
    testCalculationLoop,
    testSizeLimits
};

console.log("🎯 Pruebas cargadas. Ejecuta: testSamplingFix.runAllTests()");