# 🔍 Diagnóstico: Problema Vista Jerárquica - Riesgo Bajo y Sin Categoría

## 📋 Resumen del Problema

**Síntomas**:
- ✅ Vista jerárquica implementada correctamente
- ❌ Todos los registros aparecen como "Riesgo Bajo"
- ❌ Todas las categorías aparecen como "Sin Categoría"

**Estado**: Problema identificado - Falta implementación backend

---

## 🔎 Causa Raíz Identificada

### Problema 1: `risk_factors` Vacíos

**Causa**: El análisis forense NO está guardando los `risk_factors` en la base de datos.

**Evidencia**:
1. ✅ El código frontend llama a `handleRunForensicAnalysis()`
2. ✅ Esta función llama a `samplingProxyFetch('run_forensic_analysis', ...)`
3. ❌ **NO EXISTE** el endpoint `api/run_forensic_analysis.js`
4. ❌ Los `risk_factors` calculados NO se guardan en `audit_data_rows`

**Flujo actual (ROTO)**:
```
Usuario → Click "Ejecutar Análisis"
    ↓
handleRunForensicAnalysis()
    ↓
samplingProxyFetch('run_forensic_analysis', ...)
    ↓
❌ ERROR: Endpoint no existe
    ↓
risk_factors NO se guardan en BD
    ↓
Muestra generada con risk_factors = []
    ↓
Todos los registros → "Riesgo Bajo"
```

---

### Problema 2: Categorías "Sin Categoría"

**Causa**: Los registros NO tienen `raw_row` o el campo de categoría no está en la ubicación esperada.

**Evidencia**:
1. El código busca categoría en `raw_row` (JSON parseado)
2. Si `raw_row` no existe o no tiene el campo → `null`
3. `null` → "Sin Categoría"

**Posibles causas**:
- `raw_row` no se está guardando al cargar la población
- El campo de categoría tiene un nombre diferente
- Los datos no tienen ese campo poblado

---

## 🛠️ Soluciones Requeridas

### Solución 1: Implementar Endpoint de Análisis Forense

**Archivo a crear**: `api/run_forensic_analysis.js`

**Funcionalidad requerida**:
1. Recibir `population_id` y `config`
2. Obtener todos los registros de `audit_data_rows`
3. Ejecutar análisis forense (usar `riskAnalysisService.ts`)
4. Guardar `risk_factors` en cada registro
5. Actualizar `advanced_analysis` en la población
6. Retornar resultados

**Pseudocódigo**:
```javascript
export default async function handler(req, res) {
    const { population_id, config } = req.body;
    
    // 1. Obtener registros
    const { data: rows } = await supabase
        .from('audit_data_rows')
        .select('*')
        .eq('population_id', population_id);
    
    // 2. Ejecutar análisis forense
    const analysis = await performForensicAnalysis(rows, config);
    
    // 3. Preparar updates con risk_factors
    const updates = analysis.updatedRows.map(r => ({
        id: r.id,
        risk_score: r.risk_score,
        risk_factors: r.risk_factors
    }));
    
    // 4. Guardar en BD usando update_risk_batch
    await fetch('/api/update_risk_batch', {
        method: 'POST',
        body: JSON.stringify({ updates })
    });
    
    // 5. Actualizar advanced_analysis en populations
    await supabase
        .from('populations')
        .update({ advanced_analysis: analysis })
        .eq('id', population_id);
    
    // 6. Retornar resultados
    return res.json({ success: true, analysis });
}
```

---

### Solución 2: Verificar `raw_row` en la Carga de Datos

**Archivo a revisar**: `api/create_population.js` o donde se cargan los datos

**Verificar que**:
1. `raw_row` se guarda como JSON en cada registro
2. Contiene TODOS los campos originales
3. Los nombres de campos coinciden con el mapeo

**Ejemplo de registro correcto**:
```javascript
{
    id: "uuid-123",
    population_id: "pop-456",
    unique_id_col: "TX-001",
    monetary_value_col: 15000,
    risk_score: 0,
    risk_factors: [],  // Se llenará después del análisis
    raw_json: {  // ← DEBE EXISTIR
        "ID": "TX-001",
        "MONTO": 15000,
        "CATEGORIA": "GASTOS OPERATIVOS",  // ← Campo mapeado
        "SUBCATEGORIA": "SERVICIOS",
        "FECHA": "2024-01-15",
        "PROVEEDOR": "ABC Corp"
    }
}
```

---

## 🎯 Plan de Acción Inmediato

### Opción A: Implementación Completa (Recomendado)

**Pasos**:
1. ✅ Crear `api/run_forensic_analysis.js`
2. ✅ Integrar con `riskAnalysisService.ts`
3. ✅ Usar `api/update_risk_batch.js` para guardar
4. ✅ Probar flujo completo
5. ✅ Verificar que `risk_factors` se guarden

**Tiempo estimado**: 2-3 horas

**Beneficios**:
- ✅ Análisis forense funcional
- ✅ Vista jerárquica correcta
- ✅ Sistema completo

---

### Opción B: Workaround Temporal (Rápido)

**Pasos**:
1. Modificar `statisticalService.ts` para calcular `risk_factors` en el cliente
2. Clasificar riesgo basado en `risk_score` y análisis local
3. NO guardar en BD (solo en memoria)

**Tiempo estimado**: 30 minutos

**Limitaciones**:
- ❌ No persiste entre sesiones
- ❌ Análisis menos preciso
- ❌ No usa análisis forense completo

---

## 📊 Verificación Post-Implementación

### Checklist de Pruebas:

#### 1. Análisis Forense:
- [ ] Click en "Ejecutar Análisis" no da error
- [ ] Las tarjetas de "Data Driven Insights" muestran números
- [ ] Console.log muestra "Análisis completado"

#### 2. Base de Datos:
- [ ] Registros en `audit_data_rows` tienen `risk_factors` poblados
- [ ] `risk_factors` es un array con elementos
- [ ] `risk_score` es > 0 para registros con anomalías

#### 3. Vista Jerárquica:
- [ ] Registros con 3+ factores → "Riesgo Alto"
- [ ] Registros con 1-2 factores → "Riesgo Medio"
- [ ] Registros sin factores → "Riesgo Bajo"
- [ ] Categorías se muestran correctamente (si están mapeadas)

#### 4. Console Logs:
```
🔍 DEBUG - risk_factors del primer item: ["benford", "outlier", "duplicado"]
🔍 DEBUG - riskLevel: Alto
🔍 DEBUG - category: GASTOS OPERATIVOS
```

---

## 🔧 Código de Referencia

### Estructura de `risk_factors`:

```typescript
// Factores críticos (→ Alto Riesgo)
risk_factors: [
    "benford",           // Ley de Benford
    "outlier",           // Valor atípico
    "duplicado",         // Duplicado
    "splitting",         // Fraccionamiento
    "gap",              // Gap secuencial
    "isolation",        // ML Anomalía
    "ml_anomaly"        // ML Anomalía
]

// Factores no críticos (→ Medio Riesgo)
risk_factors: [
    "redondo",          // Número redondo
    "entropy",          // Entropía
    "categoria",        // Categoría anómala
    "actor",            // Actor sospechoso
    "ampliación"        // Ampliación de muestra
]
```

---

### Lógica de Clasificación (Ya implementada):

```typescript
const getRiskLevel = (riskScore: number, riskFactors: string[]): 'Alto' | 'Medio' | 'Bajo' => {
    // Factores críticos
    const criticalFactors = ['benford', 'outlier', 'duplicado', 'splitting', 'gap', 'isolation', 'ml_anomaly'];
    const hasCriticalFactor = riskFactors && riskFactors.some(f => 
        criticalFactors.some(cf => f.toLowerCase().includes(cf))
    );
    
    // 3+ factores = Alto
    if (riskFactors && riskFactors.length >= 3) return 'Alto';
    
    // 2+ factores o 1 crítico = Alto
    if ((riskFactors && riskFactors.length >= 2) || hasCriticalFactor) return 'Alto';
    
    // 1 factor no crítico = Medio
    if (riskFactors && riskFactors.length === 1) return 'Medio';
    
    // Sin factores = Bajo
    return 'Bajo';
};
```

---

## 📈 Impacto del Problema

### Actual (CON el problema):
```
▼ ⚠️  RIESGO BAJO              100 registros  ← TODO aquí
│  ▼ Otros                          100 items
│  │  ▼ 📁 Sin Categoría            100 items  ← TODO sin categoría
│  │  │  [Tabla con 100 registros]
```

### Esperado (SIN el problema):
```
▼ ⚠️  RIESGO ALTO              15 registros
│  ▼ Ley de Benford                  8 items
│  │  ▼ 📁 GASTOS OPERATIVOS         5 items
│  │  │  [Tabla con 5 registros]
│  │  ▶ 📁 GASTOS ADMINISTRATIVOS    3 items
│  ▶ Valores Atípicos                5 items
│  ▶ Duplicados                      2 items
▼ ⚠️  RIESGO MEDIO             25 registros
│  ▼ Números Redondos                15 items
│  ▶ Entropía                        10 items
▼ ⚠️  RIESGO BAJO              60 registros
│  ▼ Otros                           60 items
```

---

## 🎯 Conclusión

**Problema principal**: Falta el endpoint `api/run_forensic_analysis.js`

**Impacto**:
- ❌ Análisis forense no funciona
- ❌ `risk_factors` no se guardan
- ❌ Vista jerárquica muestra todo como "Riesgo Bajo"
- ❌ Categorías no se muestran (problema secundario)

**Solución**:
1. Implementar `api/run_forensic_analysis.js`
2. Integrar con `riskAnalysisService.ts`
3. Guardar `risk_factors` en BD
4. Verificar `raw_row` en carga de datos

**Prioridad**: 🔴 ALTA - Funcionalidad crítica no operativa

---

**Fecha**: 2026-01-20  
**Estado**: Problema diagnosticado - Requiere implementación backend  
**Archivos afectados**:
- ❌ `api/run_forensic_analysis.js` (NO EXISTE - CREAR)
- ✅ `components/results/NonStatisticalResultsView.tsx` (OK)
- ✅ `services/riskAnalysisService.ts` (OK)
- ⚠️ `api/create_population.js` (VERIFICAR raw_row)

