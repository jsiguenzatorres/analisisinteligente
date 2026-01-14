# PROMPT TÉCNICO COMPLETO: Bucle Infinito en MUS (Muestreo por Unidades Monetarias)

## PROBLEMA CRÍTICO

Aplicación React/TypeScript con bucle infinito en función `selectItems` durante Muestreo por Unidades Monetarias (MUS). El navegador se congela por 8+ minutos sin respuesta.

## DATOS DEL PROBLEMA

- **Población**: 1,000 registros, $25.6M valor total
- **Parámetros MUS**: TE=$75,000, EE=0, RIA=5%
- **Tamaño calculado**: ~145 unidades monetarias
- **Síntoma**: Navegador congelado, CPU 100%, sin respuesta por 8+ minutos
- **Network**: Solo 2 requests (problema en frontend, no API)

## CÓDIGO PROBLEMÁTICO

### 1. Función selectItems (services/statisticalService.ts)
```typescript
const selectItems = (
    count: number,
    seed: number,
    realRows: AuditDataRow[],
    logicCallback: (i: number, row?: AuditDataRow) => Partial<AuditSampleItem>
): AuditSampleItem[] => {
    const hasRealData = realRows && realRows.length > 0;
    const selectedItems: AuditSampleItem[] = [];

    // PROTECCIÓN CONTRA BUCLES INFINITOS EN MUS
    const MAX_ITERATIONS = Math.min(count, 10000);
    const MAX_SAMPLE_SIZE = Math.min(count, realRows?.length || 0, 5000);

    if (hasRealData) {
        const N = realRows.length;
        
        if (N === 0 || count <= 0) {
            console.warn('⚠️ selectItems: Parámetros inválidos', { N, count });
            return selectedItems;
        }

        const safeSampleSize = Math.min(MAX_SAMPLE_SIZE, count);
        const step = safeSampleSize > 0 ? N / safeSampleSize : 1;

        // AQUÍ PUEDE ESTAR EL BUCLE INFINITO
        if (!isFinite(step) || step <= 0) {
            console.error('🚨 selectItems: Step inválido, usando selección simple', { step, N, safeSampleSize });
            // Fallback: selección simple sin bucles
            for (let i = 0; i < Math.min(safeSampleSize, N); i++) {
                const row = realRows[i];
                const item: AuditSampleItem = {
                    id: String(row.unique_id_col || `ROW-${i}`),
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

        const startOffset = (seed * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;
        const normalizedStart = (startOffset / LCG_MODULUS) * Math.min(step, N - 1);

        console.log(`🔢 MUS Selection: N=${N}, sample=${safeSampleSize}, step=${step.toFixed(2)}`);

        let iterations = 0;
        // POSIBLE BUCLE INFINITO AQUÍ
        for (let i = 0; i < safeSampleSize && iterations < MAX_ITERATIONS; i++) {
            iterations++;
            
            const index = Math.min(Math.floor(normalizedStart + i * step), N - 1);
            
            if (index < 0 || index >= N || !realRows[index]) {
                console.warn(`⚠️ selectItems: Índice problemático ${index}, saltando`);
                continue; // ESTO PUEDE CAUSAR BUCLE INFINITO
            }
            
            const row = realRows[index];
            const item: AuditSampleItem = {
                id: String(row.unique_id_col || `ROW-${index}`),
                value: row.monetary_value_col || 0,
                raw_row: row.raw_json,
                risk_score: 0,
                compliance_status: 'OK',
                ...logicCallback(i, row)
            };
            selectedItems.push(item);
        }

        if (iterations >= MAX_ITERATIONS) {
            console.warn(`⚠️ selectItems: Límite de iteraciones alcanzado (${MAX_ITERATIONS})`);
        }

        console.log(`✅ selectItems: ${selectedItems.length} items seleccionados`);
    }

    return selectedItems;
};
```

### 2. Cálculo MUS que llama selectItems
```typescript
case SamplingMethod.MUS:
    // ... cálculos previos ...
    
    // LLAMADA PROBLEMÁTICA 1: Top Stratum
    if (mus.optimizeTopStratum) {
        const certaintyItems = processedRows.filter(r =>
            (r.monetary_value_col || 0) >= samplingInterval ||
            (r.risk_score || 0) >= 80
        );
        statisticalPopulation = processedRows.filter(r =>
            (r.monetary_value_col || 0) < samplingInterval &&
            (r.risk_score || 0) < 80
        );

        topStratumItems = certaintyItems.map(r => ({
            // ... mapping logic ...
        }));
    }

    // LLAMADA PROBLEMÁTICA 2: Selección estadística
    const residualV = statisticalPopulation.reduce((acc, curr) => acc + (curr.monetary_value_col || 0), 0);
    
    if (!mus.usePilotSample) {
        const theoreticalSampleSize = Math.ceil(residualV / samplingInterval);
        // AQUÍ SE CUELGA - selectItems con theoreticalSampleSize grande
        const statisticalSample = selectItems(theoreticalSampleSize, seed, statisticalPopulation, callback);
        
        sample = [...topStratumItems, ...negativeItems, ...statisticalSample];
        sampleSize = sample.length;
    }
```

## VALORES PROBLEMÁTICOS DETECTADOS

- **N (población)**: 1,000
- **theoreticalSampleSize**: Posiblemente muy grande (>1000)
- **step**: Puede ser < 1, causando índices repetitivos
- **samplingInterval**: $266,666.67 (muy grande)

## HIPÓTESIS DEL BUCLE INFINITO

1. **`continue` en bucle for**: Si muchos índices son inválidos, el bucle nunca avanza `i` pero sigue iterando
2. **Step muy pequeño**: Genera índices repetitivos o fuera de rango
3. **theoreticalSampleSize excesivo**: Intenta seleccionar más items que la población
4. **Condición de salida defectuosa**: `i < safeSampleSize` nunca se cumple

## PREGUNTA ESPECÍFICA

**¿Cómo corregir definitivamente esta función `selectItems` para evitar bucles infinitos en cualquier escenario?**

Necesito:
1. **Lógica de selección sistemática robusta** que nunca se cuelgue
2. **Manejo correcto de casos edge** (step < 1, sample > población, etc.)
3. **Condiciones de salida garantizadas** 
4. **Fallbacks seguros** para casos problemáticos

## RESTRICCIONES

- Mantener correctitud estadística del muestreo sistemático
- Funcionar con poblaciones de 100-25,000 registros
- Ser eficiente (< 1 segundo para 1,000 registros)
- No usar APIs externas (solo JavaScript puro)

## CÓDIGO DE REEMPLAZO SOLICITADO

Proporciona una versión completamente reescrita de `selectItems` que:
- **Nunca entre en bucle infinito**
- **Maneje todos los casos edge**
- **Tenga condiciones de salida garantizadas**
- **Incluya logging para diagnóstico**

¿Puedes identificar la causa exacta del bucle infinito y proporcionar una solución definitiva?