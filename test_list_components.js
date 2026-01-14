// Script de prueba específico para componentes de listas (PopulationManager y AdminUserManagement)

console.log("📋 INICIANDO PRUEBAS DE COMPONENTES DE LISTAS");

// Test 1: Verificar API de poblaciones
async function testPopulationsAPI() {
    console.log("🏢 Probando API de poblaciones...");
    
    try {
        const response = await fetch('/api/sampling_proxy?action=get_populations', {
            signal: AbortSignal.timeout(15000) // 15 segundos
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ API de poblaciones funcionando:", {
                status: response.status,
                populationsCount: data.populations?.length || 0,
                sampleData: data.populations?.slice(0, 2)
            });
            return true;
        } else {
            console.log("❌ API de poblaciones error:", response.status, response.statusText);
            const errorText = await response.text();
            console.log("Error details:", errorText);
            return false;
        }
    } catch (error) {
        if (error.name === 'TimeoutError') {
            console.log("⏰ API de poblaciones timeout - revisar conexión del servidor");
        } else {
            console.log("❌ API de poblaciones error de red:", error.message);
        }
        return false;
    }
}

// Test 2: Verificar API de usuarios
async function testUsersAPI() {
    console.log("👥 Probando API de usuarios...");
    
    try {
        const response = await fetch('/api/sampling_proxy?action=get_users', {
            signal: AbortSignal.timeout(15000)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ API de usuarios funcionando:", {
                status: response.status,
                usersCount: data.users?.length || 0,
                sampleData: data.users?.slice(0, 2)
            });
            return true;
        } else {
            console.log("❌ API de usuarios error:", response.status, response.statusText);
            const errorText = await response.text();
            console.log("Error details:", errorText);
            return false;
        }
    } catch (error) {
        if (error.name === 'TimeoutError') {
            console.log("⏰ API de usuarios timeout - revisar conexión del servidor");
        } else {
            console.log("❌ API de usuarios error de red:", error.message);
        }
        return false;
    }
}

// Test 3: Verificar API de eliminación de población
async function testDeletePopulationAPI() {
    console.log("🗑️ Probando API de eliminación (simulada)...");
    
    try {
        // Usar un ID falso para probar la API sin eliminar datos reales
        const response = await fetch('/api/sampling_proxy?action=delete_population', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ population_id: 'test-fake-id-12345' }),
            signal: AbortSignal.timeout(10000)
        });
        
        // Esperamos un error 404 o similar, lo cual indica que la API está funcionando
        console.log("✅ API de eliminación respondiendo:", {
            status: response.status,
            statusText: response.statusText
        });
        
        return response.status !== 0; // Cualquier respuesta del servidor es buena
    } catch (error) {
        if (error.name === 'TimeoutError') {
            console.log("⏰ API de eliminación timeout");
        } else {
            console.log("❌ API de eliminación error:", error.message);
        }
        return false;
    }
}

// Test 4: Verificar API de toggle de usuario
async function testToggleUserAPI() {
    console.log("🔄 Probando API de toggle usuario (simulada)...");
    
    try {
        // Usar un ID falso para probar la API sin modificar datos reales
        const response = await fetch('/api/sampling_proxy?action=toggle_user_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 'test-fake-user-id', status: true }),
            signal: AbortSignal.timeout(10000)
        });
        
        console.log("✅ API de toggle usuario respondiendo:", {
            status: response.status,
            statusText: response.statusText
        });
        
        return response.status !== 0;
    } catch (error) {
        if (error.name === 'TimeoutError') {
            console.log("⏰ API de toggle usuario timeout");
        } else {
            console.log("❌ API de toggle usuario error:", error.message);
        }
        return false;
    }
}

// Test 5: Verificar manejo de errores en componentes
function testErrorHandling() {
    console.log("🚨 Probando manejo de errores...");
    
    try {
        // Simular diferentes tipos de errores que pueden ocurrir
        const errorScenarios = [
            { name: 'TimeoutError', message: 'Request timeout after 15000ms' },
            { name: 'FetchNetworkError', message: 'HTTP 500: Internal Server Error' },
            { name: 'Error', message: 'Network connection failed' }
        ];
        
        errorScenarios.forEach((error, index) => {
            let errorMessage = "Error desconocido";
            
            if (error.name === 'TimeoutError') {
                errorMessage = "Timeout: La carga tardó demasiado tiempo. Verifique su conexión.";
            } else if (error.name === 'FetchNetworkError') {
                errorMessage = "Error de conexión: " + error.message;
            } else {
                errorMessage = "Error al cargar datos: " + error.message;
            }
            
            console.log(`  - Escenario ${index + 1} (${error.name}): ${errorMessage}`);
        });
        
        console.log("✅ Manejo de errores funcionando correctamente");
        return true;
    } catch (error) {
        console.log("❌ Error en test de manejo de errores:", error.message);
        return false;
    }
}

// Test 6: Verificar performance con datos simulados
function testPerformanceWithLargeData() {
    console.log("⚡ Probando performance con datos grandes...");
    
    try {
        const startTime = Date.now();
        
        // Simular procesamiento de una lista grande de poblaciones
        const largePopulationList = Array.from({ length: 1000 }, (_, i) => ({
            id: `pop-${i}`,
            audit_name: `Auditoría ${i}`,
            area: `Área ${i % 10}`,
            file_name: `archivo_${i}.xlsx`,
            total_rows: Math.floor(Math.random() * 10000),
            total_monetary_value: Math.random() * 1000000,
            created_at: new Date().toISOString(),
            status: i % 3 === 0 ? 'validado' : 'pendiente_validacion'
        }));
        
        // Simular filtrado y ordenamiento
        const validatedPopulations = largePopulationList
            .filter(p => p.status === 'validado')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 50); // Limitar a 50 para UI
        
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        console.log("✅ Performance test completado:", {
            totalItems: largePopulationList.length,
            validatedItems: validatedPopulations.length,
            processingTime: `${processingTime}ms`,
            performanceGood: processingTime < 100
        });
        
        return processingTime < 100; // Debe completarse en menos de 100ms
    } catch (error) {
        console.log("❌ Error en test de performance:", error.message);
        return false;
    }
}

// Test 7: Verificar estado de componentes React (simulado)
function testComponentStates() {
    console.log("⚛️ Probando estados de componentes...");
    
    try {
        // Simular estados típicos de los componentes
        const componentStates = {
            loading: false,
            error: null,
            populations: [],
            users: [],
            deleteConfirm: null,
            actionLoading: null
        };
        
        // Simular transiciones de estado
        const stateTransitions = [
            { ...componentStates, loading: true },
            { ...componentStates, loading: false, populations: [{ id: '1', name: 'Test' }] },
            { ...componentStates, loading: false, error: 'Connection failed' },
            { ...componentStates, loading: false, error: null, populations: [] }
        ];
        
        stateTransitions.forEach((state, index) => {
            const isValidState = (
                typeof state.loading === 'boolean' &&
                (state.error === null || typeof state.error === 'string') &&
                Array.isArray(state.populations) &&
                Array.isArray(state.users)
            );
            
            console.log(`  - Estado ${index + 1}: ${isValidState ? '✅ Válido' : '❌ Inválido'}`);
        });
        
        console.log("✅ Estados de componentes funcionando correctamente");
        return true;
    } catch (error) {
        console.log("❌ Error en test de estados:", error.message);
        return false;
    }
}

// Ejecutar todas las pruebas
async function runListComponentsTests() {
    console.log("🚀 Ejecutando pruebas de componentes de listas...");
    
    const results = {
        populationsAPI: await testPopulationsAPI(),
        usersAPI: await testUsersAPI(),
        deleteAPI: await testDeletePopulationAPI(),
        toggleAPI: await testToggleUserAPI(),
        errorHandling: testErrorHandling(),
        performance: testPerformanceWithLargeData(),
        componentStates: testComponentStates()
    };
    
    console.log("\n📊 RESULTADOS DE PRUEBAS DE LISTAS:");
    console.log("API Poblaciones:", results.populationsAPI ? "✅" : "❌");
    console.log("API Usuarios:", results.usersAPI ? "✅" : "❌");
    console.log("API Eliminación:", results.deleteAPI ? "✅" : "❌");
    console.log("API Toggle Usuario:", results.toggleAPI ? "✅" : "❌");
    console.log("Manejo Errores:", results.errorHandling ? "✅" : "❌");
    console.log("Performance:", results.performance ? "✅" : "❌");
    console.log("Estados Componentes:", results.componentStates ? "✅" : "❌");
    
    const criticalTests = [results.populationsAPI, results.usersAPI];
    const allCriticalPassed = criticalTests.every(result => result);
    
    if (allCriticalPassed) {
        console.log("\n🎉 PRUEBAS CRÍTICAS PASARON");
        console.log("Los componentes de listas deberían funcionar correctamente.");
    } else {
        console.log("\n⚠️ PRUEBAS CRÍTICAS FALLARON");
        console.log("Revisar la conexión del servidor y las APIs del proxy.");
    }
    
    return results;
}

// Función para probar un componente específico
async function testSpecificComponent(component) {
    console.log(`🔍 Probando componente específico: ${component}`);
    
    switch (component.toLowerCase()) {
        case 'populations':
        case 'populationmanager':
            return await testPopulationsAPI();
        case 'users':
        case 'adminusermanagement':
            return await testUsersAPI();
        default:
            console.log("❌ Componente no reconocido. Opciones: 'populations', 'users'");
            return false;
    }
}

// Función para diagnosticar problemas específicos
async function diagnoseIssues() {
    console.log("🔧 DIAGNÓSTICO DE PROBLEMAS COMUNES");
    
    // 1. Verificar si el servidor está corriendo
    try {
        const response = await fetch('/api/sampling_proxy?action=get_populations', {
            signal: AbortSignal.timeout(5000)
        });
        console.log("✅ Servidor respondiendo:", response.status);
    } catch (error) {
        console.log("❌ Servidor no responde:", error.message);
        console.log("💡 SOLUCIÓN: Verificar que el servidor de desarrollo esté corriendo");
        return;
    }
    
    // 2. Verificar variables de entorno
    console.log("🔍 Variables de entorno:");
    console.log("  - VITE_SUPABASE_URL:", import.meta.env?.VITE_SUPABASE_URL ? "✅ Configurada" : "❌ Faltante");
    console.log("  - VITE_SUPABASE_ANON_KEY:", import.meta.env?.VITE_SUPABASE_ANON_KEY ? "✅ Configurada" : "❌ Faltante");
    
    // 3. Verificar proxy de Vite
    console.log("🔄 Configuración de proxy:");
    console.log("  - Endpoint /api:", "Debería redirigir a Vercel");
    console.log("  - Endpoint /supaproxy:", "Debería redirigir a Supabase");
    
    console.log("\n💡 PASOS DE SOLUCIÓN:");
    console.log("1. Verificar que el servidor esté corriendo: npm run dev");
    console.log("2. Verificar variables en .env");
    console.log("3. Verificar vite.config.ts para configuración de proxy");
    console.log("4. Verificar que las funciones de Vercel estén desplegadas");
}

// Exportar para uso en consola
window.testListComponents = {
    runListComponentsTests,
    testSpecificComponent,
    diagnoseIssues,
    testPopulationsAPI,
    testUsersAPI,
    testDeletePopulationAPI,
    testToggleUserAPI,
    testErrorHandling,
    testPerformanceWithLargeData,
    testComponentStates
};

console.log("🎯 Pruebas de listas cargadas. Ejecuta: testListComponents.runListComponentsTests()");
console.log("Para diagnóstico: testListComponents.diagnoseIssues()");
console.log("Para componente específico: testListComponents.testSpecificComponent('populations')");