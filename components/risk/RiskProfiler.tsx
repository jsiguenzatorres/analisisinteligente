import React, { useState, useEffect } from 'react';
import { AuditPopulation, RiskProfile, AdvancedAnalysis } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { performRiskProfiling, parseCurrency } from '../../services/riskAnalysisService';
import { analyzePopulationAndRecommend } from '../../services/recommendationService'; // Import Recommendation Service
import { useToast } from '../ui/ToastContext';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface Props {
    population: AuditPopulation;
    onComplete: (updatedPop: AuditPopulation) => void;
}

const RiskProfiler: React.FC<Props> = ({ population, onComplete }) => {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<RiskProfile | null>(null);
    const [scatterData, setScatterData] = useState<any[]>([]);
    const [insight, setInsight] = useState<string>('');
    // New state to hold analysis for recommendation
    const [analysisData, setAnalysisData] = useState<AdvancedAnalysis | null>(null);
    const { addToast } = useToast();

    // Función para generar sugerencias inteligentes dinámicas
    const generateIntelligentSuggestions = () => {
        if (!analysisData) return [];

        const suggestions = [];

        // Sugerencias basadas en Análisis de Entropía
        if (analysisData.entropy) {
            if (analysisData.entropy.highRiskCombinations > 0) {
                suggestions.push({
                    id: 'entropy_high_risk',
                    type: 'CRITICAL',
                    icon: 'fa-microchip',
                    title: 'Combinaciones Categóricas Críticas Detectadas',
                    description: `Se identificaron ${analysisData.entropy.highRiskCombinations} combinaciones de categorías de alto riesgo. Estas representan patrones inusuales que pueden indicar transacciones ficticias o clasificaciones erróneas.`,
                    actions: [
                        'Revisar manualmente todas las combinaciones marcadas como alto riesgo',
                        'Verificar la validez de las clasificaciones categóricas inusuales',
                        'Investigar si existen nuevos tipos de transacciones no documentadas',
                        'Considerar muestreo dirigido en estas combinaciones específicas'
                    ],
                    priority: 'HIGH'
                });
            } else if (analysisData.entropy.anomalousCount > 5) {
                suggestions.push({
                    id: 'entropy_medium_risk',
                    type: 'WARNING',
                    icon: 'fa-microchip',
                    title: 'Diversidad Categórica Inusual',
                    description: `Se detectaron ${analysisData.entropy.anomalousCount} combinaciones categóricas poco frecuentes. Aunque no son críticas, merecen atención.`,
                    actions: [
                        'Revisar una muestra de las combinaciones menos frecuentes',
                        'Validar que las categorías estén siendo aplicadas correctamente',
                        'Documentar nuevos tipos de transacciones si son legítimas'
                    ],
                    priority: 'MEDIUM'
                });
            }
        }

        // Sugerencias basadas en Detección de Fraccionamiento
        if (analysisData.splitting) {
            if (analysisData.splitting.highRiskGroups > 0) {
                suggestions.push({
                    id: 'splitting_critical',
                    type: 'CRITICAL',
                    icon: 'fa-scissors',
                    title: 'Fraccionamiento de Alto Riesgo Detectado',
                    description: `Se identificaron ${analysisData.splitting.highRiskGroups} grupos de proveedores con patrones de fraccionamiento críticos. Score promedio: ${analysisData.splitting.averageRiskScore.toFixed(1)}.`,
                    actions: [
                        'URGENTE: Investigar inmediatamente los proveedores de alto riesgo',
                        'Revisar todas las transacciones de estos proveedores en el período',
                        'Verificar si existen aprobaciones gerenciales para montos agregados',
                        'Evaluar controles de autorización por límites de compra',
                        'Considerar auditoría especial de estos proveedores'
                    ],
                    priority: 'CRITICAL'
                });
            } else if (analysisData.splitting.suspiciousVendors > 0) {
                suggestions.push({
                    id: 'splitting_warning',
                    type: 'WARNING',
                    icon: 'fa-scissors',
                    title: 'Patrones de Fraccionamiento Detectados',
                    description: `${analysisData.splitting.suspiciousVendors} proveedores muestran patrones que podrían indicar fraccionamiento de transacciones.`,
                    actions: [
                        'Revisar los patrones de compra de estos proveedores',
                        'Verificar si los montos agregados exceden límites de autorización',
                        'Evaluar la justificación comercial de múltiples transacciones pequeñas'
                    ],
                    priority: 'MEDIUM'
                });
            }
        }

        // Sugerencias basadas en Integridad Secuencial
        if (analysisData.sequential) {
            if (analysisData.sequential.highRiskGaps > 0) {
                suggestions.push({
                    id: 'sequential_critical',
                    type: 'CRITICAL',
                    icon: 'fa-barcode',
                    title: 'Gaps Secuenciales Críticos Detectados',
                    description: `Se encontraron ${analysisData.sequential.highRiskGaps} gaps de alto riesgo en la secuencia. Gap más grande: ${analysisData.sequential.largestGap} documentos faltantes.`,
                    actions: [
                        'URGENTE: Investigar la causa de los gaps grandes en la numeración',
                        'Solicitar explicación formal sobre documentos faltantes',
                        'Revisar controles de custodia y archivo de documentos',
                        'Verificar si existen documentos anulados no reportados',
                        'Evaluar integridad del sistema de numeración automática'
                    ],
                    priority: 'CRITICAL'
                });
            } else if (analysisData.sequential.totalGaps > 0) {
                suggestions.push({
                    id: 'sequential_warning',
                    type: 'WARNING',
                    icon: 'fa-barcode',
                    title: 'Gaps en Numeración Secuencial',
                    description: `Se detectaron ${analysisData.sequential.totalGaps} gaps en la secuencia con ${analysisData.sequential.totalMissingDocuments} documentos faltantes en total.`,
                    actions: [
                        'Revisar la política de numeración secuencial',
                        'Verificar procedimientos de anulación de documentos',
                        'Evaluar controles sobre la custodia de documentos prenumerados'
                    ],
                    priority: 'MEDIUM'
                });
            }
        }

        // Sugerencias basadas en Isolation Forest
        if (analysisData.isolationForest) {
            if (analysisData.isolationForest.highRiskAnomalies > 0) {
                suggestions.push({
                    id: 'ml_critical',
                    type: 'CRITICAL',
                    icon: 'fa-brain',
                    title: 'Anomalías Multidimensionales Críticas',
                    description: `El algoritmo de Machine Learning detectó ${analysisData.isolationForest.highRiskAnomalies} transacciones con patrones altamente anómalos considerando múltiples variables simultáneamente.`,
                    actions: [
                        'Revisar detalladamente las transacciones marcadas como anomalías críticas',
                        'Analizar el contexto y justificación de estas transacciones inusuales',
                        'Verificar si representan nuevos tipos de operaciones o errores',
                        'Considerar estas transacciones como prioritarias en el muestreo'
                    ],
                    priority: 'HIGH'
                });
            } else if (analysisData.isolationForest.totalAnomalies > 10) {
                suggestions.push({
                    id: 'ml_warning',
                    type: 'INFO',
                    icon: 'fa-brain',
                    title: 'Patrones Inusuales Detectados por ML',
                    description: `Se identificaron ${analysisData.isolationForest.totalAnomalies} transacciones con patrones inusuales según análisis multidimensional.`,
                    actions: [
                        'Revisar una muestra de las anomalías detectadas',
                        'Evaluar si representan variaciones normales del negocio',
                        'Documentar nuevos patrones si son operaciones legítimas'
                    ],
                    priority: 'LOW'
                });
            }
        }

        // Sugerencias basadas en Actor Profiling
        if (analysisData.actorProfiling) {
            if (analysisData.actorProfiling.highRiskActors > 0) {
                suggestions.push({
                    id: 'actor_critical',
                    type: 'CRITICAL',
                    icon: 'fa-user-secret',
                    title: 'Comportamientos de Usuario Críticos',
                    description: `${analysisData.actorProfiling.highRiskActors} usuarios muestran patrones de comportamiento de alto riesgo. Score promedio: ${analysisData.actorProfiling.averageRiskScore.toFixed(1)}.`,
                    actions: [
                        'CONFIDENCIAL: Investigar discretamente los usuarios de alto riesgo',
                        'Revisar horarios y patrones de trabajo inusuales',
                        'Evaluar accesos y permisos de estos usuarios',
                        'Considerar monitoreo adicional de sus actividades',
                        'Verificar cumplimiento de políticas internas'
                    ],
                    priority: 'CRITICAL'
                });
            } else if (analysisData.actorProfiling.totalSuspiciousActors > 0) {
                suggestions.push({
                    id: 'actor_warning',
                    type: 'WARNING',
                    icon: 'fa-user-secret',
                    title: 'Patrones de Usuario Inusuales',
                    description: `${analysisData.actorProfiling.totalSuspiciousActors} usuarios presentan patrones de actividad que merecen atención.`,
                    actions: [
                        'Revisar patrones de trabajo de estos usuarios',
                        'Verificar justificación de actividades fuera de horario',
                        'Evaluar si requieren capacitación adicional'
                    ],
                    priority: 'MEDIUM'
                });
            }
        }

        // Sugerencias basadas en Enhanced Benford
        if (analysisData.enhancedBenford) {
            if (analysisData.enhancedBenford.conformityRiskLevel === 'HIGH') {
                suggestions.push({
                    id: 'benford_critical',
                    type: 'CRITICAL',
                    icon: 'fa-calculator',
                    title: 'Desviación Crítica de la Ley de Benford',
                    description: `MAD: ${analysisData.enhancedBenford.overallDeviation.toFixed(2)}% - ${analysisData.enhancedBenford.conformityDescription}. Se detectaron ${analysisData.enhancedBenford.highRiskPatterns} patrones críticos.`,
                    actions: [
                        'URGENTE: Investigar posible manipulación de datos financieros',
                        'Revisar procesos de captura y validación de datos',
                        'Analizar patrones específicos de dígitos anómalos',
                        'Verificar integridad de sistemas de información',
                        'Considerar auditoría forense especializada'
                    ],
                    priority: 'CRITICAL'
                });
            } else if (analysisData.enhancedBenford.conformityRiskLevel === 'MEDIUM') {
                suggestions.push({
                    id: 'benford_warning',
                    type: 'WARNING',
                    icon: 'fa-calculator',
                    title: 'Desviaciones en Distribución de Dígitos',
                    description: `MAD: ${analysisData.enhancedBenford.overallDeviation.toFixed(2)}% - Conformidad marginal con la Ley de Benford.`,
                    actions: [
                        'Revisar procesos de redondeo y aproximación',
                        'Verificar si existen sesgos en la captura de datos',
                        'Evaluar la naturaleza de las transacciones analizadas'
                    ],
                    priority: 'MEDIUM'
                });
            }
        }

        // Sugerencias generales basadas en múltiples hallazgos
        const totalHighRiskFindings = suggestions.filter(s => s.priority === 'CRITICAL' || s.priority === 'HIGH').length;
        
        if (totalHighRiskFindings >= 3) {
            suggestions.unshift({
                id: 'general_critical',
                type: 'CRITICAL',
                icon: 'fa-exclamation-triangle',
                title: 'Múltiples Hallazgos Críticos - Acción Inmediata Requerida',
                description: `Se detectaron ${totalHighRiskFindings} tipos diferentes de anomalías críticas. Esta combinación sugiere riesgos significativos que requieren atención inmediata.`,
                actions: [
                    'URGENTE: Escalar hallazgos a la gerencia inmediatamente',
                    'Suspender procesamiento de transacciones hasta investigación',
                    'Implementar muestreo dirigido con tamaño aumentado significativamente',
                    'Considerar auditoría forense especializada',
                    'Documentar todos los hallazgos para reporte gerencial',
                    'Evaluar controles internos de forma integral'
                ],
                priority: 'CRITICAL'
            });
        }

        // Sugerencias de muestreo específicas
        const totalAnomalies = (analysisData.entropy?.anomalousCount || 0) + 
                              (analysisData.splitting?.suspiciousVendors || 0) + 
                              (analysisData.sequential?.totalGaps || 0) + 
                              (analysisData.isolationForest?.totalAnomalies || 0) + 
                              (analysisData.actorProfiling?.totalSuspiciousActors || 0);

        if (totalAnomalies > 20) {
            suggestions.push({
                id: 'sampling_recommendation',
                type: 'INFO',
                icon: 'fa-random',
                title: 'Recomendación de Estrategia de Muestreo',
                description: `Dado el alto número de anomalías detectadas (${totalAnomalies}), se recomienda una estrategia de muestreo híbrida.`,
                actions: [
                    'Implementar muestreo dirigido en áreas de alto riesgo identificadas',
                    'Aumentar tamaño de muestra en 50-100% sobre lo inicialmente planeado',
                    'Considerar muestreo estratificado por nivel de riesgo',
                    'Incluir todas las transacciones marcadas como críticas',
                    'Documentar justificación del enfoque de muestreo modificado'
                ],
                priority: 'HIGH'
            });
        }

        return suggestions.sort((a, b) => {
            const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'WARNING': 1, 'INFO': 0 };
            return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
        });
    };
    const getForensicMetrics = () => {
        if (!analysisData) return [];

        const metrics = [];

        // Análisis de Entropía
        if (analysisData.entropy) {
            metrics.push({
                id: 'entropy',
                title: 'Anomalías Categóricas',
                value: analysisData.entropy.anomalousCount,
                subtitle: `${analysisData.entropy.highRiskCombinations} de alto riesgo`,
                icon: 'fa-microchip',
                color: analysisData.entropy.highRiskCombinations > 0 ? 'red' : 'blue',
                description: `Entropía: ${analysisData.entropy.categoryEntropy.toFixed(2)} bits`
            });
        }

        // Detección de Fraccionamiento
        if (analysisData.splitting) {
            metrics.push({
                id: 'splitting',
                title: 'Fraccionamiento',
                value: analysisData.splitting.suspiciousVendors,
                subtitle: `${analysisData.splitting.totalSuspiciousTransactions} transacciones`,
                icon: 'fa-scissors',
                color: analysisData.splitting.highRiskGroups > 0 ? 'red' : 
                       analysisData.splitting.suspiciousVendors > 0 ? 'yellow' : 'green',
                description: `Score promedio: ${analysisData.splitting.averageRiskScore.toFixed(1)}`
            });
        }

        // Integridad Secuencial
        if (analysisData.sequential) {
            metrics.push({
                id: 'sequential',
                title: 'Gaps Secuenciales',
                value: analysisData.sequential.totalGaps,
                subtitle: `${analysisData.sequential.totalMissingDocuments} docs faltantes`,
                icon: 'fa-barcode',
                color: analysisData.sequential.highRiskGaps > 0 ? 'red' : 
                       analysisData.sequential.totalGaps > 0 ? 'yellow' : 'green',
                description: `Gap más grande: ${analysisData.sequential.largestGap}`
            });
        }

        // Análisis Tradicionales
        metrics.push({
            id: 'benford',
            title: 'Ley de Benford',
            value: analysisData.benford.filter(b => b.isSuspicious).length,
            subtitle: 'dígitos anómalos',
            icon: 'fa-chart-bar',
            color: analysisData.benford.filter(b => b.isSuspicious).length > 2 ? 'yellow' : 'blue',
            description: 'Distribución de dígitos iniciales'
        });

        // Isolation Forest (Machine Learning)
        if (analysisData.isolationForest) {
            metrics.push({
                id: 'isolation_forest',
                title: 'ML Anomalías',
                value: analysisData.isolationForest.totalAnomalies,
                subtitle: `${analysisData.isolationForest.highRiskAnomalies} de alto riesgo`,
                icon: 'fa-brain',
                color: analysisData.isolationForest.highRiskAnomalies > 0 ? 'red' : 
                       analysisData.isolationForest.totalAnomalies > 5 ? 'yellow' : 'green',
                description: `Umbral: ${analysisData.isolationForest.anomalyThreshold.toFixed(3)}`
            });
        }

        // Actor Profiling (Análisis de Comportamiento)
        if (analysisData.actorProfiling) {
            metrics.push({
                id: 'actor_profiling',
                title: 'Actores Sospechosos',
                value: analysisData.actorProfiling.totalSuspiciousActors,
                subtitle: `${analysisData.actorProfiling.highRiskActors} de alto riesgo`,
                icon: 'fa-user-secret',
                color: analysisData.actorProfiling.highRiskActors > 0 ? 'red' : 
                       analysisData.actorProfiling.totalSuspiciousActors > 0 ? 'yellow' : 'green',
                description: `Score promedio: ${analysisData.actorProfiling.averageRiskScore.toFixed(1)}`
            });
        }

        // Enhanced Benford Analysis
        if (analysisData.enhancedBenford) {
            const conformityColor = analysisData.enhancedBenford.overallDeviation > 3 ? 'red' :
                                  analysisData.enhancedBenford.overallDeviation > 1.5 ? 'yellow' :
                                  analysisData.enhancedBenford.overallDeviation > 1.2 ? 'yellow' : 'green';
            
            metrics.push({
                id: 'enhanced_benford',
                title: 'Benford Mejorado',
                value: analysisData.enhancedBenford.suspiciousPatterns,
                subtitle: `MAD: ${analysisData.enhancedBenford.overallDeviation.toFixed(2)}%`,
                icon: 'fa-calculator',
                color: conformityColor,
                description: `${analysisData.enhancedBenford.highRiskPatterns} patrones críticos`
            });
        }

        metrics.push({
            id: 'outliers',
            title: 'Valores Atípicos',
            value: analysisData.outliersCount,
            subtitle: 'outliers detectados',
            icon: 'fa-expand-arrows-alt',
            color: analysisData.outliersCount > 10 ? 'red' : 
                   analysisData.outliersCount > 5 ? 'yellow' : 'green',
            description: `Umbral: ${analysisData.outliersThreshold.toLocaleString()}`
        });

        metrics.push({
            id: 'duplicates',
            title: 'Duplicados',
            value: analysisData.duplicatesCount,
            subtitle: 'transacciones repetidas',
            icon: 'fa-copy',
            color: analysisData.duplicatesCount > 5 ? 'red' : 
                   analysisData.duplicatesCount > 0 ? 'yellow' : 'green',
            description: 'Detección inteligente por mapeo'
        });

        return metrics;
    };

    // Función para obtener el color de la métrica
    const getMetricColorClasses = (color: string) => {
        switch (color) {
            case 'red':
                return 'bg-red-50 border-red-200 text-red-800';
            case 'yellow':
                return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            case 'green':
                return 'bg-green-50 border-green-200 text-green-800';
            default:
                return 'bg-blue-50 border-blue-200 text-blue-800';
        }
    };

    useEffect(() => {
        analyzeRisk();
    }, []);

    const analyzeRisk = async () => {
        setLoading(true);
        try {
            console.log("🚀 Starting Risk Analysis via Proxy...");
            // 1. Fetch Data Rows using Proxy (Limit 2000 for now)
            const res = await fetch(`/api/get_validation_data?id=${population.id}`);
            if (!res.ok) throw new Error('Failed to load analysis data via proxy');

            const { rows } = await res.json();

            if (!rows) throw new Error("Universo no disponible");

            // Updated to receive advancedAnalysis
            const { updatedRows, profile: newProfile, advancedAnalysis } = performRiskProfiling(rows, population);
            setProfile(newProfile);
            setAnalysisData(advancedAnalysis); // Store for later use

            const mapping = population.column_mapping;
            const plotData = updatedRows.map((r, index) => {
                // Safeguard against missing column mapping or null values
                const rawVal = r.raw_json?.[mapping.monetaryValue || ''];

                // Use robust helper
                let mValue = parseCurrency(rawVal);


                // Prevent log(0) issues or infinities
                const zVal = mValue > 0 ? Math.log10(mValue + 1) * 10 : 10;

                return {
                    id: r.id || `row-${index}`, // Ensure unique ID for Recharts keys
                    x: r.alert_count ?? 0,
                    y: r.risk_score ?? 0,
                    z: zVal,
                    name: r.unique_id_col || `ID-${index}`,
                    value: mValue
                };
            });
            // Removed filter(d => d.y > 0) to show neutral items too, giving context to the auditor

            setScatterData(plotData);

            // Persistencia de scores forenses via Proxy
            console.log("💾 Saving Risk Scores via Proxy...");
            const batchUpdate = updatedRows.map(r => ({
                id: r.id,
                monetary_value_col: r.monetary_value_col, // Important for DB stats
                risk_score: r.risk_score,
                risk_factors: r.risk_factors
            }));

            // Use Proxy for Bulk Update
            const saveRes = await fetch('/api/update_risk_batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates: batchUpdate })
            });

            if (!saveRes.ok) {
                console.warn("⚠️ Error saving risk scores, but analysis continues locally.", await saveRes.text());
            } else {
                console.log("✅ Risk Scores Saved Successfully");
            }

            // Dictamen Forense Local (Heurístico)
            const riskLevel = newProfile.totalRiskScore > 70 ? 'CRÍTICA' : newProfile.totalRiskScore > 40 ? 'MODERADA' : 'BAJA';
            const insightMsg = `El motor forense ha detectado una vulnerabilidad ${riskLevel}. Se identificaron ${newProfile.gapAlerts} puntos críticos que requieren inspección manual obligatoria para cumplir con la NIA 530.`;
            setInsight(insightMsg);

            // AUTO-NOTIFY USER (Requested Feature)
            if (newProfile.gapAlerts > 0 || newProfile.totalRiskScore > 40) {
                addToast("Patrones complejos detectados. Se ha activado la Estrategia Forense.", 'info');
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!population || !analysisData) {
            onComplete(population);
            return;
        }

        setLoading(true);
        try {
            // Generate AI Recommendation
            const recommendation = analyzePopulationAndRecommend(population.descriptive_stats, analysisData);

            // Update Population
            const updatedPop = {
                ...population,
                ai_recommendation: recommendation,
                advanced_analysis: analysisData // Save the calculated stats too
            };

            // Save to DB
            // Save to DB via Proxy (reuse update_mapping as it targets audit_populations)
            console.log("💾 Saving Final Profile via Proxy...");
            const saveRes = await fetch('/api/update_mapping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: population.id,
                    ai_recommendation: recommendation,
                    advanced_analysis: analysisData
                })
            });

            if (!saveRes.ok) {
                console.warn("⚠️ Proxy save warning:", await saveRes.text());
                // Proceed anyway as state is updated locally
            }

            onComplete(updatedPop);
        } catch (e) {
            console.error("Error saving recommendation", e);
            onComplete(population);
        }
        setLoading(false);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[3rem] shadow-sm">
            <div className="h-24 w-24 border-8 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <h3 className="mt-8 text-xl font-black text-slate-800 uppercase tracking-widest">Iniciando Motor MA-RISK</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase mt-2 tracking-[0.4em]">Cuantificando vectores de riesgo...</p>
        </div>
    );

    return (
        <div className="animate-fade-in space-y-10 pb-20">
            <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -mr-20 -mt-20"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-8">
                        <div className="h-20 w-20 rounded-[2rem] bg-indigo-600 flex items-center justify-center shadow-xl">
                            <i className="fas fa-radar text-3xl"></i>
                        </div>
                        <div>
                            <span className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2 block">Módulo de Perfilado AAMA v3.0</span>
                            <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Análisis de Riesgo NIA 530</h2>
                        </div>
                    </div>
                    <div className="flex gap-10 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl">
                        <div className="text-center">
                            <div className="text-4xl font-black text-white">{profile?.totalRiskScore.toFixed(1)}</div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Score Promedio</div>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-center">
                            <div className="text-4xl font-black text-cyan-400">{profile?.gapAlerts}</div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Alertas Detectadas</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-white rounded-[3.5rem] p-12 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-10">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Red de Dispersión Forense</h4>
                    </div>

                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis type="number" dataKey="x" name="Alertas" hide />
                                <YAxis type="number" dataKey="y" name="Score" domain={[0, 100]} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                <ZAxis type="number" dataKey="z" range={[50, 800]} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                <ReferenceLine y={75} stroke="#f43f5e" strokeDasharray="5 5" label={{ position: 'right', value: 'ALTA PRIORIDAD', fill: '#f43f5e', fontSize: 8, fontWeight: 'bold' }} />
                                <Scatter name="Hallazgos" data={scatterData}>
                                    {scatterData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.y > 75 ? '#f43f5e' : entry.y > 40 ? '#f59e0b' : '#10b981'} fillOpacity={0.6} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[3rem] p-10 border border-indigo-100 shadow-inner">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                <i className="fas fa-microscope text-sm"></i>
                            </div>
                            <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Dictamen Forense</span>
                        </div>
                        <p className="text-sm font-medium text-slate-700 leading-relaxed italic border-l-4 border-indigo-200 pl-6">
                            "{insight}"
                        </p>
                    </div>
                </div>
            </div>

            {/* Sección de Métricas Forenses */}
            {analysisData && (
                <div className="bg-white rounded-[3.5rem] p-12 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="h-12 w-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <i className="fas fa-microscope text-lg"></i>
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-slate-800 uppercase tracking-wide">Análisis Forense Completo</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">9 Modelos de Detección de Anomalías</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {getForensicMetrics().map((metric) => (
                            <div
                                key={metric.id}
                                className={`border rounded-2xl p-6 transition-all hover:shadow-md ${getMetricColorClasses(metric.color)}`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center">
                                        <i className={`fas ${metric.icon} text-lg mr-3`}></i>
                                        <h5 className="font-bold text-sm">{metric.title}</h5>
                                    </div>
                                    <div className={`h-3 w-3 rounded-full ${
                                        metric.color === 'red' ? 'bg-red-500' :
                                        metric.color === 'yellow' ? 'bg-yellow-500' :
                                        metric.color === 'green' ? 'bg-green-500' : 'bg-blue-500'
                                    }`}></div>
                                </div>
                                <div className="text-3xl font-black mb-2">{metric.value}</div>
                                <div className="text-xs font-medium opacity-75 mb-2">{metric.subtitle}</div>
                                <div className="text-xs opacity-60">{metric.description}</div>
                            </div>
                        ))}
                    </div>

                    {/* Resumen de Riesgo */}
                    <div className="mt-10 bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-8 border border-slate-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-10 w-10 bg-slate-700 rounded-xl flex items-center justify-center text-white">
                                <i className="fas fa-clipboard-check text-sm"></i>
                            </div>
                            <h5 className="text-lg font-bold text-slate-800">Resumen de Hallazgos Forenses</h5>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="text-2xl font-black text-red-600">
                                    {getForensicMetrics().filter(m => m.color === 'red').length}
                                </div>
                                <div className="text-xs font-bold text-red-800 uppercase tracking-wide">Alto Riesgo</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-black text-yellow-600">
                                    {getForensicMetrics().filter(m => m.color === 'yellow').length}
                                </div>
                                <div className="text-xs font-bold text-yellow-800 uppercase tracking-wide">Riesgo Medio</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-black text-green-600">
                                    {getForensicMetrics().filter(m => m.color === 'green').length}
                                </div>
                                <div className="text-xs font-bold text-green-800 uppercase tracking-wide">Bajo Riesgo</div>
                            </div>
                        </div>

                        {/* Recomendación Automática */}
                        <div className="mt-6 p-6 bg-white rounded-xl border border-slate-200">
                            <div className="flex items-start gap-3">
                                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0 mt-1">
                                    <i className="fas fa-lightbulb text-xs"></i>
                                </div>
                                <div>
                                    <h6 className="font-bold text-slate-800 mb-2">Recomendación de Muestreo</h6>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        {getForensicMetrics().filter(m => m.color === 'red').length > 0 
                                            ? "🚨 Se detectaron anomalías de ALTO RIESGO. Se recomienda muestreo dirigido enfocado en las áreas problemáticas identificadas y revisión manual detallada antes de proceder."
                                            : getForensicMetrics().filter(m => m.color === 'yellow').length > 0
                                            ? "⚠️ Se detectaron anomalías de RIESGO MEDIO. Se recomienda aumentar el tamaño de muestra y considerar muestreo estratificado para abordar estas áreas."
                                            : "✅ La población presenta un perfil de riesgo BAJO. Se puede proceder con muestreo estadístico estándar con confianza."
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sección de Sugerencias Inteligentes */}
            {analysisData && (
                <div className="bg-white rounded-[3.5rem] p-12 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="h-12 w-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <i className="fas fa-brain text-lg"></i>
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-slate-800 uppercase tracking-wide">Sugerencias Inteligentes</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Recomendaciones Dinámicas Basadas en Hallazgos</p>
                        </div>
                    </div>

                    {(() => {
                        const suggestions = generateIntelligentSuggestions();
                        
                        if (suggestions.length === 0) {
                            return (
                                <div className="text-center py-12">
                                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i className="fas fa-check-circle text-2xl text-green-600"></i>
                                    </div>
                                    <h5 className="text-lg font-bold text-slate-800 mb-2">Población Sin Anomalías Críticas</h5>
                                    <p className="text-slate-600">No se detectaron patrones que requieran atención especial. La población presenta un perfil de riesgo normal.</p>
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-6">
                                {suggestions.map((suggestion, index) => {
                                    const getTypeColor = (type: string) => {
                                        switch (type) {
                                            case 'CRITICAL': return 'bg-red-50 border-red-200 text-red-800';
                                            case 'WARNING': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
                                            case 'INFO': return 'bg-blue-50 border-blue-200 text-blue-800';
                                            default: return 'bg-gray-50 border-gray-200 text-gray-800';
                                        }
                                    };

                                    const getIconColor = (type: string) => {
                                        switch (type) {
                                            case 'CRITICAL': return 'bg-red-600';
                                            case 'WARNING': return 'bg-yellow-600';
                                            case 'INFO': return 'bg-blue-600';
                                            default: return 'bg-gray-600';
                                        }
                                    };

                                    const getPriorityBadge = (priority: string) => {
                                        switch (priority) {
                                            case 'CRITICAL': return 'bg-red-600 text-white';
                                            case 'HIGH': return 'bg-orange-600 text-white';
                                            case 'MEDIUM': return 'bg-yellow-600 text-white';
                                            case 'LOW': return 'bg-blue-600 text-white';
                                            default: return 'bg-gray-600 text-white';
                                        }
                                    };

                                    return (
                                        <div key={suggestion.id} className={`border rounded-2xl p-6 ${getTypeColor(suggestion.type)}`}>
                                            <div className="flex items-start gap-4">
                                                <div className={`h-10 w-10 ${getIconColor(suggestion.type)} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                                                    <i className={`fas ${suggestion.icon} text-sm`}></i>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <h5 className="font-bold text-lg">{suggestion.title}</h5>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getPriorityBadge(suggestion.priority)}`}>
                                                            {suggestion.priority}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm leading-relaxed mb-4 opacity-90">
                                                        {suggestion.description}
                                                    </p>
                                                    <div className="space-y-2">
                                                        <h6 className="font-bold text-sm opacity-90">Acciones Recomendadas:</h6>
                                                        <ul className="space-y-1">
                                                            {suggestion.actions.map((action, actionIndex) => (
                                                                <li key={actionIndex} className="flex items-start gap-2 text-sm">
                                                                    <div className="h-1.5 w-1.5 bg-current rounded-full mt-2 flex-shrink-0"></div>
                                                                    <span className="leading-relaxed opacity-80">{action}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}

            <div className="flex justify-center pt-10">
                <button
                    onClick={handleComplete}
                    className="px-24 py-7 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-black transition-all transform hover:-translate-y-1"
                >
                    Confirmar Perfilado <i className="fas fa-chevron-right ml-6 text-cyan-400"></i>
                </button>
            </div>
        </div>
    );
};

export default RiskProfiler;
