# 🔄 ROLLBACK: Agrupación Jerárquica Revertida

**Fecha**: Enero 16, 2026  
**Acción**: ROLLBACK COMPLETO  
**Razón**: Sistema se traba incluso con población pequeña

---

## ❌ PROBLEMA PERSISTENTE

El usuario reporta que el sistema **se sigue trabando** incluso después de las optimizaciones y **con la población más pequeña**.

Esto indica que el problema NO es la agrupación jerárquica que implementamos, sino algo más fundamental en el proceso de generación de muestra.

---

## 🔄 ACCIONES TOMADAS

### **1. Rollback Completo**
```bash
git checkout components/results/StratifiedResultsView.tsx
git checkout services/reportService.ts
```

**Resultado**:
- ✅ Código revertido al estado original
- ✅ Build exitoso en 7.11s
- ✅ Sin errores

### **2. Archivos Revertidos**

#### **`components/results/StratifiedResultsView.tsx`**
- ❌ Removida agrupación jerárquica
- ❌ Removidas tarjetas de categoría/subcategoría
- ❌ Removido código de expand/collapse multinivel
- ✅ Restaurado código original simple

#### **`services/reportService.ts`**
- ❌ Removidas tablas de categoría/subcategoría en PDF
- ✅ Restaurado código original

---

## 🔍 DIAGNÓSTICO NECESARIO

### **El problema REAL está en uno de estos lugares**:

#### **1. Carga de Datos (`get_universe`)**
- Timeout o hang en la llamada a Supabase
- Problema de red
- Problema de RLS (Row Level Security)
- Modo emergencia no funcionando correctamente

#### **2. Algoritmo de Estratificación (`calculateSampleSize`)**
- Bucle infinito en cálculo de límites
- Problema con parámetros específicos
- División por cero
- Condición que nunca se cumple

#### **3. Configuración de Parámetros**
- Umbral de certeza muy bajo/alto
- Número de estratos inválido
- Error tolerable muy pequeño
- Conflicto entre parámetros

---

## 🧪 PASOS DE DEBUGGING

### **PASO 1: Verificar Consola del Navegador**

1. Abre DevTools (F12)
2. Ve a la pestaña "Console"
3. Limpia la consola
4. Intenta generar muestra estratificada
5. **Copia TODOS los mensajes**

**Mensajes esperados**:
```
🌐 Iniciando carga de datos (versión anti-bucle)...
⏰ Inicio: [timestamp]
🎯 Método: stratified
📊 Población esperada: X registros
⏱️ Tiempo de carga: XXXms
✅ Datos obtenidos: X registros
🔢 Procesando X registros válidos
```

**Si NO ves estos mensajes**:
- El problema está ANTES de la carga de datos
- Posiblemente en la validación de parámetros
- O en la llamada inicial a la API

**Si ves los mensajes pero se detiene**:
- Anota en qué mensaje se detiene
- Ese es el cuello de botella

### **PASO 2: Verificar Parámetros**

Antes de generar la muestra, anota:
- **Población**: ¿Cuántos registros tiene?
- **Método**: Estratificado
- **Base**: ¿Monetaria, Categoría, Subcategoría?
- **Número de estratos**: ¿Cuántos?
- **Umbral de certeza**: ¿Cuál es el valor?
- **Método de asignación**: ¿Proporcional, Neyman, etc.?
- **Tamaño de muestra**: ¿Manual o automático?

### **PASO 3: Verificar Modo Emergencia**

En la consola del navegador, ejecuta:
```javascript
localStorage.getItem('SKIP_SAVE_MODE')
```

**Resultado esperado**: `"true"`

Si es `null`, el modo emergencia NO está activo.

### **PASO 4: Verificar Network**

1. Ve a la pestaña "Network" en DevTools
2. Limpia (icono de prohibido)
3. Intenta generar muestra
4. Busca requests que estén:
   - ⏳ Pending (esperando)
   - ❌ Failed (fallidos)
   - ⏱️ Muy lentos (>10 segundos)

---

## 🎯 POSIBLES CAUSAS Y SOLUCIONES

### **Causa 1: Problema de Red/API**

**Síntomas**:
- No aparecen mensajes en consola
- Request "get_universe" en pending infinito
- Timeout después de 10 segundos

**Solución**:
```typescript
// Aumentar timeout en SamplingWorkspace.tsx
const { rows: realRows } = await samplingProxyFetch('get_universe', {
    population_id: appState.selectedPopulation.id
}, { 
    timeout: 30000 // Aumentar a 30 segundos
});
```

### **Causa 2: Parámetros Inválidos**

**Síntomas**:
- Mensajes aparecen pero se detiene en "Procesando X registros"
- No hay errores visibles
- CPU al 100%

**Solución**:
Agregar validación de parámetros antes de calcular:
```typescript
// Validar parámetros
if (st.strataCount < 1 || st.strataCount > 10) {
    throw new Error('Número de estratos inválido');
}
if (st.certaintyStratumThreshold < 0) {
    throw new Error('Umbral de certeza inválido');
}
```

### **Causa 3: Bucle Infinito en Cálculo**

**Síntomas**:
- CPU al 100%
- Navegador no responde
- No hay mensajes de error

**Solución**:
Agregar timeout al cálculo:
```typescript
const calcTimeout = setTimeout(() => {
    throw new Error('Timeout: Cálculo de estratos tardó más de 30 segundos');
}, 30000);

const results = calculateSampleSize(...);
clearTimeout(calcTimeout);
```

### **Causa 4: Modo Emergencia No Funciona**

**Síntomas**:
- Request a Supabase en pending
- Problema de RLS
- Timeout en guardado

**Solución**:
Verificar que el modo emergencia esté activo:
```typescript
// En sampleStorageService.ts
const EMERGENCY_MODE = localStorage.getItem('SKIP_SAVE_MODE') === 'true';
console.log('🚨 MODO EMERGENCIA:', EMERGENCY_MODE);
```

---

## 📝 INFORMACIÓN NECESARIA DEL USUARIO

Para poder ayudar, necesito que me proporciones:

### **1. Mensajes de Consola**
Copia TODOS los mensajes que aparezcan en la consola cuando intentas generar la muestra.

### **2. Parámetros Usados**
- Población: ¿Cuántos registros?
- Base de estratificación: ¿Monetaria, Categoría, etc.?
- Número de estratos: ¿Cuántos?
- Umbral de certeza: ¿Cuál?
- Método de asignación: ¿Cuál?

### **3. Comportamiento Exacto**
- ¿En qué momento se traba? (al hacer click, después de X segundos, etc.)
- ¿Aparece algún mensaje en pantalla?
- ¿El navegador se congela completamente o solo la página?
- ¿Puedes abrir otras pestañas mientras está trabado?

### **4. Network Tab**
- ¿Hay algún request en "pending"?
- ¿Cuál es el nombre del request?
- ¿Cuánto tiempo lleva esperando?

---

## 🚀 PLAN DE ACCIÓN

### **Inmediato**:
1. ✅ Código revertido al original
2. ⏳ Usuario prueba con código original
3. ⏳ Usuario proporciona información de debugging

### **Según Resultados**:

#### **Si se sigue trabando con código original**:
→ El problema NO es la agrupación jerárquica
→ Hay un problema fundamental en el algoritmo o la API
→ Necesitamos los logs de consola para diagnosticar

#### **Si funciona con código original**:
→ El problema SÍ era la agrupación jerárquica
→ Necesitamos reimplementarla de forma más eficiente
→ Posiblemente con virtualización o lazy loading

---

## 📊 ESTADO ACTUAL

### **Código**:
- ✅ Revertido al estado original
- ✅ Build exitoso
- ✅ Sin errores de compilación

### **Funcionalidad**:
- ❌ Agrupación jerárquica: REMOVIDA
- ❌ Tarjetas de categoría/subcategoría: REMOVIDAS
- ❌ Tablas en PDF: REMOVIDAS
- ✅ Vista original: RESTAURADA

### **Documentación**:
- ✅ `SOLUCION_BUCLE_INFINITO_ESTRATIFICADO.md` - Análisis del problema O(n²)
- ✅ `OPTIMIZACIONES_RENDIMIENTO_ESTRATIFICADO.md` - Optimizaciones aplicadas
- ✅ `ROLLBACK_AGRUPACION_JERARQUICA.md` - Este documento
- ⚠️ Documentación de agrupación jerárquica: OBSOLETA (no implementada)

---

## 🔮 PRÓXIMOS PASOS

1. **Usuario prueba con código original**
2. **Usuario proporciona logs de consola**
3. **Diagnosticamos el problema real**
4. **Aplicamos la solución correcta**
5. **Si es necesario, reimplementamos agrupación jerárquica de forma más eficiente**

---

**Estado**: ⏳ **ESPERANDO FEEDBACK DEL USUARIO**  
**Código**: ✅ **REVERTIDO Y FUNCIONAL**  
**Siguiente paso**: 🔍 **DEBUGGING CON LOGS DE CONSOLA**
