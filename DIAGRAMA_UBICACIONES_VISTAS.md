# 🗺️ Diagrama de Ubicaciones: Vistas en Muestreo No Estadístico

## 📍 Dos Vistas Diferentes, Dos Propósitos

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE TRABAJO                         │
└─────────────────────────────────────────────────────────────┘

FASE 1: EXPLORACIÓN (Antes de Generar)
┌─────────────────────────────────────────────────────────────┐
│ Componente: NonStatisticalSampling.tsx                     │
│ Ubicación: components/samplingMethods/                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │ Data Driven Insights                             │     │
│  ├──────────────────────────────────────────────────┤     │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐         │     │
│  │ │ Benford  │ │ Outliers │ │ Duplica. │         │     │
│  │ │    [📋]  │ │    [📋]  │ │    [📋]  │ ← Click │     │
│  │ │ 150      │ │ 85       │ │ 42       │         │     │
│  │ └──────────┘ └──────────┘ └──────────┘         │     │
│  └──────────────────────────────────────────────────┘     │
│                        ↓                                    │
│                   Click [📋]                                │
│                        ↓                                    │
│  ┌──────────────────────────────────────────────────┐     │
│  │ MODAL: Análisis Forense                         │     │
│  ├──────────────────────────────────────────────────┤     │
│  │ ✅ VISTA JERÁRQUICA IMPLEMENTADA                │     │
│  │                                                   │     │
│  │ ▼ ⚠️  RIESGO ALTO         85 registros          │     │
│  │ │  ▼ Ley de Benford           45 items          │     │
│  │ │  │  [Tabla con registros]                     │     │
│  │ │  ▶ Valores Atípicos         25 items          │     │
│  │ ▶ ⚠️  RIESGO MEDIO        45 registros          │     │
│  │ ▶ ⚠️  RIESGO BAJO         20 registros          │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  Propósito: EXPLORAR anomalías antes de decidir           │
│  Datos: TODOS los hallazgos forenses                      │
│  Editable: NO                                              │
└─────────────────────────────────────────────────────────────┘

                            ↓
                    [Generar Muestra]
                            ↓

FASE 2: EJECUCIÓN (Después de Generar)
┌─────────────────────────────────────────────────────────────┐
│ Componente: NonStatisticalResultsView.tsx                  │
│ Ubicación: components/results/                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │ EJECUCIÓN DE AUDITORÍA POR RIESGO               │     │
│  ├──────────────────────────────────────────────────┤     │
│  │ ❌ VISTA PLANA (Tabla)                          │     │
│  │                                                   │     │
│  │ # │ ID      │ Riesgo │ Valor │ Revisión        │     │
│  │ 1 │ DEP001  │ ALTO   │ $100  │ [SIN NOVEDAD]   │     │
│  │ 2 │ DEP002  │ MEDIO  │ $200  │ [SIN NOVEDAD]   │     │
│  │ 3 │ DEP003  │ BAJO   │ $50   │ [SIN NOVEDAD]   │     │
│  │                                                   │     │
│  │ [Campo de observaciones editable]                │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  Propósito: EJECUTAR auditoría y documentar hallazgos     │
│  Datos: SOLO la muestra seleccionada (30-50 registros)   │
│  Editable: SÍ (observaciones, errores, impactos)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Tu Screenshot

Tu captura de pantalla muestra:
```
┌─────────────────────────────────────────────────────────────┐
│ EJECUCIÓN DE AUDITORÍA POR RIESGO                          │
│                                                             │
│ # │ ID REGISTRO │ RIESGO IA │ VALOR LIBRO │ REVISIÓN      │
│ 1 │ DEP160002   │ ESTÁNDAR  │ $ 0.00      │ SIN NOVEDAD   │
│ 2 │ DEP2610013  │ ESTÁNDAR  │ $ 27,001.32 │ SIN NOVEDAD   │
│ 3 │ DEP1120023  │ ESTÁNDAR  │ $ 2,506.10  │ SIN NOVEDAD   │
└─────────────────────────────────────────────────────────────┘
```

Esto es: **FASE 2 - NonStatisticalResultsView.tsx**
- ❌ NO tiene vista jerárquica (aún)
- ✅ Es una tabla plana para trabajo de auditoría

---

## 🤔 ¿Qué Vista Necesitas?

### Opción A: Solo Modal de Detalles (Ya Implementado)
```
Ubicación: NonStatisticalSampling.tsx
Cuándo: ANTES de generar muestra
Acceso: Click en [📋] en tarjetas de insights
Estado: ✅ IMPLEMENTADO
```

### Opción B: También en Tabla de Resultados (Requiere Implementación)
```
Ubicación: NonStatisticalResultsView.tsx
Cuándo: DESPUÉS de generar muestra
Acceso: Automático al generar
Estado: ❌ NO IMPLEMENTADO
```

### Opción C: Ambas
```
Ambas vistas con estructura jerárquica
Estado: A (✅) + B (❌)
```

---

## 💡 Recomendación

### Para Modal de Detalles (Opción A)
✅ **Ya está implementado**
- Perfecto para explorar TODOS los hallazgos
- Vista jerárquica tiene sentido (muchos registros)
- Ayuda a decidir qué incluir en la muestra

### Para Tabla de Resultados (Opción B)
🤔 **Considerar si es necesario**
- La muestra ya está seleccionada (30-50 registros)
- Propósito es EDITAR observaciones, no explorar
- Vista plana puede ser más práctica para trabajo
- Pero podría ayudar a organizar por riesgo

---

## 📋 Comparación

| Característica | Modal Detalles | Tabla Resultados |
|----------------|----------------|------------------|
| **Registros** | 100-1000+ | 30-50 |
| **Propósito** | Explorar | Ejecutar |
| **Editable** | No | Sí |
| **Vista Jerárquica** | ✅ Útil | 🤔 Opcional |
| **Scroll** | Mucho | Poco |
| **Agrupación** | ✅ Necesaria | 🤔 Nice-to-have |

---

## 🎯 Decisión

**¿Qué prefieres?**

1. **Usar solo el modal** (ya implementado)
   - Explorar hallazgos ANTES de generar
   - Tabla de resultados queda plana

2. **Implementar también en tabla de resultados**
   - Vista jerárquica en ambos lugares
   - Más consistencia visual
   - Requiere implementación adicional

3. **Híbrido**
   - Modal: Vista jerárquica (exploración)
   - Tabla: Vista plana (trabajo)
   - Cada una optimizada para su propósito

---

## 🔍 Cómo Verificar el Modal

Si quieres ver la vista jerárquica ya implementada:

1. **NO generes la muestra todavía**
2. Quédate en la pantalla de configuración
3. Busca las tarjetas de insights (Benford, Outliers, etc.)
4. Click en el botón [📋] o "Ver Detalles"
5. Verás el modal con la vista jerárquica

Si ya generaste la muestra:
1. Vuelve atrás (si es posible)
2. O carga otra población
3. Ve a Muestreo No Estadístico
4. Antes de generar, explora los insights

---

**¿Qué opción prefieres?**
