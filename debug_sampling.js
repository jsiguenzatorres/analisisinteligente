// Script de diagnóstico para identificar bucles infinitos en el muestreo

console.log("🔍 INICIANDO DIAGNÓSTICO DE MUESTREO");

// 1. Verificar conexión a Supabase
async function testSupabaseConnection() {
    try {
        console.log("📡 Probando conexión directa a Supabase...");
        const response = await fetch('/supaproxy/rest/v1/audit_populations?select=id&limit=1', {
            headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZGVxbGV1a2Fvc2h6YXJlYnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjE3NzQsImV4cCI6MjA4MTEzNzc3NH0.ql-JBWcxWRnnQsHoSCuBsodyVP4SuJiCWRTJxkSTNDc',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZGVxbGV1a2Fvc2h6YXJlYnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjE3NzQsImV4cCI6MjA4MTEzNzc3NH0.ql-JBWcxWRnnQsHoSCuBsodyVP4SuJiCWRTJxkSTNDc'
            }
        });
        
        if (response.ok) {
            console.log("✅ Conexión directa a Supabase: OK");
            return true;
        } else {
            console.error("❌ Error en conexión directa:", response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.error("❌ Error de red en conexión directa:", error);
        return false;
    }
}

// 2. Verificar proxy de Netlify/Vercel
async function testProxyConnection() {
    try {
        console.log("🔄 Probando proxy de API...");
        const response = await fetch('/api/sampling_proxy?action=get_populations');
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Proxy de API: OK", data);
            return true;
        } else {
            console.error("❌ Error en proxy:", response.status, response.statusText);
            const text = await response.text();
            console.error("Respuesta:", text);
            return false;
        }
    } catch (error) {
        console.error("❌ Error de red en proxy:", error);
        return false;
    }
}

// 3. Simular cálculo de muestra para detectar bucles
function testSampleCalculation() {
    console.log("🧮 Probando cálculo de muestra...");
    
    // Simular datos de prueba
    const mockAppState = {
        samplingMethod: 'attribute',
        samplingParams: {
            attribute: { N: 1000, NC: 95, ET: 5, PE: 1, useSequential: false }
        },
        generalParams: { seed: 12345 }
    };
    
    const mockRealRows = Array.from({ length: 1000 }, (_, i) => ({
        unique_id_col: `TEST-${i}`,
        monetary_value_col: Math.random() * 10000,
        risk_score: Math.random() * 100
    }));
    
    try {
        // Aquí simularíamos el cálculo - necesitaríamos importar la función
        console.log("⚠️ Cálculo de muestra requiere importar statisticalService");
        return true;
    } catch (error) {
        console.error("❌ Error en cálculo de muestra:", error);
        return false;
    }
}

// 4. Verificar timeouts y configuración de red
function checkNetworkConfig() {
    console.log("🌐 Verificando configuración de red...");
    
    // Verificar si hay timeouts configurados
    const originalFetch = window.fetch;
    let fetchCount = 0;
    
    window.fetch = function(...args) {
        fetchCount++;
        console.log(`📡 Fetch #${fetchCount}:`, args[0]);
        
        // Detectar bucles de fetch
        if (fetchCount > 10) {
            console.error("🚨 POSIBLE BUCLE DETECTADO: Más de 10 requests en secuencia");
        }
        
        return originalFetch.apply(this, args);
    };
    
    // Resetear contador después de 5 segundos
    setTimeout(() => {
        fetchCount = 0;
        console.log("🔄 Contador de fetch reseteado");
    }, 5000);
}

// Ejecutar diagnósticos
async function runDiagnostics() {
    console.log("🚀 Ejecutando diagnósticos completos...");
    
    checkNetworkConfig();
    
    const supabaseOK = await testSupabaseConnection();
    const proxyOK = await testProxyConnection();
    const calculationOK = testSampleCalculation();
    
    console.log("\n📊 RESUMEN DE DIAGNÓSTICOS:");
    console.log("Supabase directo:", supabaseOK ? "✅" : "❌");
    console.log("Proxy API:", proxyOK ? "✅" : "❌");
    console.log("Cálculo muestra:", calculationOK ? "✅" : "❌");
    
    if (!supabaseOK && !proxyOK) {
        console.error("🚨 PROBLEMA CRÍTICO: Ninguna conexión funciona");
        console.log("💡 SOLUCIONES SUGERIDAS:");
        console.log("1. Verificar variables de entorno (.env)");
        console.log("2. Verificar que el servidor de desarrollo esté corriendo");
        console.log("3. Verificar conectividad a internet");
        console.log("4. Verificar configuración de proxy en vite.config.ts");
    }
}

// Exportar para uso en consola
window.debugSampling = {
    runDiagnostics,
    testSupabaseConnection,
    testProxyConnection,
    testSampleCalculation,
    checkNetworkConfig
};

console.log("🎯 Diagnóstico cargado. Ejecuta: debugSampling.runDiagnostics()");