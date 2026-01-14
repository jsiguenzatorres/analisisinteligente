// Prueba del algoritmo Isolation Forest implementado
console.log('🌲 Prueba de Isolation Forest - Machine Learning para Anomalías\n');

// Simular la clase SimpleIsolationForest
class SimpleIsolationForest {
    constructor(numTrees = 100, maxDepth = 10, subsampleSize = 256) {
        this.numTrees = numTrees;
        this.maxDepth = maxDepth;
        this.subsampleSize = subsampleSize;
        this.trees = [];
    }

    fit(data) {
        this.trees = [];
        
        for (let i = 0; i < this.numTrees; i++) {
            const subsample = this.randomSubsample(data, this.subsampleSize);
            const tree = this.buildTree(subsample, 0, this.maxDepth);
            this.trees.push(tree);
        }
    }

    predict(data) {
        return data.map(point => {
            const pathLengths = this.trees.map(tree => this.getPathLength(point, tree, 0));
            const avgPathLength = pathLengths.reduce((sum, len) => sum + len, 0) / pathLengths.length;
            
            const c = this.averagePathLengthBST(this.subsampleSize);
            const anomalyScore = Math.pow(2, -avgPathLength / c);
            
            return anomalyScore;
        });
    }

    randomSubsample(data, size) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(size, data.length));
    }

    buildTree(data, depth, maxDepth) {
        if (depth >= maxDepth || data.length <= 1) {
            return { isLeaf: true, size: data.length };
        }

        const numFeatures = data[0].length;
        const splitFeature = Math.floor(Math.random() * numFeatures);
        
        const featureValues = data.map(row => row[splitFeature]);
        const minVal = Math.min(...featureValues);
        const maxVal = Math.max(...featureValues);
        
        if (minVal === maxVal) {
            return { isLeaf: true, size: data.length };
        }

        const splitValue = Math.random() * (maxVal - minVal) + minVal;

        const leftData = data.filter(row => row[splitFeature] < splitValue);
        const rightData = data.filter(row => row[splitFeature] >= splitValue);

        if (leftData.length === 0 || rightData.length === 0) {
            return { isLeaf: true, size: data.length };
        }

        return {
            isLeaf: false,
            size: data.length,
            splitFeature,
            splitValue,
            left: this.buildTree(leftData, depth + 1, maxDepth),
            right: this.buildTree(rightData, depth + 1, maxDepth)
        };
    }

    getPathLength(point, tree, currentDepth) {
        if (tree.isLeaf) {
            return currentDepth + this.averagePathLengthBST(tree.size);
        }

        if (point[tree.splitFeature] < tree.splitValue) {
            return this.getPathLength(point, tree.left, currentDepth + 1);
        } else {
            return this.getPathLength(point, tree.right, currentDepth + 1);
        }
    }

    averagePathLengthBST(n) {
        if (n <= 1) return 0;
        return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
    }
}

// Datos de prueba con anomalías intencionadas
const testData = [
    // Datos normales (cluster principal)
    [2.3, 3, 12, 8, 5],    // Monto normal, día laboral, hora normal
    [2.5, 4, 14, 9, 5],
    [2.1, 2, 10, 7, 4],
    [2.4, 5, 16, 8, 6],
    [2.2, 1, 9, 10, 5],
    [2.6, 3, 11, 8, 5],
    [2.3, 4, 15, 9, 4],
    [2.4, 2, 13, 7, 6],
    [2.1, 5, 10, 11, 5],
    [2.5, 1, 14, 8, 4],
    
    // Más datos normales
    [2.2, 3, 12, 9, 5],
    [2.4, 4, 11, 8, 6],
    [2.3, 2, 15, 10, 4],
    [2.5, 5, 13, 7, 5],
    [2.1, 1, 14, 9, 5],
    
    // ANOMALÍAS INTENCIONADAS
    [4.5, 0, 2, 15, 8],    // Monto muy alto, domingo, madrugada, ID largo
    [4.2, 6, 23, 20, 9],   // Monto alto, sábado, noche, ID muy largo
    [0.5, 3, 12, 3, 1],    // Monto muy bajo, día normal, ID muy corto
    [3.8, 0, 1, 25, 10],   // Monto alto, domingo, madrugada, ID extremo
    [1.0, 6, 22, 2, 0]     // Monto bajo, sábado, noche, ID mínimo
];

console.log('📊 Datos de Prueba:');
console.log(`Total de registros: ${testData.length}`);
console.log('Características por registro: [log(monto), día_semana, hora, long_id, cat_hash]');
console.log('');

console.log('🔍 Entrenando Isolation Forest...');
const forest = new SimpleIsolationForest(30, 6, 16); // Parámetros reducidos para prueba
forest.fit(testData);

console.log('📈 Calculando scores de anomalía...');
const anomalyScores = forest.predict(testData);

// Calcular umbral (percentil 90 para prueba)
const sortedScores = [...anomalyScores].sort((a, b) => b - a);
const anomalyThreshold = sortedScores[Math.floor(sortedScores.length * 0.1)] || 0.6;

console.log(`🎯 Umbral de anomalía: ${anomalyThreshold.toFixed(3)}`);
console.log('');

console.log('🚨 Resultados del Análisis:');
console.log('Score | Anomalía | Descripción');
console.log('-'.repeat(50));

testData.forEach((point, index) => {
    const score = anomalyScores[index];
    const isAnomaly = score > anomalyThreshold;
    const status = isAnomaly ? '🔴 SÍ' : '🟢 NO';
    
    // Interpretar las características
    const monto = Math.pow(10, point[0] - 1).toFixed(0);
    const dia = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][point[1]];
    const hora = point[2];
    
    console.log(`${score.toFixed(3)} | ${status.padEnd(6)} | $${monto}, ${dia} ${hora}:00h`);
});

// Estadísticas finales
const totalAnomalies = anomalyScores.filter(score => score > anomalyThreshold).length;
const highRiskAnomalies = anomalyScores.filter(score => score > 0.8).length;

console.log('');
console.log('📊 Estadísticas Finales:');
console.log(`Total de anomalías detectadas: ${totalAnomalies}`);
console.log(`Anomalías de alto riesgo (>0.8): ${highRiskAnomalies}`);
console.log(`Porcentaje de anomalías: ${((totalAnomalies / testData.length) * 100).toFixed(1)}%`);

console.log('');
console.log('✅ Prueba de Isolation Forest Completada');

console.log('\n💡 Interpretación de Resultados:');
console.log('- Scores altos (>0.6): Patrones inusuales detectados por ML');
console.log('- El algoritmo identifica automáticamente combinaciones anómalas');
console.log('- No requiere definir reglas específicas, aprende patrones');
console.log('- Especialmente efectivo para anomalías multidimensionales');

console.log('\n🎯 Beneficios del Isolation Forest:');
console.log('✅ Detección automática sin reglas predefinidas');
console.log('✅ Maneja múltiples dimensiones simultáneamente');
console.log('✅ Robusto ante outliers en los datos de entrenamiento');
console.log('✅ Escalable para grandes volúmenes de datos');
console.log('✅ Complementa perfectamente los análisis estadísticos tradicionales');