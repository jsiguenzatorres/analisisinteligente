# 📖 Guía de Uso: Vista Jerárquica en Muestreo No Estadístico

## 🎯 ¿Qué es la Vista Jerárquica?

La vista jerárquica organiza los hallazgos forenses en una estructura de árbol de 3 niveles que facilita la navegación y priorización de riesgos.

---

## 🚀 Cómo Acceder

1. Ir a **Muestreo No Estadístico**
2. Seleccionar un insight forense (Benford, Outliers, etc.)
3. Click en el botón **"Ver Detalles"** (icono de lista)
4. El modal se abre con la vista jerárquica

---

## 📊 Estructura de 3 Niveles

### Nivel 1: Riesgo 🎚️
```
▼ ⚠️  RIESGO ALTO              85 registros  3 tipos
▶ ⚠️  RIESGO MEDIO             45 registros  2 tipos
▶ ⚠️  RIESGO BAJO              20 registros  1 tipo
```

**Colores**:
- 🔴 **Alto**: Fondo rojo claro, borde rojo
- 🟡 **Medio**: Fondo amarillo claro, borde amarillo
- 🟢 **Bajo**: Fondo verde claro, borde verde

**Por defecto**: Riesgo Alto viene expandido

### Nivel 2: Tipo de Análisis 🏷️
```
│  ▼ Ley de Benford                         45 items
│  ▶ Valores Atípicos                       25 items
│  ▶ Duplicados                             15 items
```

**Tipos disponibles**:
- Ley de Benford
- Benford Avanzado
- Valores Atípicos
- Duplicados
- Números Redondos
- Entropía Categórica
- Fraccionamiento
- Gaps Secuenciales
- ML Anomalías
- Actores Sospechosos
- Otros

### Nivel 3: Registros 📋
```
│  │  ┌────────────────────────────────────────────┐
│  │  │ ID       │ Valor      │ Factores          │
│  │  ├──────────┼────────────┼───────────────────┤
│  │  │ TRX-001  │ $12,345.67 │ [benford]         │
│  │  │          │            │ [outlier]         │
│  │  │          │            │ [duplicado]       │
│  │  └────────────────────────────────────────────┘
```

**Columnas**:
- **ID**: Identificador único
- **Valor**: Monto monetario formateado
- **Factores de Riesgo**: Tags con cada factor detectado

---

## 🖱️ Interacciones

### Expandir/Colapsar Nivel de Riesgo
**Acción**: Click en la barra de riesgo
```
▼ ⚠️  RIESGO ALTO  →  Click  →  ▶ ⚠️  RIESGO ALTO
```
**Efecto**: Muestra/oculta todos los tipos de análisis dentro

### Expandir/Colapsar Tipo de Análisis
**Acción**: Click en el tipo de análisis
```
▶ Ley de Benford  →  Click  →  ▼ Ley de Benford
```
**Efecto**: Muestra/oculta la tabla de registros

### Múltiples Niveles Expandidos
✅ Puedes tener varios niveles expandidos simultáneamente
```
▼ ⚠️  RIESGO ALTO
│  ▼ Ley de Benford        ← Expandido
│  ▼ Valores Atípicos      ← Expandido
│  ▶ Duplicados            ← Colapsado
```

---

## 📖 Ejemplos de Uso

### Ejemplo 1: Revisar Riesgos Críticos

**Objetivo**: Ver todos los registros de alto riesgo

**Pasos**:
1. Abrir modal de detalles
2. Riesgo Alto ya está expandido ✅
3. Ver resumen: "85 registros, 3 tipos"
4. Expandir cada tipo para ver detalles

**Resultado**: Acceso inmediato a riesgos críticos

---

### Ejemplo 2: Analizar Tipo Específico

**Objetivo**: Ver solo registros con anomalías de Benford

**Pasos**:
1. Abrir modal de detalles
2. En Riesgo Alto, click en "Ley de Benford"
3. Ver tabla con 45 registros
4. Revisar factores de riesgo en cada uno

**Resultado**: Análisis enfocado en un tipo específico

---

### Ejemplo 3: Comparar Niveles de Riesgo

**Objetivo**: Ver distribución de riesgos

**Pasos**:
1. Abrir modal de detalles
2. Ver contadores en cada nivel:
   - Alto: 85 registros
   - Medio: 45 registros
   - Bajo: 20 registros
3. Expandir cada nivel para explorar

**Resultado**: Visión completa de la distribución

---

### Ejemplo 4: Exportar Datos

**Objetivo**: Descargar todos los hallazgos a Excel

**Pasos**:
1. Abrir modal de detalles
2. Click en botón "Exportar" (arriba a la derecha)
3. Archivo Excel se descarga automáticamente

**Resultado**: 
- Archivo: `AAMA_Forense_[Tipo]_[Fecha].xlsx`
- Incluye: ID, Valor, risk_factors, y todos los campos raw

---

## 🎨 Interpretación Visual

### Iconos de Expansión
- ▶️ **Chevron derecha**: Nivel colapsado (click para expandir)
- ▼ **Chevron abajo**: Nivel expandido (click para colapsar)

### Badges de Contador
```
┌─────────────────────────────────────┐
│ 85 registros  │  3 tipos            │
└─────────────────────────────────────┘
```
- **Registros**: Total de items en ese nivel
- **Tipos**: Cantidad de tipos de análisis

### Tags de Factores
```
[benford] [outlier] [duplicado]
```
- Fondo gris claro
- Borde gris
- Texto pequeño
- Múltiples tags por registro

---

## 💡 Tips y Mejores Prácticas

### 1. Priorización
✅ **Siempre revisar Riesgo Alto primero**
- Ya viene expandido por defecto
- Contiene los hallazgos más críticos
- Mayor impacto en auditoría

### 2. Navegación Eficiente
✅ **Expandir solo lo necesario**
- No es necesario expandir todo
- Enfocarse en tipos relevantes
- Usar contadores para decidir

### 3. Análisis de Factores
✅ **Revisar tags de factores de riesgo**
- Múltiples factores = mayor riesgo
- Identificar patrones comunes
- Priorizar registros con más factores

### 4. Exportación
✅ **Usar exportación para análisis profundo**
- Vista jerárquica: navegación rápida
- Excel: análisis detallado
- Complementarios, no excluyentes

### 5. Límites de Visualización
⚠️ **Cada tipo muestra máximo 20 registros**
- Mensaje indica si hay más
- Usar exportación para ver todos
- Optimiza performance del navegador

---

## 🔍 Casos Especiales

### Registros Sin Factores de Riesgo
```
▼ ⚠️  RIESGO BAJO
│  ▼ Otros                              5 items
│  │  ┌────────────────────────────────────┐
│  │  │ TRX-009  │ $33,333.33 │ Sin factores│
│  │  └────────────────────────────────────┘
```
- Clasificados como "Bajo"
- Tipo: "Otros"
- Mensaje: "Sin factores"

### Nivel Sin Registros
```
▶ ⚠️  RIESGO MEDIO              0 registros
```
- No se muestra si está vacío
- Solo aparecen niveles con datos

### Muchos Tipos de Análisis
```
▼ ⚠️  RIESGO ALTO              150 registros  8 tipos
```
- Todos los tipos listados
- Scroll interno si es necesario
- Contadores ayudan a priorizar

---

## 📊 Información Adicional

### Límites y Capacidades
| Característica | Límite |
|----------------|--------|
| Registros totales | Sin límite |
| Registros visibles por tipo | 20 |
| Altura máxima del modal | 600px |
| Niveles de riesgo | 3 (Alto/Medio/Bajo) |
| Tipos de análisis | 11 + "Otros" |
| Niveles expandidos simultáneos | Sin límite |

### Performance
- ✅ Optimizado para grandes volúmenes
- ✅ Scroll suave
- ✅ Transiciones rápidas
- ✅ Sin lag al expandir/colapsar

---

## 🆘 Solución de Problemas

### Problema: No veo ningún registro
**Solución**: 
- Verificar que el análisis forense se haya ejecutado
- Revisar si hay datos en la población
- Intentar con otro tipo de insight

### Problema: Todos los niveles están colapsados
**Solución**:
- Riesgo Alto debería estar expandido por defecto
- Click en cualquier nivel para expandir
- Refrescar el modal si es necesario

### Problema: No veo los factores de riesgo
**Solución**:
- Expandir el tipo de análisis
- Expandir el nivel de riesgo primero
- Verificar que los datos tengan risk_factors

### Problema: El modal no responde
**Solución**:
- Cerrar y volver a abrir el modal
- Verificar conexión a la base de datos
- Revisar consola del navegador para errores

---

## 🎓 Glosario

**Nivel de Riesgo**: Clasificación basada en cantidad y tipo de factores de riesgo detectados

**Tipo de Análisis**: Categoría del método forense que detectó la anomalía

**Factores de Riesgo**: Indicadores específicos de anomalía (benford, outlier, etc.)

**Expandir**: Mostrar el contenido de un nivel colapsado

**Colapsar**: Ocultar el contenido de un nivel expandido

**Tag**: Etiqueta visual que muestra un factor de riesgo

**Jerarquía**: Estructura de árbol con niveles padre-hijo

---

## ✅ Checklist de Uso

Antes de analizar:
- [ ] Población cargada
- [ ] Análisis forense ejecutado
- [ ] Insight seleccionado

Durante el análisis:
- [ ] Revisar Riesgo Alto primero
- [ ] Expandir tipos relevantes
- [ ] Revisar factores de riesgo
- [ ] Identificar patrones

Después del análisis:
- [ ] Exportar datos si es necesario
- [ ] Documentar hallazgos
- [ ] Priorizar acciones

---

## 📞 Soporte

Si tienes dudas o encuentras problemas:
1. Revisar esta guía
2. Consultar documentación técnica
3. Revisar logs en consola del navegador
4. Contactar al equipo de desarrollo

---

**Versión**: 1.0  
**Fecha**: 2026-01-20  
**Componente**: NonStatisticalSampling.tsx  
**Estado**: ✅ Producción
