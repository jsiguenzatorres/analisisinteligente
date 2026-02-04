// Script para identificar y corregir todos los errores de sintaxis en reportService.ts
const fs = require('fs');

console.log("🔍 Analizando errores en reportService.ts...");

// Leer el archivo
const content = fs.readFileSync('services/reportService.ts', 'utf8');

// Buscar patrones problemáticos
const problematicPatterns = [
    /\.toFixed\(\d+\)\s*\|\|/g,
    /\?\.\w+\.toFixed\(\d+\)\s*\|\|/g,
    /\w+\.toFixed\(\d+\)\s*\+\s*'%'\s*\|\|/g
];

let foundErrors = [];

problematicPatterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
        console.log(`❌ Patrón ${index + 1} encontrado:`, matches);
        foundErrors = foundErrors.concat(matches);
    }
});

if (foundErrors.length > 0) {
    console.log(`\n💥 Total de errores encontrados: ${foundErrors.length}`);
    foundErrors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
    });
} else {
    console.log("✅ No se encontraron errores de sintaxis");
}

// Buscar líneas específicas con problemas
const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('.toFixed(') && line.includes('||')) {
        console.log(`⚠️  Línea ${index + 1}: ${line.trim()}`);
    }
});