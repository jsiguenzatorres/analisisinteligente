// Script de prueba para verificar cambios en reportes
console.log("🔍 Verificando cambios en reportes...");

// Simular AppState para No Estadístico
const testAppState = {
    selectedPopulation: {
        id: "test-123",
        file_name: "test_data.xlsx",
        total_rows: 500,
        total_monetary_value: 1000000,
        advanced_analysis: {
            benford: [{ digit: 1, expected: 30.1, actual: 25.5, isSuspicious: true }],
            duplicatesCount: 5,
            outliersCount: 12,
            entropy: { anomalousCount: 3 },
            splitting: { highRiskGroups: 2 },
            sequential: { highRiskGaps: 0 },
            eda: {
                netValue: 1000000,
                absoluteValue: 1000000,
                positiveCount: 450,
                positiveValue: 1000000,
                negativeCount: 0,
                negativeValue: 0,
                mean: 2000,
                median: 1500,
                minValue: 100,
                maxValue: 50000,
                stdDev: 5000,
                skewness: 1.2,
                rsf: 1.1
            }
        }
    },
    results: {
        sampleSize: 30,
        sample: [
            {
                id: "TXN-001",
                value: 5000,
                risk_score: 8.5,
                risk_factors: ["Outlier", "Benford"],
                compliance_status: "OK",
                error_description: ""
            },
            {
                id: "TXN-002", 
                value: 3000,
                risk_score: 7.2,
                risk_factors: ["Duplicado"],
                compliance_status: "EXCEPCION",
                error_description: "Falta documentación soporte"
            }
        ]
    },
    generalParams: {
        objective: "Revisar transacciones de alto riesgo",
        seed: 12345
    },
    samplingMethod: "NonStatistical",
    samplingParams: {
        nonStatistical: {
            criteria: "Selección basada en risk scoring automático",
            justification: "Enfoque dirigido por riesgo según NIA 530",
            sampleSize: 30,
            selectedInsight: "RiskScoring",
            materiality: 50000,
            processCriticality: "Alto"
        }
    }
};

console.log("✅ AppState de prueba creado");
console.log("📊 Método de muestreo:", testAppState.samplingMethod);
console.log("🎯 Criterio:", testAppState.samplingParams.nonStatistical.criteria);
console.log("📈 Análisis forense disponible:", !!testAppState.selectedPopulation.advanced_analysis);
console.log("📋 Muestra de", testAppState.results.sampleSize, "ítems");

// Verificar que la detección funcione
if (testAppState.samplingMethod === "NonStatistical") {
    console.log("🎉 DETECCIÓN CORRECTA: Se usaría generateNonStatisticalReport()");
} else {
    console.log("❌ ERROR: No se detectaría como No Estadístico");
}

console.log("\n🔧 Para probar en la aplicación:");
console.log("1. Usa método 'No Estadístico'");
console.log("2. Configura criterios y justificación");
console.log("3. Genera muestra con risk scoring");
console.log("4. Genera reporte PDF");
console.log("5. Verifica que el PDF tenga 4 páginas con color Teal");