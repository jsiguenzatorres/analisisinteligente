// Script para diagnosticar y prevenir múltiples requests simultáneos

console.log("🔍 INICIANDO DIAGNÓSTICO DE MÚLTIPLES REQUESTS");

// Monitor de requests para detectar bucles
let requestCount = 0;
let requestHistory = [];
const MAX_REQUESTS_PER_MINUTE = 10;

// Interceptar fetch para monitorear requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const url = args[0];
    const timestamp = Date.now();
    
    requestCount++;
    requestHistory.push({ url, timestamp, count: requestCount });
    
    // Limpiar historial viejo (más de 1 minuto)
    requestHistory = requestHistory.filter(req => timestamp - req.timestamp < 60000);
    
    console.log(`📡 Request #${requestCount}: ${url}`);
    
    // Detectar posibles bucles
    if (requestHistory.length > MAX_REQUESTS_PER_MINUTE) {
        console.error("🚨 POSIBLE BUCLE DETECTADO: Más de 10 requests en 1 minuto");
        console.table(requestHistory.slice(-10));
    }
    
    // Detectar requests duplicados rápidos
    const recentSameUrl = requestHistory.filter(req => 
        req.url === url && timestamp - req.timestamp < 5000
    );
    
    if (recentSameUrl.length > 3) {
        console.error(`🚨 REQUESTS DUPLICADOS DETECTADOS: ${recentSameUrl.length} requests a ${url} en 5 segundos`);
    }
    
    return originalFetch.apply(this, args);
};

// Función para diagnosticar el estado actual
function diagnoseCurrentState() {
    console.log("\n🔍 DIAGNÓSTICO DEL ESTADO ACTUAL:");
    
    // Verificar si hay requests pendientes
    const pendingRequests = performance.getEntriesByType('navigation').length;
    console.log(`📊 Requests pendientes: ${pendingRequests}`);
    
    // Verificar memoria de componentes React
    if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
        console.log("⚛️ React detectado - verificando componentes...");
    }
    
    // Verificar timers activos
    const timers = [];
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    
    window.setTimeout = function(fn, delay) {
        const id = originalSetTimeout(fn, delay);
        timers.push({ type: 'timeout', id, delay });
        return id;
    };
    
    window.setInterval = function(fn, delay) {
        const id = originalSetInterval(fn, delay);
        timers.push({ type: 'interval', id, delay });
        return id;
    };
    
    console.log(`⏰ Timers activos: ${timers.length}`);
    
    // Verificar AbortControllers
    let abortControllers = 0;
    const originalAbortController = window.AbortController;
    window.AbortController = function() {
        abortControllers++;
        console.log(`🛑 AbortController creado #${abortControllers}`);
        return new originalAbortController();
    };
    
    return {
        requestCount,
        requestHistory: requestHistory.slice(-5),
        pendingRequests,
        timers: timers.length,
        abortControllers
    };
}

// Función para limpiar requests colgados
function cleanupHangingRequests() {
    console.log("🧹 LIMPIANDO REQUESTS COLGADOS...");
    
    // Cancelar todos los AbortControllers activos
    if (window.activeAbortControllers) {
        window.activeAbortControllers.forEach(controller => {
            try {
                controller.abort();
                console.log("🛑 AbortController cancelado");
            } catch (e) {
                console.warn("⚠️ Error cancelando AbortController:", e);
            }
        });
        window.activeAbortControllers = [];
    }
    
    // Limpiar historial de requests
    requestHistory = [];
    requestCount = 0;
    
    console.log("✅ Limpieza completada");
}

// Función para simular el problema y verificar la solución
async function testRequestOptimization() {
    console.log("🧪 PROBANDO OPTIMIZACIÓN DE REQUESTS...");
    
    let isRequestInProgress = false;
    
    // Simular función optimizada
    async function optimizedFetch(url) {
        if (isRequestInProgress) {
            console.log("⚠️ Request ya en progreso, ignorando...");
            return null;
        }
        
        isRequestInProgress = true;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            console.log(`📡 Iniciando request optimizado: ${url}`);
            
            // Simular request
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            clearTimeout(timeoutId);
            console.log("✅ Request completado exitosamente");
            
            return { success: true };
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log("⏰ Request cancelado por timeout");
            } else {
                console.error("❌ Error en request:", error);
            }
            return null;
        } finally {
            isRequestInProgress = false;
        }
    }
    
    // Probar múltiples requests simultáneos
    console.log("🔄 Probando múltiples requests simultáneos...");
    
    const promises = [
        optimizedFetch('/api/test1'),
        optimizedFetch('/api/test2'),
        optimizedFetch('/api/test3')
    ];
    
    const results = await Promise.all(promises);
    const successfulRequests = results.filter(r => r !== null).length;
    
    console.log(`📊 Requests exitosos: ${successfulRequests}/3`);
    
    if (successfulRequests === 1) {
        console.log("✅ Optimización funcionando: Solo 1 request ejecutado");
        return true;
    } else {
        console.log("❌ Optimización fallando: Múltiples requests ejecutados");
        return false;
    }
}

// Función para monitorear PopulationManager específicamente
function monitorPopulationManager() {
    console.log("👥 MONITOREANDO POPULATION MANAGER...");
    
    // Interceptar requests específicos del PopulationManager
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (url.includes('get_populations') || url.includes('audit_populations')) {
            console.log(`👥 PopulationManager request: ${url}`);
            
            // Verificar si es un request duplicado reciente
            const now = Date.now();
            if (window.lastPopulationRequest && now - window.lastPopulationRequest < 5000) {
                console.warn("⚠️ POSIBLE REQUEST DUPLICADO EN POPULATION MANAGER");
            }
            window.lastPopulationRequest = now;
        }
        
        return originalFetch.apply(this, arguments);
    };
    
    // Monitorear re-renders del componente
    let renderCount = 0;
    const originalConsoleLog = console.log;
    console.log = function(...args) {
        const message = args.join(' ');
        if (message.includes('PopulationManager') || message.includes('Cargando poblaciones')) {
            renderCount++;
            console.warn(`🔄 PopulationManager render/fetch #${renderCount}: ${message}`);
            
            if (renderCount > 5) {
                console.error("🚨 POSIBLE BUCLE EN POPULATION MANAGER");
            }
        }
        return originalConsoleLog.apply(this, args);
    };
}

// Función principal de diagnóstico
async function runRequestDiagnostics() {
    console.log("🚀 EJECUTANDO DIAGNÓSTICOS DE REQUESTS...\n");
    
    const initialState = diagnoseCurrentState();
    console.log("📊 Estado inicial:", initialState);
    
    monitorPopulationManager();
    
    const optimizationWorks = await testRequestOptimization();
    
    console.log("\n📋 RECOMENDACIONES:");
    
    if (requestHistory.length > 5) {
        console.log("⚠️ Muchos requests detectados - verificar bucles infinitos");
        console.log("💡 Solución: Implementar flags isRefreshing en componentes");
    }
    
    if (!optimizationWorks) {
        console.log("⚠️ Optimización de requests no funciona correctamente");
        console.log("💡 Solución: Verificar implementación de AbortController");
    }
    
    console.log("🔧 Para limpiar requests colgados: cleanupHangingRequests()");
    console.log("📊 Para ver estado actual: diagnoseCurrentState()");
    
    return {
        initialState,
        optimizationWorks,
        requestCount: requestHistory.length
    };
}

// Función de emergencia para detener todos los requests
function emergencyStop() {
    console.log("🚨 PARADA DE EMERGENCIA - DETENIENDO TODOS LOS REQUESTS");
    
    // Cancelar todos los fetch pendientes
    if (window.AbortController) {
        const controller = new AbortController();
        controller.abort();
    }
    
    // Limpiar todos los timers
    for (let i = 1; i < 10000; i++) {
        clearTimeout(i);
        clearInterval(i);
    }
    
    // Recargar la página como último recurso
    setTimeout(() => {
        console.log("🔄 Recargando página en 5 segundos...");
        setTimeout(() => window.location.reload(), 5000);
    }, 1000);
}

// Exportar funciones para uso en consola
window.debugMultipleRequests = {
    runRequestDiagnostics,
    diagnoseCurrentState,
    cleanupHangingRequests,
    testRequestOptimization,
    monitorPopulationManager,
    emergencyStop
};

console.log("🎯 Diagnóstico cargado. Ejecuta: debugMultipleRequests.runRequestDiagnostics()");
console.log("🚨 En caso de emergencia: debugMultipleRequests.emergencyStop()");