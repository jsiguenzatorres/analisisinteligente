# Agrupación por Categoría y Subcategoría en Muestreo Estratificado

## 📋 RESUMEN EJECUTIVO

Se ha implementado una funcionalidad de **agrupación jerárquica dinámica** en la vista de resultados del Muestreo Estratificado, que permite visualizar la distribución de la muestra por:

1. **Estrato** (nivel base - siempre presente)
2. **Categoría** (nivel 2 - si está configurado en column_mapping)
3. **Subcategoría** (nivel 3 - si está configurado en column_mapping)

Esta funcionalidad es **completamente dinámica** y se adapta automáticamente a la configuración del auditor.

---

## 🎯 CARACTERÍSTICAS IMPLEMENTADAS

### **FASE 1: Tarjetas Resumen (Sidebar)**

Se agregaron dos nuevas tarjetas informativas en el panel lateral derecho:

#### 1. **Distribución por Categoría**
- **Icono**: `fas fa-tags` (etiquetas múltiples)
- **Color**: Azul (`blue-50`, `blue-600`)
- **Contenido**:
  - Nombre de cada categoría
  - Cantidad de ítems seleccionados
  - Valor monetario total
  - Cantidad de errores detectados
- **Ordenamiento**: Por valor monetario descendente
- **Scroll**: Máximo 300px de altura con scroll personalizado

#### 2. **Distribución por Subcategoría**
- **Icono**: `fas fa-tag` (etiqueta única)
- **Color**: Púrpura (`purple-50`, `purple-600`)
- **Contenido**: Igual que categoría
- **Ordenamiento**: Por valor monetario descendente
- **Scroll**: Máximo 300px de altura con scroll personalizado

**Validación**: Estas tarjetas solo aparecen si:
- `column_mapping.category` está definido (para categoría)
- `column_mapping.subcategory` está definido (para subcategoría)

---

### **FASE 2: Agrupación Jerárquica en Tabla (Main Content)**

Se reemplazó la tabla plana por una **estructura jerárquica expandible/colapsable** con 3 niveles:

#### **Nivel 1: ESTRATO** (Siempre presente)
- **Color de fondo**: `slate-50` (gris claro)
- **Badge**: Amber para "Certeza", Indigo para otros estratos
- **Icono**: `fa-chevron-down` / `fa-chevron-right`
- **Información resumida al colapsar**:
  - Cantidad total de ítems
  - Valor monetario total del estrato

#### **Nivel 2: CATEGORÍA** (Condicional)
- **Color de fondo**: `blue-50/30` (azul muy claro)
- **Icono principal**: `fas fa-tags` (azul)
- **Icono expansión**: `fa-chevron-down` / `fa-chevron-right` (azul)
- **Indentación**: 8px adicionales (pl-8)
- **Información resumida al colapsar**:
  - Cantidad de ítems en la categoría
  - Valor monetario total

#### **Nivel 3: SUBCATEGORÍA** (Condicional)
- **Color de fondo**: `purple-50/30` (púrpura muy claro)
- **Icono principal**: `fas fa-tag` (púrpura)
- **Icono expansión**: `fa-chevron-down` / `fa-chevron-right` (púrpura)
- **Indentación**: 16px adicionales (pl-16)
- **Información resumida al colapsar**:
  - Cantidad de ítems en la subcategoría
  - Valor monetario total

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### **1. Helper Function: `extractCategoryData`**

```typescript
const extractCategoryData = (item: AuditSampleItem) => {
    const mapping = appState.selectedPopulation?.column_mapping;
    const raw = item.raw_row || {};
    
    const category = mapping?.category 
        ? String(raw[mapping.category] || 'Sin Categoría') 
        : null;
    const subcategory = mapping?.subcategory 
        ? String(raw[mapping.subcategory] || 'Sin Subcategoría') 
        : null;
    
    return { category, subcategory };
};
```

**Propósito**: Extraer categoría y subcategoría del objeto `raw_row` usando el `column_mapping` configurado.

---

### **2. Validación de Configuración**

```typescript
const hasCategoryMapping = !!appState.selectedPopulation?.column_mapping?.category;
const hasSubcategoryMapping = !!appState.selectedPopulation?.column_mapping?.subcategory;
```

**Propósito**: Determinar dinámicamente qué niveles de agrupación mostrar.

---

### **3. Estructura de Datos Jerárquica**

```typescript
const hierarchicalGrouping = useMemo(() => {
    const structure: Record<string, any> = {};
    
    currentResults.sample.forEach(item => {
        const stratum = item.stratum_label || 'E1';
        const { category, subcategory } = extractCategoryData(item);
        
        // Nivel 1: Estrato
        if (!structure[stratum]) {
            structure[stratum] = { items: [], categories: {} };
        }
        
        // Nivel 2: Categoría (si existe)
        if (hasCategoryMapping && category) {
            if (!structure[stratum].categories[category]) {
                structure[stratum].categories[category] = { 
                    items: [], 
                    subcategories: {} 
                };
            }
            
            // Nivel 3: Subcategoría (si existe)
            if (hasSubcategoryMapping && subcategory) {
                if (!structure[stratum].categories[category].subcategories[subcategory]) {
                    structure[stratum].categories[category].subcategories[subcategory] = { 
                        items: [] 
                    };
                }
                structure[stratum].categories[category].subcategories[subcategory].items.push(item);
            } else {
                structure[stratum].categories[category].items.push(item);
            }
        } else {
            structure[stratum].items.push(item);
        }
    });
    
    return structure;
}, [currentResults.sample, hasCategoryMapping, hasSubcategoryMapping]);
```

**Estructura resultante**:
```
{
  "Certeza": {
    items: [...],  // Ítems sin categoría
    categories: {
      "Gastos Operativos": {
        items: [...],  // Ítems sin subcategoría
        subcategories: {
          "Servicios Públicos": {
            items: [...]
          }
        }
      }
    }
  }
}
```

---

### **4. Estados de Colapso/Expansión**

```typescript
const [collapsedStrata, setCollapsedStrata] = useState<Set<string>>(new Set());
const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
const [collapsedSubcategories, setCollapsedSubcategories] = useState<Set<string>>(new Set());
```

**Claves únicas**:
- Estrato: `"Certeza"`, `"E1"`, `"E2"`, etc.
- Categoría: `"Certeza-Gastos Operativos"`
- Subcategoría: `"Certeza-Gastos Operativos-Servicios Públicos"`

---

### **5. Resúmenes en Sidebar**

```typescript
const categorySummary = useMemo(() => {
    if (!hasCategoryMapping) return null;
    
    const groups: Record<string, { count: number, value: number, errors: number }> = {};
    currentResults.sample.forEach(item => {
        const { category } = extractCategoryData(item);
        const key = category || 'Sin Categoría';
        if (!groups[key]) groups[key] = { count: 0, value: 0, errors: 0 };
        groups[key].count++;
        groups[key].value += item.value;
        if (item.compliance_status === 'EXCEPCION') groups[key].errors++;
    });
    return Object.entries(groups)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.value - a.value);
}, [currentResults, hasCategoryMapping]);
```

---

## 📊 INTEGRACIÓN CON REPORTE PDF

Se agregaron dos nuevas tablas al reporte PDF (después de la tabla de estratos):

### **Tabla 1: Distribución por Categoría**
- **Título**: "DISTRIBUCIÓN POR CATEGORÍA"
- **Color de encabezado**: Azul 600 `[37, 99, 235]`
- **Columnas**:
  1. CATEGORÍA
  2. ÍTEMS (centrado)
  3. VALOR TOTAL (derecha)
  4. ERRORES (centrado, negrita)
- **Ordenamiento**: Por valor monetario descendente
- **Condición**: Solo aparece si `column_mapping.category` está definido

### **Tabla 2: Distribución por Subcategoría**
- **Título**: "DISTRIBUCIÓN POR SUBCATEGORÍA"
- **Color de encabezado**: Púrpura 600 `[147, 51, 234]`
- **Columnas**: Igual que categoría
- **Ordenamiento**: Por valor monetario descendente
- **Condición**: Solo aparece si `column_mapping.subcategory` está definido

**Código implementado en `services/reportService.ts`**:
```typescript
// 2.1.1 Category Distribution (if configured)
const mapping = pop.column_mapping;
if (mapping?.category) {
    const categoryGroups: Record<string, { count: number, value: number, errors: number }> = {};
    results.sample.forEach(item => {
        const raw = item.raw_row || {};
        const category = String(raw[mapping.category!] || 'Sin Categoría');
        // ... agrupación y conteo
    });
    
    autoTable(doc, {
        startY: currentY,
        head: [['CATEGORÍA', 'ÍTEMS', 'VALOR TOTAL', 'ERRORES']],
        body: categoryRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        // ...
    });
}
```

---

## 🎨 COMPORTAMIENTO DINÁMICO

### **Escenario 1: Sin categoría ni subcategoría**
```
✅ Estrato (expandible)
   └─ Ítems individuales
```
**Sidebar**: Solo muestra "Distribución de la Muestra" (estratos)

---

### **Escenario 2: Solo categoría configurada**
```
✅ Estrato (expandible)
   ├─ Ítems sin categoría
   └─ ✅ Categoría (expandible)
      └─ Ítems de la categoría
```
**Sidebar**: 
- Distribución de la Muestra (estratos)
- Distribución por Categoría

**PDF**: Tabla de estratos + Tabla de categorías

---

### **Escenario 3: Solo subcategoría configurada**
```
✅ Estrato (expandible)
   └─ Ítems individuales
```
**Sidebar**: 
- Distribución de la Muestra (estratos)
- Distribución por Subcategoría

**PDF**: Tabla de estratos + Tabla de subcategorías

**Nota**: Sin categoría, la subcategoría se trata como agrupación independiente.

---

### **Escenario 4: Categoría Y subcategoría configuradas**
```
✅ Estrato (expandible)
   ├─ Ítems sin categoría
   └─ ✅ Categoría (expandible)
      ├─ Ítems sin subcategoría
      └─ ✅ Subcategoría (expandible)
         └─ Ítems de la subcategoría
```
**Sidebar**: 
- Distribución de la Muestra (estratos)
- Distribución por Categoría
- Distribución por Subcategoría

**PDF**: Tabla de estratos + Tabla de categorías + Tabla de subcategorías

---

## ✅ GARANTÍAS DE IMPLEMENTACIÓN

### **1. No se modificó la lógica de cálculo**
- Los cálculos de tamaño de muestra, estratificación y proyección de error permanecen intactos
- Solo se cambió la **visualización** de los datos

### **2. No se ocultaron componentes existentes**
- Todas las tarjetas del sidebar original siguen presentes
- La tabla de ítems mantiene todas sus columnas y funcionalidades
- Los botones de estado (CONFORME/EXCEPCIÓN) funcionan igual
- Los campos de observaciones siguen editables

### **3. Validación dinámica**
- El sistema verifica automáticamente si categoría/subcategoría están configuradas
- No muestra niveles de agrupación que no existen en los datos
- Maneja correctamente ítems sin categoría o subcategoría

### **4. Compatibilidad con datos existentes**
- Funciona con poblaciones antiguas que no tienen categoría/subcategoría
- Funciona con poblaciones nuevas que sí las tienen
- No requiere migración de datos

---

## 🧪 CASOS DE PRUEBA RECOMENDADOS

### **Test 1: Población sin categoría/subcategoría**
1. Cargar población con solo `uniqueId` y `monetaryValue`
2. Generar muestra estratificada
3. **Verificar**: Solo aparece agrupación por estrato
4. **Verificar**: Sidebar solo muestra "Distribución de la Muestra"
5. **Verificar**: PDF solo tiene tabla de estratos

### **Test 2: Población con categoría**
1. Cargar población con `category` mapeado
2. Generar muestra estratificada
3. **Verificar**: Aparece agrupación por estrato → categoría
4. **Verificar**: Sidebar muestra tarjeta de categorías
5. **Verificar**: PDF incluye tabla de categorías

### **Test 3: Población con categoría y subcategoría**
1. Cargar población con ambos campos mapeados
2. Generar muestra estratificada
3. **Verificar**: Aparece agrupación de 3 niveles
4. **Verificar**: Sidebar muestra ambas tarjetas
5. **Verificar**: PDF incluye ambas tablas
6. **Verificar**: Colapsar/expandir funciona en cada nivel

### **Test 4: Datos con valores nulos**
1. Cargar población donde algunos registros tienen categoría vacía
2. Generar muestra
3. **Verificar**: Ítems sin categoría aparecen como "Sin Categoría"
4. **Verificar**: No hay errores de JavaScript en consola

### **Test 5: Edición de hallazgos**
1. Generar muestra con agrupación jerárquica
2. Cambiar estado de un ítem a EXCEPCIÓN
3. Agregar observaciones
4. **Verificar**: Los cambios se guardan correctamente
5. **Verificar**: Los contadores de errores se actualizan en sidebar
6. **Verificar**: El PDF refleja los errores correctamente

---

## 📁 ARCHIVOS MODIFICADOS

### **1. `components/results/StratifiedResultsView.tsx`**
- ✅ Agregado: `extractCategoryData` helper function
- ✅ Agregado: `hasCategoryMapping`, `hasSubcategoryMapping` validations
- ✅ Agregado: `categorySummary`, `subcategorySummary` memos
- ✅ Agregado: `hierarchicalGrouping` memo
- ✅ Agregado: `collapsedCategories`, `collapsedSubcategories` states
- ✅ Agregado: `toggleCategory`, `toggleSubcategory` functions
- ✅ Modificado: Sidebar con nuevas tarjetas de categoría/subcategoría
- ✅ Modificado: Tabla con estructura jerárquica de 3 niveles

### **2. `services/reportService.ts`**
- ✅ Agregado: Sección "DISTRIBUCIÓN POR CATEGORÍA" en PDF
- ✅ Agregado: Sección "DISTRIBUCIÓN POR SUBCATEGORÍA" en PDF
- ✅ Validación: Solo aparecen si están configuradas en `column_mapping`

---

## 🚀 PRÓXIMOS PASOS (FASE 3 - FUTURO)

### **Filtros Avanzados**
- Filtrar tabla por categoría específica
- Filtrar por subcategoría específica
- Filtrar por múltiples criterios simultáneos

### **Vistas Alternativas**
- Vista de árbol jerárquico (tree view)
- Vista de matriz (categoría × subcategoría)
- Vista de mapa de calor (heatmap) por riesgo

### **Exportación Avanzada**
- Exportar solo una categoría a Excel
- Exportar comparativa entre categorías
- Gráficos de distribución en PDF

### **Análisis Comparativo**
- Comparar distribución de muestra vs población
- Identificar categorías sobre/sub-representadas
- Alertas de sesgo de selección

---

## 📞 SOPORTE

Para preguntas o problemas con esta funcionalidad:
1. Verificar que `column_mapping` esté correctamente configurado
2. Revisar consola del navegador para errores de JavaScript
3. Validar que los datos de `raw_row` contengan los campos mapeados
4. Confirmar que TypeScript no muestre errores de compilación

---

**Fecha de implementación**: Enero 2026  
**Versión del sistema**: AAMA v4.1  
**Estado**: ✅ Completado (Fases 1 y 2)
