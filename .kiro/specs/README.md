# 📁 Especificaciones del Proyecto

Este directorio contiene las especificaciones (specs) que guían el desarrollo del sistema de auditoría.

## 📄 Documentos Disponibles

### 1. `unified-reporting-system.md` 
**Sistema Unificado de Reportes (PDF/Excel)**

- **Estado:** 🟡 En Progreso - Fase de Pruebas
- **Propósito:** Unificar la generación de reportes eliminando duplicación de código
- **Contenido:**
  - Arquitectura del sistema
  - Secciones específicas por método de muestreo
  - User stories y criterios de aceptación
  - Decisiones pendientes
  - Plan de implementación por fases
  - Riesgos y mitigaciones

**Cuándo leer:** Para entender la arquitectura completa y las decisiones de diseño

### 2. `testing-plan-unified-reports.md`
**Plan de Pruebas Detallado**

- **Propósito:** Guía exhaustiva para validar el sistema unificado
- **Contenido:**
  - Checklist por método de muestreo
  - Secciones comunes a verificar
  - Casos de prueba específicos
  - Criterios de éxito
  - Formato de registro de pruebas

**Cuándo leer:** Para hacer pruebas exhaustivas y documentar resultados

### 3. `QUICK_START_TESTING.md` ⭐
**Guía Rápida de Pruebas**

- **Propósito:** Comenzar a probar rápidamente sin leer toda la documentación
- **Contenido:**
  - Pasos simples para probar cada método
  - Qué verificar en cada reporte
  - Plantilla de registro de resultados
  - Qué hacer si encuentras problemas

**Cuándo leer:** ¡EMPIEZA AQUÍ! Es la forma más rápida de comenzar

## 🎯 Estado Actual del Proyecto

### ✅ Completado

#### Tarea 1: Núcleo Común de Reportes
- **Archivo:** `services/reportingCore.ts`
- **Estado:** ✅ Implementado
- **Funcionalidad:**
  - Constantes de diseño compartidas
  - Procesamiento de datos común
  - Generadores de tablas
  - Utilidades de formato

#### Tarea 2: Generador PDF Unificado
- **Archivo:** `services/unifiedReportService.ts`
- **Estado:** ✅ Implementado
- **Funcionalidad:**
  - Generación de PDF usando núcleo común
  - Secciones comunes a todos los métodos
  - Diagnóstico forense integrado
  - Manejo de excepciones

#### Tarea 3: Generador Excel Simplificado
- **Archivo:** `services/simpleReportService.ts`
- **Estado:** ✅ Implementado
- **Funcionalidad:**
  - Exportación a Excel
  - Formato de datos apropiado
  - Columnas estándar

### ⏳ En Progreso

#### Tarea 4: Validación y Pruebas
- **Estado:** ⏳ Esperando pruebas del usuario
- **Próximo paso:** Probar cada método de muestreo
- **Documentos:** `QUICK_START_TESTING.md`

### 📋 Pendiente

#### Tarea 5: Refinamiento
- **Depende de:** Resultados de las pruebas
- **Incluye:**
  - Implementar secciones faltantes (si las hay)
  - Corregir errores encontrados
  - Optimizar código según feedback

#### Tarea 6: Migración a Producción
- **Depende de:** Validación exitosa
- **Incluye:**
  - Reemplazar `reportService.ts` antiguo
  - Actualizar referencias en componentes
  - Eliminar código duplicado

#### Tarea 7: Documentación Final
- **Depende de:** Migración completada
- **Incluye:**
  - Documentar API del sistema
  - Guía para agregar nuevos métodos
  - Actualizar README principal

## 🔄 Flujo de Trabajo Recomendado

```
1. Lee QUICK_START_TESTING.md
   ↓
2. Prueba cada método de muestreo
   ↓
3. Documenta resultados
   ↓
4. Reporta problemas encontrados
   ↓
5. Espera correcciones (si es necesario)
   ↓
6. Re-prueba
   ↓
7. Aprueba para migración
```

## 📊 Métodos de Muestreo

El sistema soporta 5 métodos de muestreo, cada uno con secciones específicas:

1. **MUS** (Monetary Unit Sampling)
   - Intervalo de muestreo
   - Capa de certeza
   - Proyección monetaria

2. **Attribute** Sampling
   - Muestreo secuencial
   - Tasa de error vs tolerable
   - Límite superior de confianza

3. **CAV** (Classical Variables)
   - Calibración de sigma
   - Media por Unidad (MPU)
   - Proyección estadística

4. **Stratified** Sampling
   - Distribución por estratos
   - Métodos de asignación
   - Resumen por segmento

5. **NonStatistical** Sampling
   - Selección por juicio profesional
   - Factores de riesgo cualitativos
   - Sin fórmulas estadísticas

## 🚨 Problemas Conocidos

### Sistema de Guardado (Separado)
- **Estado:** En modo emergencia (solo memoria)
- **Razón:** Problemas de RLS con Supabase
- **Solución:** Edge Function preparada pero no desplegada
- **Documentos:** `DESPLIEGUE_EDGE_FUNCTION.md`, `IMPLEMENTACION_GUARDADO_HIBRIDO.md`
- **Impacto:** Los datos no se persisten en BD, pero el sistema funciona completamente para generar muestras y reportes

## 📞 Contacto y Soporte

Si tienes preguntas o encuentras problemas:

1. **Para problemas de reportes:**
   - Documenta en el formato de registro de pruebas
   - Incluye capturas de pantalla
   - Anota los parámetros usados

2. **Para problemas de guardado:**
   - Ver `DESPLIEGUE_EDGE_FUNCTION.md`
   - El modo emergencia funciona para pruebas

3. **Para preguntas generales:**
   - Revisa los specs relevantes
   - Consulta el código fuente
   - Pregunta al equipo de desarrollo

## 🎯 Objetivo Final

Tener un sistema de reportes:
- ✅ Sin duplicación de código
- ✅ Fácil de mantener
- ✅ Fácil de extender con nuevos métodos
- ✅ Que genere reportes profesionales
- ✅ Que preserve todas las secciones específicas

## 📚 Recursos Adicionales

### Archivos de Código Relevantes
- `services/reportingCore.ts` - Núcleo común
- `services/unifiedReportService.ts` - Generador PDF
- `services/simpleReportService.ts` - Generador Excel
- `services/reportService.ts` - Sistema original (referencia)

### Documentos de Implementación
- `IMPLEMENTACION_GUARDADO_HIBRIDO.md` - Sistema de guardado
- `DESPLIEGUE_EDGE_FUNCTION.md` - Edge Function de Supabase

### Documentos de Análisis
- `ANALISIS_CAUSA_RAIZ_BUCLE_INFINITO.md` - Análisis de problemas previos
- `SOLUCION_DEFINITIVA_BUCLES_INFINITOS.md` - Soluciones implementadas

## 🔄 Historial de Versiones

- **v1.0** (2026-01-14): Specs iniciales creados
  - Sistema unificado de reportes
  - Plan de pruebas
  - Guía rápida

## 🚀 Próximos Pasos Inmediatos

1. **AHORA:** Leer `QUICK_START_TESTING.md`
2. **HOY:** Probar al menos 2-3 métodos de muestreo
3. **ESTA SEMANA:** Completar pruebas de todos los métodos
4. **SIGUIENTE:** Decidir si proceder con migración o hacer ajustes

---

**Última actualización:** 2026-01-14  
**Mantenido por:** Equipo de Desarrollo  
**Estado del proyecto:** 🟡 En Progreso - Fase de Pruebas
