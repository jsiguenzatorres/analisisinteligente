# Spec: Sistema Unificado de Reportes (PDF/Excel)

## Estado: 🟡 En Progreso - Fase de Pruebas

## Contexto

El sistema de auditoría tiene múltiples métodos de muestreo (MUS, Attribute, CAV, Stratified, NonStatistical), cada uno con secciones específicas en sus reportes. Actualmente existe duplicación de código entre la generación de reportes PDF y Excel.

## Objetivo

Unificar la lógica de generación de reportes manteniendo las secciones específicas de cada método de muestreo, eliminando duplicación de código y facilitando el mantenimiento.

## Arquitectura Actual

### Archivos Creados
- ✅ `services/reportingCore.ts` - Lógica común compartida
- ✅ `services/unifiedReportService.ts` - Generador PDF unificado
- ✅ `services/simpleReportService.ts` - Generador Excel simplificado

### Archivo Original
- 📋 `services/reportService.ts` - Implementación original con secciones específicas por método

## Secciones Específicas por Método

### 1. MUS (Monetary Unit Sampling)
- Intervalo de muestreo (J)
- Capa de certeza (ítems >= J)
- Tratamiento de valores negativos
- Proyección de error monetario

### 2. Attribute Sampling
- Muestreo secuencial (Stop-or-Go)
- Tasa de error vs error tolerable
- Límite superior de confianza

### 3. CAV (Classical Variables)
- Calibración de sigma mediante piloto
- Media por Unidad (MPU)
- Proyección estadística

### 4. Stratified Sampling
- Distribución por estratos
- Métodos de asignación (Neyman/Proporcional)
- Resumen por segmento

### 5. NonStatistical Sampling
- Selección dirigida por juicio profesional
- Factores de riesgo cualitativos
- Justificación de criterios de selección

## Secciones Comunes

### Todas las Metodologías Incluyen:
1. **Diagnóstico Forense Preliminar**
   - Análisis básico (Benford, duplicados, outliers)
   - Análisis forense avanzado (si aplica)
   - Evaluación de riesgo
   - Recomendaciones de muestreo

2. **Resumen Ejecutivo**
   - Población total
   - Valor total en libros
   - Identificadores y columnas
   - Semilla estadística

3. **Resultados de Ejecución**
   - Ítems conformes vs excepciones
   - Tasa de error
   - Distribución por fases (Piloto/Ampliación)

4. **Conclusión y Veredicto**
   - Favorable / Con Salvedades / Adverso
   - Descripción técnica
   - Recomendaciones

5. **Anexo de Excepciones**
   - Detalle de ítems con excepción
   - Descripción de hallazgos
   - Clasificación por tipo de riesgo

## User Stories

### US-1: Como auditor, quiero generar reportes PDF con secciones específicas de mi método
**Criterios de Aceptación:**
- [ ] El reporte incluye todas las secciones comunes
- [ ] El reporte incluye secciones específicas del método seleccionado
- [ ] Las fórmulas y cálculos son correctos para cada método
- [ ] El formato es profesional y consistente

### US-2: Como auditor, quiero exportar resultados a Excel manteniendo la estructura
**Criterios de Aceptación:**
- [ ] El Excel incluye todas las columnas relevantes
- [ ] Los datos están formateados correctamente
- [ ] Se mantiene la información de estratos y fases
- [ ] Los valores monetarios tienen formato de moneda

### US-3: Como desarrollador, quiero mantener un solo lugar para lógica común
**Criterios de Aceptación:**
- [ ] No hay duplicación de código entre PDF y Excel
- [ ] Los cambios en lógica común se reflejan en ambos formatos
- [ ] El código es fácil de mantener y extender

### US-4: Como auditor, quiero que el reporte NonStatistical refleje la naturaleza no estadística
**Criterios de Aceptación:**
- [ ] No se muestran fórmulas estadísticas
- [ ] Se enfatiza el juicio profesional
- [ ] Se documentan los criterios de selección
- [ ] Se justifican los factores de riesgo considerados

## Decisiones Pendientes

### 🤔 Decisión 1: Enfoque de Unificación
**Opciones:**
1. **Unificado con condicionales** - Un solo generador con if/switch por método
2. **Modular por método** - Generadores específicos que heredan de base común
3. **Híbrido** - Core común + plugins por método

**Recomendación del Usuario:** Probar primero el enfoque actual antes de decidir

### 🤔 Decisión 2: Manejo de Secciones Específicas
**Opciones:**
1. **Inline en el generador principal** - Condicionales dentro del flujo
2. **Funciones especializadas** - Una función por método que retorna secciones
3. **Configuración declarativa** - JSON/objeto que define qué secciones incluir

## Plan de Implementación

### Fase 1: Pruebas y Validación ⏳ (ACTUAL)
- [ ] Probar generación de reportes con cada método
- [ ] Verificar que todas las secciones específicas se renderizan correctamente
- [ ] Comparar con reportes originales para validar equivalencia
- [ ] Documentar cualquier sección faltante o incorrecta

### Fase 2: Refinamiento (Pendiente)
- [ ] Decidir enfoque final basado en resultados de pruebas
- [ ] Implementar secciones faltantes
- [ ] Optimizar código según decisiones tomadas

### Fase 3: Migración (Pendiente)
- [ ] Reemplazar `reportService.ts` con versión unificada
- [ ] Actualizar referencias en componentes
- [ ] Eliminar código duplicado

### Fase 4: Documentación (Pendiente)
- [ ] Documentar API del sistema unificado
- [ ] Crear guía para agregar nuevos métodos
- [ ] Actualizar README con cambios

## Riesgos y Mitigaciones

### Riesgo 1: Pérdida de Funcionalidad Específica
**Mitigación:** Fase de pruebas exhaustiva comparando reportes lado a lado

### Riesgo 2: Complejidad Excesiva del Código Unificado
**Mitigación:** Mantener opción de generadores modulares si el código se vuelve difícil de mantener

### Riesgo 3: Regresiones en Reportes Existentes
**Mitigación:** Mantener `reportService.ts` original hasta validación completa

## Notas Técnicas

### Estructura de `reportingCore.ts`
```typescript
// Constantes compartidas
export const REPORT_COLORS = { ... }

// Procesamiento de datos
export function processReportData(appState, reportType): ProcessedReportData

// Generadores de tablas
export function generatePDFTables(processedData)
export function prepareExcelData(processedData)

// Utilidades
export function formatCurrency(value)
```

### Flujo de Generación
1. `processReportData()` - Convierte AppState en datos estructurados
2. `generatePDFTables()` o `prepareExcelData()` - Prepara datos para formato específico
3. Generador específico (PDF/Excel) - Renderiza el reporte final

## Próximos Pasos Inmediatos

1. **Probar generación de reportes** con cada método de muestreo
2. **Identificar secciones faltantes** comparando con `reportService.ts`
3. **Documentar hallazgos** de las pruebas
4. **Decidir enfoque final** basado en resultados

## Referencias

- `services/reportingCore.ts` - Núcleo común
- `services/unifiedReportService.ts` - Generador PDF unificado
- `services/reportService.ts` - Implementación original (referencia)
- `services/simpleReportService.ts` - Generador Excel

## Historial de Cambios

- **2026-01-14**: Spec inicial creado basado en conversación previa
- **Estado**: Esperando pruebas de usuario para decidir próximos pasos
