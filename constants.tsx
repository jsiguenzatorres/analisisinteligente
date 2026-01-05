
import React from 'react';
import { RichInfoCard } from './components/ui/RichInfoCard';

export const InfoIcon = () => (
    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors duration-200 cursor-pointer shadow-sm border border-blue-200">
        <i className="fas fa-info text-xs font-bold"></i>
    </div>
);

export const WarningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);

export const ASSISTANT_CONTENT = {
    poblacionTotal: {
        title: 'Población Total (N)',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Es el número total de unidades de muestreo (registros, facturas, líneas) que componen el universo sujeto a auditoría.
                </RichInfoCard>
                <RichInfoCard type="justification" title="Justificación Técnica">
                    Necesario para determinar si aplica el "factor de corrección para poblaciones finitas" y para extrapolar los resultados de la muestra al total.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Impacto en la Muestra (n)">
                    Para poblaciones grandes (&gt;5,000), el tamaño tiene un impacto despreciable. En poblaciones pequeñas, reduce el tamaño de muestra requerido.
                </RichInfoCard>
            </div>
        ),
    },
    nivelConfianza: {
        title: 'Nivel de Confianza (NC)',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Probabilidad estadística de que los resultados de la muestra representen fielmente a la población real (Complemento del Riesgo de Muestreo).
                </RichInfoCard>
                <RichInfoCard type="justification" title="Relación con el Riesgo">
                    A mayor Nivel de Confianza, menor es el Riesgo de Aceptación Incorrecta (Beta) que el auditor está dispuesto a asumir.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Impacto en la Muestra (n)">
                    Relación Directa: Un mayor nivel de confianza (ej. 95% vs 90%) incrementa drásticamente el tamaño de la muestra.
                </RichInfoCard>
                <RichInfoCard type="standard" title="Rango Estándar">
                    <ul className="list-disc list-inside">
                        <li><strong>90% - 95%:</strong> Pruebas Sustantivas y de Cumplimiento estándar.</li>
                        <li><strong>98% - 99%:</strong> Áreas críticas o forenses.</li>
                    </ul>
                </RichInfoCard>
            </div>
        ),
    },
    desviacionTolerable: {
        title: 'Desviación Tolerable (ET)',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Tasa máxima de error o desviación que el auditor está dispuesto a aceptar en la población sin cambiar su evaluación de control.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Impacto en la Muestra (n)">
                    Relación Inversa: Un ET más bajo (más estricto) requiere un tamaño de muestra significativamente mayor.
                </RichInfoCard>
                <RichInfoCard type="standard" title="Rango Estándar (NIA 530)">
                    <ul className="list-disc list-inside">
                        <li><strong>2% - 5%:</strong> Controles Críticos / Alto Riesgo.</li>
                        <li><strong>6% - 10%:</strong> Controles Moderados / Bajo Riesgo.</li>
                    </ul>
                </RichInfoCard>
            </div>
        ),
    },
    desviacionEsperada: {
        title: 'Desviación Esperada (PE)',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    La tasa de error que el auditor anticipa encontrar antes de comenzar la prueba, basada en experiencia previa o pruebas piloto.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Impacto en la Muestra (n)">
                    Relación Directa: Cuantos más errores se esperan, mayor debe ser la muestra para confirmar que no exceden lo tolerable.
                </RichInfoCard>
                <RichInfoCard type="warning" title="Regla Crítica">
                    El PE debe ser siempre menor que el ET. Si PE ≥ ET, el muestreo estadístico no es viable.
                </RichInfoCard>
                <RichInfoCard type="standard" title="Rango Estándar">
                    Generalmente 0% (cero errores) o valores muy bajos (0.5% - 1.5%) para controles efectivos.
                </RichInfoCard>
            </div>
        ),
    },
    valorTotalPoblacion: {
        title: 'Valor Total de la Población (V)',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Suma absoluta de los importes monetarios de todos los ítems en la población.
                </RichInfoCard>
                <RichInfoCard type="justification" title="Uso Técnico (MUS)">
                    En MUS, este valor define el "tamaño" del universo sobre el cual se calcula el Intervalo de Muestreo. Cada unidad monetaria ($1) tiene la misma probabilidad de selección.
                </RichInfoCard>
            </div>
        ),
    },
    errorTolerable: {
        title: 'Error Tolerable Monetario (TE)',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Monto máximo de error monetario que puede existir en la cuenta sin que los estados financieros estén materialmente incorrectos (Materialidad de Ejecución).
                </RichInfoCard>
                <RichInfoCard type="impact" title="Impacto">
                    Un TE menor (más estricto) reduce el intervalo de muestreo y aumenta el tamaño de la muestra.
                </RichInfoCard>
                <RichInfoCard type="standard" title="Rango Estándar">
                    Generalmente 50% - 75% de la Materialidad Global.
                </RichInfoCard>
            </div>
        ),
    },
    erroresPrevistos: {
        title: 'Total de Errores Previstos (EE)',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Estimación del monto total de error que ya existe en la población (Anticipación).
                </RichInfoCard>
                <RichInfoCard type="warning" title="Advertencia de Eficiencia">
                    Si EE es alto (&gt;50% de TE), el método MUS se vuelve ineficiente y produce muestras excesivamente grandes. Considere CAV.
                </RichInfoCard>
            </div>
        ),
    },
    riesgoAceptacionIncorrecta: {
        title: 'Riesgo de Aceptación Incorrecta (RIA)',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Riesgo Beta: La probabilidad de concluir que el saldo es correcto cuando en realidad contiene un error material.
                </RichInfoCard>
                <RichInfoCard type="standard" title="Valores Estándar">
                    <ul className="list-disc list-inside">
                        <li><strong>5%:</strong> Alto nivel de seguridad (Confianza 95%).</li>
                        <li><strong>10%:</strong> Nivel moderado (Confianza 90%).</li>
                        <li><strong>37% - 50%:</strong> Cuando se confía plenamente en otros controles sustantivos.</li>
                    </ul>
                </RichInfoCard>
            </div>
        ),
    },
    desviacionEstandar: {
        title: 'Variabilidad (Sigma σ)',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Es la medida de cuánto se alejan los importes individuales del promedio de la población. Representa la heterogeneidad de los montos evaluados.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Impacto en la Muestra (n)">
                    Relación Directa: A mayor dispersión (heterogeneidad), mayor será la muestra necesaria para obtener una estimación fiable.
                </RichInfoCard>
                <RichInfoCard type="tip" title="Calibración del Piloto">
                    Al activar la opción "Muestra Piloto", el sistema calcula el Sigma real de los primeros 50 ítems. Si este Sigma es mayor al estimado inicialmente, el sistema sugerirá ampliar la muestra para mantener el Nivel de Confianza.
                </RichInfoCard>
                <RichInfoCard type="standard" title="Recomendación">
                    Si la variabilidad es excesiva, considere la <strong>Estratificación</strong>. Dividir la población en grupos de montos similares reduce drásticamente el Sigma residual y, por tanto, el tamaño de la muestra.
                </RichInfoCard>
            </div>
        ),
    },
    muestraPiloto: {
        title: 'Muestra Piloto (Pre-Muestreo)',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="formula" title="Propósito">
                    Permite estimar la desviación estándar (σ) cuando no se tienen datos históricos confiables.
                </RichInfoCard>
                <RichInfoCard type="standard" title="Funcionamiento">
                    El sistema toma una "foto" rápida de 50 registros para calibrar la variabilidad antes de calcular el tamaño final de la muestra (n). Esto evita muestras excesivamente grandes o insuficientes.
                </RichInfoCard>
            </div>
        )
    },
    tecnicaEstimacion: {
        title: 'Técnica de Estimación Post-Prueba',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="justification" title="Guía de Selección">
                    <ul className="list-none space-y-3">
                        <li className="pl-2 border-l-2 border-blue-200"><strong>Media por Unidad (Mean-per-Unit):</strong> Úsela si NO espera encontrar errores. Calcula el promedio de la muestra y lo multiplica por N.</li>
                        <li className="pl-2 border-l-2 border-blue-200"><strong>Diferencia (Difference):</strong> Ideal cuando hay errores y estos tienden a ser constantes (ej. siempre fallan por $100). Requiere encontrar errores en la muestra.</li>
                        <li className="pl-2 border-l-2 border-blue-200"><strong>Razón / Tasa Combinada (Ratio):</strong> Ideal cuando los errores son proporcionales al valor del ítem (ej. error del 5% del valor). Suele ser la más eficiente.</li>
                        <li className="pl-2 border-l-2 border-blue-200"><strong>Regresión:</strong> Método avanzado para relaciones lineales complejas entre valor en libros y auditado.</li>
                    </ul>
                </RichInfoCard>
            </div>
        )
    },
    estratificacion: {
        title: 'Estratificación Obligatoria',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Recomendación">
                    En CAV, la estratificación es casi obligatoria. Sin ella, la variabilidad (σ) de la población completa suele ser tan alta que la fórmula resultará en un tamaño de muestra impráctico (ej. &gt;500).
                </RichInfoCard>
                <RichInfoCard type="tip" title="¿Cuándo NO usarla?">
                    Solo si la población es extremadamente homogénea (ej. todas las transacciones son de $50.00 ± $1.00).
                </RichInfoCard>
            </div>
        ),
    },
    cantidadEstratos: {
        title: 'Cantidad de Estratos',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Número de subgrupos en los que se dividirá la población. Cada grupo debe ser mutuamente excluyente.
                </RichInfoCard>
                <RichInfoCard type="standard" title="Práctica Común">
                    Generalmente entre 3 y 5 estratos son suficientes para reducir significativamente la varianza.
                </RichInfoCard>
            </div>
        )
    },
    metodoAsignacion: {
        title: 'Método de Asignación',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="justification" title="Opciones">
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Proporcional:</strong> El tamaño de muestra de cada estrato es proporcional a su tamaño en la población.</li>
                        <li><strong>Óptima (Neyman):</strong> Asigna más muestra a estratos con mayor variabilidad o valor monetario (más eficiente).</li>
                    </ul>
                </RichInfoCard>
            </div>
        )
    },
    umbralCerteza: {
        title: 'Umbral de Certeza (Top Stratum)',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Valor monetario a partir del cual todos los ítems serán seleccionados al 100%. En MUS, esto suele ser igual al Intervalo de Muestreo (J).
                </RichInfoCard>
                <RichInfoCard type="justification" title="Propósito: Cobertura">
                    Garantiza que ninguna partida individualmente significativa (material) escape a la revisión. Esto optimiza la muestra aleatoria al "limpiar" la población de valores extremos.
                </RichInfoCard>
            </div>
        )
    },
    estratoCerteza: {
        title: 'Optimización: Estrato de Certeza',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Estrategia que extrae automáticamente cualquier ítem cuyo valor sea superior al Intervalo de Muestreo (J).
                </RichInfoCard>
                <RichInfoCard type="justification" title="Papel en el Cálculo">
                    Al extraer estos ítems al 100%, el sistema reduce el Valor Total (V) remanente y recalcula la muestra necesaria para el resto de la población, aumentando la eficiencia y precisión del alcance.
                </RichInfoCard>
            </div>
        )
    },
    tratamientoNegativos: {
        title: 'Tratamiento de Saldos Negativos',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Contexto Matemático">
                    El modelo MUS suma unidades monetarias positivas. Los valores negativos (ej. notas de crédito, saldos acreedores) distorsionan la selección sistemática.
                </RichInfoCard>
                <RichInfoCard type="standard" title="Opciones Técnicas">
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Segregar:</strong> Extraerlos a un reporte aparte para auditoría manual (Práctica recomendada por NIA).</li>
                        <li><strong>Valor Absoluto:</strong> Convertirlos a positivos. Útil si se desea que tengan probabilidad de ser seleccionados, aunque requiere ajustes en la inferencia final.</li>
                        <li><strong>Cero:</strong> Ignorarlos en el cálculo del intervalo (No recomendado si son materiales).</li>
                    </ul>
                </RichInfoCard>
            </div>
        )
    },
    semilla: {
        title: 'Mecanismo de Semilla (Seed)',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Valor inicial para el algoritmo generador de números pseudoaleatorios (PRNG).
                </RichInfoCard>
                <RichInfoCard type="standard" title="Propósito: Replicabilidad">
                    Permite que cualquier tercero (ej. regulador o revisor de calidad) genere <strong>exactamente la misma muestra</strong> utilizando los mismos parámetros, garantizando transparencia.
                </RichInfoCard>
            </div>
        ),
    },
    criterioJuicio: {
        title: 'Criterio de Juicio Profesional',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Selección intencional basada en la experiencia del auditor para cubrir riesgos específicos (ej. partidas sospechosas, montos redondos, proveedores nuevos).
                </RichInfoCard>
                <RichInfoCard type="warning" title="Limitación Importante">
                    No permite extrapolación estadística. Los resultados solo aplican a los elementos seleccionados, no a toda la población.
                </RichInfoCard>
            </div>
        ),
    },
    tablaVista: {
        title: 'Tabla o Vista de Base de Datos',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Fuente de Datos">
                    Objeto de la base de datos que contiene el universo completo.
                </RichInfoCard>
                <RichInfoCard type="justification" title="Integridad">
                    Se recomienda usar Vistas (Views) inmutables para garantizar que la población no cambie durante la auditoría.
                </RichInfoCard>
            </div>
        ),
    },
    columnaId: {
        title: 'Columna de ID Única',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Campo clave (PK) que permite identificar inequívocamente cada registro (ej. Numero_Factura, ID_Asiento).
                </RichInfoCard>
                <RichInfoCard type="impact" title="Propósito">
                    Esencial para localizar la evidencia física o digital de los ítems seleccionados en la muestra.
                </RichInfoCard>
            </div>
        ),
    },
    columnaValor: {
        title: 'Columna de Valor Monetario',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Campo numérico que contiene el importe financiero a auditar.
                </RichInfoCard>
                <RichInfoCard type="justification" title="Tratamiento">
                    Para MUS, se utilizan valores absolutos. Asegúrese de que no haya campos nulos o formatos de texto.
                </RichInfoCard>
            </div>
        ),
    },
    muestraRepresentativa: {
        title: 'Tamaño de Muestra Representativa',
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Determinación del Tamaño">
                    Es el número de registros necesarios para que el auditor pueda extrapolar sus hallazgos al universo total con un margen de error conocido.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Cálculo en MUS">
                    Se deriva de dividir el Valor Total entre el Intervalo J. Incluye tanto el <strong>Estrato de Certeza</strong> (partidas grandes al 100%) como la <strong>Muestra Aleatoria</strong>.
                </RichInfoCard>
            </div>
        )
    },
    // Mapeo de Columnas
    mappingUniqueId: {
        title: "ID Único (Transacción/Factura)",
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Columna que identifica de forma irrepetible cada registro.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Uso en Análisis">
                    <ul className="list-disc list-inside">
                        <li><strong>Básico:</strong> Permite la selección exacta de la muestra y evita errores de duplicidad en el conteo.</li>
                        <li><strong>Forense:</strong> Esencial para la prueba de Integridad Secuencial y detección de saltos en folios.</li>
                        <li><strong>Insights & EDA:</strong> Identifica valores extremos (Mín/Máx) y referencia ítems con riesgo crítico.</li>
                    </ul>
                </RichInfoCard>
            </div>
        )
    },
    mappingMonetary: {
        title: "Valor Monetario / Importe",
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Columna que contiene el valor económico de la transacción.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Uso en Análisis">
                    <ul className="list-disc list-inside">
                        <li><strong>Básico:</strong> Base para materialidad, error proyectado y desviación estándar.</li>
                        <li><strong>Forense:</strong> Alimenta la Ley de Benford, Detección de Outliers y Fraccionamiento.</li>
                        <li><strong>Insights & EDA:</strong> Determina el Factor de Tamaño Relativo (RSF) y el Valor Neto de la población.</li>
                    </ul>
                </RichInfoCard>
            </div>
        )
    },
    mappingCategory: {
        title: "Categoría (Var Principal)",
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Agrupador principal (ej. Centro de Costos, Cuenta Contable, Unidad de Negocio).
                </RichInfoCard>
                <RichInfoCard type="impact" title="Uso en Análisis">
                    <ul className="list-disc list-inside">
                        <li><strong>Básico:</strong> Permite el Muestreo Estratificado y la segmentación de resultados.</li>
                        <li><strong>Forense:</strong> Base para el Análisis de Entropía (combinaciones inusuales).</li>
                        <li><strong>Insights & EDA:</strong> Segmenta los hallazgos en el Perfil de Riesgo y el resumen descriptivo.</li>
                    </ul>
                </RichInfoCard>
            </div>
        )
    },
    mappingSubcategory: {
        title: "Subcategoría",
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Nivel de detalle secundario para refinar la clasificación descriptiva.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Uso en Análisis">
                    <ul className="list-disc list-inside">
                        <li><strong>Forense:</strong> Refina la detección de anomalías en jerarquías profundas de datos.</li>
                        <li><strong>Insights:</strong> Proporciona el contexto cualitativo necesario para entender la naturaleza de una excepción.</li>
                    </ul>
                </RichInfoCard>
            </div>
        )
    },
    mappingDate: {
        title: "Fecha de Transacción",
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Fecha en que ocurrió el evento auditado.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Uso en Análisis">
                    <ul className="list-disc list-inside">
                        <li><strong>Básico:</strong> Define la estacionalidad y el alcance temporal de la auditoría.</li>
                        <li><strong>Forense:</strong> Habilita el análisis de operaciones en fines de semana y días festivos.</li>
                        <li><strong>Insights & EDA:</strong> Genera las 'Estadísticas Cronológicas' y detecta brechas de actividad.</li>
                    </ul>
                </RichInfoCard>
            </div>
        )
    },
    mappingUser: {
        title: "Usuario / Actor",
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Identifica a la persona responsable de la creación o aprobación del registro.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Uso en Análisis">
                    <ul className="list-disc list-inside">
                        <li><strong>Forense:</strong> Habilita el **Perfilado de Actores**, detectando patrones de riesgo concentrados en individuos.</li>
                        <li><strong>Insights:</strong> Atribuye responsabilidades directas en la detección de posibles colusiones o negligencias.</li>
                    </ul>
                </RichInfoCard>
            </div>
        )
    },
    mappingVendor: {
        title: "Proveedor / Tercero",
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Identifica a la contraparte externa de la transacción.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Uso en Análisis">
                    <ul className="list-disc list-inside">
                        <li><strong>Forense:</strong> Crucial para detectar fraccionamiento de compras y dependencia inusual de proveedores.</li>
                        <li><strong>Insights & EDA:</strong> Muestra la diversidad de la cadena de suministro y destaca terceros con perfiles de alerta.</li>
                    </ul>
                </RichInfoCard>
            </div>
        )
    },
    mappingTimestamp: {
        title: "Hora / Marca de Tiempo",
        content: (
            <div className="space-y-4">
                <RichInfoCard type="definition" title="Definición">
                    Hora exacta del registro.
                </RichInfoCard>
                <RichInfoCard type="impact" title="Uso en Análisis">
                    <ul className="list-disc list-inside">
                        <li><strong>Forense:</strong> Habilita la prueba de 'Horarios Sospechosos' (detectando actividad fuera de jornada o en madrugadas).</li>
                        <li><strong>Insights:</strong> Aporta precisión forense al reconstruir la cronología de eventos críticos.</li>
                    </ul>
                </RichInfoCard>
            </div>
        )
    }
};

export const RISK_MESSAGES = {
    PILOT_PHASE: "Fase Piloto",
    PILOT_JUSTIFICATION: "Registro de calibración inicial.",
    TECH_EXPANSION: "Ampliación Técnica",
    TECH_EXPANSION_JUSTIFICATION: "Registro seleccionado para completar el tamaño representativo de la población.",
    CAV_PILOT_JUSTIFICATION: "Registro para cálculo de varianza real.",
};

export const METHODOLOGY_NOTES = {
    STOP_OR_GO: "Iniciado procedimiento Stop-or-Go (n=25).",
    MUS_PILOT: "Fase 1: Muestra Piloto iniciada para calibración de parámetros monetarios.",
    CAV_PILOT: "Fase 1: Muestra Piloto para determinación científica de la desviación estándar (Sigma).",
};
