# PROMPT TÉCNICO: Solución de Bucles Infinitos en Sistema de Muestreo Estadístico

## CONTEXTO DEL PROBLEMA

Tengo una aplicación React/TypeScript para muestreo estadístico de auditoría que experimenta bucles infinitos específicamente en el **Muestreo por Unidades Monetarias (MUS)**. El sistema funciona correctamente para otros métodos de muestreo.

## ARQUITECTURA TÉCNICA

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: API Routes (Next.js style) + Supabase PostgreSQL
- **Población de datos**: ~1,500 registros, ~$38.7M valor total
- **Problema específico**: MUS se cuelga durante la selección sistemática

## COMPONENTES INVOLUCRADOS

### 1. SamplingWorkspace.tsx (Orquestador principal)
```typescript
const handleRunSampling = async (isFinal: boolean) => {
    // Carga datos vía API proxy
    const { rows: realRows } = await samplingProxyFetch('get_universe', {
        population_id: appState.selectedPopulation.id
    });
    
    // Llama al motor de cálculo
    const results = calculateSampleSize(appState, realRows);
}
```

### 2. statisticalService.ts (Motor de cálculo MUS)
```typescript
case SamplingMethod.MUS:
    // Cálculo de tamaño de muestra
    const samplingInterval = effectiveV / sampleSize;
    
    // Selección sistemática - AQUÍ OCURRE EL BUCLE
    const statisticalSample = selectItems(theoreticalSampleSize, seed, statisticalPopulation, callback);
```

### 3. selectItems() (Función problemática)
```typescript
const selectItems = (count: number, seed: number, realRows: AuditDataRow[]) => {
    const N = realRows.length;
    const step = count > 0 ? N / count : 1;
    
    for (let i = 0; i < count; i++) {
        const index = Math.floor(normalizedStart + i * step);
        // POSIBLE BUCLE INFINITO AQUÍ
    }
}
```

## SÍNTOMAS OBSERVADOS

1. **Comportamiento**: Al presionar "EJECUTAR NUEVA SELECCIÓN" en MUS, el navegador se congela
2. **Duración**: Bucle aparentemente infinito (>5 minutos sin respuesta)
3. **Recursos**: CPU al 100%, memoria creciente
4. **Otros métodos**: Funcionan correctamente (Atributos, Variables Clásicas, etc.)
5. **Datos**: API devuelve 1,000 registros de 1,500 esperados (ratio normal)

## PARÁMETROS MUS TÍPICOS

```typescript
const musParams = {
    TE: 16666.67,        // Tolerancia al Error
    EE: 0,               // Error Esperado  
    RIA: 5,              // Riesgo Inherente y de Control
    handleNegatives: 'Absolute',
    optimizeTopStratum: true,
    usePilotSample: false
}
```

## DIAGNÓSTICO REALIZADO

### ✅ Descartado - Problemas de API
- API proxy funciona correctamente
- Datos se cargan en ~1-2 segundos
- No hay problemas de timeout o red

### ✅ Descartado - Volumen de datos
- Solo 1,000 registros procesados
- Ratio datos obtenidos/esperados: 0.67 (normal)
- No hay registros duplicados

### 🔍 Sospechoso - Cálculo matemático MUS
```typescript
// Posibles valores problemáticos:
const samplingInterval = effectiveV / sampleSize;  // ¿División por cero?
const step = N / count;                            // ¿Step inválido?
const index = Math.floor(start + i * step);       // ¿Índices fuera de rango?
```

## INTENTOS DE SOLUCIÓN

### 1. Límites de seguridad implementados
```typescript
const MAX_ITERATIONS = 10000;
const MAX_SAMPLE_SIZE = 5000;
if (!isFinite(step) || step <= 0) { /* fallback */ }
```

### 2. Validaciones agregadas
```typescript
if (index < 0 || index >= N || !realRows[index]) {
    console.warn(`Índice problemático ${index}`);
    continue;
}
```

### 3. Timeouts reducidos
- De 60s a 30s en API calls
- Límites estrictos en iteraciones

## PREGUNTA ESPECÍFICA

**¿Qué puede estar causando el bucle infinito en la selección sistemática MUS y cómo solucionarlo definitivamente?**

Posibles causas que sospecho:
1. **Cálculo de `step`**: ¿Valores que causan índices repetitivos?
2. **Algoritmo de selección**: ¿Lógica de incremento problemática?
3. **Condiciones de salida**: ¿Bucle `for` que nunca termina?
4. **Valores matemáticos**: ¿NaN, Infinity, o divisiones problemáticas?

## CÓDIGO CRÍTICO PARA REVISAR

```typescript
// Función selectItems completa
const selectItems = (count: number, seed: number, realRows: AuditDataRow[]) => {
    const N = realRows.length;
    const step = count > 0 ? N / count : 1;
    const startOffset = (seed * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;
    const normalizedStart = (startOffset / LCG_MODULUS) * Math.min(step, N - 1);

    for (let i = 0; i < count; i++) {
        const index = Math.min(Math.floor(normalizedStart + i * step), N - 1);
        // ¿Qué puede fallar aquí?
    }
}
```

## OBJETIVO

Necesito una solución robusta que:
1. Evite bucles infinitos en cualquier escenario MUS
2. Mantenga la correctitud estadística del muestreo sistemático
3. Sea eficiente para poblaciones de 1K-25K registros
4. Incluya validaciones preventivas

¿Puedes identificar la causa raíz y proponer una solución definitiva?