// Debug para entender el flujo completo de MUS y por qué genera múltiples requests
const fs = require('fs');
const path = require('path');

console.log('🔍 Analizando el flujo completo de MUS...\n');

// Leer SamplingWorkspace para entender el flujo
const samplingWorkspacePath = path.join(__dirname, 'components', 'sampling', 'SamplingWorkspace.tsx');
let samplingContent;

try {
    samplingContent = fs.readFileSync(samplingWorkspacePath, 'utf8');
} catch (err) {
    console.error('❌ Error leyendo SamplingWorkspace.tsx:', err.message);
    process.exit(1);
}

console.log('📋 Analizando llamadas API en SamplingWorkspace...');

// Buscar todas las llamadas a samplingProxyFetch
const apiCalls = [];
const lines = samplingContent.split('\n');

lines.forEach((line, index) => {
    if (line.includes('samplingProxyFetch')) {
        const trimmedLine = line.trim();
        apiCalls.push({
            lineNumber: index + 1,
            code: trimmedLine,
            context: lines.slice(Math.max(0, index - 2), index + 3).join('\n')
        });
    }
});

console.log(`✅ Encontradas ${apiCalls.length} llamadas API en SamplingWorkspace:`);
apiCalls.forEach((call, i) => {
    console.log(`\n${i + 1}. Línea ${call.lineNumber}:`);
    console.log(`   ${call.code}`);
});

// Analizar statisticalService para ver si hace llamadas API
const statisticalServicePath = path.join(__dirname, 'services', 'statisticalService.ts');
let statisticalContent;

try {
    statisticalContent = fs.readFileSync(statisticalServicePath, 'utf8');
} catch (err) {
    console.error('❌ Error leyendo statisticalService.ts:', err.message);
    process.exit(1);
}

console.log('\n📋 Analizando llamadas API en statisticalService...');

const statisticalLines = statisticalContent.split('\n');
const statisticalApiCalls = [];

statisticalLines.forEach((line, index) => {
    if (line.includes('fetch') || line.includes('samplingProxyFetch') || line.includes('supabase')) {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith('//') && !trimmedLine.startsWith('*')) {
            statisticalApiCalls.push({
                lineNumber: index + 1,
                code: trimmedLine
            });
        }
    }
});

if (statisticalApiCalls.length > 0) {
    console.log(`⚠️ Encontradas ${statisticalApiCalls.length} posibles llamadas API en statisticalService:`);
    statisticalApiCalls.forEach((call, i) => {
        console.log(`   ${i + 1}. Línea ${call.lineNumber}: ${call.code}`);
    });
} else {
    console.log('✅ No se encontraron llamadas API directas en statisticalService');
}

// Analizar el flujo específico de MUS
console.log('\n🔍 Analizando flujo específico de MUS...');

// Buscar la sección MUS en calculateSampleSize
const musSection = statisticalContent.match(/case SamplingMethod\.MUS:([\s\S]*?)break;/);
if (musSection) {
    const musCode = musSection[1];
    
    // Buscar llamadas a selectItems
    const selectItemsCalls = (musCode.match(/selectItems\(/g) || []).length;
    console.log(`📊 Llamadas a selectItems en MUS: ${selectItemsCalls}`);
    
    // Buscar bucles for/while
    const forLoops = (musCode.match(/for\s*\(/g) || []).length;
    const whileLoops = (musCode.match(/while\s*\(/g) || []).length;
    console.log(`🔄 Bucles for en MUS: ${forLoops}`);
    console.log(`🔄 Bucles while en MUS: ${whileLoops}`);
    
    // Buscar operaciones que pueden ser costosas
    const expensiveOps = [];
    if (musCode.includes('.filter(')) expensiveOps.push('filter operations');
    if (musCode.includes('.map(')) expensiveOps.push('map operations');
    if (musCode.includes('.reduce(')) expensiveOps.push('reduce operations');
    if (musCode.includes('.sort(')) expensiveOps.push('sort operations');
    
    if (expensiveOps.length > 0) {
        console.log(`⚠️ Operaciones costosas detectadas: ${expensiveOps.join(', ')}`);
    }
} else {
    console.log('❌ No se encontró la sección MUS en statisticalService');
}

console.log('\n🎯 Diagnóstico del problema:');
console.log('1. Si hay múltiples llamadas API en SamplingWorkspace: problema de flujo');
console.log('2. Si hay llamadas API en statisticalService: problema de arquitectura');
console.log('3. Si hay muchos bucles/operaciones costosas: problema de rendimiento');
console.log('4. Si selectItems se llama múltiples veces: problema de lógica MUS');

console.log('\n💡 Recomendaciones basadas en el análisis:');
if (apiCalls.length > 3) {
    console.log('- Demasiadas llamadas API, considerar consolidar');
}
if (statisticalApiCalls.length > 0) {
    console.log('- statisticalService no debería hacer llamadas API directas');
}

console.log('\n📋 Próximo paso:');
console.log('Ejecuta este diagnóstico y luego revisa la consola del navegador');
console.log('durante la ejecución de MUS para ver el orden exacto de las llamadas.');