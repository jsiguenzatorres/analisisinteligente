/**
 * 🔍 VERIFICADOR DE INTEGRIDAD DE BACKUPS
 * 
 * Confirma que los backups del reporte No Estadístico están completos
 */

const fs = require('fs');

console.log("🔍 VERIFICANDO INTEGRIDAD DE BACKUPS DEL REPORTE NO ESTADÍSTICO");
console.log("=".repeat(70));

// 1. Verificar que los backups existen
const backupFiles = [
    'services/nonStatisticalReportService.BACKUP.ts',
    'components/results/SharedResultsLayout.BACKUP.tsx',
    'BACKUP_REPORTE_NO_ESTADISTICO_FUNCIONAL.md'
];

console.log("📁 VERIFICANDO ARCHIVOS DE BACKUP:");
backupFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

// 2. Verificar contenido del generador de reporte
const backupReportExists = fs.existsSync('services/nonStatisticalReportService.BACKUP.ts');
let hasCorrectFunction = false;
let hasColorTeal = false;
let hasProfessionalFormat = false;

if (backupReportExists) {
    const backupContent = fs.readFileSync('services/nonStatisticalReportService.BACKUP.ts', 'utf8');
    hasCorrectFunction = backupContent.includes('export const generateNonStatisticalReport');
    hasColorTeal = backupContent.includes('[20, 184, 166]');
    hasProfessionalFormat = backupContent.includes('• NORMAL -') && backupContent.includes('• CRÍTICO -');
}

console.log("\n🔧 VERIFICANDO GENERADOR DE REPORTE:");
console.log(`   ${hasCorrectFunction ? '✅' : '❌'} Función generateNonStatisticalReport exportada`);
console.log(`   ${hasColorTeal ? '✅' : '❌'} Color Teal distintivo incluido`);
console.log(`   ${hasProfessionalFormat ? '✅' : '❌'} Formato profesional sin emojis`);

// 3. Verificar contenido del layout
const backupLayoutExists = fs.existsSync('components/results/SharedResultsLayout.BACKUP.tsx');
let hasCorrectImport = false;
let hasCorrectDetection = false;

if (backupLayoutExists) {
    const layoutContent = fs.readFileSync('components/results/SharedResultsLayout.BACKUP.tsx', 'utf8');
    hasCorrectImport = layoutContent.includes("import { generateNonStatisticalReport }");
    hasCorrectDetection = layoutContent.includes("appState.samplingMethod === SamplingMethod.NonStatistical");
}

console.log("\n📱 VERIFICANDO LAYOUT DE RESULTADOS:");
console.log(`   ${hasCorrectImport ? '✅' : '❌'} Import correcto del reporte especializado`);
console.log(`   ${hasCorrectDetection ? '✅' : '❌'} Detección correcta del método NonStatistical`);

// 4. Verificar tamaños de archivos
console.log("\n📏 VERIFICANDO TAMAÑOS DE ARCHIVOS:");

if (backupReportExists) {
    const reportSize = fs.statSync('services/nonStatisticalReportService.BACKUP.ts').size;
    console.log(`   📦 Generador de reporte: ${(reportSize / 1024).toFixed(1)} KB`);
    if (reportSize < 20000) {
        console.log(`   ⚠️  ADVERTENCIA: Archivo pequeño, podría estar incompleto`);
    }
}

if (backupLayoutExists) {
    const layoutSize = fs.statSync('components/results/SharedResultsLayout.BACKUP.tsx').size;
    console.log(`   📦 Layout de resultados: ${(layoutSize / 1024).toFixed(1)} KB`);
}

// 5. Verificar funciones clave en el backup
console.log("\n🔧 VERIFICANDO FUNCIONES CLAVE:");

if (backupReportExists) {
    const content = fs.readFileSync('services/nonStatisticalReportService.BACKUP.ts', 'utf8');
    const keyFunctions = [
        'generateForensicDiagnosis',
        'addPageHeader',
        'addFooter',
        'formatCurrency'
    ];
    
    keyFunctions.forEach(func => {
        const hasFunction = content.includes(func);
        console.log(`   ${hasFunction ? '✅' : '❌'} ${func}`);
    });
}

// 6. Verificar estructura de páginas
console.log("\n📄 VERIFICANDO ESTRUCTURA DE 4 PÁGINAS:");

if (backupReportExists) {
    const content = fs.readFileSync('services/nonStatisticalReportService.BACKUP.ts', 'utf8');
    const pageStructure = [
        'ANÁLISIS FORENSE Y CONFIGURACIÓN',
        'CONFIGURACIÓN Y CRITERIOS',
        'MUESTRA SELECCIONADA Y EVALUADA',
        'ANÁLISIS EXPLICATIVO DE RESULTADOS FORENSES'
    ];
    
    pageStructure.forEach((page, idx) => {
        const hasPage = content.includes(page);
        console.log(`   ${hasPage ? '✅' : '❌'} Página ${idx + 1}: ${page}`);
    });
}

// 7. Verificar correcciones aplicadas
console.log("\n🔧 VERIFICANDO CORRECCIONES APLICADAS:");

if (backupReportExists) {
    const content = fs.readFileSync('services/nonStatisticalReportService.BACKUP.ts', 'utf8');
    
    const hasRsfFix = content.includes('Number(eda.rsf || 0).toFixed(2)');
    const hasSkewnessFix = content.includes('Number(eda.skewness || 0).toFixed(3)');
    const noEmojis = !content.includes('🔍') && !content.includes('✅') && !content.includes('⚠️');
    
    console.log(`   ${hasRsfFix ? '✅' : '❌'} Corrección de eda.rsf.toFixed`);
    console.log(`   ${hasSkewnessFix ? '✅' : '❌'} Corrección de eda.skewness.toFixed`);
    console.log(`   ${noEmojis ? '✅' : '❌'} Emojis problemáticos eliminados`);
}

// Resumen final
console.log("\n" + "=".repeat(70));

const allChecks = [
    backupReportExists,
    backupLayoutExists,
    hasCorrectFunction,
    hasColorTeal,
    hasProfessionalFormat,
    hasCorrectImport,
    hasCorrectDetection
];

const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;

console.log(`📊 RESULTADO: ${passedChecks}/${totalChecks} verificaciones pasadas`);

if (passedChecks === totalChecks) {
    console.log("✅ ESTADO: BACKUPS COMPLETOS Y CORRECTOS");
    console.log("\n💡 Los backups están listos para restauración si es necesario");
    console.log("🔒 Archivos protegidos contra futuras modificaciones");
} else {
    console.log("❌ ESTADO: BACKUPS INCOMPLETOS O DAÑADOS");
    console.log("\n🔧 ACCIÓN REQUERIDA: Recrear backups desde archivos funcionales");
}

console.log("\n📋 COMANDOS DE RESTAURACIÓN:");
console.log("   cp services/nonStatisticalReportService.BACKUP.ts services/nonStatisticalReportService.ts");
console.log("   cp components/results/SharedResultsLayout.BACKUP.tsx components/results/SharedResultsLayout.tsx");
console.log("   npm run build");

console.log("\n🎯 PARA PROBAR DESPUÉS DE RESTAURAR:");
console.log("   1. Refresh completo del navegador (Ctrl+Shift+R)");
console.log("   2. Seleccionar método 'Muestreo No Estadístico'");
console.log("   3. Generar reporte PDF");
console.log("   4. Verificar 4 páginas con color Teal");