import { AppState, AuditResults, SamplingMethod, AuditSampleItem, AuditDataRow, PilotMetrics, StratumMetadata, ColumnMapping } from '../types';
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

// --- TABLAS TÉCNICAS NIA 530 ---

/**
 * Factores de Confiabilidad (FC) basados en distribución de Poisson.
 * Se usan para MUS y Atributos cuando se esperan 0 errores.
 */
export const RELIABILITY_FACTORS: Record<number, number> = {
    99: 4.61,
    95: 3.00,
    90: 2.31,
    85: 1.90,
    80: 1.61,
    75: 1.39,
    50: 0.70
};

/**
 * Factores de Expansión (FE) para MUS.
 * Se usan cuando se esperan errores (PE > 0).
 */
export const EXPANSION_FACTORS: Record<number, number> = {
    99: 1.9,
    95: 1.6,
    90: 1.5,
    85: 1.4,
    80: 1.3,
    75: 1.25,
    50: 1.15
};

/**
 * Tabla de Factores R (Poisson acumulada) para evaluación de Atributos/MUS
 * Relaciona NC y número de desviaciones encontradas (k).
 */
export const POISSON_TABLE: Record<number, Record<number, number>> = {
    95: { 0: 3.00, 1: 4.75, 2: 6.30, 3: 7.76, 4: 9.16, 5: 10.52, 6: 11.85, 7: 13.15, 8: 14.44, 9: 15.71, 10: 16.97 },
    90: { 0: 2.31, 1: 3.89, 2: 5.33, 3: 6.69, 4: 8.00, 5: 9.28, 6: 10.54, 7: 11.78, 8: 13.00, 9: 14.21, 10: 15.41 },
};

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
    let n = Math.ceil(rawN);

    // Ajuste FPCF (Población Finita) - NIA 530
    if (n / totalPopulation > 0.05) {
        n = Math.ceil(n / (1 + (n / totalPopulation)));
    }

    const formulaStr = `n = (${Z}^2 * ${alpha.toFixed(2)} * ${totalPopulation}) / ${tolerableError}^2 -> FPCF applied if >5%`;

    return {
        n,
        formula: formulaStr,
        details: `Cálculo basado en fórmula de usuario con ajuste por población finita (FPCF).`
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
    let pilotMetrics: PilotMetrics | undefined;
    let resultsMetadata: { strataMetadata?: StratumMetadata[] } = {};

    switch (samplingMethod) {
        case SamplingMethod.Attribute:
            const attr = samplingParams.attribute;
            const N_attr = realRows.length > 0 ? realRows.length : attr.N;

            if (attr.useSequential) {
                sampleSize = 25;
                methodologyNotes.push(METHODOLOGY_NOTES.STOP_OR_GO);
                sample = selectItems(sampleSize, seed, realRows, () => ({ is_pilot_item: true, risk_flag: RISK_MESSAGES.PILOT_PHASE }));
                pilotMetrics = { type: 'ATTR_PILOT', phase: 'PILOT_ONLY', initialSize: 25 };
            } else {
                // NIA 530: Muestreo de Atributos (Fórmula de Proporciones + FPCF)
                const Z_val = attr.NC >= 99 ? 2.576 : attr.NC >= 95 ? 1.96 : 1.645;
                const p = 0.5; // Probabilidad conservadora (peor escenario)
                const q = 1 - p;
                const E = attr.ET / 100;

                // n = (Z² * p * q) / E²
                let n0 = Math.ceil((Math.pow(Z_val, 2) * p * q) / Math.pow(E, 2));

                // Ajuste por Población Finita (FPCF) si n/N > 0.05
                if (n0 / N_attr > 0.05) {
                    sampleSize = Math.ceil((n0 * N_attr) / (n0 + N_attr));
                    methodologyNotes.push(`Población Finita: Ajuste aplicado (N=${N_attr}).`);
                } else {
                    sampleSize = n0;
                }

                // Asegurar que PE impacte si es alto (Modelo de Factores R)
                if (attr.PE > 0) {
                    const fcAttr = RELIABILITY_FACTORS[attr.NC] || 3.0;
                    const nFactors = Math.ceil((fcAttr * 100) / (attr.ET - attr.PE));
                    sampleSize = Math.max(sampleSize, nFactors);
                }

                sample = selectItems(sampleSize, seed, realRows, () => ({}));
                methodologyNotes.push(`Atributos: Fórmulas de proporciones NIA 530 (Z=${Z_val}).`);
            }
            break;

        case SamplingMethod.MUS:
            const mus = samplingParams.mus;
            const N_mus = realRows.length;

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
            const effectiveV = Math.abs(processedRows.reduce((acc, curr) => acc + (curr.monetary_value_col || 0), 0));

            // MUS: Cálculo exacto basado en Factores de Confiabilidad y Expansión
            const ncKey = mus.RIA <= 5 ? 95 : 90; // Mapeo de RIA a NC
            const fcMus = RELIABILITY_FACTORS[ncKey] || 3.0;
            const feMus = EXPANSION_FACTORS[ncKey] || 1.6;

            // n = (V * FC) / (TE - (EE * FE))
            const numerator = effectiveV * fcMus;
            const denominator = mus.TE - (mus.EE * feMus);

            if (denominator <= 1) { // Guard against <= 0 AND very small positives to prevent explosion
                // Escenario donde el error esperado + expansión devora la materialidad
                sampleSize = Math.min(processedRows.length, 500); // Límite técnico de seguridad
                methodologyNotes.push("Advertencia MUS: El error esperado supera la capacidad del modelo. Se aplica tamaño máximo prudencial.");
            } else {
                let calculatedSize = Math.ceil(numerator / denominator);

                // Safety Cap: Never exceed population size (Census)
                if (calculatedSize > processedRows.length) {
                    calculatedSize = processedRows.length;
                    methodologyNotes.push(`Nota: El tamaño calculado excede la población. Se seleccionó el 100% de los registros (${calculatedSize}).`);
                }

                // Hard Cap to prevent Browser Crash if processedRows is huge (though limited by Proxy to 20k)
                // If calculatedSize is massive (e.g. > 20k) but rows are fewer, above check handles it.
                // But if calculatedSize is massive and rows are 0?

                sampleSize = Math.max(0, calculatedSize);
            }

            const samplingInterval = sampleSize > 0 ? effectiveV / sampleSize : 0;

            // PIPELINE NIA 530 - ETAPA B: Estrato de Certeza (Top-Stratum) e Integración Forense
            let topStratumItems: AuditSampleItem[] = [];
            let statisticalPopulation = [...processedRows];

            if (mus.optimizeTopStratum) {
                // Partidas por materialidad (>= IM) + Partidas por Riesgo Forense (Score > 80)
                const certaintyItems = processedRows.filter(r =>
                    (r.monetary_value_col || 0) >= samplingInterval ||
                    (r.risk_score || 0) >= 80
                );
                statisticalPopulation = processedRows.filter(r =>
                    (r.monetary_value_col || 0) < samplingInterval &&
                    (r.risk_score || 0) < 80
                );

                topStratumItems = certaintyItems.map(r => ({
                    id: String(r.unique_id_col),
                    value: r.monetary_value_col || 0,
                    risk_flag: (r.risk_score || 0) >= 80 ? 'PARTIDA_CLAVE' : 'TOP_STRATUM',
                    risk_justification: (r.risk_score || 0) >= 80
                        ? `Selección obligatoria por alto score forense (${r.risk_score}). Banderas: ${(r.risk_factors || []).join(', ')}`
                        : `Ítem excede el intervalo de muestreo (${formatMoney(samplingInterval)}). Extraído al 100% por materialidad.`,
                    is_manual_selection: true,
                    absolute_value: (r as any)._is_originally_negative ? r.monetary_value_col : undefined
                }));

                methodologyNotes.push(`Selección Clave: ${certaintyItems.length} ítems extraídos al 100% (Materialidad o Riesgo Alto).`);
            }

            // PIPELINE NIA 530 - ETAPA C: Selección Estadística Sistemática
            const residualV = statisticalPopulation.reduce((acc, curr) => acc + (curr.monetary_value_col || 0), 0);

            if (mus.usePilotSample) {
                sampleSize = 30; // Hardcoded Pilot Size
                methodologyNotes.push(METHODOLOGY_NOTES.MUS_PILOT);

                // En modo Piloto, forzamos una selección puramente aleatoria/sistemática simple
                // ignorando Estrato Superior y Negativos para garantizar rendimiento y velocidad.
                pilotMetrics = { type: 'MUS_PILOT', initialEE: mus.EE, phase: 'PILOT_ONLY', initialSize: 30 };

                // Selección simple de 30 ítems del universo total (sin segregar)
                sample = selectItems(sampleSize, seed, realRows, () => ({
                    is_pilot_item: true,
                    risk_flag: RISK_MESSAGES.PILOT_PHASE,
                    risk_justification: RISK_MESSAGES.PILOT_JUSTIFICATION
                }));
            } else {
                // ... ESTANDAR MUS LOGIC (Existing) ...
                // Re-enable the calculate theoretical logic here
                const theoreticalSampleSize = Math.ceil(residualV / samplingInterval);

                // ... rest of logic ...

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
            const targetTotalN = st.sampleSize || 100;

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
                stratum_label: 'Certeza',
                raw_row: r.raw_json
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
                const variables = st.basis === 'MultiVariable' ? (st.selectedVariables || []) : [st.basis];
                residualStratifiedPop.forEach(r => {
                    const raw = r.raw_json || {};
                    const key = variables.map((v: string) => {
                        const colKey = v.toLowerCase() as keyof ColumnMapping;
                        const col = appState.selectedPopulation?.column_mapping[colKey];
                        return String(raw[col as string] || 'Otros');
                    }).join(' | ');

                    if (!groupMap.has(key)) groupMap.set(key, []);
                    groupMap.get(key)!.push(r);
                });
            }

            // 3. Asignación y Selección
            let stratifiedSampleList: AuditSampleItem[] = [];
            const strataMetadataList: StratumMetadata[] = [];

            if (certaintyResults.length > 0) {
                strataMetadataList.push({
                    label: 'Certeza',
                    populationSize: certaintyResults.length,
                    populationValue: certaintyResults.reduce((acc, curr) => acc + (curr.value || 0), 0),
                    sampleSize: certaintyResults.length
                });
            }

            const isManual = st.allocationMethod === 'Manual' && st.manualAllocations;
            if (isManual) {
                const manualAllocations = st.manualAllocations as Record<string, number>;
                Object.entries(manualAllocations).forEach(([key, nh]) => {
                    const groupRows = groupMap.get(key);
                    if (groupRows && nh > 0) {
                        const subSample = selectItems(Math.min(nh, groupRows.length), seed, groupRows, () => ({
                            stratum_label: key
                        }));
                        stratifiedSampleList = [...stratifiedSampleList, ...subSample];
                        strataMetadataList.push({
                            label: key,
                            populationSize: groupRows.length,
                            populationValue: groupRows.reduce((acc, curr) => acc + (curr.monetary_value_col || 0), 0),
                            sampleSize: subSample.length
                        });
                    }
                });
            } else {
                const totalNResidual = residualStratifiedPop.length;
                const totalVResidual = residualStratifiedPop.reduce((a, b) => a + (b.monetary_value_col || 0), 0);

                // --- ETAPA A: CÁLCULO DE N TOTAL TEÓRICO (NIA 530) ---
                // n = (N * Z * sigma / TE)^2 -> Usamos sigma global de la población residual si no hay piloto
                const Z = st.NC === 99 ? 2.576 : st.NC === 95 ? 1.96 : 1.645;
                const sigmaGlobal = appState.selectedPopulation?.descriptive_stats?.std_dev || (totalVResidual / Math.sqrt(totalNResidual || 1));
                const TE_absoluto = (st.ET / 100) * (appState.selectedPopulation?.total_monetary_value || 1);

                let theoreticalN = Math.ceil(Math.pow((totalNResidual * Z * sigmaGlobal) / Math.max(1, TE_absoluto), 2));

                // Ajuste FPCF para estratificado
                if (theoreticalN / totalNResidual > 0.05) {
                    theoreticalN = Math.ceil(theoreticalN / (1 + theoreticalN / totalNResidual));
                }

                const nToAllocate = st.sampleSize || Math.min(theoreticalN, totalNResidual);
                methodologyNotes.push(`Tamaño objetivo: ${nToAllocate} ítems (Basado en ${st.sampleSize ? 'Juicio' : 'Cálculo Estadístico'}).`);

                if (totalNResidual > 0) {
                    const strataMetrics = Array.from(groupMap.keys()).map(key => {
                        const rows = groupMap.get(key)!;
                        const vals = rows.map(r => r.monetary_value_col || 0);
                        const mean = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
                        const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / Math.max(1, vals.length - 1);
                        return { key, count: rows.length, stdDev: Math.sqrt(variance), totalValue: vals.reduce((a, b) => a + b, 0) };
                    });

                    strataMetrics.forEach(m => {
                        let nh = 0;
                        if (st.allocationMethod === 'Proporcional') {
                            nh = Math.round(nToAllocate * (m.count / totalNResidual));
                        } else if (st.allocationMethod === 'Igualitaria') {
                            nh = Math.round(nToAllocate / groupMap.size);
                        } else if (st.allocationMethod === 'Óptima (Neyman)') {
                            // n_h = n * (N_h * sigma_h) / Σ(N_i * sigma_i)
                            const sumNhSh = strataMetrics.reduce((acc, curr) => acc + (curr.count * curr.stdDev), 0);
                            nh = sumNhSh > 0 ? Math.round(nToAllocate * (m.count * m.stdDev / sumNhSh)) : Math.round(nToAllocate / groupMap.size);
                        }

                        if (nh > 0) {
                            const groupRows = groupMap.get(m.key)!;
                            const subSample = selectItems(Math.min(nh, groupRows.length), seed, groupRows, () => ({
                                stratum_label: m.key
                            }));
                            stratifiedSampleList = [...stratifiedSampleList, ...subSample];
                            strataMetadataList.push({
                                label: m.key,
                                populationSize: m.count,
                                populationValue: m.totalValue,
                                sampleSize: subSample.length
                            });
                        }
                    });
                }
            }

            sample = [...certaintyResults, ...stratifiedSampleList];
            sampleSize = sample.length;
            resultsMetadata = { strataMetadata: strataMetadataList };
            methodologyNotes.push(`Estratificación: Aplicada base ${st.basis} con asignación ${st.allocationMethod}.`);
            if (certaintyResults.length > 0) methodologyNotes.push(`Certeza: ${certaintyResults.length} ítems en capa 100%.`);
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

                const sigmaDeviation = Math.abs(sigma - cav.sigma) / (cav.sigma || 1);
                const requiresRecalibration = sigmaDeviation > 0.25;

                pilotMetrics = {
                    type: 'CAV_PILOT',
                    initialSigma: cav.sigma,
                    calibratedSigma: sigma,
                    phase: 'PILOT_ONLY',
                    initialSize: 50,
                    meanPoblacional: mean,
                    requiresRecalibration,
                    sigmaDeviation
                };

                if (requiresRecalibration) {
                    methodologyNotes.push(`ALTA INCERTIDUMBRE: Desviación Sigma del ${(sigmaDeviation * 100).toFixed(1)}% (Límite 25%). Se requiere ajustar Sigma de diseño.`);
                } else {
                    methodologyNotes.push(`Piloto CAV: Sigma calibrado en ${formatMoney(sigma)} (Sigma inicial era ${formatMoney(cav.sigma)}).`);
                }
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
        pilotMetrics,
        ...resultsMetadata
    };
};

export const calculateInference = (results: AuditResults, method: SamplingMethod, totalValue: number = 0, populationCount: number = 0) => {
    const n = Math.max(results.sampleSize, 1);
    const exceptions = results.sample.filter(i => i.compliance_status === 'EXCEPCION');
    const k = exceptions.length;

    if (method === SamplingMethod.Attribute) {
        // Cálculo de UEL basado en Factores de Poisson acumulada
        const ncKey = results.pilotMetrics ? (results.pilotMetrics.type === 'ATTR_PILOT' ? 95 : 90) : 95;
        const poissonRow = ncKey === 95 ? POISSON_TABLE[95] : POISSON_TABLE[90];
        const factorR = poissonRow[k] || (k + 3.0);

        const upperLimit = (factorR / n) * 100;
        return { upperLimit, projectedError: 0, criticalNumber: k };
    } else if (method === SamplingMethod.CAV && populationCount > 0) {
        // MPU Estimation (Mean Per Unit) for CAV
        const totalErrorInSample = exceptions.reduce((acc, curr) => acc + (curr.value || 0), 0);
        const projectedError = (totalErrorInSample / n) * populationCount;

        // Factor R para el límite superior (Conservador)
        const factorR = POISSON_TABLE[95][k] || (k + 3.0);
        return { projectedError, upperLimit: (factorR / n) * 100 };
    } else if (method === SamplingMethod.Stratified && results.strataMetadata) {
        // PROYECCIÓN PONDERADA POR ESTRATO (NIA 530 - SIT)
        let totalProjectedError = 0;

        results.strataMetadata.forEach(meta => {
            const stratumSample = results.sample.filter(i => (i.stratum_label === meta.label) || (meta.label === 'Certeza' && i.risk_flag === 'TOP_STRATUM'));
            // Note: Certeza items might be labeled TOP_STRATUM in MUS or similar, but in Stratified they should match literal label
            const stratumErrors = stratumSample.filter(i => i.compliance_status === 'EXCEPCION');

            const nh = Math.max(meta.sampleSize, stratumSample.length, 1);
            const Nh = meta.populationSize;

            // Diferencia media por ítem en el estrato
            const errorInSample = stratumErrors.reduce((acc, curr) => acc + (curr.error_amount || curr.value || 0), 0);
            const projectedStratumError = (errorInSample / nh) * Nh;

            totalProjectedError += projectedStratumError;
        });

        // El factor R aquí es más complejo en estratificado, pero usaremos el conservador de Poisson para el límite superior
        const factorR = POISSON_TABLE[95][k] || (k + 3.0);
        return { projectedError: totalProjectedError, upperLimit: (factorR / n) * 100 };
    } else {
        // Ratio Estimation for MUS/Others (NIA 530)
        const sampleValue = results.sample.reduce((acc, curr) => acc + Math.abs(curr.value || 0), 0) || 1;
        const errorValue = exceptions.reduce((acc, curr) => acc + (curr.error_amount || curr.value || 0), 0);
        const projectedError = (errorValue / sampleValue) * totalValue;

        const factorR = POISSON_TABLE[95][k] || (k + 3.0);
        return { projectedError, upperLimit: (factorR / n) * 100 };
    }
};
