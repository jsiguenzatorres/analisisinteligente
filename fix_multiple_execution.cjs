// Parche para prevenir múltiples ejecuciones simultáneas del botón MUS
const fs = require('fs');
const path = require('path');

console.log('🔧 Aplicando parche para prevenir múltiples ejecuciones...\n');

const filePath = path.join(__dirname, 'components', 'sampling', 'SamplingWorkspace.tsx');

// Leer el archivo actual
let content;
try {
    content = fs.readFileSync(filePath, 'utf8');
} catch (err) {
    console.error('❌ Error leyendo SamplingWorkspace.tsx:', err.message);
    process.exit(1);
}

// Buscar el estado loading
const loadingStateSearch = 'const [loading, setLoading] = useState(false);';
const loadingIndex = content.indexOf(loadingStateSearch);

if (loadingIndex === -1) {
    console.error('❌ No se encontró el estado loading');
    process.exit(1);
}

console.log('✅ Estado loading encontrado');

// Agregar estado adicional para prevenir múltiples ejecuciones
const beforeLoading = content.substring(0, loadingIndex + loadingStateSearch.length);
const afterLoading = content.substring(loadingIndex + loadingStateSearch.length);

const newStates = \`\${loadingStateSearch}
    const [isExecuting, setIsExecuting] = useState(false); // Prevenir múltiples ejecuciones
    const [executionStartTime, setExecutionStartTime] = useState<number | null>(null);\`;

let newContent = beforeLoading.replace(loadingStateSearch, newStates) + afterLoading;

// Buscar la función handleRunSampling para agregar protección
const handleRunSamplingSearch = 'const handleRunSampling = async (isFinal: boolean, manualAllocations?: Record<string, number>) => {';
const handleRunIndex = newContent.indexOf(handleRunSamplingSearch);

if (handleRunIndex === -1) {
    console.error('❌ No se encontró handleRunSampling');
    process.exit(1);
}

// Agregar protección al inicio de handleRunSampling
const beforeHandle = newContent.substring(0, handleRunIndex + handleRunSamplingSearch.length);
const afterHandle = newContent.substring(handleRunIndex + handleRunSamplingSearch.length);

const protectionCode = \`
        // PROTECCIÓN CONTRA MÚLTIPLES EJECUCIONES SIMULTÁNEAS
        if (isExecuting) {
            console.warn('⚠️ Ejecución ya en progreso, ignorando nueva solicitud');
            addToast('Ya hay una ejecución en progreso. Por favor espere.', 'warning');
            return;
        }

        // Verificar si hay una ejecución reciente (menos de 5 segundos)
        const now = Date.now();
        if (executionStartTime && (now - executionStartTime) < 5000) {
            console.warn('⚠️ Ejecución muy reciente, ignorando');
            addToast('Por favor espere al menos 5 segundos entre ejecuciones.', 'warning');
            return;
        }

        setIsExecuting(true);
        setExecutionStartTime(now);
        console.log('🚀 Iniciando nueva ejecución de muestreo...');\`;

newContent = beforeHandle + protectionCode + afterHandle;

// Buscar el finally block para limpiar el estado
const finallySearch = 'setLoading(false);';
const finallyIndex = newContent.lastIndexOf(finallySearch);

if (finallyIndex !== -1) {
    const beforeFinally = newContent.substring(0, finallyIndex + finallySearch.length);
    const afterFinally = newContent.substring(finallyIndex + finallySearch.length);
    
    const cleanupCode = \`\${finallySearch}
            setIsExecuting(false);
            console.log('✅ Ejecución completada, limpiando estados...');\`;
    
    newContent = beforeFinally.replace(finallySearch, cleanupCode) + afterFinally;
}

// Actualizar el disabled del botón
const buttonDisabledSearch = 'disabled={loading || showAllocationPreview}';
const buttonIndex = newContent.indexOf(buttonDisabledSearch);

if (buttonIndex !== -1) {
    newContent = newContent.replace(buttonDisabledSearch, 'disabled={loading || showAllocationPreview || isExecuting}');
}

// Actualizar el texto del botón para mostrar estado
const buttonTextSearch = '{showAllocationPreview ? \'Configurando Estratos...\' : \'Ejecutar Nueva Selección\'}';
const textIndex = newContent.indexOf(buttonTextSearch);

if (textIndex !== -1) {
    const newButtonText = \`{showAllocationPreview ? 'Configurando Estratos...' : isExecuting ? 'Ejecutando... Por favor espere' : loading ? 'Procesando...' : 'Ejecutar Nueva Selección'}\`;
    newContent = newContent.replace(buttonTextSearch, newButtonText);
}

// Escribir el archivo corregido
try {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('✅ Parche aplicado exitosamente');
    console.log('📋 Cambios realizados:');
    console.log('   - Estado isExecuting para prevenir múltiples ejecuciones');
    console.log('   - Protección contra ejecuciones muy frecuentes (5 segundos)');
    console.log('   - Botón deshabilitado durante ejecución');
    console.log('   - Texto del botón actualizado para mostrar estado');
    console.log('   - Logging detallado para diagnóstico');
    console.log('');
    console.log('🎯 Reinicia tu servidor y prueba MUS nuevamente');
    console.log('💡 Ahora el botón se deshabilitará completamente durante la ejecución');
} catch (err) {
    console.error('❌ Error escribiendo el archivo:', err.message);
    process.exit(1);
}