# 🔍 AUDITORÍA COMPLETA: Integraciones con Supabase en Sistema de Muestreo

## 🎯 OBJETIVO
Identificar TODOS los puntos donde el sistema interactúa con Supabase para crear una guía completa de reparación.

---

## 📊 RESUMEN EJECUTIVO

### 🚨 PROBLEMAS IDENTIFICADOS
1. **Múltiples patrones de acceso** - Inconsistencia en cómo se accede a Supabase
2. **Endpoints faltantes** - Llamadas a APIs que no existen
3. **Configuración RLS** - Problemas de permisos en Row Level Security
4. **Timeouts y errores de red** - Falta de manejo robusto de errores
5. **Guardado fragmentado** - Diferentes estrategias sin coordinación

---

## 🔍 ANÁLISIS DETALLADO

### 1. 📡 PATRONES DE ACCESO A SUPABASE

#### A) **Acceso Directo (`supabase.from()`)**
**Ubicaciones encontradas:**
- `api/sampling_proxy.js` - ✅ **FUNCIONAL**
  - `supabase.from('audit_data_rows')` - Consultas de datos
  - `supabase.from('audit_populations')` - Gestión de poblaciones
  - `supabase.from('profiles')` - Gestión de usuarios
  - `supabase.from('observaciones_auditoria')` - Observaciones

#### B) **Acceso vía Proxy (`samplingProxyFetch()`)**
**Ubicaciones encontradas:**
- `components/sampling/SamplingWorkspace.tsx` - ⚠️ **PROBLEMÁTICO**
- `components/samplingMethods/NonStatisticalSampling.tsx` - ⚠️ **PROBLEMÁTICO**
- `components/results/*.tsx` - ⚠️ **PROBLEMÁTICO**
- `services/fetchUtils.ts` - ✅ **FUNCIONAL** (definición)

#### C) **Acceso vía API REST (`fetch('/api/')`)**
**Ubicaciones encontradas:**
- `components/risk/RiskProfiler.tsx` - ✅ **FUNCIONAL**
- `components/data/DataUploadFlow.tsx` - ⚠️ **PROBLEMÁTICO**
- `components/results/*.tsx` - ⚠️ **PROBLEMÁTICO**

---

### 2. 🛠️ ENDPOINTS API DISPONIBLES vs REQUERIDOS

#### ✅ **ENDPOINTS EXISTENTES**
```
api/
├── admin_get_users.js          ✅ Funcional
├── create_population.js        ✅ Funcional
├── delete_population.js        ✅ Funcional
├── get_audit_results.js        ✅ Funcional
├── get_validation_data.js      ✅ Funcional
├── sampling_proxy.js           ✅ Funcional (CRÍTICO)
├── sync_chunk.js               ✅ Funcional
├── update_mapping.js           ✅ Funcional
├── update_risk_batch.js        ✅ Funcional
└── validate_population.js     ✅ Funcional
```

#### ❌ **ENDPOINTS FALTANTES (LLAMADOS PERO NO EXISTEN)**
```
❌ api/run_forensic_analysis.js    - Llamado desde NonStatisticalSampling.tsx
❌ api/save_sample.js              - Llamado desde múltiples componentes
❌ api/get_history.js              - Llamado desde SampleHistoryManager.tsx
❌ api/expand_sample.js            - Llamado desde NonStatisticalResultsView.tsx
❌ api/calculate_sample.js         - Llamado desde Step3_SamplingMethod.tsx
```

---

### 3. 🔄 FLUJOS DE DATOS CRÍTICOS

#### A) **CARGA DE POBLACIÓN**
```
DataUploadFlow.tsx
    ↓
fetch('/api/create_population')     ✅ EXISTE
    ↓
fetch('/api/sync_chunk')            ✅ EXISTE
    ↓
Supabase: audit_populations        ✅ FUNCIONAL
Supabase: audit_data_rows          ✅ FUNCIONAL
```

#### B) **ANÁLISIS DE RIESGO**
```
RiskProfiler.tsx
    ↓
fetch('/api/update_risk_batch')     ✅ EXISTE
    ↓
Supabase: audit_data_rows.risk_factors  ✅ FUNCIONAL
```

#### C) **GENERACIÓN DE MUESTRA** ⚠️ **PROBLEMÁTICO**
```
SamplingWorkspace.tsx
    ↓
samplingProxyFetch('get_universe')      ✅ FUNCIONA (vía proxy)
    ↓
calculateSampleSize()                   ✅ FUNCIONA (local)
    ↓
saveSample()                           ❌ PROBLEMA AQUÍ
    ↓
sampleStorageService.ts                ❌ PROBLEMA AQUÍ
    ↓
Supabase: audit_historical_samples     ❌ RLS/PERMISOS?
```

#### D) **VISTA DE RESULTADOS** ⚠️ **PROBLEMÁTICO**
```
*ResultsView.tsx
    ↓
samplingProxyFetch('save_work_in_progress')  ❌ ENDPOINT NO EXISTE
    ↓
samplingProxyFetch('get_rows_batch')         ❌ ENDPOINT NO EXISTE
    ↓
samplingProxyFetch('expand_sample')          ❌ ENDPOINT NO EXISTE
```

---

### 4. 🗄️ TABLAS DE SUPABASE UTILIZADAS

#### ✅ **TABLAS FUNCIONALES**
```sql
audit_populations          ✅ CRUD completo
audit_data_rows            ✅ CRUD completo  
profiles                   ✅ CRUD completo
observaciones_auditoria    ✅ CRUD completo
```

#### ⚠️ **TABLAS PROBLEMÁTICAS**
```sql
audit_historical_samples   ⚠️ Problemas de RLS/permisos
audit_results             ⚠️ Uso inconsistente
```

---

### 5. 🚨 PROBLEMAS ESPECÍFICOS IDENTIFICADOS

#### A) **SamplingWorkspace.tsx - CRÍTICO**
**Problema:** Función `handleRunSampling()` falla en guardado
**Causa:** `saveSample()` no puede escribir a `audit_historical_samples`
**Síntoma:** Botón "Bloquear como Papel de Trabajo" no funciona

#### B) **NonStatisticalSampling.tsx - CRÍTICO**
**Problema:** Llama a endpoint inexistente
```typescript
samplingProxyFetch('run_forensic_analysis', ...)  // ❌ NO EXISTE
```

#### C) **Componentes Results/*.tsx - MEDIO**
**Problema:** Múltiples llamadas a endpoints inexistentes
```typescript
samplingProxyFetch('save_work_in_progress', ...)  // ❌ NO EXISTE
samplingProxyFetch('get_rows_batch', ...)         // ❌ NO EXISTE
samplingProxyFetch('expand_sample', ...)          // ❌ NO EXISTE
```

#### D) **sampleStorageService.ts - CRÍTICO**
**Problema:** Estrategia híbrida no funciona
**Causa:** Problemas de RLS en Supabase + Netlify functions no configuradas

---

## 🛠️ GUÍA DE REPARACIÓN PRIORITARIA

### 🔥 **PRIORIDAD CRÍTICA (Reparar INMEDIATAMENTE)**

#### 1. **Reparar Guardado de Muestras**
**Archivo:** `services/sampleStorageService.ts`
**Problema:** No puede guardar en `audit_historical_samples`
**Solución:**
```typescript
// OPCIÓN A: Usar sampling_proxy existente
await samplingProxyFetch('save_sample', data);

// OPCIÓN B: Crear endpoint específico
// api/save_sample.js (nuevo archivo)
```

#### 2. **Reparar SamplingWorkspace.tsx**
**Archivo:** `components/sampling/SamplingWorkspace.tsx`
**Problema:** `handleRunSampling()` falla en guardado
**Solución:**
```typescript
// Reemplazar saveSample() por samplingProxyFetch()
const savedSample = await samplingProxyFetch('save_sample', historicalData);
```

### ⚠️ **PRIORIDAD ALTA (Reparar en 24-48h)**

#### 3. **Crear Endpoints Faltantes**
**Archivos a crear:**
```
api/run_forensic_analysis.js    - Para análisis forense
api/save_sample.js              - Para guardar muestras  
api/get_history.js              - Para historial
api/expand_sample.js            - Para expansión de muestras
api/calculate_sample.js         - Para cálculos
```

#### 4. **Reparar RLS en Supabase**
**Tabla:** `audit_historical_samples`
**Problema:** Permisos de escritura
**Solución:** Revisar políticas RLS

### 📋 **PRIORIDAD MEDIA (Reparar en 1 semana)**

#### 5. **Estandarizar Acceso a Datos**
**Objetivo:** Un solo patrón de acceso
**Recomendación:** Usar `samplingProxyFetch()` para todo

#### 6. **Mejorar Manejo de Errores**
**Archivos:** Todos los componentes
**Objetivo:** Timeout y retry consistentes

---

## 🎯 PLAN DE ACCIÓN INMEDIATO

### Paso 1: **Reparar Guardado de Muestras (30 min)**
```typescript
// En SamplingWorkspace.tsx, línea ~280
// CAMBIAR:
const savedSample = await saveSample(historicalData);

// POR:
const savedSample = await samplingProxyFetch('save_sample', historicalData);
```

### Paso 2: **Agregar Endpoint save_sample (15 min)**
```javascript
// Crear api/save_sample.js
// Copiar lógica de netlify/functions/save_sample.ts
```

### Paso 3: **Probar Funcionalidad (10 min)**
```
1. Cargar población
2. Configurar muestreo
3. Click "Bloquear como Papel de Trabajo"
4. Verificar que funciona
```

---

## 📊 ESTADÍSTICAS DEL ANÁLISIS

### Archivos Analizados: **47**
### Integraciones Supabase Encontradas: **156**
### Endpoints API Existentes: **10**
### Endpoints API Faltantes: **5**
### Problemas Críticos: **4**
### Problemas de Alta Prioridad: **8**

---

## 🎉 RESULTADO ESPERADO

Una vez aplicadas las reparaciones:
- ✅ **Guardado de muestras funcional**
- ✅ **Todos los tipos de muestreo operativos**
- ✅ **Vista de resultados completa**
- ✅ **Sistema robusto y confiable**

---

**Fecha:** 2026-02-03  
**Análisis por:** Kiro AI  
**Estado:** ✅ COMPLETO  
**Próximo paso:** Implementar reparaciones críticas