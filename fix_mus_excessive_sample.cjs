// Parche para solucionar el problema de tamaño de muestra excesivo en MUS
const fs = require('fs');
const path = require('path');

console.log('🔧 Aplicando parche para tamaño de muestra excesivo en MUS...\n');

const filePath = path.join(__dirname, 'services', 'statisticalService.ts');

// Leer el archivo actual
let content;
try {
    content = fs.readFileSync(filePath, 'utf8');
} catch (err) {
    console.error('❌ Error leyendo statisticalService.ts:', err.message);
    process.exit(1);
}

// Buscar la línea específica del cálculo problemático
const searchText = 'let calculatedSize = Math.ceil(numerator / denominator);';
const searchIndex = content.indexOf(searchText);

if (searchIndex === -1) {
    console.error('❌ No se encontró la línea de cálculo de MUS');
    process.exit(1);
}

console.log('✅ Línea de cálculo MUS encontrada');

// Reemplazar solo esa sección específica
const beforeCalc = content.substring(0, searchIndex);
const afterCalc = content.substring(searchIndex + searchText.length);

const newCalculation = `let calculatedSize = Math.ceil(numerator / denominator);
                
                console.log(\`🔢 MUS Sample Size Calculated: \${calculatedSize}\`);

                // PROTECCIÓN CRÍTICA CONTRA TAMAÑOS EXCESIVOS QUE CAUSAN BUCLES INFINITOS
                const populationSize = processedRows.length;
                const maxReasonableSize = Math.min(populationSize * 0.8, 2000); // Máximo 80% de población o 2000
                
                if (calculatedSize > maxReasonableSize) {
                    console.warn(\`🚨 MUS: Tamaño excesivo detectado. Calculado: \${calculatedSize}, Límite: \${maxReasonableSize}\`);
                    const originalSize = calculatedSize;
                    calculatedSize = maxReasonableSize;
                    methodologyNotes.push(\`Advertencia MUS: Tamaño calculado excesivo (\${originalSize}). Limitado a \${calculatedSize} por viabilidad práctica.\`);
                    methodologyNotes.push(\`Recomendación: Considere aumentar la Tolerancia al Error (TE) de $\${mus.TE.toLocaleString()} a un valor mayor para reducir el tamaño de muestra.\`);
                }`;

const newContent = beforeCalc + newCalculation + afterCalc;

// Escribir el archivo corregido
try {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('✅ Parche aplicado exitosamente');
    console.log('📋 Cambios realizados:');
    console.log('   - Límite máximo de muestra: 80% de población o 2000 registros');
    console.log('   - Logging del tamaño calculado para diagnóstico');
    console.log('   - Advertencias cuando el tamaño es excesivo');
    console.log('   - Recomendación para ajustar TE (Tolerancia al Error)');
    console.log('');
    console.log('🎯 Reinicia tu servidor y prueba MUS nuevamente');
    console.log('💡 Si el problema persiste, considera aumentar TE de $16,666 a $50,000 o más');
} catch (err) {
    console.error('❌ Error escribiendo el archivo:', err.message);
    process.exit(1);
}