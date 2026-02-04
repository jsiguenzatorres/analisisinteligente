# 📍 Dónde Encontrar la Vista Jerárquica

## ⚠️ IMPORTANTE: Ubicación de la Vista Jerárquica

La vista jerárquica implementada está en el **MODAL DE DETALLES** que se abre ANTES de generar la muestra, NO en la tabla de resultados después de generar.

---

## 🔍 Cómo Acceder a la Vista Jerárquica

### Paso 1: Ir a Muestreo No Estadístico
1. Cargar una población
2. Ir a la sección "Muestreo No Estadístico"

### Paso 2: Ver los Insights Forenses
Verás tarjetas con diferentes análisis:
- 📊 Ley de Benford
- 📈 Valores Atípicos  
- 📋 Duplicados
- 💰 Números Redondos
- 🔀 Entropía
- ✂️ Fraccionamiento
- Etc.

### Paso 3: Click en "Ver Detalles"
En cada tarjeta hay un botón con icono de lista (📋):
```
┌─────────────────────────────┐
│ Ley de Benford         [📋] │ ← Click aquí
│                             │
│ 150 Anomalías               │
└─────────────────────────────┘
```

### Paso 4: Modal con Vista Jerárquica
Se abre el modal con la estructura de árbol:
```
┌─────────────────────────────────────────┐
│ Análisis Forense: Benford              │
├─────────────────────────────────────────┤
│ Hallazgos: 150          [Exportar]     │
├─────────────────────────────────────────┤
│                                         │
│ ▼ ⚠️  RIESGO ALTO    85 registros      │
│ │                                       │
│ │  ▼ Ley de Benford        45 items    │
│ │  │  [Tabla con registros]            │
│ │                                       │
│ │  ▶ Valores Atípicos      25 items    │
│ │  ▶ Duplicados            15 items    │
│                                         │
│ ▶ ⚠️  RIESGO MEDIO   45 registros      │
│ ▶ ⚠️  RIESGO BAJO    20 registros      │
└─────────────────────────────────────────┘
```

---

## ❌ NO Está Aquí

### Vista de Resultados (Después de Generar)
La tabla que muestra "EJECUCIÓN DE AUDITORÍA POR RIESGO" es DIFERENTE:
```
┌─────────────────────────────────────────────┐
│ EJECUCIÓN DE AUDITORÍA POR RIESGO          │
├─────────────────────────────────────────────┤
│ # │ ID      │ Riesgo │ Valor │ Revisión   │
├───┼─────────┼────────┼───────┼────────────┤
│ 1 │ DEP001  │ ALTO   │ $100  │ SIN ERROR  │
│ 2 │ DEP002  │ MEDIO  │ $200  │ SIN ERROR  │
└─────────────────────────────────────────────┘
```

Esta es la tabla de trabajo de auditoría, NO tiene vista jerárquica.

---

## 🎯 Diferencias Clave

| Característica | Modal de Detalles | Tabla de Resultados |
|----------------|-------------------|---------------------|
| **Cuándo** | ANTES de generar muestra | DESPUÉS de generar |
| **Propósito** | Explorar anomalías | Ejecutar auditoría |
| **Vista** | ✅ Jerárquica (árbol) | ❌ Plana (tabla) |
| **Datos** | Todos los hallazgos | Solo muestra seleccionada |
| **Editable** | ❌ No | ✅ Sí (observaciones) |

---

## 📸 Capturas de Pantalla Esperadas

### 1. Insights Forenses (Antes de Generar)
```
┌──────────────────────────────────────────────────┐
│ Data Driven Insights                             │
├──────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ Benford  │ │ Outliers │ │ Duplica. │         │
│ │    [📋]  │ │    [📋]  │ │    [📋]  │ ← Aquí │
│ │ 150      │ │ 85       │ │ 42       │         │
│ └──────────┘ └──────────┘ └──────────┘         │
└──────────────────────────────────────────────────┘
```

### 2. Modal de Detalles (Vista Jerárquica)
```
┌─────────────────────────────────────────────────┐
│ Análisis Forense: Benford              [X]     │
├─────────────────────────────────────────────────┤
│ Hallazgos: 150                    [Exportar]   │
├─────────────────────────────────────────────────┤
│ ▼ ⚠️  RIESGO ALTO              85 registros    │ ← Árbol
│ │  ▼ Ley de Benford                 45 items   │   Jerárquico
│ │  │  ┌──────────────────────────────────┐    │
│ │  │  │ ID    │ Valor │ Factores        │    │
│ │  │  ├───────┼───────┼─────────────────┤    │
│ │  │  │ TX001 │ $100  │ [benford]       │    │
│ │  │  └──────────────────────────────────┘    │
│ │  ▶ Valores Atípicos               25 items   │
│ ▶ ⚠️  RIESGO MEDIO             45 registros    │
└─────────────────────────────────────────────────┘
```

### 3. Tabla de Resultados (NO Jerárquica)
```
┌─────────────────────────────────────────────────┐
│ EJECUCIÓN DE AUDITORÍA POR RIESGO              │
├─────────────────────────────────────────────────┤
│ # │ ID      │ Riesgo │ Valor │ Revisión       │ ← Tabla
│ 1 │ DEP001  │ ALTO   │ $100  │ [SIN NOVEDAD]  │   Plana
│ 2 │ DEP002  │ MEDIO  │ $200  │ [SIN NOVEDAD]  │
└─────────────────────────────────────────────────┘
```

---

## 🔄 Flujo Completo

```
1. Cargar Población
   ↓
2. Ir a Muestreo No Estadístico
   ↓
3. Ver Insights Forenses (tarjetas)
   ↓
4. Click en [📋] "Ver Detalles"
   ↓
5. ✅ MODAL CON VISTA JERÁRQUICA ← AQUÍ
   ↓
6. Cerrar modal
   ↓
7. Configurar parámetros
   ↓
8. Generar Muestra
   ↓
9. Tabla de Resultados (plana) ← NO AQUÍ
```

---

## 🧪 Cómo Probar

### Test Rápido:
1. Abre la aplicación
2. Carga una población con datos
3. Ve a "Muestreo No Estadístico"
4. Busca las tarjetas de insights (Benford, Outliers, etc.)
5. En cualquier tarjeta, busca el icono de lista (📋) o botón "Ver Detalles"
6. Click en ese botón
7. Deberías ver el modal con la vista jerárquica

### Si NO ves el botón:
- Verifica que el análisis forense se haya ejecutado
- Verifica que haya anomalías detectadas
- Busca en la parte superior derecha de cada tarjeta

---

## ❓ Preguntas Frecuentes

### P: ¿Por qué no veo la vista jerárquica en la tabla de resultados?
**R**: Porque la vista jerárquica está en el MODAL DE DETALLES, no en la tabla de resultados. Son dos vistas diferentes con propósitos diferentes.

### P: ¿Dónde está el botón "Ver Detalles"?
**R**: En cada tarjeta de insight forense, antes de generar la muestra. Busca el icono de lista (📋).

### P: ¿Puedo tener vista jerárquica en la tabla de resultados también?
**R**: Sí, pero requeriría una implementación adicional. La tabla de resultados actual es para trabajo de auditoría (editar observaciones), no para exploración.

### P: ¿La vista jerárquica funciona con todos los insights?
**R**: Sí, funciona con cualquier insight que tenga el botón "Ver Detalles": Benford, Outliers, Duplicados, etc.

---

## 🎯 Resumen

**Vista Jerárquica está en**:
- ✅ Modal de Detalles
- ✅ Antes de generar muestra
- ✅ Click en botón [📋] en tarjetas de insights

**Vista Jerárquica NO está en**:
- ❌ Tabla de resultados
- ❌ Después de generar muestra
- ❌ Vista de "Ejecución de Auditoría"

---

Si después de seguir estos pasos aún no ves la vista jerárquica, por favor:
1. Toma una captura de pantalla de la sección de insights forenses
2. Verifica que estés en "Muestreo No Estadístico" (no en resultados)
3. Confirma que hay anomalías detectadas en los insights
