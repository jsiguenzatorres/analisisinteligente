
import { AuditPopulation, RiskProfile, RiskAnalysisResult, AdvancedAnalysis, EdaMetrics, BenfordAnalysis } from '../types';

const BENFORD_PROBABILITIES = [30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6];

export function parseCurrency(value: any): number {
    if (typeof value === 'number') return value;
    if (value === null || value === undefined) return 0;

    let str = String(value).trim();
    if (!str) return 0;

    // Detectar formato Europeo/Latino (1.000,00) vs US (1,000.00)
    // Si tiene comas y puntos, y la ultima coma está DESPUÉS del último punto -> Es Europeo (1.234,56)
    if (str.includes(',') && str.includes('.')) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
            // Eliminar puntos (miles), reemplazar coma por punto (decimal)
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            // US: Eliminar comas
            str = str.replace(/,/g, '');
        }
    } else if (str.includes(',')) {
        // Ambiguo: 1,000 o 10,50
        // Si hay mas de una coma, es separador miles (1,000,000) -> US
        if ((str.match(/,/g) || []).length > 1) {
            str = str.replace(/,/g, '');
        } else {
            // Una sola coma.
            // Si seguida de 3 digitos exactos y fin cadena -> Probable miles (1,000) -> US
            // Si seguida de 2 digitos -> Decimal (10,50) -> EU
            // Asumimos EU (Decimal) por defecto en UI Español, salvo que parezca miles
            if (/\,\d{3}$/.test(str)) {
                str = str.replace(/,/g, ''); // Miles US
            } else {
                str = str.replace(',', '.'); // Decimal EU
            }
        }
    } else if (str.includes('.')) {
        // Ambiguo: 1.000 o 10.50
        // Mismo caso pero invertido.
        if ((str.match(/\./g) || []).length > 1) {
            str = str.replace(/\./g, ''); // Miles EU
        } else {
            if (/\.\d{3}$/.test(str)) {
                str = str.replace(/\./g, ''); // Miles EU
            }
            // Si no, asumimos que es punto decimal standard (US)
        }
    }

    // Limpiar cualquier otro caracter (excepto punto y menos)
    const clean = str.replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

export const performRiskProfiling = (rows: any[], population: AuditPopulation): RiskAnalysisResult => {
    const riskCriteria = {
        highValueConfig: 10000, // Umbral por defecto
        suspiciousTimeStart: 20, // 8 PM
        suspiciousTimeEnd: 6    // 6 AM
    };

    const mapping = population.column_mapping || {} as any;
    const monetaryValue = mapping.monetaryValue;
    const dateCol = mapping.date;
    const vendorCol = mapping.vendor;

    let totalRiskScore = 0; // Suma acumulada de scores
    let gapAlerts = 0;              // Cantidad de hallazgos significativos

    const updatedRows = rows.map(r => {
        const raw = r.raw_json || {};
        // Robust parsing using helper
        let m = parseCurrency(raw[monetaryValue || '']);
        const dStr = raw[dateCol || ''];

        let score = 0;
        const factors: string[] = [];

        // 1. High Value Check
        if (m > riskCriteria.highValueConfig) {
            score += 20;
            factors.push('HIGH_VALUE');
        }

        // 2. Benford's Law (Elementary Check on Leading Digit)
        if (m > 0) {
            const leadingDigit = parseInt(String(m)[0]);
            // Just a dummy simulation: penalize if leading digit is 9 (unlikely)
            if (leadingDigit === 9) {
                // score += 5; // Disabled for noise reduction in demo
            }
        }

        // 3. Weekend/Night Check
        if (dStr) {
            const date = new Date(dStr);
            if (!isNaN(date.getTime())) {
                const hour = date.getHours();
                const day = date.getDay();
                if (day === 0 || day === 6) {
                    score += 15;
                    factors.push('WEEKEND');
                }
                if (hour >= riskCriteria.suspiciousTimeStart || hour <= riskCriteria.suspiciousTimeEnd) {
                    score += 15;
                    factors.push('OFF_HOURS');
                }
            }
        }

        // 4. Round Amounts
        if (m > 100 && m % 100 === 0) {
            score += 10;
            factors.push('ROUND_AMOUNT');
        }

        // 5. Keyword Search in Vendor
        if (vendorCol && raw[vendorCol]) {
            const v = String(raw[vendorCol]).toLowerCase();
            if (v.includes('unknown') || v.includes('sin nombre') || v.includes('efectivo')) {
                score += 30;
                factors.push('SUSPICIOUS_VENDOR');
            }
        }

        // --- NEW ISOLATION FOREST SIMULATION ---
        // If amount is extremely high compared to criteria (outlier)
        if (m > riskCriteria.highValueConfig * 5) {
            score += 25;
            factors.push('STATISTICAL_OUTLIER');
        }
        // ---------------------------------------

        totalRiskScore += score;
        if (score > 40) gapAlerts++;

        return {
            ...r,
            monetary_value_col: m, // Actualizamos columna auxiliar para BBDD
            risk_score: score,
            risk_factors: factors
        };
    });

    const avgScore = updatedRows.length > 0 ? totalRiskScore / updatedRows.length : 0;

    // --- EDA CALCULATION ---
    // Recalculate basic stats on the fly for the Advanced Analysis object
    let absSum = 0;
    let max = 0;
    let min = 0;
    let negativeCount = 0;
    let zeroCount = 0;
    let values: number[] = [];
    let correctDataCount = 0;
    let errorDataCount = 0;

    // Benford Setup
    const digitCounts = new Array(10).fill(0);

    updatedRows.forEach(r => {
        let m = r.monetary_value_col; // Already parsed above

        if (m < 0) negativeCount++;
        if (m === 0) zeroCount++;

        absSum += Math.abs(m);
        values.push(m);
        correctDataCount++;

        if (max < m) max = m;
        if (min > m) min = m; // Assuming min tracks signed or absolute? usually signed min.

        if (m !== 0) {
            const leading = parseInt(String(Math.abs(m)).charAt(0));
            if (leading >= 1 && leading <= 9) digitCounts[leading]++;
        }
    });

    const averageValue = correctDataCount > 0 ? absSum / correctDataCount : 0;

    // Benford Score (MAD - Mean Absolute Deviation)
    let benfordDev = 0;
    const totalLeading = values.filter(v => v !== 0).length;
    if (totalLeading > 0) {
        for (let i = 1; i <= 9; i++) {
            const observed = (digitCounts[i] / totalLeading) * 100;
            const expected = BENFORD_PROBABILITIES[i - 1];
            benfordDev += Math.abs(observed - expected);
        }
        benfordDev /= 9;
    }

    // Construct proper Benford Analysis Array
    const benfordAnalysis: BenfordAnalysis[] = new Array(9).fill(0).map((_, i) => {
        const d = i + 1;
        const totalLeading = values.filter(v => v !== 0).length;
        const observedFreq = totalLeading > 0 ? (digitCounts[d] / totalLeading) * 100 : 0;
        const expectedFreq = BENFORD_PROBABILITIES[d - 1];

        return {
            digit: d,
            expectedFreq,
            actualFreq: observedFreq,
            actualCount: digitCounts[d],
            isSuspicious: Math.abs(observedFreq - expectedFreq) > 5 // Simple threshold
        };
    });

    const edaMetrics: EdaMetrics = {
        netValue: absSum,
        absoluteValue: absSum,
        totalRecords: correctDataCount,
        zerosCount: zeroCount,
        positiveValue: 0,
        negativeValue: 0,
        positiveCount: 0,
        negativeCount: negativeCount,
        errorDataCount,
        correctDataCount,
        meanValue: averageValue,
        minValue: min,
        maxValue: max,
        sampleStdDev: 0,
        sampleVariance: 0,
        populationStdDev: 0,
        populationVariance: 0,
        skewness: 0,
        kurtosis: 0
    };

    const advancedAnalysis: AdvancedAnalysis = {
        benford: benfordAnalysis,
        outliersCount: updatedRows.filter(r => r.risk_factors?.includes('STATISTICAL_OUTLIER')).length,
        outliersThreshold: riskCriteria.highValueConfig * 5,
        duplicatesCount: 0,
        zerosCount: zeroCount,
        negativesCount: negativeCount,
        roundNumbersCount: updatedRows.filter(r => r.risk_factors?.includes('ROUND_AMOUNT')).length,
        forensicDiscovery: population.advanced_analysis?.forensicDiscovery || [],
        eda: edaMetrics
    };

    return {
        updatedRows,
        profile: {
            totalRiskScore: avgScore,
            gapAlerts: gapAlerts,
            factorsCount: {
                highValue: updatedRows.filter(r => r.risk_factors?.includes('HIGH_VALUE')).length,
                weekend: updatedRows.filter(r => r.risk_factors?.includes('WEEKEND')).length,
                offHours: updatedRows.filter(r => r.risk_factors?.includes('OFF_HOURS')).length,
                roundAmount: updatedRows.filter(r => r.risk_factors?.includes('ROUND_AMOUNT')).length
            }
        },
        advancedAnalysis
    };
};
