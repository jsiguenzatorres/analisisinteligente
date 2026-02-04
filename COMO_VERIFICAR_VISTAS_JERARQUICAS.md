# 🔍 Cómo Verificar el Problema de las Vistas Jerárquicas

## 📋 Problema Actual

La vista jerárquica en `NonStatisticalResultsView.tsx` muestra:
- ❌ Todos los registros en "Riesgo Bajo"
- ❌ Todas las categorías como "Sin Categoría"

Esto a pesar de que:
- ✅ El usuario configuró mapeo de categorías
- ✅ El análisis forense se ejecutó

---

## 🎯 Pasos para Diagnosticar

### Paso 1: Abrir la Consola del Navegador

1. Presiona **F12** o **Click derecho → Inspeccionar**
2. Ve a la pestaña **"Console"**
3. Limpia la consola (icono 🚫 o Ctrl+L)

### Paso 2: Generar una Muestra

1. Ve a **Muestreo No Estadístico**
2. Configura los parámetros
3. Click en **"Generar Muestra"**
4. Espera a que se complete
5. Ve a la **tabla de resultados**

### Paso 3: Revisar los Console Logs

Deberías ver estos mensajes en la consola:

```
🔍 DEBUG - Primer item de la muestra: {id: "...", risk_factors: [...], ...}
🔍 DEBUG - risk_factors del primer item: ["benford", "outlier"]
🔍 DEBUG - Mapeo de categorías: {category: "CATEGORIA", subcategory: "SUBCATEGORIA"}
🔍 DEBUG - Clasificación del primer item:
  - riskScore: 0
  - riskFactors: ["benford", "outlier"]
  - riskLevel: Alto
  - analysisType: Ley de Benford
  - category: GASTOS OPERATIVOS
```

---

## 🔍 Interpretación de los Logs

### Caso 1: `risk_factors` está vacío `[]`

**Ejemplo de log:**
```
🔍 DEBUG - risk_factors del primer item: []
🔍 DEBUG - Clasificación del primer item:
  - riskFactors: []
  - riskLevel: Bajo  ← PROBLEMA AQUÍ
```

**Diagnóstico**: Los registros NO tienen factores de riesgo asignados

**Causas posibles**:
1. No se ejecutó el análisis forense completo
2. El análisis forense no guardó los `risk_factors` en la base de datos
3. Los `risk_factors` no se están cargando al generar la muestra

**Solución**:
1. Ve a la sección **"Métodos de Análisis Forense"**
2. Click en **"Ejecutar Análisis"**
3. Espera a que termine (puede tardar varios segundos)
4. Verifica que las tarjetas de "Data Driven Insights" muestren números > 0
5. Vuelve a generar la muestra

---

### Caso 2: `category` es `null` o `undefined`

**Ejemplo de log:**
```
🔍 DEBUG - Mapeo de categorías: {category: "CATEGORIA", subcategory: "SUBCATEGORIA"}
🔍 DEBUG - Clasificación del primer item:
  - category: null  ← PROBLEMA AQUÍ
```

**Diagnóstico**: El campo de categoría no se está extrayendo correctamente

**Causas posibles**:
1. El campo de categoría no existe en `raw_row`
2. El nombre del campo en el mapeo no coincide con el nombre real en los datos
3. Los datos no tienen ese campo poblado

**Solución**:
1. Verifica el mapeo de columnas en la configuración
2. Asegúrate de que el nombre del campo sea exacto (case-sensitive)
3. Verifica que los datos originales tengan ese campo

---

### Caso 3: `raw_row` no existe o está mal formateado

**Ejemplo de log:**
```
🔍 DEBUG - Primer item de la muestra: {id: "...", value: 123, raw_row: undefined}
```

**Diagnóstico**: Los items no tienen `raw_row` o está en formato incorrecto

**Causas posibles**:
1. La muestra se generó sin incluir `raw_row`
2. El formato de `raw_row` no es JSON válido

**Solución**: Verificar la función que genera la muestra

---

## 🛠️ Soluciones Específicas

### Solución 1: Ejecutar Análisis Forense

Si `risk_factors` está vacío:

1. **Ir a Muestreo No Estadístico**
2. **Buscar el panel "Métodos de Análisis Forense"**
3. **Click en "Ejecutar Análisis"**
4. **Esperar a que termine** (verás un spinner)
5. **Verificar las tarjetas de "Data Driven Insights"**:
   - Ley de Benford: X anomalías
   - Valores Atípicos: X outliers
   - Duplicados: X duplicados
   - etc.
6. **Si todas las tarjetas muestran 0**: El análisis no detectó anomalías (normal en poblaciones limpias)
7. **Volver a generar la muestra**

---

### Solución 2: Verificar Mapeo de Categorías

Si `category` es null:

1. **Ir a Configuración de Población**
2. **Verificar el mapeo de columnas**:
   - ¿Está mapeado el campo "Categoría"?
   - ¿El nombre del campo es correcto?
   - ¿Es case-sensitive? (CATEGORIA vs categoria)
3. **Verificar los datos originales**:
   - Abrir el archivo Excel/CSV original
   - Verificar que la columna existe
   - Verificar que tiene datos (no está vacía)
4. **Re-cargar la población** si es necesario

---

### Solución 3: Verificar Estructura de Datos

Si `raw_row` no existe:

1. **Abrir la consola del navegador**
2. **Ejecutar este comando**:
```javascript
// Ver la estructura de un item de la muestra
console.log(JSON.stringify(appState.results.sample[0], null, 2));
```
3. **Verificar que tenga**:
   - `id`
   - `value`
   - `risk_factors` (array)
   - `raw_row` (objeto o string JSON)

---

## 📊 Ejemplo de Datos Correctos

### Item con Factores de Riesgo:
```javascript
{
  "id": "TX-001",
  "value": 15000,
  "risk_score": 85,
  "risk_factors": ["benford", "outlier", "duplicado"],
  "raw_row": {
    "ID": "TX-001",
    "MONTO": 15000,
    "CATEGORIA": "GASTOS OPERATIVOS",
    "SUBCATEGORIA": "SERVICIOS",
    "FECHA": "2024-01-15"
  }
}
```

**Resultado esperado**:
- ✅ Riesgo: **Alto** (3 factores)
- ✅ Tipo: **Ley de Benford**
- ✅ Categoría: **GASTOS OPERATIVOS**

---

### Item sin Factores de Riesgo:
```javascript
{
  "id": "TX-002",
  "value": 5000,
  "risk_score": 0,
  "risk_factors": [],  // ← VACÍO
  "raw_row": {
    "ID": "TX-002",
    "MONTO": 5000,
    "CATEGORIA": "GASTOS ADMINISTRATIVOS"
  }
}
```

**Resultado esperado**:
- ✅ Riesgo: **Bajo** (sin factores)
- ✅ Tipo: **Otros**
- ✅ Categoría: **GASTOS ADMINISTRATIVOS**

---

## 🎯 Checklist de Verificación

### Antes de Generar la Muestra:
- [ ] ¿Se ejecutó el análisis forense completo?
- [ ] ¿Las tarjetas de "Data Driven Insights" muestran números?
- [ ] ¿El mapeo de categorías está configurado?
- [ ] ¿Los datos originales tienen el campo de categoría?

### Después de Generar la Muestra:
- [ ] ¿Los console.logs aparecen en la consola?
- [ ] ¿`risk_factors` tiene elementos (no está vacío)?
- [ ] ¿`category` tiene un valor (no es null)?
- [ ] ¿La vista jerárquica muestra los niveles correctos?

---

## 🚨 Problemas Comunes

### Problema: "No veo los console.logs"
**Solución**: 
- Asegúrate de estar en la pestaña "Console" del navegador
- Limpia la consola y vuelve a generar la muestra
- Verifica que no haya filtros activos en la consola

### Problema: "risk_factors siempre está vacío"
**Solución**:
- Ejecuta el análisis forense ANTES de generar la muestra
- Verifica que el análisis termine correctamente
- Si el análisis no detecta anomalías, es normal que esté vacío

### Problema: "category siempre es null"
**Solución**:
- Verifica el mapeo de columnas
- Asegúrate de que el nombre del campo sea exacto
- Verifica que los datos tengan ese campo poblado

### Problema: "La vista muestra 'Sin Categoría' pero configuré el mapeo"
**Solución**:
- Verifica que `raw_row` contenga el campo
- Verifica que el campo no esté vacío en los datos
- Verifica que el nombre del campo en el mapeo coincida con el de los datos

---

## 📝 Qué Reportar

Si después de seguir estos pasos el problema persiste, reporta:

1. **Console logs completos** (copia y pega)
2. **Estructura de un item** (ejecuta `console.log(JSON.stringify(appState.results.sample[0], null, 2))`)
3. **Mapeo de categorías** (captura de pantalla)
4. **Tarjetas de "Data Driven Insights"** (captura de pantalla)
5. **¿Se ejecutó el análisis forense?** (Sí/No)

---

## 🎉 Resultado Esperado

Después de seguir estos pasos, deberías ver:

```
▼ ⚠️  RIESGO ALTO              15 registros
│  ▼ Ley de Benford                  8 items
│  │  ▼ 📁 GASTOS OPERATIVOS         5 items
│  │  │  [Tabla con 5 registros]
│  │  ▶ 📁 GASTOS ADMINISTRATIVOS    3 items
│  ▶ Valores Atípicos                5 items
│  ▶ Duplicados                      2 items
▼ ⚠️  RIESGO MEDIO             8 registros
│  ▼ Números Redondos                8 items
▶ ⚠️  RIESGO BAJO              12 registros
```

---

**Fecha**: 2026-01-20  
**Estado**: Guía de diagnóstico  
**Acción requerida**: Seguir los pasos y reportar los logs

