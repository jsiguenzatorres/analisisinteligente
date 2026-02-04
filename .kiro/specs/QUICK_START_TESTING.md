# 🚀 Guía Rápida: Prueba del Sistema Unificado de Reportes

## ¿Qué vamos a probar?

Hemos creado un nuevo sistema unificado para generar reportes PDF y Excel que:
- ✅ Elimina duplicación de código
- ✅ Mantiene todas las secciones específicas de cada método
- ✅ Facilita el mantenimiento futuro

**Necesitamos validar que funciona correctamente antes de reemplazar el sistema actual.**

## 🎯 Objetivo de las Pruebas

Generar reportes con cada método de muestreo y verificar que:
1. No falten secciones importantes
2. Los cálculos sean correctos
3. El formato sea profesional
4. Las secciones específicas de cada método estén presentes

## 📋 Pasos para Probar

### Paso 1: Preparar el Entorno
```bash
# Asegúrate de que el proyecto esté actualizado
npm install
npm run dev
```

### Paso 2: Probar Cada Método

#### 🔹 Método 1: MUS (Monetary Unit Sampling)
1. Abre la aplicación
2. Carga una población
3. Selecciona método "MUS"
4. Configura parámetros típicos:
   - TE: $50,000
   - EE: $5,000
   - RIA: 5 (95% confianza)
5. Genera la muestra
6. **Exporta el reporte PDF**
7. **Exporta el reporte Excel**
8. Verifica que incluya:
   - ✅ Intervalo de muestreo (J)
   - ✅ Capa de certeza
   - ✅ Fórmula: "Intervalo (J) = TE / Factor R"
   - ✅ Proyección de error monetario

#### 🔹 Método 2: Attribute Sampling
1. Selecciona método "Attribute"
2. Configura parámetros:
   - NC: 95%
   - ET: 5%
   - PE: 1%
3. Genera la muestra
4. **Exporta reportes**
5. Verifica que incluya:
   - ✅ Tasa de error vs error tolerable
   - ✅ Fórmula: "n = (Factor * 100) / (ET - PE)"
   - ✅ Estrategia secuencial si aplica

#### 🔹 Método 3: CAV (Classical Variables)
1. Selecciona método "CAV"
2. Configura parámetros:
   - TE: $50,000
   - Sigma: $1,000
   - NC: 95%
3. Genera la muestra
4. **Exporta reportes**
5. Verifica que incluya:
   - ✅ Sigma de diseño vs calibrado
   - ✅ Media por Unidad (MPU)
   - ✅ Fórmula: "n = [(N × Z × σ) / TE]²"

#### 🔹 Método 4: Stratified Sampling
1. Selecciona método "Stratified"
2. Configura estratificación
3. Genera la muestra
4. **Exporta reportes**
5. Verifica que incluya:
   - ✅ Tabla de distribución por estratos
   - ✅ Método de asignación
   - ✅ Resumen por segmento

#### 🔹 Método 5: NonStatistical Sampling
1. Selecciona método "NonStatistical"
2. Define criterios de selección
3. Genera la muestra
4. **Exporta reportes**
5. Verifica que incluya:
   - ✅ Énfasis en juicio profesional
   - ✅ Factores de riesgo
   - ✅ NO fórmulas estadísticas

### Paso 3: Verificar Secciones Comunes

En TODOS los reportes, verifica que aparezcan:
- ✅ Diagnóstico forense preliminar
- ✅ Resumen estadístico del universo
- ✅ Configuración del método
- ✅ Resultados de ejecución
- ✅ Conclusión y veredicto
- ✅ Desglose de expansión (Piloto/Ampliación)
- ✅ Excepciones (si las hay)
- ✅ Footer con número de página

### Paso 4: Comparar con Reporte Original

Si tienes reportes generados con el sistema anterior:
1. Genera el mismo reporte con el sistema nuevo
2. Compara lado a lado
3. Verifica que no falte información
4. Anota cualquier diferencia

## 📝 Registro de Resultados

Usa esta plantilla para cada método probado:

```
=== PRUEBA: [Nombre del Método] ===
Fecha: [Hoy]
Estado: [✅ Exitoso / ⚠️ Con observaciones / ❌ Fallido]

PDF:
- Genera correctamente: [Sí/No]
- Secciones específicas presentes: [Sí/No]
- Cálculos correctos: [Sí/No]
- Formato profesional: [Sí/No]

Excel:
- Genera correctamente: [Sí/No]
- Todas las columnas presentes: [Sí/No]
- Formato de datos correcto: [Sí/No]

Observaciones:
[Anota aquí cualquier problema o sugerencia]

Capturas: [Adjunta si es posible]
```

## 🐛 ¿Encontraste un Problema?

### Si falta una sección:
1. Anota qué sección falta
2. En qué método ocurre
3. Compara con el reporte original

### Si hay un error de cálculo:
1. Anota el valor esperado vs el obtenido
2. Los parámetros usados
3. El método de muestreo

### Si el formato no es correcto:
1. Captura pantalla
2. Describe qué esperabas ver
3. Qué ves en su lugar

## 📊 Criterios de Éxito

### ✅ Prueba Exitosa
- Todos los métodos generan reportes sin errores
- Todas las secciones están presentes
- Los cálculos son correctos
- El formato es profesional

### ⚠️ Necesita Ajustes
- Falta alguna sección menor
- Formato mejorable
- Texto poco claro

### ❌ Requiere Corrección
- Errores en cálculos
- Secciones importantes faltantes
- No genera el reporte

## 🎯 Próximos Pasos

### Si todo funciona bien:
1. ✅ Marcar spec como "Listo para Migración"
2. Proceder a reemplazar sistema antiguo
3. Actualizar documentación

### Si hay problemas menores:
1. Documentar los problemas
2. Implementar correcciones
3. Re-probar

### Si hay problemas mayores:
1. Analizar causa raíz
2. Decidir si ajustar enfoque
3. Considerar enfoque modular

## 📚 Documentos Relacionados

- `unified-reporting-system.md` - Spec completo del sistema
- `testing-plan-unified-reports.md` - Plan detallado de pruebas
- `services/reportingCore.ts` - Código del núcleo común
- `services/unifiedReportService.ts` - Generador PDF
- `services/simpleReportService.ts` - Generador Excel

## 💡 Consejos

1. **Prueba con datos reales** - Usa poblaciones que ya hayas usado antes
2. **Compara con reportes anteriores** - Así detectas diferencias fácilmente
3. **Prueba casos extremos** - Sin excepciones, con muchas excepciones, etc.
4. **Documenta todo** - Mejor tener más información que menos

## ❓ Preguntas Frecuentes

**P: ¿Debo probar todos los métodos?**
R: Idealmente sí, pero puedes empezar con los que más uses.

**P: ¿Qué hago si encuentro un error?**
R: Documéntalo con el formato de registro y continúa probando los demás métodos.

**P: ¿Puedo usar el sistema antiguo mientras tanto?**
R: Sí, el sistema antiguo sigue funcionando. El nuevo es adicional.

**P: ¿Cuánto tiempo toma probar todo?**
R: Aproximadamente 30-45 minutos si pruebas los 5 métodos.

## 🚀 ¡Comienza Ahora!

1. Abre la aplicación
2. Carga una población
3. Selecciona el primer método (MUS)
4. Genera muestra y reportes
5. Verifica las secciones
6. Anota resultados
7. Repite con los demás métodos

**¡Buena suerte con las pruebas!** 🎉
