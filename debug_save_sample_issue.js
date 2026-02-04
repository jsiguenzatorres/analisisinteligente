/**
 * 🔍 DIAGNÓSTICO: Problema con "Bloquear como Papel de Trabajo"
 * 
 * Este script ayuda a diagnosticar por qué el botón de guardado no funciona correctamente.
 * 
 * INSTRUCCIONES:
 * 1. Abrir la aplicación en el navegador
 * 2. Abrir DevTools (F12)
 * 3. Ir a la pestaña Console
 * 4. Pegar este código y presionar Enter
 * 5. Intentar usar el botón "Bloquear como Papel de Trabajo"
 * 6. Revisar los logs detallados
 */

console.log('🔍 DIAGNÓSTICO ACTIVADO: Problema con guardado de muestras');
console.log('📋 Monitoreando llamadas a samplingProxyFetch...');

// Interceptar todas las llamadas a fetch para monitorear
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const [url, options] = args;
    
    // Solo monitorear llamadas al sampling_proxy
    if (url && url.includes('sampling_proxy')) {
        console.log('🌐 INTERCEPTED FETCH:', {
            url,
            method: options?.method || 'GET',
            body: options?.body ? JSON.parse(options.body) : null,
            timestamp: new Date().toLocaleTimeString()
        });
        
        // Llamar al fetch original y monitorear la respuesta
        return originalFetch.apply(this, args)
            .then(response => {
                console.log('📥 FETCH RESPONSE:', {
                    url,
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok,
                    timestamp: new Date().toLocaleTimeString()
                });
                
                // Clonar la respuesta para poder leerla sin afectar el flujo original
                const clonedResponse = response.clone();
                clonedResponse.json()
                    .then(data => {
                        console.log('📄 RESPONSE DATA:', data);
                    })
                    .catch(err => {
                        console.log('⚠️ No se pudo parsear respuesta como JSON:', err);
                    });
                
                return response;
            })
            .catch(error => {
                console.error('❌ FETCH ERROR:', {
                    url,
                    error: error.message,
                    timestamp: new Date().toLocaleTimeString()
                });
                throw error;
            });
    }
    
    return originalFetch.apply(this, args);
};

// Interceptar errores de JavaScript
window.addEventListener('error', function(event) {
    if (event.error && event.error.stack && event.error.stack.includes('samplingProxyFetch')) {
        console.error('🚨 JAVASCRIPT ERROR relacionado con samplingProxyFetch:', {
            message: event.error.message,
            stack: event.error.stack,
            filename: event.filename,
            lineno: event.lineno,
            timestamp: new Date().toLocaleTimeString()
        });
    }
});

// Interceptar promesas rechazadas
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.toString().includes('samplingProxyFetch')) {
        console.error('🚨 UNHANDLED PROMISE REJECTION relacionada con samplingProxyFetch:', {
            reason: event.reason,
            timestamp: new Date().toLocaleTimeString()
        });
    }
});

// Función para verificar el estado actual de la aplicación
function checkAppState() {
    console.log('🔍 VERIFICANDO ESTADO DE LA APLICACIÓN:');
    
    // Verificar si hay población seleccionada
    const populationElements = document.querySelectorAll('[data-testid="population"], .population-info, .selected-population');
    console.log('📊 Elementos de población encontrados:', populationElements.length);
    
    // Verificar si hay botones de guardado
    const saveButtons = document.querySelectorAll('button');
    const lockButtons = Array.from(saveButtons).filter(btn => 
        btn.textContent && btn.textContent.toLowerCase().includes('bloquear')
    );
    console.log('🔒 Botones de "Bloquear" encontrados:', lockButtons.length);
    
    if (lockButtons.length > 0) {
        lockButtons.forEach((btn, index) => {
            console.log(`   Botón ${index + 1}:`, {
                text: btn.textContent.trim(),
                disabled: btn.disabled,
                className: btn.className
            });
        });
    }
    
    // Verificar si hay errores en la consola
    const consoleErrors = [];
    const originalConsoleError = console.error;
    console.error = function(...args) {
        consoleErrors.push({
            args,
            timestamp: new Date().toLocaleTimeString()
        });
        originalConsoleError.apply(console, args);
    };
    
    console.log('✅ Diagnóstico configurado. Ahora intente usar el botón "Bloquear como Papel de Trabajo"');
}

// Ejecutar verificación inicial
setTimeout(checkAppState, 1000);

// Función para generar reporte de diagnóstico
function generateDiagnosticReport() {
    console.log('📋 GENERANDO REPORTE DE DIAGNÓSTICO...');
    console.log('='.repeat(50));
    console.log('🕐 Timestamp:', new Date().toLocaleString());
    console.log('🌐 URL actual:', window.location.href);
    console.log('👤 User Agent:', navigator.userAgent);
    console.log('📱 Viewport:', `${window.innerWidth}x${window.innerHeight}`);
    console.log('='.repeat(50));
    
    // Verificar localStorage
    const skipSaveMode = localStorage.getItem('SKIP_SAVE_MODE');
    console.log('🚨 Modo emergencia activo:', skipSaveMode === 'true');
    
    // Verificar si hay datos en sessionStorage o localStorage relacionados
    const relevantKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('audit') || key.includes('sample') || key.includes('population'))) {
            relevantKeys.push(key);
        }
    }
    console.log('💾 Claves relevantes en localStorage:', relevantKeys);
    
    console.log('📋 Reporte generado. Copie toda la información de la consola para análisis.');
}

// Exponer función para generar reporte
window.generateDiagnosticReport = generateDiagnosticReport;

console.log('🎯 DIAGNÓSTICO LISTO');
console.log('💡 Para generar un reporte completo, ejecute: generateDiagnosticReport()');