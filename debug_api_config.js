// Script para diagnosticar problemas de configuración de API

console.log("🔍 DIAGNÓSTICO DE CONFIGURACIÓN DE API");

// Función para probar las APIs una por una
async function testAPIEndpoints() {
    console.log("🧪 PROBANDO ENDPOINTS DE API...\n");
    
    const endpoints = [
        {
            name: "get_populations",
            url: "/api/sampling_proxy?action=get_populations",
            method: "GET"
        },
        {
            name: "get_users", 
            url: "/api/sampling_proxy?action=get_users",
            method: "GET"
        },
        {
            name: "update_risk_batch",
            url: "/api/update_risk_batch",
            method: "POST",
            body: { updates: [] }
        }
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
        try {
            console.log(`📡 Probando ${endpoint.name}...`);
            
            const options = {
                method: endpoint.method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (endpoint.body) {
                options.body = JSON.stringify(endpoint.body);
            }
            
            const response = await fetch(endpoint.url, options);
            const responseText = await response.text();
            
            results[endpoint.name] = {
                status: response.status,
                ok: response.ok,
                response: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
            };
            
            if (response.ok) {
                console.log(`✅ ${endpoint.name}: OK (${response.status})`);
            } else {
                console.log(`❌ ${endpoint.name}: ERROR (${response.status})`);
                console.log(`   Response: ${responseText.substring(0, 100)}...`);
            }
            
        } catch (error) {
            console.log(`💥 ${endpoint.name}: EXCEPTION - ${error.message}`);
            results[endpoint.name] = {
                status: 'ERROR',
                ok: false,
                response: error.message
            };
        }
        
        // Pausa pequeña entre requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
}

// Función para verificar variables de entorno (desde el cliente)
function checkEnvironmentVariables() {
    console.log("🔧 VERIFICANDO VARIABLES DE ENTORNO...\n");
    
    const requiredVars = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY'
    ];
    
    const results = {};
    
    requiredVars.forEach(varName => {
        const value = import.meta.env[varName];
        results[varName] = {
            exists: !!value,
            length: value ? value.length : 0,
            preview: value ? value.substring(0, 20) + '...' : 'NOT SET'
        };
        
        if (value) {
            console.log(`✅ ${varName}: ${value.substring(0, 20)}... (${value.length} chars)`);
        } else {
            console.log(`❌ ${varName}: NOT SET`);
        }
    });
    
    return results;
}

// Función para probar conectividad directa a Supabase
async function testSupabaseDirectConnection() {
    console.log("🔗 PROBANDO CONEXIÓN DIRECTA A SUPABASE...\n");
    
    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !anonKey) {
            console.log("❌ Variables de Supabase no configuradas");
            return false;
        }
        
        // Probar endpoint de health
        const healthUrl = `${supabaseUrl}/rest/v1/`;
        const response = await fetch(healthUrl, {
            headers: {
                'apikey': anonKey,
                'Authorization': `Bearer ${anonKey}`
            }
        });
        
        console.log(`📡 Health check: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            console.log("✅ Conexión directa a Supabase: OK");
            return true;
        } else {
            console.log("❌ Conexión directa a Supabase: FALLO");
            return false;
        }
        
    } catch (error) {
        console.log(`💥 Error en conexión directa: ${error.message}`);
        return false;
    }
}

// Función para diagnosticar el problema específico
async function diagnoseAPIProblems() {
    console.log("🚨 DIAGNÓSTICO COMPLETO DE PROBLEMAS DE API\n");
    
    // 1. Verificar variables de entorno
    const envVars = checkEnvironmentVariables();
    console.log("\n");
    
    // 2. Probar conexión directa
    const directConnection = await testSupabaseDirectConnection();
    console.log("\n");
    
    // 3. Probar endpoints de API
    const apiResults = await testAPIEndpoints();
    console.log("\n");
    
    // 4. Análisis y recomendaciones
    console.log("📊 ANÁLISIS DE RESULTADOS:");
    console.log("=" .repeat(50));
    
    // Verificar si el problema es de configuración
    const hasRequiredVars = envVars.VITE_SUPABASE_URL?.exists && envVars.VITE_SUPABASE_ANON_KEY?.exists;
    
    if (!hasRequiredVars) {
        console.log("🚨 PROBLEMA: Variables de entorno faltantes");
        console.log("💡 SOLUCIÓN: Configurar .env.local con las variables de Supabase");
        return;
    }
    
    if (!directConnection) {
        console.log("🚨 PROBLEMA: No hay conectividad con Supabase");
        console.log("💡 SOLUCIÓN: Verificar URL y claves de Supabase");
        return;
    }
    
    // Verificar APIs específicas
    const failedAPIs = Object.entries(apiResults).filter(([name, result]) => !result.ok);
    
    if (failedAPIs.length > 0) {
        console.log("🚨 PROBLEMA: APIs fallando:");
        failedAPIs.forEach(([name, result]) => {
            console.log(`   ❌ ${name}: ${result.status} - ${result.response.substring(0, 50)}...`);
        });
        
        // Verificar si es problema de SERVICE_ROLE_KEY
        const has500Errors = failedAPIs.some(([name, result]) => result.status === 500);
        if (has500Errors) {
            console.log("\n💡 POSIBLE CAUSA: Falta SUPABASE_SERVICE_ROLE_KEY en variables de entorno del servidor");
            console.log("💡 SOLUCIÓN: Agregar SUPABASE_SERVICE_ROLE_KEY a .env.local");
        }
    } else {
        console.log("✅ Todas las APIs funcionan correctamente");
    }
    
    return {
        envVars,
        directConnection,
        apiResults,
        summary: {
            hasRequiredVars,
            directConnection,
            failedAPIs: failedAPIs.length
        }
    };
}

// Función para generar el SERVICE_ROLE_KEY faltante
function generateServiceRoleKeyInstructions() {
    console.log("🔑 INSTRUCCIONES PARA OBTENER SERVICE_ROLE_KEY:");
    console.log("=" .repeat(50));
    console.log("1. Ir a https://supabase.com/dashboard");
    console.log("2. Seleccionar tu proyecto");
    console.log("3. Ir a Settings > API");
    console.log("4. Copiar el 'service_role' key (NO el anon key)");
    console.log("5. Agregarlo a .env.local como:");
    console.log("   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");
    console.log("\n⚠️ IMPORTANTE: El service_role key es SECRETO, no lo compartas");
}

// Exportar funciones para uso en consola
window.debugAPIConfig = {
    diagnoseAPIProblems,
    testAPIEndpoints,
    checkEnvironmentVariables,
    testSupabaseDirectConnection,
    generateServiceRoleKeyInstructions
};

console.log("🎯 Diagnóstico de API cargado.");
console.log("Ejecuta: debugAPIConfig.diagnoseAPIProblems()");
console.log("Para instrucciones de SERVICE_ROLE_KEY: debugAPIConfig.generateServiceRoleKeyInstructions()");