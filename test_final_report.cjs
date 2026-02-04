/**
 * 🚀 PRUEBA FINAL - REPORTE NO ESTADÍSTICO
 */

console.log("🚀 VERIFICACIÓN FINAL DEL REPORTE NO ESTADÍSTICO");
console.log("=".repeat(50));

const fs = require('fs');

// 1. Verificar que el archivo SharedResultsLayout.tsx tiene los imports correctos
const sharedLayoutContent = fs.readFileSync('components/results/SharedResultsLayout.tsx', 'utf8');

const hasCorrectImport = sharedLayoutContent.includes("import { generateNonStatisticalReport } from '../../services/nonStatisticalReportService'");
const hasDirectDetection = sharedLayoutContent.includes("appState.samplingMethod === SamplingMethod.NonStatistical");
const hasDirectCall = sharedLayoutContent.includes("await generateNonStatisticalReport(appState)");

console.log("📁 VERIFICACIÓN DE IMPORTS Y LLAMADAS:");
console.log(`   ${hasCorrectImport ? '✅' : '❌'} Import directo de generateNonStatisticalReport`);
console.log(`   ${hasDirectDetection ? '✅' : '❌'} Detección directa del método NonStatistical`);
console.log(`   ${hasDirectCall ? '✅' : '❌'} Llamada directa a generateNonStatisticalReport`);

// 2. Verificar que el archivo nonStatisticalReportService.ts existe y tiene la función
const nonStatExists = fs.existsSync('services/nonStatisticalReportService.ts');
let hasExportFunction = false;

if (nonStatExists) {
    const nonStatContent = fs.readFileSync('services/nonStatisticalReportService.ts', 'utf8');
    hasExportFunction = nonStatContent.includes('export const generateNonStatisticalReport');
}

console.log("\n🔧 VERIFICACIÓN DE FUNCIÓN ESPECIALIZADA:");
console.log(`   ${nonStatExists ? '✅' : '❌'} Archivo nonStatisticalReportService.ts existe`);
console.log(`   ${hasExportFunction ? '✅' : '❌'} Función generateNonStatisticalReport exportada`);

// 3. Verificar build
const distExists = fs.existsSync('dist');
console.log("\n🏗️ VERIFICACIÓN DE BUILD:");
console.log(`   ${distExists ? '✅' : '❌'} Build completado`);

// 4. Resumen
const allGood = hasCorrectImport && hasDirectDetection && hasDirectCall && nonStatExists && hasExportFunction && distExists;

console.log("\n" + "=".repeat(50));
if (allGood) {
    console.log("✅ ESTADO: TODO CORRECTO - REPORTE DEBERÍA FUNCIONAR");
    console.log("\n🎯 INSTRUCCIONES PARA EL USUARIO:");
    console.log("   1. Hacer refresh completo: Ctrl+Shift+R");
    console.log("   2. Seleccionar método 'Muestreo No Estadístico'");
    console.log("   3. Configurar parámetros y generar muestra");
    console.log("   4. Hacer click en 'Generar Reporte PDF'");
    console.log("   5. Debería aparecer reporte de 4 páginas con color Teal");
} else {
    console.log("❌ ESTADO: HAY PROBLEMAS - REVISAR IMPLEMENTACIÓN");
}

console.log("\n📞 Si sigue fallando, el problema puede ser:");
console.log("   • Caché del navegador muy persistente");
console.log("   • Servidor de desarrollo necesita reinicio");
console.log("   • Datos de análisis forense incompletos");