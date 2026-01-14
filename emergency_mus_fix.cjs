// Solución de emergencia para MUS - timeout agresivo y logging detallado
const fs = require('fs');
const path = require('path');

console.log('🚨 Aplicando solución de emergencia para MUS...\n');

const filePath = path.join(__dirname, 'components', 'sampling', 'SamplingWorkspace.tsx');

// Leer el archivo actual
let content;
try {
    content = fs.readFileSync(filePath, 'utf8');
} catch (err) {
    console.error('❌ Error leyendo SamplingWorkspace.tsx:', err.message);
    process.exit(1);
}

// Buscar y reemplazar el timeout en handleRunSampling
const oldTimeout = 'timeout: 30000';
const newTimeout = 'timeout: 15000'; // Reducir a 15 segundos

if (content.includes(oldTimeout)) {
    content = content.replace(new RegExp(oldTimeout, 'g'), newTimeout);
    console.log('✅ Timeout reducido de 30s a 15s');
} else {
    console.log('⚠️ No se encontró timeout de 30s para reemplazar');
}

// Buscar la función checkExistingAndLock y agregar timeout más corto
const checkExistingSearch = 'const checkExistingAndLock = async () => {';
const checkIndex = content.indexOf(checkExistingSearch);

if (checkIndex !== -1) {
    // Buscar el timeout en checkExistingAndLock
    const checkSection = content.substring(checkIndex, checkIndex + 2000);
    if (checkSection.includes('timeout: 15000')) {
        content = content.replace('timeout: 15000', 'timeout: 10000');
        console.log('✅ Timeout de checkExistingAndLock reducido a 10s');
    }
}

// Agregar logging más agresivo al inicio de handleRunSampling
const handleRunSearch = 'console.log("🌐 Iniciando carga de datos (versión anti-bucle)...");';
const handleIndex = content.indexOf(handleRunSearch);

if (handleIndex !== -1) {
    const loggingCode = \`console.log("🌐 Iniciando carga de datos (versión anti-bucle)...");
            console.log("⏰ Timestamp:", new Date().toISOString());
            console.log("🎯 Método:", appState.samplingMethod);
            console.log("📊 Población ID:", appState.selectedPopulation.id);
            
            // TIMEOUT AGRESIVO: Abortar después de 15 segundos TOTAL
            const emergencyTimeout = setTimeout(() => {
                console.error("🚨 TIMEOUT EMERGENCIA: Abortando después de 15 segundos");
                setLoading(false);
                addToast("Timeout: Operación cancelada después de 15 segundos. Intente con parámetros diferentes.", 'error');
            }, 15000);\`;
    
    content = content.replace(handleRunSearch, loggingCode);
    console.log('✅ Logging detallado y timeout de emergencia agregados');
}

// Agregar clearTimeout en el finally
const finallySearch = 'setLoading(false);';
const finallyIndex = content.lastIndexOf(finallySearch);

if (finallyIndex !== -1) {
    const clearTimeoutCode = \`clearTimeout(emergencyTimeout);
            setLoading(false);\`;
    
    content = content.replace(finallySearch, clearTimeoutCode);
    console.log('✅ Limpieza de timeout de emergencia agregada');
}

// Agregar protección específica para MUS
const musProtection = \`
        // PROTECCIÓN ESPECÍFICA PARA MUS
        if (appState.samplingMethod === 'MUS') {
            console.log("🔧 Aplicando protecciones específicas para MUS");
            
            // Verificar parámetros MUS
            const musParams = appState.samplingParams?.mus;
            if (musParams) {
                console.log("📋 Parámetros MUS:", {
                    TE: musParams.TE,
                    EE: musParams.EE,
                    RIA: musParams.RIA
                });
                
                // Advertir si TE es muy pequeño
                if (musParams.TE < 50000) {
                    console.warn("⚠️ TE muy pequeño, puede causar muestra excesiva");
                    addToast(\`Advertencia: TE de $\${musParams.TE.toLocaleString()} puede causar muestras muy grandes. Considere usar $50,000 o más.\`, 'warning');
                }
            }
        }\`;

const expectedRowsIndex = content.indexOf('const expectedRows = appState.selectedPopulation.total_rows || 1500;');
if (expectedRowsIndex !== -1) {
    content = content.replace(
        'const expectedRows = appState.selectedPopulation.total_rows || 1500;',
        \`const expectedRows = appState.selectedPopulation.total_rows || 1500;\${musProtection}\`
    );
    console.log('✅ Protección específica para MUS agregada');
}

// Escribir el archivo corregido
try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Solución de emergencia aplicada exitosamente');
    console.log('📋 Cambios realizados:');
    console.log('   - Timeout reducido a 15 segundos máximo');
    console.log('   - Timeout de emergencia que aborta automáticamente');
    console.log('   - Logging detallado con timestamps');
    console.log('   - Protección específica para parámetros MUS');
    console.log('   - Advertencias para TE muy pequeños');
    console.log('');
    console.log('🎯 Reinicia tu servidor y prueba MUS');
    console.log('💡 Si aún se cuelga, el timeout de 15s lo abortará automáticamente');
    console.log('📊 Revisa la consola para ver exactamente dónde se detiene');
} catch (err) {
    console.error('❌ Error escribiendo el archivo:', err.message);
    process.exit(1);
}