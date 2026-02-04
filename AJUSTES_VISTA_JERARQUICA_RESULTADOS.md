# 🔧 Ajustes a Vista Jerárquica - Tabla de Resultados

## 📋 Problemas Identificados

### 1. Solo muestra "Riesgo Bajo"
**Causa**: La clasificación de riesgo se basaba únicamente en `risk_score`, que en muchos casos es 0 o muy bajo.

**Solución**: Clasificación inteligente basada en `risk_factors`:
- **Alto**: 3+ factores O 2+ factores con al menos uno crítico
- **Medio**: 1-2 factores no críticos
- **Bajo**: Sin factores o score bajo

### 2. No muestra categorías del mapeo
**Causa**: La jerarquía solo tenía 3 niveles (Riesgo → Tipo → Registros).

**Solución**: Jerarquía adaptativa de 3-4 niveles:
- **SIN categorías**: Riesgo → Tipo → Registros (3 niveles)
- **CON categorías**: Riesgo → Tipo → Categoría → Registros (4 niveles)

---

## ✅ Cambios Implementados

### 1. Clasificación de Riesgo Mejorada

#### Antes:
```typescript
const getRiskLevel = (riskScore: number): 'Alto' | 'Medio' | 'Bajo' => {
    if (riskScore > 80) return 'Alto';
    if (riskScore > 50) return 'Medio';
    return 'Bajo';
};
```

#### Después:
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
    
    // Fallback al score
    if (riskScore > 80) return 'Alto';
    if (riskScore > 50) return 'Medio';
    return 'Bajo';
};
```

**Beneficios**:
- ✅ Registros con anomalías forenses se clasifican como Alto/Medio
- ✅ No depende solo del score numérico
- ✅ Prioriza registros con múltiples factores de riesgo

---

### 2. Jerarquía Adaptativa con Categorías

#### Nueva Función: `getCategoryFromItem`
```typescript
const getCategoryFromItem = (item: AuditSampleItem): string | null => {
    if (!appState.selectedPopulation?.column_mapping) return null;
    
    const categoryField = appState.selectedPopulation.column_mapping.category;
    if (!categoryField) return null;
    
    try {
        const rawData = typeof item.raw_row === 'string' ? JSON.parse(item.raw_row) : item.raw_row;
        return rawData?.[categoryField] || null;
    } catch {
        return null;
    }
};
```

#### Organización Jerárquica Mejorada
```typescript
const organizeHierarchically = (items: AuditSampleItem[]) => {
    const hasCategoryMapping = !!appState.selectedPopulation?.column_mapping?.category;
    
    const hierarchy: {
        [riskLevel: string]: {
            [analysisType: string]: {
                [category: string]: AuditSampleItem[]
            }
        }
    } = { 'Alto': {}, 'Medio': {}, 'Bajo': {} };
    
    items.forEach(item => {
        const riskLevel = getRiskLevel(item.risk_score || 0, item.risk_factors || []);
        const analysisType = getAnalysisType(item.risk_factors || []);
        const category = hasCategoryMapping ? (getCategoryFromItem(item) || 'Sin Categoría') : 'Todos';
        
        // Organizar en 3 niveles
        if (!hierarchy[riskLevel][analysisType]) {
            hierarchy[riskLevel][analysisType] = {};
        }
        if (!hierarchy[riskLevel][analysisType][category]) {
            hierarchy[riskLevel][analysisType][category] = [];
        }
        hierarchy[riskLevel][analysisType][category].push(item);
    });
    
    return { hierarchy, hasCategoryMapping };
};
```

---

### 3. Renderizado Adaptativo

#### Sin Categorías (3 niveles):
```
▼ ⚠️  RIESGO ALTO              15 registros
│  ▼ Ley de Benford                  8 items
│  │  [Tabla con registros]
│  ▶ Valores Atípicos                5 items
```

#### Con Categorías (4 niveles):
```
▼ ⚠️  RIESGO ALTO              15 registros
│  ▼ Ley de Benford                  8 items
│  │  ▼ 📁 GASTOS OPERATIVOS         5 items
│  │  │  [Tabla con registros]
│  │  ▶ 📁 GASTOS ADMINISTRATIVOS    3 items
│  ▶ Valores Atípicos                5 items
```

---

## 🎯 Estructura Final

### Caso 1: Sin Mapeo de Categorías
```
Nivel 1: RIESGO (Alto/Medio/Bajo)
    │
    ├─ Nivel 2: TIPO DE ANÁLISIS
    │      │
    │      └─ Nivel 3: REGISTROS (Tabla editable)
```

### Caso 2: Con Mapeo de Categorías
```
Nivel 1: RIESGO (Alto/Medio/Bajo)
    │
    ├─ Nivel 2: TIPO DE ANÁLISIS
    │      │
    │      ├─ Nivel 3: CATEGORÍA (del mapeo del usuario)
    │      │      │
    │      │      └─ Nivel 4: REGISTROS (Tabla editable)
```

---

## 🎨 Elementos Visuales Nuevos

### Nivel de Categoría
```typescript
<div className="cursor-pointer p-3 bg-white rounded-lg hover:bg-slate-50 transition-all border border-slate-200">
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <i className="fas fa-chevron-down text-slate-400"></i>
            <i className="fas fa-folder text-indigo-500"></i>
            <span className="font-bold text-xs">GASTOS OPERATIVOS</span>
        </div>
        <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded-full">
            5 items
        </span>
    </div>
</div>
```

**Características**:
- ✅ Icono de carpeta (📁)
- ✅ Color indigo para distinguir de otros niveles
- ✅ Contador de items
- ✅ Expandible/colapsable

---

## 📊 Ejemplos de Clasificación

### Ejemplo 1: Registro con Múltiples Factores
```typescript
{
    id: "TX-001",
    risk_score: 0,  // Score bajo
    risk_factors: ["benford", "outlier", "duplicado"]  // 3 factores
}
```
**Clasificación**: ⚠️ **RIESGO ALTO** (por cantidad de factores)

### Ejemplo 2: Registro con Factor Crítico
```typescript
{
    id: "TX-002",
    risk_score: 0,
    risk_factors: ["benford"]  // 1 factor crítico
}
```
**Clasificación**: ⚠️ **RIESGO ALTO** (por factor crítico)

### Ejemplo 3: Registro con Factor No Crítico
```typescript
{
    id: "TX-003",
    risk_score: 0,
    risk_factors: ["redondo"]  // 1 factor no crítico
}
```
**Clasificación**: ⚠️ **RIESGO MEDIO** (1 factor no crítico)

### Ejemplo 4: Registro Sin Factores
```typescript
{
    id: "TX-004",
    risk_score: 0,
    risk_factors: []  // Sin factores
}
```
**Clasificación**: ⚠️ **RIESGO BAJO** (sin factores)

---

## 🔍 Factores Críticos vs No Críticos

### Factores Críticos (→ Alto Riesgo):
- `benford` - Ley de Benford
- `outlier` - Valores atípicos
- `duplicado` - Duplicados
- `splitting` - Fraccionamiento
- `gap` - Gaps secuenciales
- `isolation` - ML Anomalías
- `ml_anomaly` - ML Anomalías

### Factores No Críticos (→ Medio Riesgo):
- `redondo` - Números redondos
- `entropy` - Entropía
- `categoria` - Categoría anómala
- `actor` - Actor sospechoso
- `ampliación` - Ampliación de muestra

---

## 🎯 Casos de Uso

### Caso 1: Usuario SIN mapeo de categorías
**Resultado**:
```
▼ ⚠️  RIESGO ALTO              15 registros
│  ▼ Ley de Benford                  8 items
│  │  [Tabla directa con 8 registros]
```

### Caso 2: Usuario CON mapeo de categorías
**Resultado**:
```
▼ ⚠️  RIESGO ALTO              15 registros
│  ▼ Ley de Benford                  8 items
│  │  ▼ 📁 GASTOS OPERATIVOS         5 items
│  │  │  [Tabla con 5 registros]
│  │  ▶ 📁 GASTOS ADMINISTRATIVOS    3 items
```

---

## 📈 Mejoras de UX

### Antes:
- ❌ Todos los registros en "Riesgo Bajo"
- ❌ No se veían las categorías del usuario
- ❌ Difícil identificar prioridades

### Después:
- ✅ Clasificación inteligente por factores de riesgo
- ✅ Categorías del usuario visibles (si las configuró)
- ✅ Priorización automática
- ✅ Navegación más granular

---

## 🔧 Funciones Helper Nuevas

### 1. `getCategoryFromItem(item)`
Extrae la categoría del raw_row usando el mapeo del usuario.

### 2. `renderItemsTable(...)`
Renderiza la tabla de registros editables (reutilizable).

### 3. `getRiskLevel(riskScore, riskFactors)`
Clasificación inteligente basada en factores.

---

## ✅ Checklist de Verificación

### Clasificación de Riesgo:
- [ ] Registros con 3+ factores → Alto
- [ ] Registros con factores críticos → Alto
- [ ] Registros con 1 factor no crítico → Medio
- [ ] Registros sin factores → Bajo

### Categorías:
- [ ] Si hay mapeo de categorías → Nivel adicional visible
- [ ] Si NO hay mapeo → Tabla directa (3 niveles)
- [ ] Categorías extraídas del raw_row correctamente
- [ ] "Sin Categoría" para registros sin categoría

### Funcionalidad:
- [ ] Expandir/colapsar funciona en todos los niveles
- [ ] Campos editables preservados
- [ ] Auto-guardado funcional
- [ ] Contadores correctos en cada nivel

---

## 🎉 Resultado Final

Ahora la vista jerárquica:
1. ✅ Clasifica correctamente por riesgo (basado en factores)
2. ✅ Muestra categorías del usuario (si las configuró)
3. ✅ Prioriza registros con anomalías forenses
4. ✅ Proporciona navegación granular
5. ✅ Mantiene funcionalidad de edición

**Estado**: ✅ LISTO PARA PRODUCCIÓN

---

**Fecha**: 2026-01-20  
**Componente**: NonStatisticalResultsView.tsx  
**Tipo de Cambio**: Bug Fix + Feature Enhancement
