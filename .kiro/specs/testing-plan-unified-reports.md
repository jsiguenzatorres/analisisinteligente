# Plan de Pruebas: Sistema Unificado de Reportes

## Objetivo
Validar que el sistema unificado de reportes genera correctamente todos los reportes para cada método de muestreo, manteniendo las secciones específicas de cada uno.

## Métodos a Probar

### ✅ Checklist de Pruebas

#### 1. MUS (Monetary Unit Sampling)
- [ ] Generar muestra MUS con parámetros típicos
- [ ] Exportar reporte PDF
- [ ] Exportar reporte Excel
- [ ] Verificar secciones específicas:
  - [ ] Intervalo de muestreo (J) calculado correctamente
  - [ ] Capa de certeza mostrada si aplica
  - [ ] Tratamiento de negativos documentado
  - [ ] Proyección de error monetario presente
  - [ ] Fórmula: "Intervalo (J) = TE / Factor R"

#### 2. Attribute Sampling
- [ ] Generar muestra por Atributos
- [ ] Exportar reporte PDF
- [ ] Exportar reporte Excel
- [ ] Verificar secciones específicas:
  - [ ] Nivel de confianza (NC) mostrado
  - [ ] Error tolerable (ET) vs error esperado (PE)
  - [ ] Estrategia secuencial si aplica
  - [ ] Tasa de error vs límite tolerable
  - [ ] Fórmula: "n = (Factor * 100) / (ET - PE)"

#### 3. CAV (Classical Variables)
- [ ] Generar muestra CAV
- [ ] Exportar reporte PDF
- [ ] Exportar reporte Excel
- [ ] Verificar secciones específicas:
  - [ ] Sigma de diseño vs sigma calibrado
  - [ ] Técnica de estimación (MPU)
  - [ ] Proyección estadística
  - [ ] Piloto de 50 ítems si aplica
  - [ ] Fórmula: "n = [(N × Z × σ) / TE]²"

#### 4. Stratified Sampling
- [ ] Generar muestra estratificada
- [ ] Exportar reporte PDF
- [ ] Exportar reporte Excel
- [ ] Verificar secciones específicas:
  - [ ] Tabla de distribución por estratos
  - [ ] Método de asignación (Neyman/Proporcional)
  - [ ] Resumen por segmento
  - [ ] Umbral de certeza
  - [ ] Fórmula: "n_h = n × (p_h)"

#### 5. NonStatistical Sampling
- [ ] Generar muestra no estadística
- [ ] Exportar reporte PDF
- [ ] Exportar reporte Excel
- [ ] Verificar secciones específicas:
  - [ ] Énfasis en juicio profesional
  - [ ] Factores de riesgo documentados
  - [ ] Criterios de selección justificados
  - [ ] NO mostrar fórmulas estadísticas
  - [ ] Texto: "Selección dirigida basada en juicio profesional"

## Secciones Comunes a Verificar (Todos los Métodos)

### Página 1: Diagnóstico y Planificación
- [ ] **Diagnóstico Forense Preliminar**
  - [ ] Análisis básico (Benford, duplicados, outliers)
  - [ ] Análisis forense avanzado (si está disponible)
  - [ ] Evaluación de riesgo (BAJO/MEDIO/ALTO/CRÍTICO)
  - [ ] Recomendaciones de muestreo

- [ ] **Resumen Estadístico del Universo**
  - [ ] Población total (N registros)
  - [ ] Valor total en libros
  - [ ] Identificador único
  - [ ] Columna monetaria
  - [ ] Semilla estadística

- [ ] **Configuración del Método**
  - [ ] Parámetros específicos del método
  - [ ] Explicaciones técnicas
  - [ ] Fórmula aplicada

### Página 2: Resultados y Conclusión
- [ ] **Resumen de Ejecución**
  - [ ] Tamaño de muestra ejecutado
  - [ ] Ítems conformes
  - [ ] Ítems con excepción
  - [ ] Tasa de desviación muestral
  - [ ] Fase final alcanzada

- [ ] **Distribución por Estratos** (si aplica)
  - [ ] Tabla con estratos
  - [ ] Conteo de ítems por estrato
  - [ ] Valor total por estrato
  - [ ] Errores por estrato

- [ ] **Conclusión de Auditoría**
  - [ ] Veredicto (Favorable/Con Salvedades/Adverso)
  - [ ] Color apropiado (Verde/Amarillo/Rojo)
  - [ ] Descripción técnica
  - [ ] Justificación basada en resultados

- [ ] **Desglose de Expansión**
  - [ ] Fase 1 (Piloto) - conteo
  - [ ] Fase 2 (Ampliación) - conteo
  - [ ] Total auditado
  - [ ] Fórmula de cálculo

- [ ] **Dictamen de Hallazgos** (si hay excepciones)
  - [ ] Agrupación por tipo (Integridad/Documentación/Cálculo)
  - [ ] Conteo por categoría
  - [ ] Descripción de cada tipo

### Página 3: Análisis Forense (si aplica)
- [ ] Diagnóstico forense completo
- [ ] Hallazgos específicos
- [ ] Nivel de riesgo evaluado

### Página 4: Excepciones (si hay)
- [ ] Tabla de excepciones
- [ ] ID del ítem
- [ ] Valor
- [ ] Descripción del error
- [ ] Estrato

### Página 5: Observaciones (si hay)
- [ ] Tabla de observaciones cualitativas
- [ ] Título
- [ ] Descripción
- [ ] Tipo de control
- [ ] Severidad

### Footer (Todas las páginas)
- [ ] Número de página
- [ ] Versión del sistema
- [ ] Fecha de generación

## Formato Excel

### Columnas Requeridas
- [ ] Item #
- [ ] ID Referencia
- [ ] Fase / Origen
- [ ] Estrato
- [ ] Valor Libros / Importe
- [ ] Riesgo (Pts)
- [ ] Evaluación de Control
- [ ] Hallazgos / Observaciones Técnicas

### Formato de Datos
- [ ] Valores monetarios con formato de moneda
- [ ] Números enteros sin decimales
- [ ] Texto legible y completo
- [ ] Colores apropiados para excepciones

## Casos de Prueba Específicos

### Caso 1: Muestra sin Excepciones
**Objetivo:** Verificar reporte cuando todo está conforme
- [ ] Veredicto debe ser "Favorable"
- [ ] Color verde en conclusión
- [ ] No debe aparecer página de excepciones
- [ ] Recomendaciones positivas

### Caso 2: Muestra con Pocas Excepciones
**Objetivo:** Verificar reporte con excepciones dentro del tolerable
- [ ] Veredicto "Con Salvedades" o "Favorable" según método
- [ ] Página de excepciones presente
- [ ] Dictamen de hallazgos con categorización
- [ ] Recomendaciones de seguimiento

### Caso 3: Muestra con Muchas Excepciones
**Objetivo:** Verificar reporte cuando se excede el tolerable
- [ ] Veredicto "Adverso"
- [ ] Color rojo en conclusión
- [ ] Página de excepciones detallada
- [ ] Recomendaciones de acción inmediata

### Caso 4: Muestra con Análisis Forense
**Objetivo:** Verificar inclusión de análisis forense avanzado
- [ ] Página de diagnóstico forense presente
- [ ] Hallazgos forenses detallados
- [ ] Evaluación de riesgo basada en análisis
- [ ] Recomendaciones específicas de forense

### Caso 5: Muestra Estratificada
**Objetivo:** Verificar manejo correcto de estratos
- [ ] Tabla de distribución por estratos
- [ ] Resumen por segmento
- [ ] Errores distribuidos por estrato
- [ ] Conclusión considera estratificación

## Comparación con Reporte Original

Para cada método, comparar lado a lado:
- [ ] Todas las secciones del reporte original están presentes
- [ ] Los cálculos son idénticos
- [ ] El formato es equivalente o mejor
- [ ] No se perdió información relevante

## Criterios de Éxito

### Mínimo Aceptable
- ✅ Todos los métodos generan reportes sin errores
- ✅ Todas las secciones comunes están presentes
- ✅ Secciones específicas de cada método están incluidas
- ✅ Cálculos son correctos

### Ideal
- ✅ Formato profesional y consistente
- ✅ Código mantenible y sin duplicación
- ✅ Fácil agregar nuevos métodos
- ✅ Documentación completa

## Registro de Pruebas

### Formato de Registro
```
Método: [MUS/Attribute/CAV/Stratified/NonStatistical]
Fecha: [YYYY-MM-DD]
Probado por: [Usuario]
Resultado: [✅ Exitoso / ⚠️ Con observaciones / ❌ Fallido]

Observaciones:
- [Detalle de lo encontrado]
- [Secciones faltantes o incorrectas]
- [Sugerencias de mejora]

Capturas de pantalla: [Adjuntar si es posible]
```

## Próximos Pasos Después de las Pruebas

1. **Si todas las pruebas pasan:**
   - Proceder con Fase 2: Refinamiento
   - Decidir enfoque final (unificado/modular/híbrido)
   - Migrar a producción

2. **Si hay secciones faltantes:**
   - Documentar qué falta
   - Implementar secciones faltantes
   - Re-probar

3. **Si hay errores en cálculos:**
   - Identificar la causa raíz
   - Corregir en `reportingCore.ts`
   - Re-probar todos los métodos

4. **Si el código es muy complejo:**
   - Considerar enfoque modular
   - Refactorizar según sea necesario
   - Mantener simplicidad

## Contacto y Soporte

Si encuentras problemas durante las pruebas:
1. Documenta el problema en el registro de pruebas
2. Captura pantallas si es posible
3. Anota los parámetros usados
4. Reporta para análisis y corrección
