
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AppState, SamplingMethod, AuditResults, AuditObservation } from '../types';
import { calculateInference } from './statisticalService';

const COLORS = {
    primary: [15, 23, 42] as [number, number, number],     // Oxford Black
    secondary: [30, 58, 138] as [number, number, number],  // Deep Navy
    accent: [5, 150, 105] as [number, number, number],     // Emerald
    danger: [185, 28, 28] as [number, number, number],     // Red 700
    text: [30, 41, 59] as [number, number, number],
    border: [203, 213, 225] as [number, number, number],
    highlight: [248, 250, 252] as [number, number, number] // Slate 50
};

const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null) return "$0.00";
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const generateAuditReport = async (appState: AppState) => {
    const { selectedPopulation: pop, results, generalParams, samplingMethod, samplingParams } = appState;
    if (!pop || !results) throw new Error("Datos incompletos para generar el reporte.");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // --- HELPER: HEADER & FOOTER ---
    const addPageHeader = (title: string, subtitle?: string) => {
        // Franja Azul Superior
        doc.setFillColor(30, 58, 138); // Deep Navy
        doc.rect(0, 0, pageWidth, 25, 'F');

        // Logo o Título de la Firma (Simulado)
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text("AUDITORÍA DE CUMPLIMIENTO", margin, 12);

        // Subtítulos
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Cliente: ${pop.file_name} | Fecha: ${new Date().toLocaleDateString()}`, margin, 19);

        // Título de la Sección
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title.toUpperCase(), margin, 38);
        if (subtitle) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 116, 139);
            doc.text(subtitle, margin, 44);
        }
    };

    const addFooter = (pageNumber: number) => {
        const str = `Página ${pageNumber}`;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(str, pageWidth - margin - doc.getTextWidth(str), pageHeight - 10);
        doc.text("Generado por Asistente de Muestreo de Auditoría v2.0", margin, pageHeight - 10);
    };

    // --- PÁGINA 1: RESUMEN EJECUTIVO Y PARÁMETROS ---
    addPageHeader("Cédula de Planificación de Muestreo", "Resumen de Parámetros y Estrategia");

    // 1. Información del Universo (Tabla compacta)
    autoTable(doc, {
        startY: 50,
        head: [['CONCEPTO', 'DETALLE']],
        body: [
            ['Población sujeta a auditoría (N)', `${pop.total_rows.toLocaleString()} registros`],
            ['Valor Total en Libros', formatCurrency(pop.total_monetary_value)],
            ['Identificador Único', pop.column_mapping.uniqueId || "N/A"],
            ['Columna Importe', pop.column_mapping.monetaryValue || "N/A"],
            ['Semilla Estadística (Seed)', generalParams.seed.toString()]
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    // 2. Parámetros de Selección (Según el Método)
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.setFont('helvetica', 'bold');
    doc.text(`CONFIGURACIÓN: MÉTODO ${samplingMethod === SamplingMethod.Attribute ? 'ATRIBUTOS' : samplingMethod}`, margin, currentY);
    currentY += 5;

    let paramsData: string[][] = [];
    let formulaText = "";

    if (samplingMethod === SamplingMethod.Attribute) {
        const attr = samplingParams.attribute;
        paramsData = [
            ['Nivel de Confianza (NC)', `${attr.NC}%`, 'Probabilidad de que la muestra represente a la población.'],
            ['Desviación Tolerable (ET)', `${attr.ET}%`, 'Máximo error aceptable sin modificar valoración de riesgo.'],
            ['Desviación Esperada (PE)', `${attr.PE}%`, 'Error anticipado basado en experiencia previa.'],
            ['Estrategia', attr.useSequential ? 'Muestreo Secuencial (Stop-or-Go)' : 'Muestreo de Tamaño Fijo', 'Enfoque de selección.']
        ];
        formulaText = "Tamaño (n) = (Factor de Confianza * 100) / (ET - PE)";
    } else if (samplingMethod === SamplingMethod.MUS) {
        const mus = samplingParams.mus;
        const confidenceFactor = mus.RIA <= 5 ? 3.0 : 2.31;
        const confidenceLabel = mus.RIA <= 5 ? "95% (Alto)" : "90% (Medio)";

        paramsData = [
            ['Nivel de Confianza', confidenceLabel, `Factor de confiabilidad R=${confidenceFactor}`],
            ['Error Tolerable (TE)', formatCurrency(mus.TE), 'Umbral de materialidad monetaria definido.'],
            ['Error Esperado (EE)', formatCurrency(mus.EE), 'Anticipación de errores basada en historial.'],
            ['Intervalo de Muestreo (J)', formatCurrency(mus.TE / confidenceFactor), 'Teórico: TE / Factor R.'],
            ['Capa de Certeza', mus.optimizeTopStratum ? 'Activada' : 'No Aplicada', 'Extracción al 100% de ítems >= J.'],
            ['Tratamiento Negativos', mus.handleNegatives === 'Separate' ? 'Segregar' : mus.handleNegatives === 'Absolute' ? 'Valor Absoluto' : 'Tratar como Cero', 'Política para saldos acreedores.'],
            ['Semilla Estadística', generalParams.seed.toString(), 'Valor para reproducibilidad NIA 530.']
        ];
        formulaText = "Intervalo (J) = TE / Factor R;  Certeza = Ítems >= J;  Muestra = Residual / J";
    } else if (samplingMethod === SamplingMethod.Stratified) {
        const st = samplingParams.stratified;
        paramsData = [
            ['Base Estratificación', st.basis === 'Monetary' ? 'Monetaria' : 'Por Categoría', 'Criterio de división del universo.'],
            ['Cantidad de Estratos', st.strataCount.toString(), 'Número de segmentos creados.'],
            ['Método Asignación', st.allocationMethod, 'Lógica de distribución de la muestra (Neyman/Prop).'],
            ['Umbral de Certeza', formatCurrency(st.certaintyStratumThreshold), 'Límite para extracción al 100%.'],
            ['Semilla Estadística', generalParams.seed.toString(), 'Valor para reproducibilidad NIA 530.']
        ];
        formulaText = "Asignación n_h = n * (p_h) donde p_h depende del método (Neyman u Óptima).";
    } else if (samplingMethod === SamplingMethod.CAV) {
        const cav = samplingParams.cav;
        const isPilot = results.pilotMetrics?.type === 'CAV_PILOT';
        const sigmaUsed = isPilot ? (results.pilotMetrics as any).calibratedSigma : cav.sigma;
        const ncLabel = `${cav.NC || 95}%`;

        paramsData = [
            ['Técnica Estimación', cav.estimationTechnique === 'Media' ? 'Media por Unidad (MPU)' : cav.estimationTechnique, 'Lógica de proyección del error.'],
            ['Nivel de Confianza (NC)', ncLabel, 'Nivel de seguridad estadística independiente.'],
            ['Error Tolerable (TE)', formatCurrency(cav.TE), 'Umbral monetario total específico para CAV.'],
            ['Sigma de Diseño (σ)', formatCurrency(cav.sigma), 'Variabilidad inicial estimada.'],
            ['Sigma Calibrado (σ)', isPilot ? formatCurrency(sigmaUsed) : 'No aplicado', 'Calibración vía piloto de 50 ítems.'],
            ['Universo (N)', (appState.selectedPopulation?.total_rows || 0).toLocaleString(), 'Registros totales en la población.'],
            ['Semilla Estadística', generalParams.seed.toString(), 'Valor para reproducibilidad NIA 530.']
        ];
        formulaText = "Tamaño n = [ (N * Z * Sigma) / TE ]^2;  Proyección = MPU * N";
    }

    autoTable(doc, {
        startY: currentY,
        head: [['PARÁMETRO', 'VALOR', 'EXPLICACIÓN TÉCNICA']],
        body: paramsData,
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105] }, // Slate 600
        styles: { fontSize: 9 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // 3. Fórmula Utilizada
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 20, 2, 2, 'F');
    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50);
    doc.text(`FÓRMULA APLICADA: ${formulaText}`, margin + 5, currentY + 12);

    addFooter(1);

    // --- PÁGINA 2: EJECUCIÓN Y RESULTADOS ---
    doc.addPage();
    addPageHeader("Evaluación y Resultados", "Resumen de Hallazgos y Proyección");

    // 4. Resumen de Ejecución
    const errors = results.sample.filter(i => i.compliance_status === 'EXCEPCION');
    const totalErrors = errors.length;
    const errorRate = ((totalErrors / results.sampleSize) * 100).toFixed(2);

    // Calcular Inferencia/Veredicto
    let veredicto = "Favorable";
    let conclusion = "Los resultados obtenidos se encuentran dentro de los límites tolerables establecidos.";
    let colorVeredicto = [22, 163, 74]; // Green

    if (samplingMethod === SamplingMethod.Attribute) {
        const attr = samplingParams.attribute;
        const inference = calculateInference(results, samplingMethod, 0);
        if (inference.upperLimit > attr.ET) {
            veredicto = "Con Salvedades / Adverso";
            conclusion = `Se detectó una tasa de error proyectada (${inference.upperLimit.toFixed(2)}%) superior al error tolerable (${attr.ET}%). Se recomienda ampliar la muestra o realizar pruebas sustantivas adicionales.`;
            colorVeredicto = [220, 38, 38];
        }
    } else if (samplingMethod === SamplingMethod.MUS) {
        const mus = samplingParams.mus;
        const inference = calculateInference(results, samplingMethod, 0);
        const projectedError = inference.projectedError || 0;
        if (projectedError > mus.TE) {
            veredicto = "Adverso (Material)";
            conclusion = `El error proyectado de ${formatCurrency(projectedError)} EXCEDE la materialidad tolerable de ${formatCurrency(mus.TE)}. El saldo de la cuenta podría estar materialmente sobrevalorado.`;
            colorVeredicto = [220, 38, 38];
        } else {
            conclusion = `El error proyectado de ${formatCurrency(projectedError)} es menor a la materialidad establecida (${formatCurrency(mus.TE)}). No se han detectado desviaciones materiales en los saldos evaluados.`;
        }
    } else if (samplingMethod === SamplingMethod.CAV) {
        const cav = samplingParams.cav;
        const inference = calculateInference(results, samplingMethod, pop.total_monetary_value, pop.total_rows);
        const projectedError = inference.projectedError || 0;
        const TE = cav.TE || 50000;
        if (projectedError > TE) {
            veredicto = "Adverso (Material)";
            conclusion = `La proyección MPU de ${formatCurrency(projectedError)} EXCEDE la materialidad tolerable de ${formatCurrency(TE)}. Existe riesgo de error material detectado por variables clásicas.`;
            colorVeredicto = [220, 38, 38];
        } else {
            conclusion = `El error proyectado MPU de ${formatCurrency(projectedError)} es aceptable respecto al TE de ${formatCurrency(TE)}. No se detectan desviaciones significativas en la estimación del valor total.`;
        }
    } else if (samplingMethod === SamplingMethod.Stratified) {
        const stratifiedParams = samplingParams.stratified;
        const inference = calculateInference(results, samplingMethod, pop.total_monetary_value, pop.total_rows);
        const projectedError = inference.projectedError || 0;
        const TE = samplingParams.mus?.TE || 50000;

        if (projectedError > TE) {
            veredicto = "Adverso (Material)";
            conclusion = `El error proyectado mediante Estimación de Razón (${formatCurrency(projectedError)}) EXCEDE la materialidad tolerable (${formatCurrency(TE)}). Los hallazgos en los estratos evaluados indican una desviación representativa en la población.`;
            colorVeredicto = [220, 38, 38];
        } else {
            conclusion = `El error proyectado de ${formatCurrency(projectedError)} se mantiene por debajo de la materialidad de ${formatCurrency(TE)}. La distribución por estratos confirma un nivel de riesgo aceptable para el universo evaluado.`;
        }
    }

    const executionData = [
        ['Tamaño de Muestra Ejecutado', results.sampleSize],
        ['Items Evaluados "Conformes"', results.sampleSize - totalErrors],
        ['Items con "Excepción" (Errores)', totalErrors],
        ['Tasa de Desviación Muestral', `${errorRate}%`],
        ['Fase Final Alcanzada', results.sample.some(i => !i.is_pilot_item) ? "Fase 2 (Ampliación)" : "Fase 1 (Piloto)"]
    ];

    autoTable(doc, {
        startY: 50,
        head: [['MÉTRICA DE EJECUCIÓN', 'RESULTADO']],
        body: executionData,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138] },
        columnStyles: { 0: { cellWidth: 100, fontStyle: 'bold' } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // 4.1 Resumen de Estratificación (Si aplica)
    if (samplingMethod === SamplingMethod.Stratified || samplingMethod === SamplingMethod.CAV) {
        const strataGroups: Record<string, { count: number, value: number, errors: number }> = {};
        results.sample.forEach(item => {
            const key = item.stratum_label || 'Sin Estrato';
            if (!strataGroups[key]) strataGroups[key] = { count: 0, value: 0, errors: 0 };
            strataGroups[key].count++;
            strataGroups[key].value += (item.value || 0);
            if (item.compliance_status === 'EXCEPCION') strataGroups[key].errors++;
        });

        const strataRows = Object.entries(strataGroups).map(([name, data]) => [
            name,
            data.count,
            formatCurrency(data.value),
            data.errors
        ]);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 58, 138);
        doc.text("RESUMEN DE DISTRIBUCIÓN POR ESTRATOS", margin, currentY);
        currentY += 5;

        autoTable(doc, {
            startY: currentY,
            head: [['ESTRATO / SEGMENTO', 'ÍTEMS', 'VALOR TOTAL', 'ERRORES']],
            body: strataRows,
            theme: 'striped',
            headStyles: { fillColor: [51, 65, 85] },
            styles: { fontSize: 8 },
            columnStyles: {
                1: { halign: 'center' },
                2: { halign: 'right' },
                3: { halign: 'center', fontStyle: 'bold' }
            }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 5. Dictamen / Conclusión
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("CONCLUSIÓN DE AUDITORÍA", margin, currentY);
    currentY += 5;

    doc.setFillColor(colorVeredicto[0], colorVeredicto[1], colorVeredicto[2]);
    doc.setTextColor(255, 255, 255);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 12, 1, 1, 'F');
    doc.setFontSize(10);
    doc.text(`VEREDICTO: ${veredicto.toUpperCase()}`, margin + 5, currentY + 8);

    currentY += 15;
    doc.setTextColor(50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const splitConclusion = doc.splitTextToSize(conclusion, pageWidth - (margin * 2));
    doc.text(splitConclusion, margin, currentY);
    currentY += splitConclusion.length * 5 + 10;

    // --- NUEVA SECCIÓN: DESGLOSE DE EXPANSIÓN (Card Estilo UI) ---
    const pilotCount = results.sample.filter(i => i.is_pilot_item).length;
    const expansionCount = results.sample.filter(i => !i.is_pilot_item).length;

    doc.setFillColor(15, 23, 42); // Slate 900
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 45, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("DESGLOSE DE EXPANSIÓN", margin + 10, currentY + 10);

    doc.setFont('courier', 'bold');
    doc.setTextColor(52, 211, 153); // Emerald 400

    if (samplingMethod === SamplingMethod.Attribute) {
        const rFactor = (samplingParams.attribute?.NC >= 95 ? 3.0 : 2.3);
        const et = samplingParams.attribute?.ET || 1;
        const pe = samplingParams.attribute?.PE || 0;
        doc.text(`n_teórico = (${rFactor} * 100) / (${et} - ${pe}) = ${results.sampleSize}`, margin + 10, currentY + 20);
    } else {
        const mus = samplingParams.mus;
        const confFactor = mus.RIA <= 5 ? 3.0 : 2.31;
        const intervalJ = mus.TE / confFactor;
        doc.text(`J = ${formatCurrency(intervalJ)} | n = V / J = ${results.sampleSize}`, margin + 10, currentY + 20);
    }

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.1);
    doc.line(margin + 10, currentY + 25, pageWidth - margin - 10, currentY + 25);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text("Fase 1 (Piloto):", margin + 10, currentY + 32);
    doc.text(`${pilotCount} registros`, pageWidth - margin - 35, currentY + 32);

    doc.setTextColor(52, 211, 153);
    doc.text("Fase 2 (Ampliación):", margin + 10, currentY + 38);
    doc.text(`+ ${expansionCount} registros`, pageWidth - margin - 35, currentY + 38);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text("Total Auditado:", margin + 10, currentY + 44);
    doc.text(`${results.sampleSize} registros`, pageWidth - margin - 35, currentY + 44);

    currentY += 55;

    // --- NUEVA SECCIÓN: DICTAMEN DE HALLAZGOS (IA) ---
    const exceptionsFull = results.sample.filter(i => i.compliance_status === 'EXCEPCION');
    if (exceptionsFull.length > 0) {
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text("DICTAMEN DE HALLAZGOS", margin, currentY);
        currentY += 8;

        const grouped = {
            'Integridad': { items: 0, desc: 'Se detectaron fallos en la completitud de los registros o campos obligatorios vacíos.' },
            'Documentación': { items: 0, desc: 'Los ítems seleccionados carecen de soporte documental o referencias cruzadas válidas.' },
            'Cálculo': { items: 0, desc: 'Diferencias aritméticas encontradas entre el valor en libros y la verificación física.' }
        };

        exceptionsFull.forEach(ex => {
            const desc = (ex.error_description || '').toLowerCase();
            if (desc.includes('falta') || desc.includes('soporte') || desc.includes('document')) grouped.Documentación.items++;
            else if (desc.includes('calculo') || desc.includes('error') || desc.includes('diferencia')) grouped.Cálculo.items++;
            else grouped.Integridad.items++;
        });

        Object.entries(grouped).filter(([_, data]) => data.items > 0).forEach(([titulo, data]) => {
            if (currentY > pageHeight - 40) {
                addFooter(2);
                doc.addPage();
                addPageHeader("Evaluación y Resultados (Cont.)", "Continuación de Hallazgos");
                currentY = 50;
            }

            doc.setFillColor(248, 250, 252); // Slate 50
            doc.setDrawColor(226, 232, 240); // Slate 200
            doc.roundedRect(margin, currentY, pageWidth - margin * 2, 20, 2, 2, 'FD');

            doc.setTextColor(30, 41, 59);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`RIESGO DE ${titulo.toUpperCase()}`, margin + 5, currentY + 8);

            doc.setTextColor(30, 58, 138);
            doc.text(`n=${data.items}`, pageWidth - margin - 15, currentY + 8);

            doc.setTextColor(100, 116, 139);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            const splitDesc = doc.splitTextToSize(`"${data.desc}"`, pageWidth - margin * 2 - 10);
            doc.text(splitDesc, margin + 5, currentY + 14);

            currentY += 25;
        });
    }

    addFooter(2);

    // --- NUEVA SECCIÓN: OBSERVACIONES DEL EXPEDIENTE (SOLICITADO: ANTES DEL ANEXO) ---
    const observations = (appState as any).observations || [];
    if (observations.length > 0) {
        doc.addPage();
        addPageHeader("Sección V: Expediente de Hallazgos", "Observaciones cualitativas y evidencias del auditor");

        autoTable(doc, {
            startY: 50,
            head: [['Título', 'Descripción', 'Tipo de Control', 'Prioridad / Severidad']],
            body: observations.map((o: any) => [
                o.titulo,
                o.descripcion,
                o.tipo || 'General',
                o.severidad
            ]),
            theme: 'grid',
            headStyles: { fillColor: [30, 58, 138] },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 35, fontStyle: 'bold' },
                1: { cellWidth: 90 },
                2: { cellWidth: 30 },
                3: { cellWidth: 25, halign: 'center' }
            }
        });
        addFooter(3);
    }

    // --- PÁGINA ANEXO: DETALLE DE LA MUESTRA ---
    doc.addPage();
    addPageHeader("Anexo: Matriz de Control Detallada", "Evidencia ítem por ítem del papel de trabajo");

    const mapping = pop.column_mapping;
    const sampleRows = results.sample.map((item, idx) => {
        const raw = item.raw_row || {};
        const monetaryVal = mapping?.monetaryValue ? raw[mapping.monetaryValue] : undefined;
        const totalVal = parseFloat(String(item.value || monetaryVal || 0));

        let statusText = 'PENDIENTE';
        if (item.compliance_status === 'OK') statusText = 'CONFORME';
        else if (item.compliance_status === 'EXCEPCION') statusText = 'EXCEPCIÓN';

        let faseLabel = item.is_pilot_item ? "PILOTO" : "AMPLIACIÓN";
        if (item.risk_flag === 'TOP_STRATUM' || item.risk_flag === 'CERTEZA_ESTRAT.') faseLabel = "CERTEZA";
        else if (item.risk_flag === 'NEGATIVO_SEGREGADO' || item.risk_flag === 'NEGATIVO_ABS') faseLabel = "ACREEDOR";

        if (item.stratum_label && item.stratum_label !== 'Certeza') {
            faseLabel = `ESTRATO: ${item.stratum_label}`;
        }

        return [
            idx + 1,
            item.id,
            formatCurrency(totalVal),
            item.stratum_label || 'E1',
            item.risk_score || 0,
            faseLabel,
            statusText,
            item.error_description || (statusText === 'EXCEPCIÓN' ? 'Sin descripción' : '')
        ];
    });

    autoTable(doc, {
        startY: 50,
        head: [['It.', 'ID Ref', 'Importe', 'Estrato', 'Riesgo', 'Fase', 'Estado', 'Observación / Hallazgo']],
        body: sampleRows,
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 30 },
            2: { cellWidth: 22, halign: 'right' },
            3: { cellWidth: 20 },
            4: { cellWidth: 12, halign: 'center' },
            5: { cellWidth: 18 },
            6: { cellWidth: 20, fontStyle: 'bold' },
            7: { cellWidth: 'auto' }
        },
        didParseCell: function (data) {
            if (data.section === 'body') {
                if (data.row.raw[6] === 'EXCEPCIÓN') {
                    data.cell.styles.fillColor = [254, 202, 202];
                    data.cell.styles.textColor = [185, 28, 28];
                } else if (data.row.raw[6] === 'PENDIENTE') {
                    data.cell.styles.textColor = [100, 116, 139];
                }
            }
        }
    });

    addFooter(4);

    // --- LA SECCIÓN DE OBSERVACIONES QUE ESTABA AQUÍ FUE MOVIDA ARRIBA ---

    doc.save(`PT_Auditoria_${pop.file_name.split('.')[0]}_${new Date().getTime()}.pdf`);
};
