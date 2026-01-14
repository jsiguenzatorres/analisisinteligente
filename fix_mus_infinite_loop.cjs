// Parche específico para solucionar bucle infinito en MUS (Muestreo por Unidades Monetarias)
const fs = require('fs');
const path = require('path');

console.log('🔧 Aplicando parche específico para MUS...\n');

const filePath = path.join(__dirname, 'services', 'statisticalService.ts');

// Leer el archivo actual
let content;
try {
    content = fs.readFileSync(filePath, 'utf8');
} catch (err) {
    console.error('❌ Error leyendo statisticalService.ts:', err.message);
    process.exit(1);
}

// Buscar la función selectItems que puede causar bucle infinito
const selectItemsStart = content.indexOf('const selectItems = (');
if (selectItemsStart === -1) {
    console.error('❌ No se encontró la función selectItems');
    process.exit(1);
}

// Buscar el final de la función selectItems
const nextFunctionStart = content.indexOf('export const calculateSampleSize', selectItemsStart);
if (nextFunctionStart === -1) {
    console.error('❌ No se encontró el final de selectItems');
    process.exit(1);
}

console.log('✅ Función selectItems encontrada');

// Nueva función selectItems corregida para evitar bucles infinitos
const newSelectItems = `// Helper local para selección sistemática (Intervalo Constante) - VERSIÓN ANTI-BUCLE
const selectItems = (
    count: number,
    seed: number,
    realRows: AuditDataRow[],
    logicCallback: (i: number, row?: AuditDataRow) => Partial<AuditSampleItem>
): AuditSampleItem[] => {

    const hasRealData = realRows && realRows.length > 0;
    const selectedItems: AuditSampleItem[] = [];

    // PROTECCIÓN CONTRA BUCLES INFINITOS
    const MAX_ITERATIONS = Math.min(count, 10000); // Límite máximo de iteraciones
    const MAX_SAMPLE_SIZE = Math.min(count, realRows.length, 5000); // Límite de muestra

    if (hasRealData) {
        const N = realRows.length;
        
        // Validaciones de seguridad
        if (N === 0) {
            console.warn('⚠️ selectItems: No hay datos para seleccionar');
            return selectedItems;
        }
        
        if (count <= 0) {
            console.warn('⚠️ selectItems: Tamaño de muestra inválido:', count);
            return selectedItems;
        }

        const safeSampleSize = Math.min(MAX_SAMPLE_SIZE, count);
        const step = safeSampleSize > 0 ? N / safeSampleSize : 1;

        // Validar que step es válido
        if (!isFinite(step) || step <= 0) {
            console.error('🚨 selectItems: Step inválido:', step);
            // Fallback: selección simple
            for (let i = 0; i < Math.min(safeSampleSize, N); i++) {
                const row = realRows[i];
                const item: AuditSampleItem = {
                    id: String(row.unique_id_col || \`ROW-\${i}\`),
                    value: row.monetary_value_col || 0,
                    raw_row: row.raw_json,
                    risk_score: 0,
                    compliance_status: 'OK',
                    ...logicCallback(i, row)
                };
                selectedItems.push(item);
            }
            return selectedItems;
        }

        // Determinar un punto de inicio aleatorio basado en la semilla (reproducible)
        const startOffset = (seed * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;
        const normalizedStart = (startOffset / LCG_MODULUS) * Math.min(step, N - 1);

        console.log(\`🔢 MUS Selection: N=\${N}, sample=\${safeSampleSize}, step=\${step.toFixed(2)}, start=\${normalizedStart.toFixed(2)}\`);

        let iterations = 0;
        for (let i = 0; i < safeSampleSize && iterations < MAX_ITERATIONS; i++) {
            iterations++;
            
            // formula: start + i * step
            const index = Math.min(Math.floor(normalizedStart + i * step), N - 1);
            
            // Validar índice
            if (index < 0 || index >= N) {
                console.warn(\`⚠️ selectItems: Índice fuera de rango: \${index}\`);
                continue;
            }
            
            const row = realRows[index];
            
            // Validar que el row existe
            if (!row) {
                console.warn(\`⚠️ selectItems: Row no encontrado en índice \${index}\`);
                continue;
            }

            const item: AuditSampleItem = {
                id: String(row.unique_id_col || \`ROW-\${index}\`),
                value: row.monetary_value_col || 0,
                raw_row: row.raw_json,
                risk_score: 0,
                compliance_status: 'OK',
                ...logicCallback(i, row)
            };
            selectedItems.push(item);
            
            // Protección adicional: si tardamos mucho, salir
            if (iterations % 1000 === 0) {
                console.log(\`⏱️ selectItems: Procesando... \${iterations}/\${safeSampleSize}\`);
            }
        }

        if (iterations >= MAX_ITERATIONS) {
            console.warn(\`⚠️ selectItems: Alcanzado límite de iteraciones (\${MAX_ITERATIONS})\`);
        }

        console.log(\`✅ selectItems completado: \${selectedItems.length} items seleccionados en \${iterations} iteraciones\`);

    } else {
        // Fallback for simulation/no-data
        const safeSampleSize = Math.min(MAX_SAMPLE_SIZE, count);
        for (let i = 0; i < safeSampleSize; i++) {
            const currentIdx = i + 1;
            const item: AuditSampleItem = {
                id: \`TRANS-\${seed + currentIdx}\`,
                value: Math.floor(Math.random() * 15000) + 100,
                raw_row: null,
                risk_score: 0,
                compliance_status: 'OK',
                ...logicCallback(i)
            };
            selectedItems.push(item);
        }
    }

    return selectedItems;
};

`;

// Reemplazar la función selectItems
const beforeSelectItems = content.substring(0, selectItemsStart);
const afterSelectItems = content.substring(nextFunctionStart);
const newContent = beforeSelectItems + newSelectItems + afterSelectItems;

// Escribir el archivo corregido
try {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('✅ Parche MUS aplicado exitosamente');
    console.log('📋 Cambios realizados en selectItems:');
    console.log('   - Límite máximo de 10,000 iteraciones');
    console.log('   - Límite de muestra a 5,000 registros');
    console.log('   - Validación de step y índices');
    console.log('   - Logging detallado para diagnóstico');
    console.log('   - Fallback para casos problemáticos');
    console.log('   - Protección contra índices fuera de rango');
    console.log('');
    console.log('🎯 Reinicia tu servidor y prueba MUS nuevamente');
} catch (err) {
    console.error('❌ Error escribiendo el archivo:', err.message);
    process.exit(1);
}