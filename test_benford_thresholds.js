// Prueba de Umbrales Correctos para Enhanced Benford Analysis
console.log('🔢 UMBRALES ESTÁNDAR PARA ANÁLISIS DE BENFORD\n');

// Función para interpretar conformidad según estándares forenses
function interpretBenfordConformity(mad) {
    if (mad < 0.006) {
        return {
            level: 'CLOSE',
            description: 'Conformidad cercana - Muy probable que siga Benford',
            riskLevel: 'LOW',
            color: '🟢'
        };
    } else if (mad < 0.012) {
        return {
            level: 'ACCEPTABLE', 
            description: 'Conformidad aceptable - Probable que siga Benford',
            riskLevel: 'LOW',
            color: '🟢'
        };
    } else if (mad < 0.015) {
        return {
            level: 'MARGINAL',
            description: 'Conformidad marginal - Posibles anomalías menores',
            riskLevel: 'MEDIUM',
            color: '🟡'
        };
    } else {
        return {
            level: 'NONCONFORMITY',
            description: 'No conformidad - Anomalías significativas detectadas',
            riskLevel: 'HIGH',
            color: '🔴'
        };
    }
}

console.log('📊 TABLA DE UMBRALES ESTÁNDAR (MAD - Mean Absolute Deviation):');
console.log('');
console.log('Rango MAD      | Nivel          | Interpretación                              | Riesgo');
console.log('---------------|----------------|---------------------------------------------|--------');
console.log('< 0.6%         | CLOSE          | Conformidad cercana - Muy probable Benford  | 🟢 BAJO');
console.log('0.6% - 1.2%    | ACCEPTABLE     | Conformidad aceptable - Probable Benford    | 🟢 BAJO');
console.log('1.2% - 1.5%    | MARGINAL       | Conformidad marginal - Posibles anomalías   | 🟡 MEDIO');
console.log('> 1.5%         | NONCONFORMITY  | No conformidad - Anomalías significativas   | 🔴 ALTO');

console.log('\n📚 FUENTE: Nigrini, M. (2012). "Benford\'s Law: Applications for Forensic Accounting"');

// Ejemplos de diferentes niveles de conformidad
const testCases = [
    { name: 'Datos Naturales (Facturas)', mad: 0.004, description: 'Población de facturas sin manipulación' },
    { name: 'Datos Contables Normales', mad: 0.008, description: 'Registros contables típicos' },
    { name: 'Datos con Redondeo', mad: 0.013, description: 'Datos con algún redondeo sistemático' },
    { name: 'Datos Manipulados', mad: 0.025, description: 'Datos con manipulación evidente' },
    { name: 'Datos de Prueba (Nuestro Test)', mad: 0.065, description: 'Datos de prueba con anomalías intencionadas' }
];

console.log('\n🧪 EJEMPLOS DE INTERPRETACIÓN:');
console.log('');

testCases.forEach(testCase => {
    const interpretation = interpretBenfordConformity(testCase.mad);
    console.log(`${interpretation.color} ${testCase.name}`);
    console.log(`   MAD: ${(testCase.mad * 100).toFixed(1)}%`);
    console.log(`   Nivel: ${interpretation.level}`);
    console.log(`   Interpretación: ${interpretation.description}`);
    console.log(`   Descripción: ${testCase.description}`);
    console.log('');
});

console.log('🎯 ANÁLISIS DE NUESTRO RESULTADO (6.50%):');
console.log('');
const ourResult = interpretBenfordConformity(0.065);
console.log(`${ourResult.color} MAD: 6.50%`);
console.log(`${ourResult.color} Nivel: ${ourResult.level}`);
console.log(`${ourResult.color} Riesgo: ${ourResult.riskLevel}`);
console.log(`${ourResult.color} Interpretación: ${ourResult.description}`);
console.log('');
console.log('📈 Comparación con umbrales:');
console.log(`   - Es ${(6.5 / 1.5).toFixed(1)}x mayor que el umbral de anomalías (1.5%)`);
console.log(`   - Es ${(6.5 / 0.6).toFixed(1)}x mayor que el umbral aceptable (0.6%)`);
console.log(`   - Indica manipulación CLARA en los datos de prueba`);

console.log('\n💡 CONSIDERACIONES IMPORTANTES:');
console.log('');
console.log('✅ Los datos de prueba fueron diseñados CON ANOMALÍAS INTENCIONADAS:');
console.log('   • Exceso de números que empiezan con 9 (manipulación)');
console.log('   • Exceso de números terminados en 0 y 5 (redondeo)');
console.log('   • Déficit en números que empiezan con 1, 2, 3');
console.log('');
console.log('✅ En datos reales de auditoría esperaríamos:');
console.log('   • MAD < 1.5% para poblaciones normales');
console.log('   • MAD 1.5-3% para poblaciones con algunas irregularidades');
console.log('   • MAD > 3% para poblaciones con manipulación significativa');

console.log('\n🔧 CONFIGURACIÓN RECOMENDADA PARA PRODUCCIÓN:');
console.log('');
console.log('Umbrales de Alerta:');
console.log('• 🟢 MAD < 1.2%: Sin alertas - Población normal');
console.log('• 🟡 MAD 1.2-1.5%: Alerta MEDIA - Revisar patrones');
console.log('• 🔴 MAD > 1.5%: Alerta ALTA - Investigación requerida');
console.log('• 🚨 MAD > 3%: Alerta CRÍTICA - Manipulación probable');

console.log('\n📋 RECOMENDACIONES DE ACCIÓN:');
console.log('');
console.log('Para MAD > 1.5% (NONCONFORMITY):');
console.log('1. Aumentar tamaño de muestra significativamente');
console.log('2. Implementar muestreo dirigido en áreas problemáticas');
console.log('3. Realizar pruebas sustantivas adicionales');
console.log('4. Documentar hallazgos para revisión gerencial');
console.log('5. Considerar extensión del alcance de auditoría');

console.log('\n✅ CONCLUSIÓN:');
console.log('El resultado de 6.50% MAD es CORRECTO para datos de prueba con anomalías.');
console.log('En producción, este nivel indicaría manipulación significativa y requeriría');
console.log('investigación inmediata según las Normas Internacionales de Auditoría (NIA).');