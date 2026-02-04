// Script para identificar y corregir todos los errores de sintaxis en reportService.ts
const fs = require('fs');

console.log("🔍 Analizando errores en reportService.ts...");

// Leer el archivo
const content = fs.readFileSync('services/reportService.ts', 'utf8');

// Buscar líneas específicas con problemas
const lines = content.split('\n');
let foundErrors = [];

lines.forEach((line, index) => {
    if (line.includes('.toFixed(') && line.includes('||')) {
        console.log(`⚠️  Línea ${index + 1}: ${line.trim()}`);
        foundErrors.push({
            line: index + 1,
            content: line.trim()
        });
    }
});

if (foundErrors.length > 0) {
    console.log(`\n💥 Total de líneas problemáticas: ${foundErrors.length}`);
} else {
    console.log("✅ No se encontraron líneas problemáticas con .toFixed() y ||");
}

// Buscar otros patrones problemáticos
console.log("\n🔍 Buscando otros patrones problemáticos...");

const problematicLines = lines.filter((line, index) => {
    return line.includes('toFixed') && (
        line.includes('undefined') ||
        line.includes('null') ||
        line.match(/\w+\?\.\w+\.toFixed/) ||
        line.match(/\w+\.toFixed.*\|\|/)
    );
});

if (problematicLines.length > 0) {
    console.log("🚨 Líneas que pueden causar errores:");
    problematicLines.forEach((line, i) => {
        const lineNumber = lines.indexOf(line) + 1;
        console.log(`${i + 1}. Línea ${lineNumber}: ${line.trim()}`);
    });
}