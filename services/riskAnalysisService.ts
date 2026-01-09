import { AuditPopulation, RiskProfile, AdvancedAnalysis } from '../types';

/**
 * Motor de Inteligencia Forense Multi-Variable (MA-Risk Engine v2.0)
 * Ejecuta N pruebas y consolida un Score de Riesgo Ponderado.
 */
export const performRiskProfiling = (rows: any[], pop: AuditPopulation): { updatedRows: any[], profile: RiskProfile, advancedAnalysis: AdvancedAnalysis } => {
    const { category, subcategory, monetaryValue, uniqueId, user, vendor, date, timestamp, sequentialId } = pop.column_mapping || {};
    // Fix: access forensicDiscovery as string array of IDs
    const activeTests = pop.advanced_analysis?.forensicDiscovery || [];

    const total = rows.length;

    // 1. PRE-PROCESAMIENTO: Mapas de Frecuencia y Medias para detección de anomalías
    const catFreq: Record<string, number> = {};
    const userStats: Record<string, { sum: number, count: number }> = {};
    const vendorStats: Record<string, { sum: number, count: number }> = {};

    rows.forEach(r => {
        const raw = r.raw_json || {};
        const c = String(raw[category || ''] || 'N/A');
        const u = String(raw[user || ''] || 'N/A');
        const v = String(raw[vendor || ''] || 'N/A');
        const m = parseFloat(String(raw[monetaryValue || '']).replace(/[^0-9.-]+/g, "")) || 0;

        catFreq[c] = (catFreq[c] || 0) + 1;

        if (!userStats[u]) userStats[u] = { sum: 0, count: 0 };
        userStats[u].sum += m;
        userStats[u].count += 1;

        if (!vendorStats[v]) vendorStats[v] = { sum: 0, count: 0 };
        vendorStats[v].sum += m;
        vendorStats[v].count += 1;
    });

    // 2. EJECUCIÓN DE PRUEBAS CRUZADAS POR REGISTRO
    const updatedRows = rows.map(r => {
        let score = 0;
        const factors: string[] = [];
        const raw = r.raw_json || {};
        const m = parseFloat(String(raw[monetaryValue || '']).replace(/[^0-9.-]+/g, "")) || 0;

        // Fix: activeTests.includes('entropy') is now valid as activeTests is string[]
        // --- PRUEBA 1: ENTROPÍA (Categoría vs Subcategoría Inusual) ---
        if (activeTests.includes('entropy') && category && subcategory) {
            const prob = catFreq[String(raw[category])] / total;
            if (prob < 0.03) {
                score += 25;
                factors.push(`Frecuencia Baja (${(prob * 100).toFixed(2)}%): El segmento [${raw[category]}] es estadísticamente inusual en esta población.`);
            }
        }

        // Fix: activeTests.includes('timestamps') is now valid as activeTests is string[]
        // --- PRUEBA 2: HORARIOS SOSPECHOSOS (Timestamps) ---
        if (activeTests.includes('timestamps') && timestamp) {
            const dt = new Date(raw[timestamp]);
            const hour = dt.getHours();
            const day = dt.getDay(); // 0: Domingo, 6: Sábado
            const isWeekend = day === 0 || day === 6;
            if (isWeekend || hour < 7 || hour > 19) {
                score += 20;
                factors.push(`Fuera de Horario (${hour}h, ${isWeekend ? 'Fin de semana' : 'Día laboral'}): Registro creado en ventana de tiempo no estándar.`);
            }
        }

        // Fix: activeTests.includes('splitting') is now valid as activeTests is string[]
        // --- PRUEBA 3: FRACCIONAMIENTO (Splitting) ---
        if (activeTests.includes('splitting') && vendor && monetaryValue) {
            // Un monto "justo debajo" de un número redondo (ej: 990, 4950)
            const rem1000 = m % 1000;
            const rem5000 = m % 5000;
            if (m > 0 && (rem1000 >= 980 || rem5000 >= 4900)) {
                score += 30;
                factors.push(`Proximidad de Umbral ($${m.toLocaleString()}): Monto crítico detectado cerca de límite de redondeo.`);
            }
        }

        // Fix: activeTests.includes('actors') is now valid as activeTests is string[]
        // --- PRUEBA 4: PERFILADO DE ACTORES (User Risk) ---
        if (activeTests.includes('actors') && user) {
            const uData = userStats[String(raw[user])];
            const avg = uData.sum / uData.count;
            if (m > avg * 3 && uData.count > 5) {
                score += 35;
                factors.push(`Desviación de Actor ($${m.toLocaleString()} vs Promedio $${avg.toLocaleString()}): Monto excede 3x el histórico del usuario.`);
            }
        }

        // Fix: activeTests.includes('gaps') is now valid as activeTests is string[]
        // --- PRUEBA 5: GAPS SECUENCIALES ---
        // (Simulada para este batch, requiere ordenamiento previo para ser exacta)
        if (activeTests.includes('gaps') && sequentialId) {
            const seq = parseInt(String(raw[sequentialId]).replace(/\D/g, ''));
            if (isNaN(seq)) {
                score += 10;
                // Add test ID to factor for later scoring identification
                factors.push("ID No Secuencial Detectado (gaps)");
            }
        }

        // Fix: activeTests.includes('isolation') is now valid as activeTests is string[]
        // --- PRUEBA 6: ISOLATION (Outliers Monetarios) ---
        if (activeTests.includes('isolation')) {
            if (m < 0) { score += 50; factors.push("Valor Negativo Crítico (isolation)"); }
            if (m === 0) { score += 15; factors.push("Registro en Cero (isolation)"); }
        }

        return {
            ...r,
            risk_score: Math.min(100, score),
            risk_factors: factors,
            alert_count: factors.length // Para el gráfico de dispersión
        };
    });

    // 3. PERFIL AGREGADO
    const ranges = [
        { range: 'Bajo (0-20)', count: 0 },
        { range: 'Medio (21-50)', count: 0 },
        { range: 'Alto (51-80)', count: 0 },
        { range: 'Crítico (81+)', count: 0 }
    ];

    updatedRows.forEach(r => {
        if (r.risk_score <= 20) ranges[0].count++;
        else if (r.risk_score <= 50) ranges[1].count++;
        else if (r.risk_score <= 80) ranges[2].count++;
        else ranges[3].count++;
    });

    // 4. STATS FOR AI RECOMMENDATION & EDA
    let negativesSum = 0;
    let positivesSum = 0;
    let negativesCount = 0;
    let positivesCount = 0;
    let zerosCount = 0;
    let outliersCount = 0;
    let errorDataCount = 0;
    let correctDataCount = 0;
    let absSum = 0;

    // New stats
    let minDate = new Date(8640000000000000);
    let maxDate = new Date(-8640000000000000);
    let weekendCount = 0;
    let charLengths: number[] = [];
    let blankCount = 0;
    const uniqueChars = new Set<string>();

    let minValue = Infinity;
    let maxValue = -Infinity;
    let minId: string | number | undefined;
    let maxId: string | number | undefined;

    const values: number[] = [];
    const textField = category || subcategory || vendor || user;
    const dateField = date || timestamp;

    updatedRows.forEach(r => {
        const raw = r.raw_json || {};
        // Robust parsing: Handle possible numeric values directly or formatted strings
        let valRaw = raw[monetaryValue || ''];
        let m = 0;

        if (typeof valRaw === 'number') {
            m = valRaw;
        } else {
            const valStr = String(valRaw || '');
            // Remove everything except numbers, dots and minus sign
            m = parseFloat(valStr.replace(/[^0-9.-]+/g, ""));
        }

        if (isNaN(m)) {
            errorDataCount++;
            m = 0; // Treat as 0 for safeguard in other stats if needed, or skip
        } else {
            correctDataCount++;
            absSum += Math.abs(m);
            values.push(m);

            if (m < minValue) { minValue = m; minId = r.unique_id_col; }
            if (m > maxValue) { maxValue = m; maxId = r.unique_id_col; }

            if (m < 0) {
                negativesCount++;
                negativesSum += m;
            } else if (m > 0) {
                positivesCount++;
                positivesSum += m;
            } else if (monetaryValue) {
                zerosCount++;
            }

            if (r.risk_score > 80) outliersCount++;
        }

        // Date Stats
        if (dateField && raw[dateField]) {
            const d = new Date(raw[dateField]);
            if (!isNaN(d.getTime())) {
                if (d < minDate) minDate = d;
                if (d > maxDate) maxDate = d;
                const day = d.getDay();
                if (day === 0 || day === 6) weekendCount++;
            }
        }

        // Char Stats (Using first available text field from mapping)
        if (textField && raw[textField] !== undefined) {
            const val = String(raw[textField]);
            if (!val || val.trim() === '') blankCount++;
            else {
                uniqueChars.add(val);
                charLengths.push(val.length);
            }
        }
    });

    // Momentos estadísticos
    const n = values.length;
    const mean = n > 0 ? values.reduce((a, b) => a + b, 0) / n : 0;

    let sumSqDiff = 0;
    let sumCubDiff = 0;
    let sumQuadDiff = 0;

    values.forEach(v => {
        const diff = v - mean;
        sumSqDiff += Math.pow(diff, 2);
        sumCubDiff += Math.pow(diff, 3);
        sumQuadDiff += Math.pow(diff, 4);
    });

    const varianceSample = n > 1 ? sumSqDiff / (n - 1) : 0;
    const stdDevSample = Math.sqrt(varianceSample);

    const variancePop = n > 0 ? sumSqDiff / n : 0;
    const stdDevPop = Math.sqrt(variancePop);

    // Skewness (Asimetría) y Kurtosis (Curtosis)
    let skewness = 0;
    let kurtosis = 0;

    if (n > 2 && stdDevSample > 0) {
        // Sample Skewness
        skewness = (n / ((n - 1) * (n - 2))) * (sumCubDiff / Math.pow(stdDevSample, 3));
    }
    if (n > 3 && stdDevSample > 0) {
        // Sample Excess Kurtosis
        const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
        const term2 = sumQuadDiff / Math.pow(stdDevSample, 4);
        const term3 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
        kurtosis = term1 * term2 - term3;
    }

    // RSF Calculation
    const sortedValues = [...values].sort((a, b) => b - a);
    const topValue = sortedValues[0] || 0;
    const secondTopValue = sortedValues[1] || 0;
    const rsfVal = secondTopValue !== 0 ? topValue / secondTopValue : 0;

    const duplicatesCount = category ? Object.keys(catFreq).length : -1;

    const dateStats = (dateField && minDate.getTime() !== 8640000000000000) ? {
        earliest: minDate.toISOString().split('T')[0],
        latest: maxDate.toISOString().split('T')[0],
        weekendCount,
        holidayCount: 0, // Placeholder
        daysGap: Math.ceil(Math.abs(maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    } : undefined;

    const charStats = textField ? {
        blankCount,
        uniqueCount: uniqueChars.size,
        avgLength: charLengths.length > 0 ? charLengths.reduce((a, b) => a + b, 0) / charLengths.length : 0,
        maxLength: charLengths.length > 0 ? Math.max(...charLengths) : 0
    } : undefined;

    const rsf = {
        topValue,
        secondTopValue,
        rsf: rsfVal,
        topId: maxId || 'N/A'
    };

    const eda = {
        totalRecords: n,
        netValue: values.reduce((a, b) => a + b, 0),
        absoluteValue: absSum,
        zerosCount,
        positiveValue: positivesSum,
        negativeValue: negativesSum,
        positiveCount: positivesCount,
        negativeCount: negativesCount,
        errorDataCount,
        correctDataCount,
        meanValue: mean,
        minValue: minValue === Infinity ? 0 : minValue,
        maxValue: maxValue === -Infinity ? 0 : maxValue,
        minId,
        maxId,
        sampleStdDev: stdDevSample,
        sampleVariance: varianceSample,
        populationStdDev: stdDevPop,
        populationVariance: variancePop,
        skewness,
        kurtosis,
        dateStats,
        charStats,
        rsf
    };

    const advancedAnalysis: AdvancedAnalysis = {
        benford: pop.advanced_analysis?.benford || [],
        outliersCount,
        outliersThreshold: 0,
        duplicatesCount,
        zerosCount,
        negativesCount,
        roundNumbersCount: 0,
        forensicDiscovery: activeTests,
        eda
    };

    return {
        updatedRows,
        profile: {
            totalRiskScore: updatedRows.reduce((a, b) => a + b.risk_score, 0) / total,
            riskDistribution: ranges,
            // Fix: activeTests is now string[], so name: t matches string requirement and t.toLowerCase() is valid
            topRiskCategories: activeTests.map((t: string) => ({ name: t, score: updatedRows.filter(r => r.risk_factors.some((f: string) => f.toLowerCase().includes(t.toLowerCase()))).length, alert: 'INFO' as const })),
            gapAlerts: updatedRows.filter(r => r.risk_score > 70).length
        },
        advancedAnalysis
    };
};
