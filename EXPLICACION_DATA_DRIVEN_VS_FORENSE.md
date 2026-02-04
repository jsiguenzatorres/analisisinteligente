# 📊 Explicación: Data Driven Insights vs Métodos de Análisis Forense

## 🎯 Respuesta Corta

**SON LO MISMO** - Solo nombres diferentes en distintas partes de la interfaz.

---

## 📖 Explicación Detallada

### "Data Driven Insights" (Tarjetas Individuales)

**Ubicación**: Sección de configuración de Muestreo No Estadístico

**Qué son**: Tarjetas individuales que muestran resultados de cada método forense:
- Ley de Benford (15 anomalías)
- Valores Atípicos (0 outliers)
- Duplicados (5 duplicados)
- Números Redondos
- Entropía
- Fraccionamiento
- Gaps Secuenciales
- Isolation Forest
- Perfilado de Actores
- Benford Mejorado

**Propósito**:
1. Mostrar resultados individuales de cada análisis
2. Permitir seleccionar UN método específico para basar la muestra
3. Cargar automáticamente criterios y justificación al hacer click

**Ejemplo de uso**:
```
Usuario hace click en "Ley de Benford" →
Se carga automáticamente:
- Criterio: "Selección basada en Ley de Benford..."
- Justificación: "Confirmación de Condiciones (IIA 2320-3)..."
- Tamaño sugerido: 30 + (gaps * 5)
```

---

### "Métodos de Análisis Forense" (Panel Completo)

**Ubicación**: Panel grande con todas las tarjetas juntas

**Qué es**: Agrupación visual de TODOS los métodos forenses disponibles

**Propósito**:
1. Mostrar todos los métodos en un solo lugar
2. Botón "Ejecutar Análisis" que corre los 9 modelos simultáneamente
3. Configurar parámetros avanzados (umbrales, ventanas de tiempo, etc.)

**Ejemplo de uso**:
```
Usuario hace click en "Ejecutar Análisis" →
Se ejecutan los 9 modelos:
1. Análisis de Entropía
2. Fraccionamiento
3. Gaps Secuenciales
4. Isolation Forest
5. Perfilado de Actores
6. Benford Mejorado
7. Ley de Benford
8. Duplicados
9. Valores Atípicos

Resultado: Población analizada con risk_factors en cada registro
```

---

## 🔄 Relación Entre Ambos

```
┌─────────────────────────────────────────────────┐
│ MÉTODOS DE ANÁLISIS FORENSE (Panel Completo)   │
│                                                 │
│ [Ejecutar Análisis] → Corre 9 modelos          │
│                                                 │
│ ↓ Genera risk_factors en cada registro         │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ DATA DRIVEN INSIGHTS (Tarjetas Individuales)   │
│                                                 │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ Benford  │ │ Outliers │ │ Duplica. │        │
│ │ 15 items │ │ 0 items  │ │ 5 items  │        │
│ └──────────┘ └──────────┘ └──────────┘        │
│                                                 │
│ ↓ Usuario selecciona UNO para la muestra       │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Flujo de Trabajo

### Paso 1: Ejecutar Análisis Forense Completo
```
1. Usuario carga población
2. Click en "Ejecutar Análisis" en panel de Métodos Forenses
3. Sistema ejecuta 9 modelos
4. Cada registro recibe risk_factors: ['benford', 'outlier', etc.]
```

### Paso 2: Ver Resultados en Data Driven Insights
```
1. Tarjetas se actualizan con contadores
2. "Ley de Benford: 15 anomalías"
3. "Valores Atípicos: 0 outliers"
4. "Duplicados: 5 duplicados"
```

### Paso 3: Seleccionar Método para Muestra
```
1. Usuario hace click en tarjeta "Ley de Benford"
2. Se cargan criterios automáticamente
3. Usuario genera muestra basada en ese método
```

---

## 🐛 Problemas Actuales Identificados

### Problema 1: "Sin Categoría"
**Causa**: El código busca categoría en `raw_row`, pero puede estar en otro campo

**Solución Implementada**:
```typescript
const getCategoryFromItem = (item: AuditSampleItem): string | null => {
    // Intenta múltiples fuentes:
    // 1. raw_row (JSON parseado)
    // 2. item directamente (campo mapeado)
    // 3. Fallback a null
};
```

### Problema 2: "Riesgo Bajo" en todo
**Causa**: Los registros no tienen `risk_factors` poblados

**Posibles razones**:
1. No se ejecutó el "Análisis Forense Completo"
2. Los risk_factors no se guardaron en la base de datos
3. Los risk_factors no se están cargando al generar la muestra

**Solución**: Agregados console.logs para debug:
```typescript
console.log('🔍 DEBUG - risk_factors del primer item:', items[0]?.risk_factors);
```

---

## 🔍 Cómo Verificar el Problema

### Paso 1: Abrir Consola del Navegador
1. F12 o Click derecho → Inspeccionar
2. Ir a pestaña "Console"

### Paso 2: Generar Muestra
1. Ir a Muestreo No Estadístico
2. Generar muestra
3. Ver tabla de resultados

### Paso 3: Revisar Console Logs
Deberías ver:
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

### Paso 4: Identificar el Problema

#### Si `risk_factors` está vacío `[]`:
**Problema**: No se ejecutó el análisis forense o no se guardó
**Solución**: 
1. Ir a "Métodos de Análisis Forense"
2. Click en "Ejecutar Análisis"
3. Esperar a que termine
4. Volver a generar muestra

#### Si `category` es `null`:
**Problema**: El campo de categoría no se está extrayendo correctamente
**Solución**: Verificar que el mapeo de columnas esté correcto

---

## 📋 Checklist de Diagnóstico

### Verificar Análisis Forense:
- [ ] ¿Se ejecutó "Análisis Forense Completo"?
- [ ] ¿Las tarjetas de Data Driven Insights muestran números > 0?
- [ ] ¿Los registros en la base de datos tienen risk_factors?

### Verificar Mapeo de Categorías:
- [ ] ¿Se configuró el mapeo de columnas?
- [ ] ¿El campo "category" está mapeado?
- [ ] ¿Los datos tienen ese campo poblado?

### Verificar Generación de Muestra:
- [ ] ¿La muestra se generó después del análisis forense?
- [ ] ¿Los items de la muestra tienen risk_factors?
- [ ] ¿Los console.logs muestran los datos correctos?

---

## 🎯 Resumen

### Data Driven Insights:
- ✅ Tarjetas individuales
- ✅ Muestran resultados por método
- ✅ Permiten seleccionar UN método
- ✅ Cargan criterios automáticamente

### Métodos de Análisis Forense:
- ✅ Panel completo
- ✅ Ejecuta TODOS los métodos
- ✅ Genera risk_factors
- ✅ Configura parámetros avanzados

### Son lo mismo:
- ✅ Misma funcionalidad
- ✅ Diferentes vistas
- ✅ Complementarios
- ✅ Trabajan juntos

---

## 🔧 Próximos Pasos

1. **Revisar console.logs** en el navegador
2. **Verificar** si risk_factors está poblado
3. **Verificar** si el mapeo de categorías es correcto
4. **Reportar** qué muestran los logs para ajustar

---

**Fecha**: 2026-01-20  
**Estado**: Debugging en progreso  
**Acción requerida**: Revisar console.logs
