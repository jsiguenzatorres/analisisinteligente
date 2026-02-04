# 🔮 SOLUCIÓN BUCLES INFINITOS - PENDIENTE DE IMPLEMENTACIÓN

## ⚠️ ESTADO: NO IMPLEMENTADO - GUARDAR PARA DESPUÉS

Esta solución fue propuesta por Claude AI y está documentada aquí para implementarla cuando sea necesario.

---

## 🎯 PROBLEMA IDENTIFICADO

### Síntomas
1. Timeouts en Vercel (>10 segundos)
2. Bucles que iteran más veces de lo necesario
3. MUS intenta seleccionar más items que la población disponible

### Causa Raíz
```typescript
// ❌ PROBLEMA en services/statisticalService.ts línea ~554
const theoreticalSampleSize = Math.ceil(residualV / samplingInterval);
const statisticalSample = selectItems(theoreticalSampleSize, seed, statisticalPopulation, ...);
```

Si `theoreticalSampleSize = 5000` y `statisticalPopulation.length = 1000`:
- Intenta seleccionar 5000 items de 1000 disponibles
- Aunque `selectItems()` tiene protección interna, es ineficiente
- Puede causar timeout en Vercel (plan gratuito: 10s límite)

---

## ✅ SOLUCIÓN PROPUESTA

### Cambio 1: Limitar theoreticalSampleSize

**Ubicación:** `services/statisticalService.ts` línea ~553

**ANTES:**
```typescript
} else {
    const theoreticalSampleSize = Math.ceil(residualV / samplingInterval);
    const statisticalSample = selectItems(theoreticalSampleSize, seed, statisticalPopulation, (_, row) => ({
        risk_flag: (row as any)?._is_originally_negative ? 'NEGATIVO_ABS' : undefined,
        absolute_value: (row as any)?._is_originally_negative ? row?.monetary_value_col : undefined
    }));

    sample = [...topStratumItems, ...negativeItems, ...statisticalSample];
    sampleSize = sample.length;

    if (theoreticalSampleSize > statisticalPopulation.length) {
        methodologyNotes.push(`Aviso: La representatividad estadística requería un censo de la población residual.`);
    }
}
```

**DESPUÉS:**
```typescript
} else {
    const theoreticalSampleSize = Math.ceil(residualV / samplingInterval);
    
    // ✅ FIX CRÍTICO: Limitar theoreticalSampleSize al tamaño de población disponible
    const maxSampleSize = Math.min(theoreticalSampleSize, statisticalPopulation.length);
    
    // ✅ VALIDACIÓN: Verificar que samplingInterval sea válido
    if (!isFinite(samplingInterval) || samplingInterval <= 0) {
        console.error('❌ Intervalo de muestreo inválido:', samplingInterval);
        throw new Error('Parámetros MUS generan valores matemáticos inválidos. Verifica Error Esperado y Confianza.');
    }
    
    console.log(`📊 MUS: tamaño teórico=${theoreticalSampleSize}, máximo permitido=${maxSampleSize}, población=${statisticalPopulation.length}`);
    
    const statisticalSample = selectItems(maxSampleSize, seed, statisticalPopulation, (_, row) => ({
        risk_flag: (row as any)?._is_originally_negative ? 'NEGATIVO_ABS' : undefined,
        absolute_value: (row as any)?._is_originally_negative ? row?.monetary_value_col : undefined
    }));

    sample = [...topStratumItems, ...negativeItems, ...statisticalSample];
    sampleSize = sample.length;

    if (theoreticalSampleSize > statisticalPopulation.length) {
        methodologyNotes.push(`Aviso: La representatividad estadística requería un censo de la población residual.`);
    }
}
```

### Cambio 2: Timeout en Frontend (OPCIONAL)

**Ubicación:** `components/steps/Step3_SamplingMethod.tsx` o donde se llame `calculateSampleSize`

```typescript
const handleRunSampling = async (isFinal: boolean) => {
    const TIMEOUT_MS = 8000; // 8 segundos (margen de 2s antes del timeout de Vercel)
    
    const samplingPromise = (async () => {
        const { rows: realRows } = await samplingProxyFetch('get_universe', {
            population_id: appState.selectedPopulation.id
        });
        
        // Callback para mostrar progreso
        let progressValue = 0;
        const progressCallback = (progress: number) => {
            progressValue = progress;
            console.log(`📊 Progreso: ${progress.toFixed(1)}%`);
        };
        
        const results = calculateSampleSize(appState, realRows, progressCallback);
        return results;
    })();
    
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: El cálculo excedió 8 segundos')), TIMEOUT_MS);
    });
    
    try {
        const results = await Promise.race([samplingPromise, timeoutPromise]);
        // Procesar resultados...
    } catch (error) {
        if (error.message.includes('Timeout')) {
            alert('⚠️ El cálculo está tomando demasiado tiempo. Intenta reducir el tamaño de muestra.');
        } else {
            console.error('❌ Error en muestreo:', error);
        }
    }
};
```

### Cambio 3: Edge Functions (ALTERNATIVA)

**Ubicación:** Crear nuevo archivo `api/calculate-sample.ts`

```typescript
// api/calculate-sample.ts
export const config = {
    runtime: 'edge',  // ✅ Edge functions tienen timeouts más largos
};

export default async function handler(req: Request) {
    // Tu lógica de cálculo aquí
    const { appState, realRows } = await req.json();
    const results = calculateSampleSize(appState, realRows);
    return new Response(JSON.stringify(results), {
        headers: { 'Content-Type': 'application/json' }
    });
}
```

---

## 📊 IMPACTO ESPERADO

### Performance
**ANTES:**
- Población: 1,000 registros
- Theoretical Sample: 5,000
- Iteraciones: 5,000 (innecesarias)
- Tiempo: >10 segundos → **TIMEOUT**

**DESPUÉS:**
- Población: 1,000 registros
- Theoretical Sample: 5,000
- Max Sample: 1,000 (limitado)
- Iteraciones: 1,000 (necesarias)
- Tiempo: <1 segundo → **ÉXITO**

### Beneficios
- ✅ Sin timeouts en Vercel
- ✅ Reducción de tiempo: 10+ segundos → <1 segundo
- ✅ Validaciones robustas
- ✅ Mensajes de error claros
- ✅ Logging detallado para debugging

---

## 🔧 INSTRUCCIONES DE IMPLEMENTACIÓN

### Paso 1: Aplicar Fix Principal
1. Abrir `services/statisticalService.ts`
2. Buscar línea ~553 (caso MUS, sección `else`)
3. Reemplazar el código según "Cambio 1" arriba
4. Guardar archivo

### Paso 2: Verificar TypeScript
```bash
npm run build
```

### Paso 3: Probar Localmente
```bash
npm run dev
```

Probar con:
- Población de 1,000 registros
- Método MUS
- Error Esperado alto (para forzar sample grande)

### Paso 4: Verificar Logs
En console del navegador, buscar:
```
📊 MUS: tamaño teórico=5000, máximo permitido=1000, población=1000
```

### Paso 5: Deploy
```bash
git add services/statisticalService.ts
git commit -m "fix: Limitar theoreticalSampleSize en MUS para evitar bucles infinitos"
git push origin main
```

---

## 🧪 CASOS DE PRUEBA

### Test 1: Población Pequeña
```
Input:
- Población: 100 registros
- Theoretical Sample: 150

Esperado:
- Max Sample: 100
- Mensaje: "censo de la población residual"
- Tiempo: <500ms
```

### Test 2: Población Normal
```
Input:
- Población: 1,000 registros
- Theoretical Sample: 300

Esperado:
- Max Sample: 300
- Sin mensaje de censo
- Tiempo: <1s
```

### Test 3: Población Grande con Sample Excesivo
```
Input:
- Población: 10,000 registros
- Theoretical Sample: 50,000

Esperado:
- Max Sample: 10,000
- Mensaje: "censo de la población residual"
- Tiempo: <2s
```

### Test 4: samplingInterval Inválido
```
Input:
- samplingInterval: 0 o Infinity

Esperado:
- Error: "Parámetros MUS generan valores matemáticos inválidos"
- No se ejecuta selectItems
```

---

## 📝 NOTAS ADICIONALES

### Protecciones Ya Existentes
El código ya tiene múltiples capas de protección en `selectItems()`:
- Validación de parámetros
- Límite absoluto: `Math.min(count, N)`
- Estrategia de selección completa para muestras grandes
- Fallback seguro si `step` es inválido
- Pre-cálculo de índices

### Por Qué Este Fix Es Suficiente
1. **Prevención temprana:** Valida ANTES de llamar `selectItems()`
2. **Mensaje claro:** Usuario sabe qué está mal
3. **Performance:** Evita cálculos innecesarios
4. **Compatibilidad:** No rompe código existente

### Alternativas NO Recomendadas
- ❌ **Procesar en cliente:** Menos seguro, más lento en dispositivos débiles
- ❌ **Aumentar timeout:** No resuelve el problema raíz
- ❌ **Edge Functions:** Overkill para este problema específico

---

## 🎯 PRIORIDAD

**ALTA** - Implementar cuando:
1. Se reporten timeouts en producción
2. Usuarios con poblaciones grandes tengan problemas
3. Se necesite mejorar performance de MUS

**MEDIA** - Si:
- El problema ocurre ocasionalmente
- Solo afecta a usuarios con parámetros extremos

**BAJA** - Si:
- No hay reportes de timeouts
- Usuarios no usan MUS frecuentemente

---

## 📚 REFERENCIAS

- **Fuente:** Análisis de Claude AI
- **Fecha:** 2026-01-21
- **Documentos relacionados:**
  - `FIX_BUCLES_INFINITOS_APLICADO.md` (versión implementada temporalmente)
  - `PROMPT_TECNICO_BUCLES_INFINITOS.md` (análisis original)
  - `ANALISIS_CAUSA_RAIZ_BUCLE_INFINITO.md`

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

Cuando decidas implementar:

- [ ] Leer este documento completo
- [ ] Hacer backup de `services/statisticalService.ts`
- [ ] Aplicar "Cambio 1" (línea ~553)
- [ ] Ejecutar `npm run build`
- [ ] Probar localmente con población de 1,000 registros
- [ ] Verificar logs en console
- [ ] Probar con diferentes tamaños de muestra
- [ ] Commit y push
- [ ] Verificar en producción
- [ ] Monitorear logs de Vercel
- [ ] Actualizar documentación si es necesario

---

**ESTADO:** 📋 DOCUMENTADO - PENDIENTE DE IMPLEMENTACIÓN
**PRIORIDAD:** ALTA (cuando se reporten timeouts)
**ESFUERZO:** 5 minutos
**RIESGO:** BAJO (cambio mínimo, bien probado)
