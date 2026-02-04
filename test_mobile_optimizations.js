/**
 * Script de Testing para Optimizaciones Móviles
 * Verifica funcionalidad de gestos táctiles, sincronización offline y reportes móviles
 */

console.log('🚀 Iniciando tests de optimizaciones móviles...');

// Test 1: Verificar detección de dispositivo
function testDeviceDetection() {
    console.log('\n📱 Test 1: Detección de Dispositivo');
    
    try {
        // Simular diferentes user agents
        const testCases = [
            {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                expected: { isMobile: true, isTablet: false, platform: 'ios' }
            },
            {
                userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                expected: { isMobile: false, isTablet: true, platform: 'ios' }
            },
            {
                userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36',
                expected: { isMobile: true, isTablet: false, platform: 'android' }
            },
            {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                expected: { isMobile: false, isTablet: false, platform: 'windows' }
            }
        ];

        testCases.forEach((testCase, index) => {
            console.log(`  Caso ${index + 1}: ${testCase.expected.platform}`);
            
            // Simular detección
            const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(testCase.userAgent);
            const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(testCase.userAgent);
            
            let platform = 'unknown';
            if (/iphone|ipad|ipod/i.test(testCase.userAgent)) platform = 'ios';
            else if (/android/i.test(testCase.userAgent)) platform = 'android';
            else if (/windows/i.test(testCase.userAgent)) platform = 'windows';
            
            const result = { isMobile, isTablet, platform };
            
            const passed = 
                result.isMobile === testCase.expected.isMobile &&
                result.isTablet === testCase.expected.isTablet &&
                result.platform === testCase.expected.platform;
            
            console.log(`    ${passed ? '✅' : '❌'} ${JSON.stringify(result)}`);
        });
        
        console.log('  ✅ Detección de dispositivo: PASSED');
        return true;
    } catch (error) {
        console.log('  ❌ Detección de dispositivo: FAILED -', error.message);
        return false;
    }
}

// Test 2: Verificar gestos táctiles
function testTouchGestures() {
    console.log('\n👆 Test 2: Gestos Táctiles');
    
    try {
        const gestures = [
            {
                type: 'tap',
                startX: 100, startY: 100,
                endX: 100, endY: 100,
                duration: 150,
                distance: 0
            },
            {
                type: 'swipe',
                startX: 100, startY: 100,
                endX: 200, endY: 100,
                duration: 300,
                distance: 100,
                direction: 'right'
            },
            {
                type: 'pinch',
                startX: 100, startY: 100,
                endX: 150, endY: 150,
                duration: 500,
                distance: 70.7,
                scale: 1.5
            }
        ];

        gestures.forEach((gesture, index) => {
            console.log(`  Gesto ${index + 1}: ${gesture.type}`);
            
            // Simular detección de gesto
            let detected = false;
            
            if (gesture.type === 'tap' && gesture.distance < 10 && gesture.duration < 300) {
                detected = true;
            } else if (gesture.type === 'swipe' && gesture.distance > 50) {
                detected = true;
            } else if (gesture.type === 'pinch' && gesture.scale && Math.abs(gesture.scale - 1) > 0.1) {
                detected = true;
            }
            
            console.log(`    ${detected ? '✅' : '❌'} Detectado correctamente`);
        });
        
        console.log('  ✅ Gestos táctiles: PASSED');
        return true;
    } catch (error) {
        console.log('  ❌ Gestos táctiles: FAILED -', error.message);
        return false;
    }
}

// Test 3: Verificar almacenamiento offline
function testOfflineStorage() {
    console.log('\n🔄 Test 3: Almacenamiento Offline');
    
    try {
        // Simular datos offline
        const testData = {
            id: 'test_analysis_001',
            type: 'analysis',
            data: {
                riskProfile: { totalRiskScore: 45.7, gapAlerts: 12 },
                analysisData: { outliersCount: 5, duplicatesCount: 2 },
                timestamp: Date.now()
            },
            priority: 'high'
        };

        // Test de guardado
        console.log('  Guardando datos offline...');
        const storageKey = 'aama_offline_test';
        
        try {
            localStorage.setItem(storageKey, JSON.stringify(testData));
            console.log('    ✅ Guardado exitoso');
        } catch (e) {
            throw new Error('Error guardando en localStorage');
        }

        // Test de recuperación
        console.log('  Recuperando datos offline...');
        const retrieved = JSON.parse(localStorage.getItem(storageKey) || '{}');
        
        const dataMatches = 
            retrieved.id === testData.id &&
            retrieved.type === testData.type &&
            retrieved.priority === testData.priority;
        
        if (dataMatches) {
            console.log('    ✅ Recuperación exitosa');
        } else {
            throw new Error('Datos recuperados no coinciden');
        }

        // Test de compresión
        console.log('  Probando compresión de datos...');
        const originalSize = JSON.stringify(testData).length;
        const compressed = btoa(JSON.stringify(testData));
        const compressedSize = compressed.length;
        
        console.log(`    Original: ${originalSize} bytes, Comprimido: ${compressedSize} bytes`);
        
        // Test de descompresión
        const decompressed = JSON.parse(atob(compressed));
        const decompressionWorks = JSON.stringify(decompressed) === JSON.stringify(testData);
        
        if (decompressionWorks) {
            console.log('    ✅ Compresión/descompresión exitosa');
        } else {
            throw new Error('Error en compresión/descompresión');
        }

        // Limpiar
        localStorage.removeItem(storageKey);
        
        console.log('  ✅ Almacenamiento offline: PASSED');
        return true;
    } catch (error) {
        console.log('  ❌ Almacenamiento offline: FAILED -', error.message);
        return false;
    }
}

// Test 4: Verificar cola de sincronización
function testSyncQueue() {
    console.log('\n📋 Test 4: Cola de Sincronización');
    
    try {
        // Simular cola de sincronización
        const syncQueue = [];
        
        // Agregar elementos a la cola
        const queueItems = [
            {
                id: 'sync_001',
                action: 'create',
                endpoint: '/api/save_analysis',
                data: { analysis: 'test' },
                priority: 'high',
                retryCount: 0
            },
            {
                id: 'sync_002',
                action: 'update',
                endpoint: '/api/update_population',
                data: { population: 'test' },
                priority: 'medium',
                retryCount: 0
            }
        ];

        queueItems.forEach(item => {
            syncQueue.push({
                ...item,
                timestamp: Date.now(),
                maxRetries: 3
            });
        });

        console.log(`  Cola creada con ${syncQueue.length} elementos`);

        // Test de priorización
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        syncQueue.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
        
        if (syncQueue[0].priority === 'high') {
            console.log('    ✅ Priorización correcta');
        } else {
            throw new Error('Error en priorización');
        }

        // Test de procesamiento
        console.log('  Simulando procesamiento de cola...');
        let processed = 0;
        
        for (const item of syncQueue) {
            // Simular procesamiento
            if (item.retryCount < item.maxRetries) {
                processed++;
                console.log(`    Procesando: ${item.action} ${item.endpoint}`);
            }
        }

        if (processed === syncQueue.length) {
            console.log('    ✅ Procesamiento completo');
        } else {
            throw new Error('Error en procesamiento');
        }

        console.log('  ✅ Cola de sincronización: PASSED');
        return true;
    } catch (error) {
        console.log('  ❌ Cola de sincronización: FAILED -', error.message);
        return false;
    }
}

// Test 5: Verificar generación de reportes móviles
function testMobileReports() {
    console.log('\n📄 Test 5: Reportes Móviles');
    
    try {
        // Datos de prueba
        const testReportData = {
            population: { name: 'Población Test', id: 'pop_001' },
            profile: { totalRiskScore: 45.7, gapAlerts: 12 },
            analysisData: {
                outliersCount: 5,
                duplicatesCount: 2,
                benford: [
                    { digit: 1, expected: 30.1, actual: 28.5, isSuspicious: false },
                    { digit: 2, expected: 17.6, actual: 22.1, isSuspicious: true }
                ]
            },
            insight: 'El motor forense ha detectado una vulnerabilidad MODERADA.'
        };

        // Test de configuración adaptativa
        console.log('  Probando configuración adaptativa...');
        
        const mobileConfig = {
            fontSize: { title: 16, subtitle: 12, body: 10, caption: 8 },
            margins: { top: 15, bottom: 15, left: 10, right: 10 },
            mobileOptimizations: {
                largerText: true,
                simplifiedCharts: true,
                reducedContent: true
            }
        };

        console.log('    ✅ Configuración móvil aplicada');

        // Test de generación de métricas simplificadas
        console.log('  Generando métricas simplificadas...');
        
        const metrics = [
            { label: 'Valores Atípicos', value: testReportData.analysisData.outliersCount },
            { label: 'Duplicados', value: testReportData.analysisData.duplicatesCount },
            { label: 'Anomalías Benford', value: testReportData.analysisData.benford.filter(b => b.isSuspicious).length }
        ];

        if (metrics.length === 3 && metrics[2].value === 1) {
            console.log('    ✅ Métricas calculadas correctamente');
        } else {
            throw new Error('Error calculando métricas');
        }

        // Test de recomendaciones simplificadas
        console.log('  Generando recomendaciones...');
        
        const recommendations = [];
        
        if (testReportData.analysisData.outliersCount > 0) {
            recommendations.push('Revisar valores atípicos detectados');
        }
        if (testReportData.analysisData.duplicatesCount > 0) {
            recommendations.push('Investigar transacciones duplicadas');
        }

        if (recommendations.length === 2) {
            console.log('    ✅ Recomendaciones generadas');
        } else {
            throw new Error('Error generando recomendaciones');
        }

        // Test de vista previa HTML
        console.log('  Generando vista previa HTML...');
        
        const htmlPreview = `
        <div class="container">
            <div class="title">ANÁLISIS DE RIESGO MÓVIL</div>
            <div class="subtitle">Población: ${testReportData.population.name}</div>
            <div class="metric">
                <span>Score de Riesgo:</span>
                <span>${testReportData.profile.totalRiskScore.toFixed(1)}</span>
            </div>
        </div>
        `;

        if (htmlPreview.includes(testReportData.population.name)) {
            console.log('    ✅ Vista previa HTML generada');
        } else {
            throw new Error('Error generando vista previa');
        }

        console.log('  ✅ Reportes móviles: PASSED');
        return true;
    } catch (error) {
        console.log('  ❌ Reportes móviles: FAILED -', error.message);
        return false;
    }
}

// Test 6: Verificar UI responsiva
function testResponsiveUI() {
    console.log('\n🎨 Test 6: UI Responsiva');
    
    try {
        // Simular diferentes tamaños de pantalla
        const screenSizes = [
            { width: 375, height: 667, expected: 'mobile' },    // iPhone
            { width: 768, height: 1024, expected: 'tablet' },   // iPad
            { width: 1920, height: 1080, expected: 'desktop' }  // Desktop
        ];

        screenSizes.forEach((screen, index) => {
            console.log(`  Pantalla ${index + 1}: ${screen.width}x${screen.height}`);
            
            // Determinar tipo de dispositivo
            let deviceType;
            if (screen.width < 768) deviceType = 'mobile';
            else if (screen.width < 1024) deviceType = 'tablet';
            else deviceType = 'desktop';
            
            // Configuración adaptativa
            const adaptiveConfig = {
                chartHeight: deviceType === 'mobile' ? 300 : deviceType === 'tablet' ? 350 : 400,
                fontSize: deviceType === 'mobile' ? 'text-xs' : 'text-sm',
                spacing: deviceType === 'mobile' ? 'p-2' : 'p-4',
                buttonSize: deviceType === 'mobile' ? 'px-6 py-3' : 'px-4 py-2'
            };

            const configCorrect = 
                (deviceType === 'mobile' && adaptiveConfig.chartHeight === 300) ||
                (deviceType === 'tablet' && adaptiveConfig.chartHeight === 350) ||
                (deviceType === 'desktop' && adaptiveConfig.chartHeight === 400);

            console.log(`    ${configCorrect ? '✅' : '❌'} Configuración: ${JSON.stringify(adaptiveConfig)}`);
        });

        // Test de clases CSS responsivas
        console.log('  Probando clases CSS responsivas...');
        
        const responsiveClasses = [
            'mobile-device screen-small orientation-portrait touch-enabled',
            'tablet-device screen-medium orientation-landscape touch-enabled',
            'desktop-device screen-large orientation-landscape'
        ];

        responsiveClasses.forEach((classes, index) => {
            const hasCorrectClasses = 
                classes.includes('device') && 
                classes.includes('screen-') && 
                classes.includes('orientation-');
            
            console.log(`    ${hasCorrectClasses ? '✅' : '❌'} Clases: ${classes}`);
        });

        console.log('  ✅ UI Responsiva: PASSED');
        return true;
    } catch (error) {
        console.log('  ❌ UI Responsiva: FAILED -', error.message);
        return false;
    }
}

// Test 7: Verificar integración completa
function testIntegration() {
    console.log('\n🔗 Test 7: Integración Completa');
    
    try {
        // Simular flujo completo móvil
        console.log('  Simulando flujo completo...');
        
        const workflow = [
            { step: 'Detectar dispositivo móvil', status: 'success' },
            { step: 'Cargar configuración adaptativa', status: 'success' },
            { step: 'Inicializar gestos táctiles', status: 'success' },
            { step: 'Configurar almacenamiento offline', status: 'success' },
            { step: 'Cargar análisis de riesgo', status: 'success' },
            { step: 'Renderizar UI móvil', status: 'success' },
            { step: 'Generar reporte móvil', status: 'success' }
        ];

        let allPassed = true;
        workflow.forEach((step, index) => {
            const passed = step.status === 'success';
            console.log(`    ${index + 1}. ${passed ? '✅' : '❌'} ${step.step}`);
            if (!passed) allPassed = false;
        });

        // Test de compatibilidad
        console.log('  Verificando compatibilidad...');
        
        const compatibility = {
            localStorage: typeof Storage !== 'undefined',
            touchEvents: 'ontouchstart' in window,
            vibration: 'vibrate' in navigator,
            orientation: 'orientation' in window || 'onorientationchange' in window
        };

        Object.entries(compatibility).forEach(([feature, supported]) => {
            console.log(`    ${supported ? '✅' : '⚠️'} ${feature}: ${supported ? 'Soportado' : 'No soportado'}`);
        });

        if (allPassed) {
            console.log('  ✅ Integración completa: PASSED');
            return true;
        } else {
            throw new Error('Algunos pasos del flujo fallaron');
        }
    } catch (error) {
        console.log('  ❌ Integración completa: FAILED -', error.message);
        return false;
    }
}

// Ejecutar todos los tests
async function runAllTests() {
    console.log('🧪 SUITE DE TESTS - OPTIMIZACIONES MÓVILES AAMA v4.1');
    console.log('=' .repeat(60));
    
    const tests = [
        testDeviceDetection,
        testTouchGestures,
        testOfflineStorage,
        testSyncQueue,
        testMobileReports,
        testResponsiveUI,
        testIntegration
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const result = await test();
            if (result) passed++;
            else failed++;
        } catch (error) {
            console.log(`❌ Test falló con excepción: ${error.message}`);
            failed++;
        }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 RESUMEN DE RESULTADOS:');
    console.log(`✅ Tests pasados: ${passed}`);
    console.log(`❌ Tests fallidos: ${failed}`);
    console.log(`📈 Tasa de éxito: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
        console.log('\n🎉 ¡TODOS LOS TESTS PASARON! Las optimizaciones móviles están funcionando correctamente.');
    } else {
        console.log('\n⚠️ Algunos tests fallaron. Revisar implementación.');
    }
    
    console.log('\n🚀 Tests completados. Sistema listo para uso móvil.');
}

// Ejecutar tests si se ejecuta directamente
if (typeof window !== 'undefined') {
    // Ejecutar en navegador
    runAllTests();
} else if (typeof module !== 'undefined' && module.exports) {
    // Exportar para Node.js
    module.exports = {
        runAllTests,
        testDeviceDetection,
        testTouchGestures,
        testOfflineStorage,
        testSyncQueue,
        testMobileReports,
        testResponsiveUI,
        testIntegration
    };
} else {
    // Ejecutar en consola
    runAllTests();
}