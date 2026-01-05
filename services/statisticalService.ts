import { AppState, AuditResults, SamplingMethod, AuditSampleItem, AuditDataRow, PilotMetrics } from '../types';
import { RISK_MESSAGES, METHODOLOGY_NOTES } from '../constants';

export const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2
    }).format(amount);
};

// Constants for Linear Congruential Generator (LCG)
const LCG_MULTIPLIER = 9301;
const LCG_INCREMENT = 49297;
const LCG_MODULUS = 233280;

// Helper local para generar ítems
// Helper local para selección sistemática (Intervalo Constante)
const selectItems = (
    count: number,
    seed: number,
    realRows: AuditDataRow[],
    logicCallback: (i: number, row?: AuditDataRow) => Partial<AuditSampleItem>
): AuditSampleItem[] => {

    const hasRealData = realRows && realRows.length > 0;
    const selectedItems: AuditSampleItem[] = [];

    if (hasRealData) {
        const N = realRows.length;
        const step = count > 0 ? N / count : 1;

        // Determinar un punto de inicio aleatorio basado en la semilla (reproducible)
        // El inicio debe estar entre 0 y el primer intervalo (step)
        // Usamos una lógica determinista simple con la semilla
        const startOffset = (seed * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;
        const normalizedStart = (startOffset / LCG_MODULUS) * Math.min(step, N - 1);

        for (let i = 0; i < count; i++) {
            // formula: start + i * step
            const index = Math.min(Math.floor(normalizedStart + i * step), N - 1);
            const row = realRows[index];

            const item: AuditSampleItem = {
                id: String(row.unique_id_col || `ROW-${index}`),
                value: row.monetary_value_col || 0,
                raw_row: row.raw_json,
                risk_score: 0,
                compliance_status: 'OK',
                ...logicCallback(i, row)
            };
            selectedItems.push(item);
        }

    } else {
        // Fallback for simulation/no-data
        for (let i = 0; i < count; i++) {
            const currentIdx = i + 1;
            const item: AuditSampleItem = {
                id: `TRANS-${seed + currentIdx}`,
                value: Math.floor(Math.random() * 15000) + 100,
                risk_score: 0,
                compliance_status: 'OK',
                ...logicCallback(i)
            };
            selectedItems.push(item);
        }
    }

    return selectedItems;
};



export const calculateStopOrGoExpansion = (
    currentSize: number,
    errorsFound: number,
    NC: number,
    ET: number
): { recommendedExpansion: number; justification: string; newTotal: number; formula: string } => {
    const formula = "n = (Factor_Confianza × 100) / (Error_Tolerable - Error_Previsto)";

    if (errorsFound === 0) {
        return {
            recommendedExpansion: 0,
            justification: "No se detectaron desviaciones. El procedimiento Stop-or-Go permite concluir sin ampliar la muestra.",
            newTotal: currentSize,
            formula
        };
    }

    const rFactor = NC >= 95 ? 3.0 : 2.31;
    const fullSampleSize = Math.ceil((rFactor * 100) / ET);
    const expansion = Math.max(0, fullSampleSize - currentSize);

    return {
        recommendedExpansion: expansion,
        justification: `Se detectaron ${errorsFound} desviaciones. Se requiere ampliar la muestra a ${fullSampleSize} registros para validar el control con un NC del ${NC}%.`,
        newTotal: fullSampleSize,
        formula
    };
};

export const calculateVariableExpansion = (
    appState: AppState,
    currentResults: AuditResults,
    errorsFound: number,
    totalPilotValue: number,
    totalRows: number = Infinity
): { recommendedExpansion: number; justification: string; newTotal: number; formula: string } => {

    const { samplingMethod, samplingParams } = appState;
    let newTotal = currentResults.sampleSize;
    let justification = "";
    let formula = "n = (N × Z² × σ²) / E²";

    if (samplingMethod === SamplingMethod.MUS) {
        const mus = samplingParams.mus;
        const confidenceFactor = mus.RIA <= 5 ? 3.0 : 2.31; // Factor de Confianza (Z)

        // n = (Valor Monetario Total * Factor Confianza) / (Error Tolerable - (Error Esperado * Factor Ajuste))
        // Ajuste por errores encontrados: penalización en denominador reduce intervalo -> aumenta muestra
        const errorAdjustment = errorsFound * 0.5; // Factor empírico de penalización
        const effectiveTe = mus.TE / (1 + (errorsFound * 0.1)); // Reducción simulada del TE ante hallazgos

        // Cálculo estándar MUS:
        // n = (V * RF) / (TE - (EE * ExpansionFactor)) - Simplificado a Intervalo

        const samplingInterval = mus.TE / (confidenceFactor + (errorsFound * 0.5));
        const calculatedTotal = Math.ceil(mus.V / samplingInterval);

        // User requesting theoretical calculation (uncapped)
        newTotal = calculatedTotal;

        formula = `n = (${formatMoney(mus.V)} / ${formatMoney(samplingInterval)}) = ${calculatedTotal}`;

        // if (calculatedTotal > totalRows) {
        //     // formula += ` (Teórico > Universo)`; // Optional: Keep clean as per request
        // }

        if (errorsFound === 0) {
            if (calculatedTotal > totalRows) {
                justification = `Nota Técnica: El método MUS selecciona $1 por cada intervalo, resultando en ${calculatedTotal} "Unidades Monetarias" a auditar. Como estos pesos están distribuidos en sus ${totalRows} registros físicos, y la muestra de pesos excede la cantidad de documentos, se requiere un CENSO (auditar los ${totalRows} documentos disponibles).`;
            } else {
                justification = `Fase Piloto Exitosa. Proyección limpia sugiere completar muestra hasta ${newTotal} registros para cubrimiento total.`;
            }
        } else {
            if (calculatedTotal > totalRows) {
                justification = `Debido a los hallazgos (${errorsFound}) y el riesgo asociado, el modelo exige ${calculatedTotal} puntos monetarios. Esto cubre el 100% de la población física disponible (${totalRows} registros).`;
            } else {
                justification = `Hallazgos detectados (${errorsFound}). Se ajusta el intervalo de muestreo por riesgo, requiriendo aumentar la muestra a ${newTotal}.`;
            }
        }
    } else if (samplingMethod === SamplingMethod.NonStatistical) {
        // Lógica No Estadística: Regla de Juicio Profesional (NIA 530)
        // Ante hallazgos, expandir un % o n items fijos (ej. +50% o +10 items)
        const expansionFactor = 0.5; // 50% de incremento
        const minExpansion = 10;
        const suggestedExpansion = Math.max(minExpansion, Math.ceil(currentResults.sampleSize * expansionFactor));

        newTotal = currentResults.sampleSize + suggestedExpansion;
        formula = `n' = n + max(${minExpansion}, n × ${expansionFactor})`;
        justification = `Se detectaron ${errorsFound} hallazgos en la muestra dirigida. Bajo juicio profesional (NIA 530), se recomienda una expansión del 50% (+${suggestedExpansion} ítems) para evaluar si las debilidades son sistemáticas.`;

        if (newTotal > totalRows) newTotal = totalRows;
    }
    else if (samplingMethod === SamplingMethod.CAV) {
        const cav = samplingParams.cav;
        const pilotSigma = (currentResults.pilotMetrics?.type === 'CAV_PILOT' ? currentResults.pilotMetrics.calibratedSigma : undefined) || cav.sigma;
        const N = totalRows || 1000;
        const NC = cav.NC || 95;
        const Z = NC === 99 ? 2.576 : NC === 95 ? 1.96 : 1.645;
        const TE = cav.TE || 50000;

        const adjustmentFactor = 1 + (errorsFound * 0.2);
        const calculatedTotal = Math.ceil(Math.pow((N * Z * pilotSigma * adjustmentFactor) / TE, 2));

        newTotal = calculatedTotal;

        justification = errorsFound === 0
            ? `Calibración Sigma completada. Tamaño definitivo ajustado a ${newTotal}.`
            : `Variabilidad detectada. Muestra recalibrada a ${newTotal} items.`;
    }

    const expansion = Math.max(0, newTotal - currentResults.sampleSize);
    return { recommendedExpansion: expansion, justification, newTotal, formula };
};

export const calculateCustomFormula = (
    confidenceLevel: number,
    totalPopulation: number, // Count (N) or Value (V) based on interpretation
    tolerableError: number
): { n: number; formula: string; details: string } => {
    // Formula: n = (Z^2 * (1 - Confidence) * N) / TE^2
    const Z = confidenceLevel >= 99 ? 2.58 : confidenceLevel >= 95 ? 1.96 : 1.645;
    const alpha = 1 - (confidenceLevel / 100);
    const num = Math.pow(Z, 2) * alpha * totalPopulation;
    const den = Math.pow(tolerableError, 2);

    // Safety check for den=0
    if (den === 0) return { n: 0, formula: "Error: TE es 0", details: "División por cero" };

    const rawN = num / den;
    const n = Math.ceil(rawN);

    const formulaStr = `n = (${Z}^2 * ${alpha.toFixed(2)} * ${totalPopulation}) / ${tolerableError}^2 = ${Math.ceil(rawN)}`;

    return {
        n,
        formula: formulaStr,
        details: `Cálculo basado en fórmula de usuario: ROUNDUP((Z^2 * (1-Conf) * Pob) / TE^2)`
    };
};

export const expandAuditSample = (
    currentResults: AuditResults,
    additionalSize: number,
    seed: number,
    realRows: AuditDataRow[] = []
): AuditResults => {
    const newItems = selectItems(additionalSize, seed + 888, realRows, () => ({
        risk_flag: RISK_MESSAGES.TECH_EXPANSION,
        risk_justification: RISK_MESSAGES.TECH_EXPANSION_JUSTIFICATION
    }));

    return {
        ...currentResults,
        sampleSize: currentResults.sampleSize + additionalSize,
        sample: [...currentResults.sample, ...newItems],
        methodologyNotes: [...(currentResults.methodologyNotes || []), `Muestra completada con ${additionalSize} ítems adicionales para alcanzar representatividad estadística.`]
    };
};

export const calculateSampleSize = (appState: AppState, realRows: AuditDataRow[] = []): AuditResults => {
    const { samplingMethod, samplingParams } = appState;
    let sampleSize = 0;
    const methodologyNotes: string[] = [];
    const seed = appState.generalParams.seed;
    let sample: AuditSampleItem[] = [];
    let pilotMetrics: PilotMetrics | null = null;

    switch (samplingMethod) {
        case SamplingMethod.Attribute:
            const attr = samplingParams.attribute;
            if (attr.useSequential) {
                sampleSize = 25;
                methodologyNotes.push(METHODOLOGY_NOTES.STOP_OR_GO);
                sample = selectItems(sampleSize, seed, realRows, () => ({ is_pilot_item: true, risk_flag: RISK_MESSAGES.PILOT_PHASE }));
                pilotMetrics = { type: 'ATTR_PILOT', phase: 'PILOT_ONLY', initialSize: 25 };
            } else {
                // Factores R exactos según guía metodológica de usuario
                let rFactorAttr = 2.3; // Default (90-94%)
                if (attr.NC >= 99) rFactorAttr = 4.6;
                else if (attr.NC >= 95) rFactorAttr = 3.0;

                // Fórmula: (R * 100) / (ET - PE) (Manteniendo ajuste de PE estándar)
                sampleSize = Math.ceil((rFactorAttr * 100) / (attr.ET - attr.PE));
                sample = selectItems(sampleSize, seed, realRows, () => ({}));
            }
            break;

        case SamplingMethod.MUS:
            const mus = samplingParams.mus;

            // PIPELINE NIA 530 - ETAPA A: Tratamiento de Negativos
            let processedRows = [...realRows];
            const negativeItems: AuditSampleItem[] = [];

            if (mus.handleNegatives === 'Separate') {
                processedRows = realRows.filter(r => (r.monetary_value_col || 0) >= 0);
                const segregated = realRows.filter(r => (r.monetary_value_col || 0) < 0);
                segregated.forEach(r => negativeItems.push({
                    id: String(r.unique_id_col),
                    value: r.monetary_value_col || 0,
                    risk_flag: 'NEGATIVO_SEGREGADO',
                    risk_justification: 'Ítem con saldo acreedor segregado para auditoría manual según política.',
                    is_manual_selection: true
                }));
                methodologyNotes.push(`Negativos: Se segregaron ${segregated.length} registros para revisión manual.`);
            } else if (mus.handleNegatives === 'Zero') {
                processedRows = realRows.map(r => ({
                    ...r,
                    monetary_value_col: Math.max(0, r.monetary_value_col || 0)
                }));
                methodologyNotes.push(`Negativos: Saldos acreedores tratados como valor cero.`);
            } else if (mus.handleNegatives === 'Absolute') {
                processedRows = realRows.map(r => ({
                    ...r,
                    monetary_value_col: Math.abs(r.monetary_value_col || 0),
                    _is_originally_negative: (r.monetary_value_col || 0) < 0
                }));
                methodologyNotes.push(`Negativos: Saldos acreedores convertidos a valor absoluto.`);
            }

            // Recalcular V efectivo tras tratamiento de negativos
            const effectiveV = processedRows.reduce((acc, curr) => acc + (curr.monetary_value_col || 0), 0);
            const confidenceFactorMUS = 3.0; // Fixed 95%
            const samplingInterval = mus.TE / confidenceFactorMUS;

            // PIPELINE NIA 530 - ETAPA B: Estrato de Certeza (Top-Stratum)
            let topStratumItems: AuditSampleItem[] = [];
            let statisticalPopulation = [...processedRows];

            if (mus.optimizeTopStratum) {
                const certaintyItems = processedRows.filter(r => (r.monetary_value_col || 0) >= samplingInterval);
                statisticalPopulation = processedRows.filter(r => (r.monetary_value_col || 0) < samplingInterval);

                topStratumItems = certaintyItems.map(r => ({
                    id: String(r.unique_id_col),
                    value: r.monetary_value_col || 0,
                    risk_flag: 'TOP_STRATUM',
                    risk_justification: `Ítem excede el intervalo de muestreo (${formatMoney(samplingInterval)}). Extraído al 100% por materialidad.`,
                    is_manual_selection: true,
                    absolute_value: (r as any)._is_originally_negative ? r.monetary_value_col : undefined
                }));

                methodologyNotes.push(`Estrato Certeza: Se extrajeron ${certaintyItems.length} ítems claves que superan el intervalo.`);
            }

            // PIPELINE NIA 530 - ETAPA C: Selección Estadística Sistemática
            const residualV = statisticalPopulation.reduce((acc, curr) => acc + (curr.monetary_value_col || 0), 0);

            if (mus.usePilotSample) {
                sampleSize = 30;
                methodologyNotes.push(METHODOLOGY_NOTES.MUS_PILOT);
                const statisticalSample = selectItems(sampleSize, seed, statisticalPopulation, (_, row) => ({
                    is_pilot_item: true,
                    risk_flag: (row as any)?._is_originally_negative ? 'NEGATIVO_ABS' : RISK_MESSAGES.PILOT_PHASE,
                    risk_justification: (row as any)?._is_originally_negative
                        ? 'Ítem negativo tratado como valor absoluto para probabilística.'
                        : RISK_MESSAGES.PILOT_JUSTIFICATION,
                    absolute_value: (row as any)?._is_originally_negative ? row?.monetary_value_col : undefined
                }));

                sample = [...topStratumItems, ...negativeItems, ...statisticalSample];
                sampleSize = sample.length;
                pilotMetrics = { type: 'MUS_PILOT', initialEE: mus.EE, phase: 'PILOT_ONLY', initialSize: 30 };
            } else {
                const theoreticalSampleSize = Math.ceil(residualV / samplingInterval);
                const statisticalSample = selectItems(theoreticalSampleSize, seed, statisticalPopulation, (_, row) => ({
                    risk_flag: (row as any)?._is_originally_negative ? 'NEGATIVO_ABS' : undefined,
                    absolute_value: (row as any)?._is_originally_negative ? row?.monetary_value_col : undefined
                }));

                sample = [...topStratumItems, ...negativeItems, ...statisticalSample];
                sampleSize = sample.length;

                if (theoreticalSampleSize > statisticalPopulation.length) {
                    methodologyNotes.push(`Aviso: La representatividad estadística requería un censo de la población residual.`);
                }
            }
            break;
            break;

        case SamplingMethod.Stratified:
            const st = samplingParams.stratified;
            const targetTotalN = st.usePilotSample ? 50 : 100;

            // 1. Capa de Certeza (100% Extraction)
            const certaintyThreshold = st.certaintyStratumThreshold || Infinity;
            const certaintyStratum = realRows.filter(r => (r.monetary_value_col || 0) >= certaintyThreshold);
            const residualStratifiedPop = realRows.filter(r => (r.monetary_value_col || 0) < certaintyThreshold);

            let certaintyResults: AuditSampleItem[] = certaintyStratum.map(r => ({
                id: String(r.unique_id_col),
                value: r.monetary_value_col || 0,
                risk_flag: 'CERTEZA_ESTRAT.',
                risk_justification: `Ítem excede el umbral de materialidad del estrato superior (${formatMoney(certaintyThreshold)}).`,
                is_manual_selection: true,
                stratum_label: 'Certeza'
            }));

            // 2. Agrupación por Estratos
            let groupMap: Map<string, AuditDataRow[]> = new Map();

            if (st.basis === 'Monetary') {
                const sortedResidual = [...residualStratifiedPop].sort((a, b) => (a.monetary_value_col || 0) - (b.monetary_value_col || 0));
                const itemsPerStratum = Math.ceil(sortedResidual.length / st.strataCount);

                for (let i = 0; i < st.strataCount; i++) {
                    const group = sortedResidual.slice(i * itemsPerStratum, (i + 1) * itemsPerStratum);
                    if (group.length > 0) groupMap.set(`E${i + 1}`, group);
                }
            } else {
                // Soporte Multivariable (Cat + Subcat)
                const variables = st.basis === 'MultiVariable'
                    ? (st.selectedVariables || [])
                    : [st.basis];

                residualStratifiedPop.forEach(r => {
                    const raw = r.raw_json || {};
                    const key = variables.map((v: string) => {
                        const col = appState.selectedPopulation?.column_mapping[v.toLowerCase() as 'category' | 'subcategory'];
                        return String(raw[col as string] || 'Otros');
                    }).join(' | ');

                    if (!groupMap.has(key)) groupMap.set(key, []);
                    groupMap.get(key)!.push(r);
                });
            }

            // 3. Asignación y Selección
            let stratifiedSample: AuditSampleItem[] = [];
            const manualAllocations = st.manualAllocations as Record<string, number>;

            if (manualAllocations) {
                // PRIORIDAD: Alocación Manual (Juicio del Auditor)
                Object.entries(manualAllocations).forEach(([key, nh]) => {
                    const groupRows = groupMap.get(key);
                    if (groupRows && nh > 0) {
                        const subSample = selectItems(Math.min(nh, groupRows.length), seed, groupRows, () => ({
                            stratum_label: key
                        }));
                        stratifiedSample = [...stratifiedSample, ...subSample];
                    }
                });
            } else {
                // ASIGNACIÓN AUTOMÁTICA (FALLBACK)
                const nToAllocate = Math.max(0, targetTotalN - certaintyResults.length);
                const totalNResidual = residualStratifiedPop.length;

                if (totalNResidual > 0) {
                    const strataKeys = Array.from(groupMap.keys());
                    const strataMetrics = strataKeys.map(key => {
                        const rows = groupMap.get(key)!;
                        const vals = rows.map(r => r.monetary_value_col || 0);
                        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
                        const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / Math.max(1, vals.length - 1);
                        return { key, count: rows.length, stdDev: Math.sqrt(variance) };
                    });

                    strataMetrics.forEach(m => {
                        let nh = 0;
                        if (st.allocationMethod === 'Proporcional') {
                            nh = Math.round(nToAllocate * (m.count / totalNResidual));
                        } else if (st.allocationMethod === 'Igualitaria') {
                            nh = Math.round(nToAllocate / strataKeys.length);
                        } else if (st.allocationMethod === 'Óptima (Neyman)') {
                            const sumNhSh = strataMetrics.reduce((acc, curr) => acc + (curr.count * curr.stdDev), 0);
                            nh = sumNhSh > 0 ? Math.round(nToAllocate * (m.count * m.stdDev / sumNhSh)) : Math.round(nToAllocate / strataKeys.length);
                        }

                        if (nh > 0) {
                            const groupRows = groupMap.get(m.key)!;
                            const subSample = selectItems(Math.min(nh, groupRows.length), seed, groupRows, () => ({
                                stratum_label: m.key
                            }));
                            stratifiedSample = [...stratifiedSample, ...subSample];
                        }
                    });
                }
            }

            sample = [...certaintyResults, ...stratifiedSample];
            sampleSize = sample.length;
            methodologyNotes.push(`Estratificación: Aplicada base ${st.basis} con asignación ${manualAllocations ? 'Manual (Auditor)' : st.allocationMethod}.`);
            if (certaintyResults.length > 0) methodologyNotes.push(`Certeza: ${certaintyResults.length} ítems claves superan el umbral monetario.`);

            break;

        case SamplingMethod.CAV:
            const cav = samplingParams.cav;
            if (cav.usePilotSample) {
                sampleSize = 50;
                methodologyNotes.push(METHODOLOGY_NOTES.CAV_PILOT);
                sample = selectItems(sampleSize, seed, realRows, () => ({
                    is_pilot_item: true,
                    risk_flag: RISK_MESSAGES.PILOT_PHASE,
                    risk_justification: RISK_MESSAGES.CAV_PILOT_JUSTIFICATION
                }));

                // Calibración de Sigma basada en el Piloto
                const vals = sample.map(i => i.value);
                const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
                const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (vals.length - 1);
                const sigma = Math.sqrt(variance);

                pilotMetrics = {
                    type: 'CAV_PILOT',
                    initialSigma: cav.sigma,
                    calibratedSigma: sigma,
                    phase: 'PILOT_ONLY',
                    initialSize: 50,
                    meanPoblacional: mean
                };

                methodologyNotes.push(`Piloto CAV: Sigma calibrado en ${formatMoney(sigma)} (Sigma inicial era ${formatMoney(cav.sigma)}).`);
            } else {
                // Cálculo de Tamaño Final usando Sigma (calibrado o manual)
                const N_CAV = realRows.length > 0 ? realRows.length : 1000;
                const sigmaToUse = cav.sigma || 1;
                const TE_CAV = cav.TE || 50000;
                const NC_CAV = cav.NC || 95;

                let Z = 1.96;
                if (NC_CAV === 90) Z = 1.645;
                if (NC_CAV === 99) Z = 2.576;

                const precisionDeseada = TE_CAV;
                sampleSize = Math.ceil(Math.pow((N_CAV * Z * sigmaToUse) / precisionDeseada, 2));

                sampleSize = Math.min(sampleSize, realRows.length);

                sample = selectItems(sampleSize, seed, realRows, () => ({}));
                methodologyNotes.push(`CAV: Tamaño calculado de ${sampleSize} usando sigma de ${formatMoney(sigmaToUse)}.`);
            }
            break;

        case SamplingMethod.NonStatistical:
            const ns = samplingParams.nonStatistical;
            const n_ns = ns.sampleSize || 30;
            const insight = ns.selectedInsight || 'Default';

            methodologyNotes.push(`Muestreo No Estadístico: Enfoque '${insight}' con tamaño n=${n_ns}.`);

            // Muestreo Inteligente (Smart Selection)
            if (insight === 'RiskScoring') {
                // Ordenar por Risk Score (Ponderado Forense)
                const scoredRows = [...realRows].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
                const topRisky = scoredRows.slice(0, n_ns);

                sample = topRisky.map(r => ({
                    id: String(r.unique_id_col),
                    value: r.monetary_value_col || 0,
                    risk_score: r.risk_score,
                    risk_factors: r.risk_factors || [],
                    risk_flag: 'ALTO RIESGO',
                    risk_justification: `Ítem seleccionado por Score de Riesgo Ponderado (${r.risk_score}). Factores: ${(r.risk_factors || []).join(', ')}`,
                    is_manual_selection: true,
                    raw_row: r.raw_json
                }));
                sampleSize = sample.length;
                methodologyNotes.push("Smart Selection: Se extrajeron los ítems con mayores factores de riesgo combinados.");
            } else if (insight !== 'Default') {
                // Selección Dirigida por Hallazgo Específico
                const matchingRows = realRows.filter(r => {
                    if (insight === 'Outliers') return (r.risk_factors || []).some((f: string) => f.includes('Atípico') || f.includes('IQR'));
                    if (insight === 'Benford') return (r.risk_factors || []).some((f: string) => f.includes('Benford'));
                    if (insight === 'Duplicates') return (r.risk_factors || []).some((f: string) => f.includes('Duplicado'));
                    if (insight === 'RoundNumbers') return (r.risk_factors || []).some((f: string) => f.includes('redondo'));
                    return false;
                });

                const directedSelection = matchingRows.slice(0, n_ns);
                sample = directedSelection.map(r => ({
                    id: String(r.unique_id_col),
                    value: r.monetary_value_col || 0,
                    risk_score: r.risk_score,
                    risk_factors: r.risk_factors || [],
                    risk_flag: 'HALLAZGO_DIRIGIDO',
                    risk_justification: `Selección dirigida basada en insight de ${insight}.`,
                    is_manual_selection: true,
                    raw_row: r.raw_json
                }));

                // Si no hay suficientes hallazgos, completar con sistemático
                if (sample.length < n_ns) {
                    const remainingN = n_ns - sample.length;
                    const usedIds = new Set(sample.map(s => s.id));
                    const remainingRows = realRows.filter(r => !usedIds.has(String(r.unique_id_col)));
                    const fillingSample = selectItems(remainingN, seed, remainingRows, () => ({}));
                    sample = [...sample, ...fillingSample];
                    methodologyNotes.push(`Insuficientes hallazgos de ${insight} (se encontraron ${directedSelection.length}); se completó la muestra con selección sistemática.`);
                } else {
                    methodologyNotes.push(`Selección Dirigida: Se extrajeron ${sample.length} ítems con banderas de ${insight}.`);
                }
                sampleSize = sample.length;
            } else {
                // Muestreo No Estadístico Estándar (Aleatorio/Sistemático)
                sampleSize = n_ns;
                sample = selectItems(sampleSize, seed, realRows, () => ({}));
                methodologyNotes.push("Selección Estándar: Aplicada selección sistemática sobre el universo completo.");
            }
            break;


        default:
            sampleSize = 30;
            sample = selectItems(sampleSize, seed, realRows, () => ({}));
    }

    return {
        sampleSize,
        sample,
        totalErrorProjection: 0,
        upperErrorLimit: 0,
        findings: [],
        methodologyNotes,
        pilotMetrics
    };
};

export const calculateInference = (results: AuditResults, method: SamplingMethod, totalValue: number = 0, populationCount: number = 0) => {
    const n = Math.max(results.sampleSize, 1);
    const exceptions = results.sample.filter(i => i.compliance_status === 'EXCEPCION');
    const k = exceptions.length;

    const factors: Record<number, number> = { 0: 3.0, 1: 4.75, 2: 6.30, 3: 7.76, 4: 9.16, 5: 10.52 };
    const R = factors[k] || (k + 6.5);

    if (method === SamplingMethod.Attribute) {
        return { upperLimit: (R / n) * 100, projectedError: 0 };
    } else if (method === SamplingMethod.CAV && populationCount > 0) {
        // MPU Estimation (Mean Per Unit) for CAV
        // Projected Error = N * (Sum of errors in sample / n)
        const totalErrorInSample = exceptions.reduce((acc, curr) => acc + (curr.value || 0), 0);
        const projectedError = (totalErrorInSample / n) * populationCount;
        return { projectedError, upperLimit: (R / n) * 100 };
    } else {
        // Ratio Estimation for MUS/Others
        const sampleValue = results.sample.reduce((acc, curr) => acc + Math.abs(curr.value || 0), 0);
        const errorValue = exceptions.reduce((acc, curr) => acc + (curr.value || 0), 0);
        const projectedError = sampleValue > 0 ? (errorValue / sampleValue) * totalValue : 0;
        return { projectedError, upperLimit: (R / n) * 100 };
    }
};
