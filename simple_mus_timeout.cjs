// Solución simple: timeout más agresivo para MUS
const fs = require('fs');
const path = require('path');

console.log('🔧 Aplicando timeout agresivo para MUS...\n');

const filePath = path.join(__dirname, 'components', 'sampling', 'SamplingWorkspace.tsx');

// Leer el archivo actual
let content;
try {
    content = fs.readFileSync(filePath, 'utf8');
} catch (err) {
    console.error('❌ Error leyendo SamplingWorkspace.tsx:', err.message);
    process.exit(1);
}

// Cambio 1: Reducir timeout principal de 30s a 10s
if (content.includes('timeout: 30000')) {
    content = content.replace(/timeout: 30000/g, 'timeout: 10000');
    console.log('✅ Timeout principal reducido a 10 segundos');
}

// Cambio 2: Reducir timeout de checkExistingAndLock
if (content.includes('timeout: 15000')) {
    content = content.replace(/timeout: 15000/g, 'timeout: 8000');
    console.log('✅ Timeout de verificación reducido a 8 segundos');
}

// Cambio 3: Agregar logging simple al inicio
const loggingSearch = 'console.log("🌐 Iniciando carga de datos (versión anti-bucle)...");';
if (content.includes(loggingSearch)) {
    const newLogging = 'console.log("🌐 Iniciando carga de datos (versión anti-bucle)...");\n            console.log("⏰ Inicio:", new Date().toLocaleString());\n            console.log("🎯 Método:", appState.samplingMethod);';
    content = content.replace(loggingSearch, newLogging);
    console.log('✅ Logging mejorado agregado');
}

// Cambio 4: Agregar advertencia para TE pequeño en MUS
const expectedRowsSearch = 'const expectedRows = appState.selectedPopulation.total_rows || 1500;';
if (content.includes(expectedRowsSearch)) {
    const musWarning = expectedRowsSearch + '\n            \n            // Advertencia específica para MUS\n            if (appState.samplingMethod === "MUS" && appState.samplingParams?.mus?.TE < 50000) {\n                console.warn("⚠️ MUS: TE muy pequeño puede causar problemas");\n                addToast("Advertencia: TE pequeño puede causar muestras excesivas en MUS", "warning");\n            }';
    content = content.replace(expectedRowsSearch, musWarning);
    console.log('✅ Advertencia para TE pequeño agregada');
}

// Escribir el archivo corregido
try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Timeout agresivo aplicado exitosamente');
    console.log('📋 Cambios realizados:');
    console.log('   - Timeout principal: 30s → 10s');
    console.log('   - Timeout verificación: 15s → 8s');
    console.log('   - Logging mejorado con timestamps');
    console.log('   - Advertencia para TE pequeño en MUS');
    console.log('');
    console.log('🎯 Reinicia tu servidor y prueba MUS');
    console.log('💡 Ahora debería abortar en máximo 10 segundos si hay problemas');
} catch (err) {
    console.error('❌ Error escribiendo el archivo:', err.message);
    process.exit(1);
}