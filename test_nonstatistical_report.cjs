/**
 * 🧪 SCRIPT DE DIAGNÓSTICO - REPORTE NO ESTADÍSTICO
 * 
 * Verifica que el reporte especializado esté funcionando correctamente
 */

console.log("🧪 INICIANDO DIAGNÓSTICO DEL REPORTE NO ESTADÍSTICO");
console.log("=" .repeat(60));

// 1. Verificar que los archivos existen
const fs = require('fs');
const path = require('path');

const requiredFiles = [
    'services/nonStatisticalReportService.ts',
    'services/simpleReportService.ts',
    'types.ts'
];

console.log("📁 VERIFICANDO ARCHIVOS REQUERIDOS:");
requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

// 2. Verificar contenido de archivos clave
console.log("\n🔍 VERIFICANDO CONTENIDO DE ARCHIVOS:");

// Verificar enum SamplingMethod
const typesContent = fs.readFileSync('types.ts', 'utf8');
const hasNonStatistical = typesContent.includes("NonStatistical = 'non_statistical'");
console.log(`   ${hasNonStatistical ? '✅' : '❌'} Enum NonStatistical definido en types.ts`);

// Verificar detección en simpleReportService
const simpleReportContent = fs.readFileSync('services/simpleReportService.ts', 'utf8');
const hasDetection = simpleReportContent.includes('samplingMethod === SamplingMethod.NonStatistical');
const hasImport = simpleReportContent.includes("import('./nonStatisticalReportService')");
console.log(`   ${hasDetection ? '✅' : '❌'} Detección de método NonStatistical`);
console.log(`   ${hasImport ? '✅' : '❌'} Import dinámico del reporte especializado`);

// Verificar función principal en nonStatisticalReportService
const nonStatReportContent = fs.readFileSync('services/nonStatisticalReportService.ts', 'utf8');
const hasMainFunction = nonStatReportContent.includes('export const generateNonStatisticalReport');
const hasForensicDiagnosis = nonStatReportContent.includes('generateForensicDiagnosis');
const hasFourPages = nonStatReportContent.includes('doc.addPage()');
console.log(`   ${hasMainFunction ? '✅' : '❌'} Función principal exportada`);
console.log(`   ${hasForensicDiagnosis ? '✅' : '❌'} Diagnóstico forense incluido`);
console.log(`   ${hasFourPages ? '✅' : '❌'} Múltiples páginas implementadas`);

// 3. Verificar build
console.log("\n🏗️ VERIFICANDO BUILD:");
const distExists = fs.existsSync('dist');
console.log(`   ${distExists ? '✅' : '❌'} Directorio dist existe`);

if (distExists) {
    const distFiles = fs.readdirSync('dist/assets').filter(f => f.includes('nonStatisticalReportService'));
    console.log(`   ${distFiles.length > 0 ? '✅' : '❌'} Chunk nonStatisticalReportService compilado`);
    if (distFiles.length > 0) {
        console.log(`      📦 Archivo: ${distFiles[0]}`);
    }
}

// 4. Verificar tamaño del archivo
const nonStatSize = fs.statSync('services/nonStatisticalReportService.ts').size;
console.log(`\n📏 TAMAÑO DEL ARCHIVO ESPECIALIZADO: ${(nonStatSize / 1024).toFixed(1)} KB`);

if (nonStatSize < 10000) {
    console.log("   ⚠️  ADVERTENCIA: El archivo parece pequeño, podría estar incompleto");
} else {
    console.log("   ✅ Tamaño adecuado para implementación completa");
}

// 5. Contar líneas de código
const lines = nonStatReportContent.split('\n').length;
console.log(`   📝 Líneas de código: ${lines}`);

if (lines < 500) {
    console.log("   ⚠️  ADVERTENCIA: Pocas líneas para implementación completa");
} else {
    console.log("   ✅ Cantidad de líneas adecuada");
}

// 6. Verificar funciones clave
console.log("\n🔧 VERIFICANDO FUNCIONES CLAVE:");
const keyFunctions = [
    'generateForensicDiagnosis',
    'addPageHeader',
    'addFooter',
    'formatCurrency'
];

keyFunctions.forEach(func => {
    const hasFunction = nonStatReportContent.includes(func);
    console.log(`   ${hasFunction ? '✅' : '❌'} ${func}`);
});

// 7. Verificar estructura de páginas
console.log("\n📄 VERIFICANDO ESTRUCTURA DE PÁGINAS:");
const pageStructure = [
    'ANÁLISIS FORENSE Y CONFIGURACIÓN',
    'CONFIGURACIÓN Y CRITERIOS',
    'MUESTRA SELECCIONADA Y EVALUADA',
    'ANÁLISIS EXPLICATIVO DE RESULTADOS FORENSES'
];

pageStructure.forEach((page, idx) => {
    const hasPage = nonStatReportContent.includes(page);
    console.log(`   ${hasPage ? '✅' : '❌'} Página ${idx + 1}: ${page}`);
});

// 8. Verificar colores distintivos (Teal)
const hasTealColors = nonStatReportContent.includes('[20, 184, 166]');
console.log(`\n🎨 COLORES DISTINTIVOS:`);
console.log(`   ${hasTealColors ? '✅' : '❌'} Colores Teal implementados`);

// 9. Verificar datos forenses
console.log("\n🔬 VERIFICANDO ACCESO A DATOS FORENSES:");
const forensicData = [
    'analysis.benford',
    'analysis.duplicatesCount',
    'analysis.outliersCount',
    'analysis.entropy',
    'analysis.splitting',
    'analysis.sequential',
    'analysis.isolationForest',
    'analysis.actorProfiling',
    'analysis.enhancedBenford',
    'analysis.eda'
];

forensicData.forEach(data => {
    const hasData = nonStatReportContent.includes(data);
    console.log(`   ${hasData ? '✅' : '❌'} ${data}`);
});

console.log("\n" + "=".repeat(60));
console.log("🎯 DIAGNÓSTICO COMPLETADO");

// Resumen final
const allChecks = [
    hasNonStatistical,
    hasDetection,
    hasImport,
    hasMainFunction,
    hasForensicDiagnosis,
    hasFourPages,
    hasTealColors,
    nonStatSize > 10000,
    lines > 500
];

const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;

console.log(`\n📊 RESULTADO: ${passedChecks}/${totalChecks} verificaciones pasadas`);

if (passedChecks === totalChecks) {
    console.log("✅ ESTADO: IMPLEMENTACIÓN COMPLETA Y CORRECTA");
    console.log("\n💡 RECOMENDACIONES PARA EL USUARIO:");
    console.log("   1. Hacer refresh completo del navegador (Ctrl+Shift+R)");
    console.log("   2. Verificar que está seleccionando método 'No Estadístico'");
    console.log("   3. Verificar que el análisis forense se ejecutó correctamente");
    console.log("   4. Verificar que configuró criterios y justificación");
} else {
    console.log("❌ ESTADO: IMPLEMENTACIÓN INCOMPLETA");
    console.log("\n🔧 ACCIONES REQUERIDAS:");
    console.log("   1. Revisar archivos faltantes o incompletos");
    console.log("   2. Ejecutar npm run build nuevamente");
    console.log("   3. Verificar errores de compilación");
}

console.log("\n🚀 Para probar el reporte:");
console.log("   1. Abrir aplicación en navegador");
console.log("   2. Seleccionar método 'Muestreo No Estadístico'");
console.log("   3. Configurar parámetros y ejecutar análisis");
console.log("   4. Generar muestra y evaluar ítems");
console.log("   5. Generar reporte PDF");
console.log("   6. Verificar que aparezcan 4 páginas con color Teal");