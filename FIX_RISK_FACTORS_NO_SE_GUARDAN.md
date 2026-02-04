# 🔧 FIX: Risk Factors No Se Guardan en Base de Datos

## 🎯 Problema Identificado

Basado en las pantallas proporcionadas:

### Síntomas:
1. ✅ Análisis de Riesgo muestra **458 alertas detectadas**
2. ✅ Ley de Benford muestra **698 anomalías**
3. ✅ Categorías y subcategorías configuradas correctamente
4. ❌ Vista de resultados muestra **solo "RIESGO BAJO"**
5. ❌ Vista de resultados muestra **solo "Sin Categoría"**
6. ❌ No refleja las 698 anomalías detectadas

### Causa Raíz:
El código calculaba los `risk_factors` correctamente pero **NO los guardaba en la base de datos**.

**Flujo anterior (ROTO)**:
```
1. performRiskProfiling() calcula risk_factors
   ↓
2. updatedRows contiene risk_factors
   ↓
3. Se intenta guardar en "background task"
   ↓
4. ❌ Background task NO ejecuta el guardado
   ↓
5. Solo se guarda advanced_analysis (estadísticas globales)
   ↓
6. audit_data_rows NO tiene risk_factors
   ↓
7. Al generar muestra → risk_factors = []
   ↓
8. Todo se clasifica como "Riesgo Bajo"
```

---

## ✅ Solución Implementada

### Cambio en `components/risk/RiskProfiler.tsx`

**Antes** (líneas 773-785):
```typescript
// Guardar scores en background
const saveTaskId = backgroundProcessor.addTask(
    'data_processing',
    { 
        updates: updatedRows.map(r => ({
            id: r.id,
            monetary_value_col: r.monetary_value_col,
            risk_score: r.risk_score,
            risk_factors: r.risk_factors
        }))
    },
    'low'
);

setBackgroundTasks(prev => [...prev, saveTaskId]);
```

**Después**:
```typescript
// Guardar risk_factors en la base de datos
console.log(`💾 Guardando risk_factors para ${updatedRows.length} registros...`);
try {
    const updates = updatedRows.map(r => ({
        id: r.id,
        risk_score: r.risk_score || 0,
        risk_factors: r.risk_factors || []
    }));

    const response = await fetch('/api/update_risk_batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
    });

    if (response.ok) {
        const result = await response.json();
        console.log(`✅ Risk factors guardados: ${result.count} registros actualizados`);
        addToast(`Análisis completado: ${result.count} registros actualizados con factores de riesgo`, 'success');
    } else {
        console.error('❌ Error guardando risk_factors:', await response.text());
        addToast('Advertencia: Los factores de riesgo no se guardaron correctamente', 'warning');
    }
} catch (error) {
    console.error('❌ Error en update_risk_batch:', error);
    addToast('Advertencia: Error al guardar factores de riesgo', 'warning');
}
```

### Cambios Clave:

1. **Guardado Síncrono**: Ahora espera a que termine el guardado antes de continuar
2. **Feedback al Usuario**: Muestra toast con el resultado
3. **Manejo de Errores**: Captura y reporta errores
4. **Console Logs**: Facilita debugging
5. **Usa API Existente**: Aprovecha `update_risk_batch` que ya existe

---

## 🔄 Flujo Nuevo (CORRECTO)

```
1. Usuario ejecuta "Análisis de Riesgo"
   ↓
2. performRiskProfiling() calcula risk_factors
   ↓ (Benford: 698, Outliers: X, etc.)
3. updatedRows contiene risk_factors
   ↓
4. ✅ fetch('/api/update_risk_batch') GUARDA en BD
   ↓
5. audit_data_rows TIENE risk_factors
   ↓
6. Usuario genera muestra
   ↓
7. Muestra incluye risk_factors de BD
   ↓
8. Vista jerárquica clasifica correctamente:
   - Alto: Registros con 3+ factores
   - Medio: Registros con 1-2 factores
   - Bajo: Registros sin factores
```

---

## 📊 Resultado Esperado

### Antes del Fix:
```
▼ ⚠️  RIESGO BAJO              30 registros  ← TODO aquí
│  ▼ Otros                          30 items
│  │  ▼ 📁 Sin Categoría            30 items
```

### Después del Fix:
```
▼ ⚠️  RIESGO ALTO              15 registros  ← Registros con anomalías Benford
│  ▼ Ley de Benford                  12 items
│  │  ▼ 📁 Hipotecario Tradicional   8 items
│  │  ▶ 📁 Línea PyME                4 items
│  ▶ Valores Atípicos                3 items
▼ ⚠️  RIESGO MEDIO             8 registros
│  ▼ Números Redondos                5 items
│  │  ▼ 📁 Crédito Agil              3 items
│  │  ▶ 📁 Personal Libre            2 items
│  ▶ Entropía                        3 items
▼ ⚠️  RIESGO BAJO              7 registros
│  ▼ Otros                           7 items
│  │  ▼ 📁 Hipotecario Tradicional   4 items
│  │  ▶ 📁 Línea PyME                3 items
```

---

## 🧪 Cómo Probar el Fix

### Paso 1: Limpiar Datos Anteriores (Opcional)
Si quieres empezar desde cero:
```sql
-- Limpiar risk_factors anteriores
UPDATE audit_data_rows 
SET risk_factors = '[]'::jsonb, 
    risk_score = 0 
WHERE population_id = 'tu-population-id';
```

### Paso 2: Ejecutar Análisis de Riesgo
1. Ir a la población cargada
2. Click en **"Análisis de Riesgo NIA 530"**
3. Esperar a que termine (10-30 segundos)
4. **Verificar toast**: Debe decir "Análisis completado: 1000 registros actualizados con factores de riesgo"

### Paso 3: Verificar Console Logs
Abrir consola del navegador (F12) y buscar:
```
💾 Guardando risk_factors para 1000 registros...
✅ Risk factors guardados: 1000 registros actualizados
```

### Paso 4: Verificar Base de Datos
```sql
-- Ver registros con risk_factors
SELECT 
    unique_id_col,
    risk_score,
    risk_factors,
    array_length(risk_factors, 1) as num_factors
FROM audit_data_rows
WHERE population_id = 'tu-population-id'
  AND array_length(risk_factors, 1) > 0
ORDER BY risk_score DESC
LIMIT 10;
```

Deberías ver registros con `risk_factors` como:
```
["benford", "outlier"]
["benford", "redondo", "duplicado"]
["outlier"]
```

### Paso 5: Generar Muestra No Estadística
1. Ir a **Muestreo No Estadístico**
2. Configurar parámetros
3. Generar muestra
4. **Verificar vista jerárquica**:
   - Debe mostrar 3 niveles de riesgo (Alto, Medio, Bajo)
   - Debe mostrar categorías correctas
   - Debe reflejar las anomalías detectadas

### Paso 6: Verificar Categorías
1. Expandir cualquier nivel de riesgo
2. Expandir cualquier tipo de análisis
3. **Verificar que aparecen las categorías**:
   - "Hipotecario Tradicional"
   - "Línea PyME"
   - "Crédito Agil"
   - "Personal Libre"
   - etc.

---

## 🐛 Solución de Problemas

### Problema: Toast dice "Advertencia: Los factores de riesgo no se guardaron"

**Causa**: Error en `update_risk_batch`

**Solución**:
1. Verificar que el endpoint existe: `api/update_risk_batch.js`
2. Verificar variables de entorno:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Revisar console.log del servidor para ver el error específico

---

### Problema: Sigue mostrando "Sin Categoría"

**Causa**: El campo de categoría no está en `raw_json`

**Solución**:
1. Verificar que el mapeo de columnas es correcto
2. Verificar que los datos tienen el campo
3. Re-cargar la población si es necesario

**Query de verificación**:
```sql
SELECT 
    unique_id_col,
    raw_json->'linea de credito' as categoria,
    raw_json->'destino' as subcategoria
FROM audit_data_rows
WHERE population_id = 'tu-population-id'
LIMIT 5;
```

---

### Problema: Sigue mostrando todo en "Riesgo Bajo"

**Causa**: Los `risk_factors` siguen vacíos

**Solución**:
1. Verificar que el análisis de riesgo se ejecutó correctamente
2. Verificar console.log: "✅ Risk factors guardados"
3. Verificar en BD que los registros tienen `risk_factors`
4. Si no, revisar errores en el servidor

---

## 📋 Checklist de Verificación

### Después de Aplicar el Fix:
- [ ] Código actualizado en `RiskProfiler.tsx`
- [ ] Servidor reiniciado (si es necesario)
- [ ] Análisis de riesgo ejecutado
- [ ] Toast muestra "Análisis completado: X registros actualizados"
- [ ] Console.log muestra "✅ Risk factors guardados"
- [ ] BD tiene registros con `risk_factors` poblados
- [ ] Muestra generada refleja los niveles de riesgo correctos
- [ ] Vista jerárquica muestra 3 niveles (Alto, Medio, Bajo)
- [ ] Categorías se muestran correctamente

---

## 🎯 Impacto del Fix

### Antes:
- ❌ 698 anomalías detectadas pero no guardadas
- ❌ Vista muestra todo como "Riesgo Bajo"
- ❌ Categorías no se muestran
- ❌ Análisis forense inútil

### Después:
- ✅ 698 anomalías guardadas en BD
- ✅ Vista muestra distribución real de riesgo
- ✅ Categorías se muestran correctamente
- ✅ Análisis forense funcional y útil

---

## 📊 Ejemplo Real (Basado en tus Pantallas)

### Datos de tu Población:
- Total registros: 1000
- Ley de Benford: 698 anomalías detectadas
- Categorías: "Hipotecario Tradicional", "Línea PyME", "Crédito Agil", "Personal Libre"

### Resultado Esperado Después del Fix:
```
▼ ⚠️  RIESGO ALTO              ~200 registros
│  ▼ Ley de Benford                  ~180 items
│  │  ▼ 📁 Hipotecario Tradicional   ~100 items
│  │  ▼ 📁 Línea PyME                ~50 items
│  │  ▶ 📁 Crédito Agil              ~20 items
│  │  ▶ 📁 Personal Libre            ~10 items
│  ▶ Valores Atípicos                ~20 items
│  
▼ ⚠️  RIESGO MEDIO             ~300 registros
│  ▼ Números Redondos                ~150 items
│  ▶ Benford Mejorado                ~100 items
│  ▶ Entropía                        ~50 items
│  
▼ ⚠️  RIESGO BAJO              ~500 registros
│  ▼ Otros                           ~500 items
│  │  ▼ 📁 Hipotecario Tradicional   ~250 items
│  │  ▼ 📁 Línea PyME                ~150 items
│  │  ▶ 📁 Crédito Agil              ~70 items
│  │  ▶ 📁 Personal Libre            ~30 items
```

---

## 🎉 Conclusión

El fix es simple pero crítico:
1. ✅ Cambia guardado asíncrono (background) por síncrono (await)
2. ✅ Usa API existente (`update_risk_batch`)
3. ✅ Agrega feedback al usuario
4. ✅ Maneja errores correctamente

**Tiempo de implementación**: Ya está aplicado
**Tiempo de prueba**: 5-10 minutos
**Impacto**: ALTO - Hace funcional todo el sistema de análisis forense

---

**Fecha**: 2026-01-20  
**Archivo modificado**: `components/risk/RiskProfiler.tsx`  
**Líneas**: 773-785  
**Estado**: ✅ APLICADO

