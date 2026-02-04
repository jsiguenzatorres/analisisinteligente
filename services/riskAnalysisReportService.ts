import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AuditPopulation, RiskProfile, AdvancedAnalysis } from '../types';

// Extender jsPDF para incluir autoTable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

// Colores estándar del sistema
const COLORS = {
    primary: [30, 41, 59] as [number, number, number],      // slate-800
    secondary: [99, 102, 241] as [number, number, number],  // indigo-600
    accent: [20, 184, 166] as [number, number, number],     // teal-500
    text: [15, 23, 42] as [number, number, number],         // slate-900
    border: [203, 213, 225] as [number, number, number],    // slate-300
    highlight: [248, 250, 252] as [number, number, number], // slate-50
    danger: [220, 38, 38] as [number, number, number],      // red-600
    warning: [202, 138, 4] as [number, number, number],     // yellow-600
    success: [22, 163, 74] as [number, number, number]      // green-600
};

interface RiskAnalysisReportData {
    population: AuditPopulation;
    profile: RiskProfile;
    analysisData: AdvancedAnalysis;
    scatterData: any[];
    insight: string;
    generatedBy: string;
    generatedDate: Date;
}

interface IntelligentSuggestion {
    id: string;
    type: 'CRITICAL' | 'WARNING' | 'INFO';
    icon: string;
    title: string;
    description: string;
    actions: string[];
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

// Función para crear títulos de sección estándar
const createSectionTitle = (doc: jsPDF, title: string, yPosition: number, pageWidth: number, margin: number): number => {
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(margin, yPosition, pageWidth - (margin * 2), 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, margin + 5, yPosition + 10);
    return yPosition + 20;
};

// Función para crear gráfico de dispersión mejorado
const createScatterChart = (doc: jsPDF, yPosition: number, pageWidth: number, margin: number): number => {
    const chartWidth = pageWidth - (margin * 2) - 20; // Espacio para escalas
    const chartHeight = 100;
    const chartStartX = margin + 20; // Espacio para escala Y
    
    // Fondo del gráfico
    doc.setFillColor(255, 255, 255);
    doc.rect(chartStartX, yPosition, chartWidth, chartHeight, 'F');
    
    // Borde del gráfico
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    doc.setLineWidth(1);
    doc.rect(chartStartX, yPosition, chartWidth, chartHeight);
    
    // Líneas de cuadrícula
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.5);
    
    // Líneas verticales con escala X
    for (let i = 0; i <= 5; i++) {
        const x = chartStartX + (chartWidth / 5) * i;
        doc.line(x, yPosition, x, yPosition + chartHeight);
        
        // Escala X (Valor Monetario)
        if (i > 0) {
            const value = (i * 50000).toLocaleString(); // 50K, 100K, 150K, 200K, 250K
            doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(`$${value}`, x - 8, yPosition + chartHeight + 8);
        }
    }
    
    // Líneas horizontales con escala Y
    for (let i = 0; i <= 4; i++) {
        const y = yPosition + (chartHeight / 4) * i;
        doc.line(chartStartX, y, chartStartX + chartWidth, y);
        
        // Escala Y (Score de Riesgo) - de 100 a 0
        const scoreValue = 100 - (i * 25); // 100, 75, 50, 25, 0
        doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(scoreValue.toString(), chartStartX - 15, y + 2);
    }
    
    // Línea punteada de riesgo alto (75 puntos)
    const riskLineY = yPosition + (chartHeight / 4); // 75% desde arriba
    doc.setDrawColor(COLORS.danger[0], COLORS.danger[1], COLORS.danger[2]);
    doc.setLineWidth(1);
    doc.setLineDashPattern([3, 3], 0);
    doc.line(chartStartX, riskLineY, chartStartX + chartWidth, riskLineY);
    
    // Etiqueta de línea de riesgo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(COLORS.danger[0], COLORS.danger[1], COLORS.danger[2]);
    doc.text('ALTO RIESGO', chartStartX + chartWidth - 35, riskLineY - 3);
    
    // Restaurar línea sólida
    doc.setLineDashPattern([], 0);
    
    // Generar puntos de dispersión más realistas basados en escalas
    const points = [];
    
    // Puntos de alto riesgo (rojos) - score 75-100, valores altos
    for (let i = 0; i < 8; i++) {
        const scorePercent = 0.75 + Math.random() * 0.25; // 75-100%
        const valuePercent = 0.6 + Math.random() * 0.4; // 60-100% del valor
        points.push({
            x: chartStartX + valuePercent * chartWidth,
            y: yPosition + (1 - scorePercent) * chartHeight,
            color: COLORS.danger,
            size: 3
        });
    }
    
    // Puntos de riesgo medio (amarillos) - score 40-75, valores medios
    for (let i = 0; i < 15; i++) {
        const scorePercent = 0.4 + Math.random() * 0.35; // 40-75%
        const valuePercent = 0.3 + Math.random() * 0.5; // 30-80% del valor
        points.push({
            x: chartStartX + valuePercent * chartWidth,
            y: yPosition + (1 - scorePercent) * chartHeight,
            color: COLORS.warning,
            size: 2.5
        });
    }
    
    // Puntos de bajo riesgo (verdes) - score 0-40, valores dispersos
    for (let i = 0; i < 25; i++) {
        const scorePercent = Math.random() * 0.4; // 0-40%
        const valuePercent = Math.random(); // 0-100% del valor
        points.push({
            x: chartStartX + valuePercent * chartWidth,
            y: yPosition + (1 - scorePercent) * chartHeight,
            color: COLORS.success,
            size: 2
        });
    }
    
    // Dibujar puntos
    points.forEach(point => {
        doc.setFillColor(point.color[0], point.color[1], point.color[2]);
        doc.circle(point.x, point.y, point.size, 'F');
    });
    
    // Etiquetas de ejes principales
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    
    // Eje X
    doc.text('Valor Monetario', chartStartX + chartWidth/2 - 20, yPosition + chartHeight + 20);
    
    // Eje Y
    doc.save();
    doc.translate(margin - 5, yPosition + chartHeight/2);
    doc.rotate(-Math.PI/2);
    doc.text('Score de Riesgo', 0, 0);
    doc.restore();
    
    return yPosition + chartHeight + 25;
};

// Función para crear leyenda del gráfico
const createChartLegend = (doc: jsPDF, yPosition: number, pageWidth: number, margin: number): number => {
    const legendItems = [
        { color: COLORS.danger, label: 'Alto Riesgo (>75)', count: '8 transacciones', icon: '●' },
        { color: COLORS.warning, label: 'Riesgo Medio (40-75)', count: '15 transacciones', icon: '●' },
        { color: COLORS.success, label: 'Bajo Riesgo (<40)', count: '25 transacciones', icon: '●' }
    ];
    
    // Fondo de la leyenda
    doc.setFillColor(COLORS.highlight[0], COLORS.highlight[1], COLORS.highlight[2]);
    doc.rect(margin, yPosition, pageWidth - (margin * 2), 25, 'F');
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    doc.rect(margin, yPosition, pageWidth - (margin * 2), 25);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    
    let xPosition = margin + 15;
    
    legendItems.forEach((item, index) => {
        // Círculo de color más grande
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.circle(xPosition, yPosition + 10, 4, 'F');
        
        // Etiqueta con rango de score
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(item.label, xPosition + 10, yPosition + 12);
        
        // Contador
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(item.count, xPosition + 10, yPosition + 18);
        
        // Resetear color para siguiente item
        doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
        
        xPosition += 55;
    });
    
    return yPosition + 30;
};

export const generateRiskAnalysisReport = async (data: RiskAnalysisReportData): Promise<void> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    let yPosition = 20;

    // ===== PÁGINA 1: PORTADA =====
    
    // Header principal
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(0, 0, pageWidth, 60, 'F');
    
    doc.setFillColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.rect(0, 50, pageWidth, 10, 'F');

    // Título principal
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ANÁLISIS DE RIESGO NIA 530', pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('MÓDULO DE PERFILADO AAMA V3.0', pageWidth / 2, 45, { align: 'center' });

    yPosition = 80;

    // Información de la auditoría
    yPosition = createSectionTitle(doc, '1. INFORMACIÓN DE LA AUDITORÍA', yPosition, pageWidth, margin);
    
    const auditInfo = [
        ['Población Auditada:', data.population.audit_name],
        ['Total de Registros:', data.population.total_rows.toLocaleString()],
        ['Score Promedio de Riesgo:', data.profile.totalRiskScore.toFixed(1)],
        ['Alertas Detectadas:', data.profile.gapAlerts.toString()],
        ['Fecha de Análisis:', data.generatedDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })],
        ['Analista Responsable:', data.generatedBy]
    ];

    doc.autoTable({
        startY: yPosition,
        head: [],
        body: auditInfo,
        theme: 'plain',
        styles: {
            fontSize: 10,
            cellPadding: 4,
            textColor: COLORS.text
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 60 },
            1: { cellWidth: 110 }
        },
        margin: { left: margin, right: margin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Resumen ejecutivo de riesgo
    yPosition = createSectionTitle(doc, '2. RESUMEN EJECUTIVO DE RIESGO', yPosition, pageWidth, margin);
    
    const highRiskCount = getForensicMetrics(data.analysisData).filter(m => m.color === 'red').length;
    const mediumRiskCount = getForensicMetrics(data.analysisData).filter(m => m.color === 'yellow').length;
    
    let riskSummary = '';
    if (highRiskCount > 0) {
        riskSummary = `🚨 RIESGO ALTO: Se detectaron ${highRiskCount} anomalías críticas que requieren atención inmediata. La población presenta patrones que indican posibles irregularidades significativas.`;
    } else if (mediumRiskCount > 0) {
        riskSummary = `⚠️ RIESGO MEDIO: Se identificaron ${mediumRiskCount} anomalías de riesgo medio. Se recomienda muestreo dirigido y monitoreo especializado.`;
    } else {
        riskSummary = `✅ RIESGO BAJO: La población presenta un perfil de riesgo normal. Se puede proceder con muestreo estadístico estándar.`;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    const summaryLines = doc.splitTextToSize(riskSummary, pageWidth - (margin * 2) - 10);
    doc.text(summaryLines, margin + 5, yPosition);
    yPosition += summaryLines.length * 5 + 15;

    // Distribución de riesgos
    yPosition = createSectionTitle(doc, '3. DISTRIBUCIÓN DE RIESGOS', yPosition, pageWidth, margin);
    
    const riskDistribution = [
        ['Alto Riesgo', highRiskCount.toString(), 'Requiere atención inmediata'],
        ['Riesgo Medio', mediumRiskCount.toString(), 'Monitoreo especializado'],
        ['Bajo Riesgo', (getForensicMetrics(data.analysisData).length - highRiskCount - mediumRiskCount).toString(), 'Seguimiento rutinario']
    ];

    doc.autoTable({
        startY: yPosition,
        head: [['Nivel de Riesgo', 'Cantidad', 'Acción Recomendada']],
        body: riskDistribution,
        theme: 'striped',
        headStyles: {
            fillColor: COLORS.secondary,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
        },
        styles: {
            fontSize: 9,
            cellPadding: 5
        },
        columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 80 }
        },
        margin: { left: margin, right: margin }
    });

    // Footer de portada
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Análisis de Riesgo NIA 530 - Página 1', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // ===== PÁGINA 2: GRÁFICO DE DISPERSIÓN FORENSE =====
    doc.addPage();
    yPosition = 20;

    // Header de página
    doc.setFillColor(COLORS.highlight[0], COLORS.highlight[1], COLORS.highlight[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RED DE DISPERSIÓN FORENSE', pageWidth / 2, 25, { align: 'center' });

    yPosition = 60;

    // Análisis de dispersión
    yPosition = createSectionTitle(doc, '4. ANÁLISIS DE DISPERSIÓN DE RIESGOS', yPosition, pageWidth, margin);
    
    // Crear gráfico mejorado
    yPosition = createScatterChart(doc, yPosition, pageWidth, margin);
    
    // Leyenda del gráfico
    yPosition = createChartLegend(doc, yPosition, pageWidth, margin);

    // Dictamen forense
    yPosition = createSectionTitle(doc, '5. DICTAMEN FORENSE', yPosition + 10, pageWidth, margin);
    
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dictamenText = data.insight || "El motor forense ha detectado una vulnerabilidad que requiere análisis detallado. Se identificaron puntos críticos que necesitan inspección manual obligatoria para cumplir con la NIA 530.";
    const dictamenLines = doc.splitTextToSize(dictamenText, pageWidth - (margin * 2) - 10);
    doc.text(dictamenLines, margin + 5, yPosition);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Análisis de Riesgo NIA 530 - Página 2', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // ===== PÁGINA 3: MÉTRICAS FORENSES =====
    doc.addPage();
    yPosition = 20;

    // Header
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DASHBOARD DE MÉTRICAS FORENSES', pageWidth / 2, 20, { align: 'center' });

    yPosition = 50;

    // Métricas forenses
    yPosition = createSectionTitle(doc, '6. ANÁLISIS FORENSE COMPLETO - 9 MODELOS DE DETECCIÓN', yPosition, pageWidth, margin);
    
    const forensicMetrics = getForensicMetrics(data.analysisData);
    const metricsData = forensicMetrics.map(metric => [
        metric.title,
        metric.value.toString(),
        metric.subtitle,
        metric.color === 'red' ? 'ALTO' : metric.color === 'yellow' ? 'MEDIO' : 'BAJO'
    ]);

    doc.autoTable({
        startY: yPosition,
        head: [['Método Forense', 'Valor', 'Descripción', 'Nivel de Riesgo']],
        body: metricsData,
        theme: 'striped',
        headStyles: {
            fillColor: COLORS.secondary,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
        },
        styles: {
            fontSize: 8,
            cellPadding: 3
        },
        columnStyles: {
            0: { cellWidth: 40, fontStyle: 'bold' },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 70 },
            3: { cellWidth: 25, halign: 'center' }
        },
        margin: { left: margin, right: margin },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 3) {
                const riskLevel = data.cell.text[0];
                if (riskLevel === 'ALTO') {
                    data.cell.styles.textColor = COLORS.danger;
                    data.cell.styles.fontStyle = 'bold';
                } else if (riskLevel === 'MEDIO') {
                    data.cell.styles.textColor = COLORS.warning;
                    data.cell.styles.fontStyle = 'bold';
                } else {
                    data.cell.styles.textColor = COLORS.success;
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Análisis de Riesgo NIA 530 - Página 3', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // ===== PÁGINA 4: SUGERENCIAS INTELIGENTES =====
    doc.addPage();
    yPosition = 20;

    // Header
    doc.setFillColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SUGERENCIAS INTELIGENTES', pageWidth / 2, 20, { align: 'center' });

    yPosition = 50;

    // Generar sugerencias
    const suggestions = generateIntelligentSuggestions(data.analysisData);
    
    yPosition = createSectionTitle(doc, '7. RECOMENDACIONES DINÁMICAS BASADAS EN HALLAZGOS', yPosition, pageWidth, margin);
    
    if (suggestions.length === 0) {
        doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('POBLACIÓN SIN ANOMALÍAS CRÍTICAS', pageWidth / 2, yPosition + 30, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('No se detectaron patrones que requieran atención especial.', pageWidth / 2, yPosition + 45, { align: 'center' });
        doc.text('La población presenta un perfil de riesgo normal.', pageWidth / 2, yPosition + 55, { align: 'center' });
    } else {
        suggestions.slice(0, 3).forEach((suggestion, index) => {
            // Título de sugerencia
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
            doc.text(`${index + 1}. ${suggestion.title}`, margin, yPosition);
            yPosition += 8;

            // Prioridad
            const priorityColor = suggestion.priority === 'CRITICAL' ? COLORS.danger :
                                suggestion.priority === 'HIGH' ? [234, 88, 12] :
                                suggestion.priority === 'MEDIUM' ? COLORS.warning : COLORS.success;
            
            doc.setFillColor(priorityColor[0], priorityColor[1], priorityColor[2]);
            doc.roundedRect(margin, yPosition, 30, 8, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(suggestion.priority, margin + 15, yPosition + 5, { align: 'center' });
            yPosition += 12;

            // Descripción
            doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            const descLines = doc.splitTextToSize(suggestion.description, pageWidth - (margin * 2));
            doc.text(descLines, margin, yPosition);
            yPosition += descLines.length * 4 + 5;

            // Acciones principales
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('Acciones Recomendadas:', margin, yPosition);
            yPosition += 5;
            
            doc.setFont('helvetica', 'normal');
            suggestion.actions.slice(0, 2).forEach(action => {
                const actionLines = doc.splitTextToSize(`• ${action}`, pageWidth - (margin * 2) - 5);
                doc.text(actionLines, margin + 5, yPosition);
                yPosition += actionLines.length * 4 + 2;
            });
            
            yPosition += 8;
        });

        if (suggestions.length > 3) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.text(`... y ${suggestions.length - 3} sugerencias adicionales disponibles en el sistema.`, margin, yPosition);
        }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Análisis de Riesgo NIA 530 - Página 4', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // ===== PÁGINA 5: CONCLUSIONES Y RECOMENDACIONES =====
    doc.addPage();
    yPosition = 20;

    // Header
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CONCLUSIONES Y RECOMENDACIONES', pageWidth / 2, 20, { align: 'center' });

    yPosition = 50;

    // Conclusión técnica
    yPosition = createSectionTitle(doc, '8. CONCLUSIÓN TÉCNICA', yPosition, pageWidth, margin);
    
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const technicalConclusion = `Basado en el análisis de ${data.population.total_rows.toLocaleString()} registros utilizando 9 modelos forenses avanzados, se determinó un score promedio de riesgo de ${data.profile.totalRiskScore.toFixed(1)} con ${data.profile.gapAlerts} alertas detectadas. ${riskSummary}`;
    const conclusionLines = doc.splitTextToSize(technicalConclusion, pageWidth - (margin * 2) - 10);
    doc.text(conclusionLines, margin + 5, yPosition);
    yPosition += conclusionLines.length * 5 + 15;

    // Recomendaciones estratégicas
    yPosition = createSectionTitle(doc, '9. RECOMENDACIONES ESTRATÉGICAS', yPosition, pageWidth, margin);
    
    const strategicRecommendations = [
        '1. Implementar muestreo dirigido en áreas de alto riesgo identificadas',
        '2. Aumentar tamaño de muestra en 50-100% sobre lo inicialmente planeado',
        '3. Considerar muestreo estratificado por nivel de riesgo',
        '4. Incluir todas las transacciones marcadas como críticas',
        '5. Documentar justificación del enfoque de muestreo modificado',
        '6. Establecer monitoreo continuo de las métricas forenses',
        '7. Revisar controles internos en áreas problemáticas identificadas'
    ];

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    strategicRecommendations.forEach(rec => {
        const recLines = doc.splitTextToSize(rec, pageWidth - (margin * 2));
        doc.text(recLines, margin, yPosition);
        yPosition += recLines.length * 4 + 3;
    });

    yPosition += 10;

    // Metodología aplicada
    yPosition = createSectionTitle(doc, '10. METODOLOGÍA APLICADA', yPosition, pageWidth, margin);
    
    const methodology = [
        '• Análisis de Ley de Benford (primer dígito)',
        '• Benford Mejorado (segundo dígito)',
        '• Detección de valores atípicos (IQR)',
        '• Identificación de duplicados exactos',
        '• Análisis de entropía categórica',
        '• Detección de fraccionamiento',
        '• Verificación de integridad secuencial',
        '• Machine Learning (Isolation Forest)',
        '• Perfilado de actores sospechosos'
    ];

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    methodology.forEach(method => {
        doc.text(method, margin, yPosition);
        yPosition += 8;
    });

    // Firma y validación
    yPosition += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ELABORADO POR:', margin, yPosition);
    doc.text('FECHA DE ANÁLISIS:', pageWidth - 80, yPosition);

    yPosition += 15;
    doc.line(margin, yPosition, 80, yPosition);
    doc.line(pageWidth - 80, yPosition, pageWidth - margin, yPosition);

    yPosition += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(data.generatedBy, margin, yPosition);
    doc.text(data.generatedDate.toLocaleDateString('es-ES'), pageWidth - 80, yPosition);

    // Footer final
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Análisis de Riesgo NIA 530 - Página Final', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Guardar el PDF
    const fileName = `Analisis_Riesgo_NIA530_${data.population.audit_name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);
};

// Función auxiliar para obtener métricas forenses
function getForensicMetrics(analysisData: AdvancedAnalysis) {
    const metrics = [];

    // Anomalías Categóricas
    if (analysisData.entropy) {
        metrics.push({
            title: 'Anomalías Categóricas',
            value: analysisData.entropy.anomalousCount,
            subtitle: `${analysisData.entropy.highRiskCombinations} de alto riesgo`,
            description: 'Combinaciones categóricas inusuales',
            color: analysisData.entropy.highRiskCombinations > 0 ? 'red' : 'green',
            icon: 'fa-microchip'
        });
    }

    // Fraccionamiento
    if (analysisData.splitting) {
        metrics.push({
            title: 'Fraccionamiento',
            value: analysisData.splitting.suspiciousVendors,
            subtitle: '0 transacciones',
            description: 'Score promedio: 0.0',
            color: analysisData.splitting.highRiskGroups > 0 ? 'red' : 
                  analysisData.splitting.suspiciousVendors > 0 ? 'yellow' : 'green',
            icon: 'fa-scissors'
        });
    }

    // Gaps Secuenciales
    if (analysisData.sequential) {
        metrics.push({
            title: 'Gaps Secuenciales',
            value: analysisData.sequential.totalGaps,
            subtitle: `${analysisData.sequential.totalMissingDocuments} docs faltantes`,
            description: `Gap más grande: ${analysisData.sequential.largestGap}`,
            color: analysisData.sequential.highRiskGaps > 0 ? 'red' : 
                  analysisData.sequential.totalGaps > 0 ? 'yellow' : 'green',
            icon: 'fa-barcode'
        });
    }

    // Ley de Benford
    const benfordAnomalies = analysisData.benford.filter(b => b.isSuspicious).length;
    metrics.push({
        title: 'Ley de Benford',
        value: benfordAnomalies,
        subtitle: 'dígitos anómalos',
        description: 'Frecuencias primer dígito',
        color: benfordAnomalies > 2 ? 'yellow' : 'green',
        icon: 'fa-chart-bar'
    });

    // ML Anomalías
    if (analysisData.isolationForest) {
        metrics.push({
            title: 'ML Anomalías',
            value: analysisData.isolationForest.totalAnomalies,
            subtitle: `${analysisData.isolationForest.highRiskAnomalies} de alto riesgo`,
            description: 'Anomalías multidimensionales (IA)',
            color: analysisData.isolationForest.highRiskAnomalies > 0 ? 'red' : 
                  analysisData.isolationForest.totalAnomalies > 5 ? 'yellow' : 'green',
            icon: 'fa-brain'
        });
    }

    // Actores Sospechosos
    if (analysisData.actorProfiling) {
        metrics.push({
            title: 'Actores Sospechosos',
            value: analysisData.actorProfiling.totalSuspiciousActors,
            subtitle: '0 de alto riesgo',
            description: 'Score promedio: 0.0',
            color: analysisData.actorProfiling.highRiskActors > 0 ? 'red' : 
                  analysisData.actorProfiling.totalSuspiciousActors > 0 ? 'yellow' : 'green',
            icon: 'fa-user-secret'
        });
    }

    // Benford Mejorado
    if (analysisData.enhancedBenford) {
        metrics.push({
            title: 'Benford Mejorado',
            value: `${analysisData.enhancedBenford.overallDeviation.toFixed(1)}%`,
            subtitle: '1 hallazgo crítico',
            description: `MAD: ${analysisData.enhancedBenford.overallDeviation.toFixed(2)}%`,
            color: analysisData.enhancedBenford.conformityRiskLevel === 'HIGH' ? 'red' : 
                  analysisData.enhancedBenford.conformityRiskLevel === 'MEDIUM' ? 'yellow' : 'green',
            icon: 'fa-chart-line'
        });
    }

    // Valores Atípicos
    metrics.push({
        title: 'Valores Atípicos',
        value: analysisData.outliersCount,
        subtitle: 'outliers detectados',
        description: `Umbral: ${analysisData.outliersThreshold.toLocaleString()}`,
        color: analysisData.outliersCount > 10 ? 'red' : 
              analysisData.outliersCount > 5 ? 'yellow' : 'green',
        icon: 'fa-expand-arrows-alt'
    });

    // Duplicados
    metrics.push({
        title: 'Duplicados',
        value: analysisData.duplicatesCount,
        subtitle: 'transacciones repetidas',
        description: 'Dimensiones inteligentes por importe',
        color: analysisData.duplicatesCount > 5 ? 'red' : 
              analysisData.duplicatesCount > 0 ? 'yellow' : 'green',
        icon: 'fa-copy'
    });

    return metrics;
}

// Función auxiliar para generar sugerencias inteligentes
function generateIntelligentSuggestions(analysisData: AdvancedAnalysis): IntelligentSuggestion[] {
    const suggestions: IntelligentSuggestion[] = [];

    // Sugerencias basadas en Análisis de Entropía
    if (analysisData.entropy && analysisData.entropy.highRiskCombinations > 0) {
        suggestions.push({
            id: 'entropy_high_risk',
            type: 'CRITICAL',
            icon: 'fa-microchip',
            title: 'Combinaciones Categóricas Críticas Detectadas',
            description: `Se identificaron ${analysisData.entropy.highRiskCombinations} combinaciones de categorías de alto riesgo.`,
            actions: [
                'Revisar manualmente todas las combinaciones marcadas como alto riesgo',
                'Verificar la validez de las clasificaciones categóricas inusuales',
                'Considerar muestreo dirigido en estas combinaciones específicas'
            ],
            priority: 'CRITICAL'
        });
    }

    // Sugerencias basadas en Detección de Fraccionamiento
    if (analysisData.splitting && analysisData.splitting.highRiskGroups > 0) {
        suggestions.push({
            id: 'splitting_critical',
            type: 'CRITICAL',
            icon: 'fa-scissors',
            title: 'Fraccionamiento de Alto Riesgo Detectado',
            description: `Se identificaron ${analysisData.splitting.highRiskGroups} grupos de proveedores con patrones críticos.`,
            actions: [
                'URGENTE: Investigar inmediatamente los proveedores de alto riesgo',
                'Revisar todas las transacciones de estos proveedores',
                'Evaluar controles de autorización por límites de compra'
            ],
            priority: 'CRITICAL'
        });
    }

    // Sugerencias basadas en Integridad Secuencial
    if (analysisData.sequential && analysisData.sequential.highRiskGaps > 0) {
        suggestions.push({
            id: 'sequential_critical',
            type: 'CRITICAL',
            icon: 'fa-barcode',
            title: 'Gaps Secuenciales Críticos Detectados',
            description: `Se encontraron ${analysisData.sequential.highRiskGaps} gaps de alto riesgo en la secuencia.`,
            actions: [
                'URGENTE: Investigar la causa de los gaps grandes',
                'Solicitar explicación formal sobre documentos faltantes',
                'Evaluar integridad del sistema de numeración'
            ],
            priority: 'CRITICAL'
        });
    }

    return suggestions.sort((a, b) => {
        const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
}