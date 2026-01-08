
import React, { useState, useMemo } from 'react';
import { AppState, AdvancedAnalysis, InsightType } from '../../types';
import Modal from '../ui/Modal';
import {
    BarChart, Bar, ResponsiveContainer, Cell
} from 'recharts';
import { supabase } from '../../services/supabaseClient';
import { utils, writeFile } from 'xlsx';

interface Props {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}

const NonStatisticalSampling: React.FC<Props> = ({ appState, setAppState }) => {
    const params = appState.samplingParams.nonStatistical;
    const analysis = appState.selectedPopulation?.advanced_analysis;

    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailType, setDetailType] = useState<string | null>(null);
    const [detailItems, setDetailItems] = useState<any[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [selectedInsight, setSelectedInsight] = useState<InsightType | null>(null);

    const [explanationOpen, setExplanationOpen] = useState(false);
    const [explanationContent, setExplanationContent] = useState({ title: '', text: '', auditImpact: '' });

    const EDA_EXPLANATIONS = useMemo(() => {
        const gapAlerts = appState.selectedPopulation?.risk_profile?.gapAlerts || 0;
        const suggestedN = 30 + (gapAlerts * 5);

        return {
            NET_VALUE: {
                title: "Valor Neto de la Población",
                text: "Suma de todos los registros (Positivos + Negativos). Fórmula: Σ(Balance_i).",
                auditImpact: "Representa el saldo contable objeto de auditoría. Permite validar la integridad de la carga contra el balance general."
            },
            ABS_VALUE: {
                title: "Masa Monetaria (Valor Absoluto)",
                text: "Suma de los valores absolutos: Σ|Balance_i|. Ignora los signos para medir la exposición real.",
                auditImpact: "Es el universo real de riesgo. Un error positivo de $1M y uno negativo de $1M no se compensan para el auditor; representan $2M en riesgo de auditoría."
            },
            MEAN: {
                title: "Valor Medio (Promedio)",
                text: "Promedio simple de la población: ΣX / n.",
                auditImpact: "Sirve como base para proyectar errores. Una desviación grande entre la media y la mediana sugiere una población muy sesgada."
            },
            STD_DEV: {
                title: "Desviación Estándar (Sigma)",
                text: "Mide la dispersión de los datos respecto a la media. Fórmula: sqrt(Σ(x - μ)² / (n-1)).",
                auditImpact: "A mayor Sigma, mayor es el riesgo de que la muestra aleatoria no sea representativa. Indica alta volatilidad en los montos de transacción."
            },
            SKEWNESS: {
                title: "Coeficiente de Asimetría",
                text: "Indica hacia dónde se inclina el peso de la masa monetaria. (n / ((n-1)(n-2))) * Σ((x-μ)/s)³.",
                auditImpact: "Asimetría > 0.5 indica concentración en valores altos. Es crucial para decidir si se requiere una segregación de estratos de certeza."
            },
            SAMPLE_SIZE: {
                title: "Alcance de la Muestra (n)",
                text: `Fórmula aplicada: n = Base(30) + (Gaps de Riesgo * Factor_Ponderación(5))\n\nSustitución: n = 30 + (${gapAlerts} * 5) = ${suggestedN} unidades.`,
                auditImpact: `Incrementa progresivamente la cobertura en función de las anomalías detectadas. A mayor cantidad de 'Gaps' críticos (${gapAlerts}), mayor es el esfuerzo requerido.`
            },
            SMART_SELECTION: {
                title: "Selección Inteligente por Riesgo",
                text: "Algoritmo multivariable que prioriza ítems con intersección de banderas rojas (Benford + Outlier + Duplicado + Redondo).",
                auditImpact: "Optimiza el tiempo del auditor al enfocarse en los 'registros de mayor riesgo' en lugar de una selección aleatoria de bajo valor agregado."
            },
            RSF: {
                title: "Ratio de Tamaño Relativo (RSF)",
                text: "Cálculo: Valor Máximo / Segundo Valor Máximo.",
                auditImpact: "Detección de Outliers Extremos: Un ratio > 5-10 sugiere que el registro más alto es anómalo comparado con el resto, indicando posibles errores de digitación o fraude."
            },
            DATE_STATS: {
                title: "Análisis Cronológico",
                text: "Evaluación de la distribución temporal de transacciones y detección de actividad en días no hábiles.",
                auditImpact: "Identifica riesgos de control interno y transacciones extemporáneas."
            },
            CHAR_STATS: {
                title: "Calidad de Datos Maestros",
                text: "Evaluación de campos de texto, detección de duplicidades y registros incompletos.",
                auditImpact: "Detecta transacciones con autorizadores ausentes o descripciones genéricas sospechosas."
            }
        };
    }, [appState.selectedPopulation]);

    const formatMoney = (amount: number) => {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getBenfordAnomalyCount = () => {
        if (!analysis?.benford) return 0;
        return analysis.benford
            .filter(b => b.isSuspicious)
            .reduce((acc, curr) => acc + curr.actualCount, 0);
    };

    const handleInsightSelection = (type: InsightType) => {
        setSelectedInsight(type);
        let criteria = "";
        let justification = "";
        const criticality = params.processCriticality || 'Medio';

        switch (type) {
            case 'RiskScoring':
                criteria = "Estrategia 'Smart Selection' (Risk-Based): Algoritmo de extracción automatizada que prioriza unidades con alta densidad de alertas forenses. El sistema filtra y ordena el universo según un score ponderado donde convergen anomalías de Benford, valores atípicos, duplicidades y patrones de redondez.";
                justification = `Enfoque de Auditoría Basado en Riesgo Acumulado (Consejo 2320-3 del IIA): Se ha determinado que la eficacia de la prueba, dada una criticidad ${criticality}, se maximiza al inspeccionar los elementos que presentan simultáneamente múltiples factores de riesgo. Esta selección dirigida mitiga la posibilidad de omitir irregularidades críticas.`;
                break;
            case 'Benford':
                criteria = "Selección sustantiva focalizada en registros cuyos montos transgreden las expectativas de frecuencia natural (Ley de Benford).";
                justification = `Confirmación de Condiciones (IIA 2320-3): Las desviaciones en los dígitos iniciales sugieren intervenciones manuales. Ante un proceso de criticidad ${criticality}, se requiere esta revisión para validar la veracidad de los soportes documentales sin depender de inferencia probabilística.`;
                break;
            case 'Outliers':
                criteria = "Extracción de partidas situadas en la periferia de la distribución (Outliers), identificadas mediante el Rango Intercuartílico (IQR).";
                justification = `Materialidad e Insights Cualitativos: Al ser montos anómalos para un nivel de criticidad ${criticality}, representan el mayor impacto potencial. La selección busca confirmar la existencia de condiciones inusuales según el juicio profesional.`;
                break;
            case 'Duplicates':
                criteria = "Inspección de clústeres de datos con montos o atributos idénticos (Hallazgos Geométricos de Repetición).";
                justification = `Evaluación de Control Interno: Se busca validar si las repeticiones en este proceso (${criticality}) obedecen a fallas en el control preventivo, errores de registro o intentos premeditados de duplicidad.`;
                break;
            case 'RoundNumbers':
                criteria = "Selección de ítems con 'Redondeo Forense' (múltiplos significativos), técnica orientada a detectar estimaciones contables ad-hoc.";
                justification = `Debilidad en el Soporte: Los números redondos son inusuales y frecuentemente se vinculan a ajustes manuales. Este enfoque descriptivo (IIA 2320-3) se centra en confirmar la razonabilidad de las transacciones más sospechosas en el área.`;
                break;
        }

        const criticalGaps = appState.selectedPopulation?.risk_profile?.gapAlerts || 0;
        const suggestedSize = 30 + (criticalGaps * 5);

        setAppState(prev => ({
            ...prev,
            samplingParams: {
                ...prev.samplingParams,
                nonStatistical: {
                    ...prev.samplingParams.nonStatistical,
                    criteria: criteria,
                    justification: justification,
                    selectedInsight: type,
                    sampleSize: suggestedSize,
                    sizeJustification: ''
                }
            }
        }));
    };

    const handleShowDetails = async (e: React.MouseEvent, type: string) => {
        e.stopPropagation();
        if (!appState.selectedPopulation) return;

        setDetailType(type);
        setDetailModalOpen(true);
        setIsLoadingDetails(true);
        setDetailItems([]);

        try {
            let query = supabase
                .from('audit_data_rows')
                .select('unique_id_col, monetary_value_col, raw_json')
                .eq('population_id', appState.selectedPopulation.id);

            switch (type) {
                case 'Negativos':
                    query = query.lt('monetary_value_col', 0);
                    break;
                case 'Positivos':
                    query = query.gt('monetary_value_col', 0);
                    break;
                case 'En Cero':
                    query = query.eq('monetary_value_col', 0);
                    break;
                case 'Datos Erróneos':
                    query = query.is('monetary_value_col', null);
                    break;
                case 'Mínimo':
                    if (analysis?.eda?.minId) query = query.eq('unique_id_col', analysis.eda.minId);
                    else query = query.order('monetary_value_col', { ascending: true }).limit(1);
                    break;
                case 'Máximo':
                    if (analysis?.eda?.maxId) query = query.eq('unique_id_col', analysis.eda.maxId);
                    else query = query.order('monetary_value_col', { ascending: false }).limit(1);
                    break;
                case 'Outliers':
                    const threshold = analysis?.outliersThreshold || 0;
                    query = query.gt('monetary_value_col', threshold);
                    break;
                case 'Duplicates':
                    query = query.not('risk_factors', 'is', null).like('risk_factors', '%Duplicado%');
                    break;
                case 'RoundNumbers':
                    query = query.not('risk_factors', 'is', null).like('risk_factors', '%redondo%');
                    break;
                case 'Fin de Semana (WD)':
                    const dateField = appState.selectedPopulation.column_mapping.date;
                    if (dateField) {
                        // Using double arrow for JSONB casting to text and then checking day of week
                        // Note: Complex cases might need to be resolved via raw SQL but we try via JSONB filter if possible
                        // Or we fetch first 1000 and filter in client for the preview
                        const { data: allRows } = await supabase
                            .from('audit_data_rows')
                            .select('unique_id_col, monetary_value_col, raw_json')
                            .eq('population_id', appState.selectedPopulation.id)
                            .limit(1000);

                        const filtered = (allRows || []).filter(r => {
                            const d = new Date(r.raw_json?.[dateField]);
                            return !isNaN(d.getTime()) && (d.getDay() === 0 || d.getDay() === 6);
                        });
                        setDetailItems(filtered.map(r => ({ id: r.unique_id_col, value: r.monetary_value_col ?? 0, raw: r.raw_json })));
                        return;
                    }
                    break;
                case 'Campos Vacíos':
                    const textField = appState.selectedPopulation.column_mapping.category || appState.selectedPopulation.column_mapping.subcategory || appState.selectedPopulation.column_mapping.vendor;
                    if (textField) {
                        query = query.or(`raw_json->>${textField}.is.null,raw_json->>${textField}.eq.""`);
                    }
                    break;
            }

            const { data: rows, error } = await query.limit(100);

            if (error) throw error;
            setDetailItems((rows || []).map(r => ({
                id: r.unique_id_col,
                value: r.monetary_value_col ?? 0,
                raw: r.raw_json
            })));
        } catch (err) {
            console.error("Error fetching details:", err);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const showHelp = (e: React.MouseEvent, key: keyof typeof EDA_EXPLANATIONS) => {
        e.stopPropagation();
        setExplanationContent(EDA_EXPLANATIONS[key]);
        setExplanationOpen(true);
    };

    return (
        <>
            <div className="space-y-8 animate-fade-in">
                <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-slate-700 font-bold text-sm tracking-tight">Parámetros Específicos: Muestreo No Estadístico / de Juicio</h3>
                </div>

                <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-lg flex items-center shadow-sm">
                    <i className="fas fa-microscope text-teal-600 mr-4 text-xl"></i>
                    <div>
                        <h4 className="text-teal-900 font-black text-[11px] uppercase tracking-wider">Data Driven Insights</h4>
                        <p className="text-[11px] text-teal-700 font-medium">
                            El sistema ha analizado la población. Seleccione un enfoque para cargar automáticamente los criterios basados en riesgos detectados.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div
                        onClick={() => handleInsightSelection('Benford')}
                        className={`cursor-pointer bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group ${selectedInsight === 'Benford' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'}`}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ley de Benford</h5>
                            <button onClick={(e) => handleShowDetails(e, 'Benford')} className="text-emerald-500 hover:text-emerald-600 transition-colors">
                                <i className="fas fa-list-ul"></i>
                            </button>
                        </div>
                        <div className="flex justify-between items-end h-16">
                            <div className="flex-1 h-12 flex items-end gap-1 px-1">
                                {[40, 60, 20, 15, 10, 8, 7, 5, 4].map((h, i) => (
                                    <div key={i} className="flex-1 bg-rose-500 rounded-t-sm" style={{ height: `${h}%` }}></div>
                                ))}
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className="text-2xl font-black text-slate-800 leading-none">{getBenfordAnomalyCount()}</div>
                                <div className="text-[8px] font-black text-rose-500 uppercase mt-1">Anomalías</div>
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => handleInsightSelection('Outliers')}
                        className={`cursor-pointer bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${selectedInsight === 'Outliers' ? 'border-purple-500 ring-2 ring-purple-100 bg-purple-50/10' : 'border-slate-200'}`}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valores Atípicos</h5>
                            <button onClick={(e) => handleShowDetails(e, 'Outliers')} className="text-purple-500 hover:text-purple-600">
                                <i className="fas fa-expand-arrows-alt"></i>
                            </button>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-black text-purple-600 leading-none">{analysis?.outliersCount || 0}</div>
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Registros &gt; IQR</div>
                        </div>
                    </div>

                    <div
                        onClick={() => handleInsightSelection('Duplicates')}
                        className={`cursor-pointer bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${selectedInsight === 'Duplicates' ? 'border-orange-500 ring-2 ring-orange-100 bg-orange-50/10' : 'border-slate-200'}`}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duplicados</h5>
                            <button onClick={(e) => handleShowDetails(e, 'Duplicates')} className="text-orange-500 hover:text-orange-600">
                                <i className="fas fa-copy"></i>
                            </button>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-black text-orange-500 leading-none">{analysis?.duplicatesCount || 0}</div>
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Valores Repetidos</div>
                        </div>
                    </div>

                    <div
                        onClick={() => handleInsightSelection('RoundNumbers')}
                        className={`cursor-pointer bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${selectedInsight === 'RoundNumbers' ? 'border-cyan-500 ring-2 ring-cyan-100 bg-cyan-50/10' : 'border-slate-200'}`}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Números Redondos</h5>
                            <button onClick={(e) => handleShowDetails(e, 'RoundNumbers')} className="text-cyan-500 hover:text-cyan-600">
                                <i className="fas fa-coins"></i>
                            </button>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-black text-slate-800 leading-none">{analysis?.roundNumbersCount || 0}</div>
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1">Hallazgos Redondos</div>
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => handleInsightSelection('RiskScoring')}
                    className={`cursor-pointer bg-white border rounded-3xl p-6 shadow-sm relative overflow-hidden group transition-all hover:shadow-lg ${selectedInsight === 'RiskScoring' ? 'border-rose-500 ring-2 ring-rose-100 bg-rose-50/10' : 'border-slate-200'}`}
                >
                    <div className="absolute top-0 right-0 p-1 bg-rose-500 text-white text-[8px] font-black px-3 py-1 uppercase tracking-widest rounded-bl-xl shadow-lg">ESTRATEGIA ACTIVA</div>
                    <div className="flex items-center gap-6">
                        <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center border-4 border-rose-100 shadow-sm text-rose-500 flex-shrink-0">
                            <i className="fas fa-biohazard text-3xl"></i>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-slate-800 font-black text-base">Risk Scoring (Muestreo Inteligente)</h4>
                                <button onClick={(e) => showHelp(e, 'SMART_SELECTION' as any)} className="text-rose-300 hover:text-rose-500 transition-colors"><i className="fas fa-info-circle text-sm"></i></button>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed mt-1 max-w-3xl">
                                Combina todos los factores anteriores para calcular un <span className="font-bold text-slate-700">Puntaje de Riesgo</span> por transacción. Selecciona automáticamente los ítems con mayor coincidencia de alertas (ej. Outlier + Redondo + Duplicado).
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 col-span-2">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex-1">
                                <h4 className="text-slate-900 font-black text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
                                    Tamaño de la Muestra (n)
                                    <button onClick={(e) => showHelp(e, 'SAMPLE_SIZE' as any)} className="text-slate-300 hover:text-indigo-400 transition-colors"><i className="fas fa-info-circle text-xs"></i></button>
                                </h4>
                                <p className="text-[10px] text-slate-500 font-medium italic">
                                    Sugerencia Técnica (NIA 530): <span className="text-rose-600 font-bold">{30 + ((appState.selectedPopulation?.risk_profile?.gapAlerts || 0) * 5)} ítems</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">n =</span>
                                    <input
                                        type="number"
                                        value={params.sampleSize || 30}
                                        onChange={(e) => setAppState(prev => ({
                                            ...prev,
                                            samplingParams: {
                                                ...prev.samplingParams,
                                                nonStatistical: { ...prev.samplingParams.nonStatistical, sampleSize: parseInt(e.target.value) || 0 }
                                            }
                                        }))}
                                        className="w-32 bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-center font-black text-slate-800 focus:ring-4 focus:ring-rose-500/10 transition-all shadow-sm"
                                        min={1}
                                    />
                                </div>
                            </div>
                        </div>
                        {params.sampleSize !== (30 + ((appState.selectedPopulation?.risk_profile?.gapAlerts || 0) * 5)) && (
                            <div className="mt-4 p-5 bg-amber-50 rounded-2xl border border-amber-200 animate-fade-in-up">
                                <label className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                    <i className="fas fa-exclamation-triangle text-amber-600"></i> Justificación de Alcance Manual
                                </label>
                                <textarea
                                    value={params.sizeJustification || ''}
                                    onChange={(e) => setAppState(prev => ({
                                        ...prev,
                                        samplingParams: {
                                            ...prev.samplingParams,
                                            nonStatistical: { ...prev.samplingParams.nonStatistical, sizeJustification: e.target.value }
                                        }
                                    }))}
                                    className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl text-xs text-slate-700 font-medium h-20"
                                    placeholder="Explique las razones técnicas..."
                                />
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                        <h4 className="text-slate-900 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                            Criticidad del Proceso
                            <button onClick={(e) => showHelp(e, 'SKEWNESS' as any)} className="text-slate-300 hover:text-rose-400 transition-colors"><i className="fas fa-shield-halved text-xs"></i></button>
                        </h4>
                        <select
                            value={params.processCriticality || 'Medio'}
                            onChange={(e) => setAppState(prev => ({
                                ...prev,
                                samplingParams: {
                                    ...prev.samplingParams,
                                    nonStatistical: { ...prev.samplingParams.nonStatistical, processCriticality: e.target.value as any }
                                }
                            }))}
                            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-bold text-slate-800 shadow-sm focus:ring-4 focus:ring-rose-500/10 transition-all outline-none appearance-none"
                        >
                            <option value="Bajo">Bajo (Operativo)</option>
                            <option value="Medio">Medio (Táctico)</option>
                            <option value="Alto">Alto (Estratégico)</option>
                            <option value="Crítico">Crítico (Vital/Cumplimiento)</option>
                        </select>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                        <h4 className="text-slate-900 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                            Materialidad (TE)
                            <button onClick={(e) => showHelp(e, 'NET_VALUE' as any)} className="text-slate-300 hover:text-rose-400 transition-colors"><i className="fas fa-info-circle text-xs"></i></button>
                        </h4>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">$</span>
                            <input
                                type="number"
                                value={params.materiality || 50000}
                                onChange={(e) => setAppState(prev => ({
                                    ...prev,
                                    samplingParams: {
                                        ...prev.samplingParams,
                                        nonStatistical: { ...prev.samplingParams.nonStatistical, materiality: parseInt(e.target.value) || 0 }
                                    }
                                }))}
                                className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-8 pr-4 text-center font-black text-slate-800 shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {analysis?.eda && (
                    <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm animate-fade-in-up mt-8">
                        <div className="bg-slate-50 px-8 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <i className="fas fa-file-invoice-dollar text-indigo-500"></i> Ficha Técnica Descriptiva (EDA)
                            </h4>
                            <span className="text-[9px] font-bold text-slate-400 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">Población: {analysis.eda.totalRecords} ítems</span>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-10">
                            {/* Columna 1: Totales y Saldos */}
                            <div className="space-y-6">
                                <h5 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-2 flex justify-between items-center">
                                    Resumen de Saldos
                                    <button onClick={(e) => showHelp(e, 'NET_VALUE' as any)} className="text-indigo-300 hover:text-indigo-500"><i className="fas fa-info-circle text-[10px]"></i></button>
                                </h5>
                                <div className="space-y-4">
                                    <div
                                        className="flex justify-between items-end cursor-pointer group hover:bg-slate-50 p-1 rounded-lg transition-all"
                                        onClick={(e) => showHelp(e, 'NET_VALUE' as any)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-medium text-slate-500 uppercase">Valor Neto</span>
                                            <i className="fas fa-calculator text-[8px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                        </div>
                                        <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600">${formatMoney(analysis.eda.netValue)}</span>
                                    </div>
                                    <div
                                        className="flex justify-between items-end cursor-pointer group hover:bg-slate-50 p-1 rounded-lg transition-all"
                                        onClick={(e) => showHelp(e, 'ABS_VALUE' as any)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-medium text-slate-500 uppercase">Valor Absoluto</span>
                                            <i className="fas fa-calculator text-[8px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                        </div>
                                        <span className="text-sm font-black text-slate-900 group-hover:text-amber-600">${formatMoney(analysis.eda.absoluteValue)}</span>
                                    </div>
                                    <div className="pt-2">
                                        <div
                                            className="flex justify-between text-[9px] font-bold mb-1 cursor-pointer group hover:bg-emerald-50 p-1 rounded-lg"
                                            onClick={(e) => handleShowDetails(e, 'Positivos')}
                                        >
                                            <span className="text-emerald-600 uppercase">POSITIVOS ({analysis.eda.positiveCount})</span>
                                            <span className="text-emerald-700 font-black">${formatMoney(analysis.eda.positiveValue)}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-emerald-500" style={{ width: `${(analysis.eda.positiveCount / analysis.eda.totalRecords) * 100}%` }}></div>
                                            <div className="h-full bg-rose-500" style={{ width: `${(analysis.eda.negativeCount / analysis.eda.totalRecords) * 100}%` }}></div>
                                        </div>
                                        <div
                                            className="flex justify-between text-[9px] font-bold mt-1 cursor-pointer group hover:bg-rose-50 p-1 rounded-lg"
                                            onClick={(e) => handleShowDetails(e, 'Negativos')}
                                        >
                                            <span className="text-rose-600 uppercase">NEGATIVOS ({analysis.eda.negativeCount})</span>
                                            <span className="text-rose-700 font-black">${formatMoney(analysis.eda.negativeValue)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Columna 2: Centralidad y Rango */}
                            <div className="space-y-6">
                                <h5 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-2 flex justify-between items-center">
                                    Centralidad y Rango
                                    <button onClick={(e) => showHelp(e, 'MEAN' as any)} className="text-indigo-300 hover:text-indigo-500"><i className="fas fa-info-circle text-[10px]"></i></button>
                                </h5>
                                <div className="space-y-4">
                                    <div
                                        className="flex justify-between items-end cursor-pointer group hover:bg-slate-50 p-1 rounded-lg"
                                        onClick={(e) => showHelp(e, 'MEAN' as any)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-medium text-slate-500 uppercase">Valor Medio</span>
                                            <i className="fas fa-calculator text-[8px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                        </div>
                                        <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600">${formatMoney(analysis.eda.meanValue)}</span>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                                        <div
                                            className="flex justify-between items-center cursor-pointer group hover:bg-white p-1 rounded-lg"
                                            onClick={(e) => handleShowDetails(e, 'Mínimo')}
                                        >
                                            <span className="text-[9px] font-black text-slate-400 uppercase">Mínimo</span>
                                            <span className="text-[10px] font-black text-slate-700 group-hover:text-indigo-600">${formatMoney(analysis.eda.minValue)}</span>
                                        </div>
                                        <div
                                            className="flex justify-between items-center cursor-pointer group hover:bg-white p-1 rounded-lg"
                                            onClick={(e) => handleShowDetails(e, 'Máximo')}
                                        >
                                            <span className="text-[9px] font-black text-slate-400 uppercase">Máximo</span>
                                            <span className="text-[10px] font-black text-slate-700 group-hover:text-indigo-600">${formatMoney(analysis.eda.maxValue)}</span>
                                        </div>
                                    </div>
                                    <div
                                        className="flex justify-between items-end cursor-pointer group hover:bg-rose-50 p-1 rounded-lg"
                                        onClick={(e) => handleShowDetails(e, 'Datos Erróneos')}
                                    >
                                        <span className="text-[10px] font-medium text-slate-500 uppercase">Datos Erróneos</span>
                                        <span className={`font-black ${analysis.eda.errorDataCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{analysis.eda.errorDataCount}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Columna 3: Forma y Dispersión */}
                            <div className="space-y-6">
                                <h5 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-2 flex justify-between items-center">
                                    Forma y Dispersión
                                    <button onClick={(e) => showHelp(e, 'STD_DEV' as any)} className="text-indigo-300 hover:text-indigo-500"><i className="fas fa-info-circle text-[10px]"></i></button>
                                </h5>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div
                                            className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100 cursor-pointer group hover:bg-indigo-100/50 transition-all"
                                            onClick={(e) => showHelp(e, 'STD_DEV' as any)}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[8px] font-black text-indigo-400 uppercase block">Std Dev (s)</span>
                                                <i className="fas fa-calculator text-[8px] text-indigo-300"></i>
                                            </div>
                                            <span className="text-xs font-black text-indigo-900">${formatMoney(analysis.eda.sampleStdDev)}</span>
                                        </div>
                                        <div
                                            className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100 cursor-pointer group hover:bg-indigo-100/50 transition-all"
                                            onClick={(e) => showHelp(e, 'SKEWNESS' as any)}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[8px] font-black text-indigo-400 uppercase block">Asimetría</span>
                                                <i className="fas fa-calculator text-[8px] text-indigo-300"></i>
                                            </div>
                                            <span className="text-xs font-black text-indigo-900">{analysis.eda.skewness.toFixed(3)}</span>
                                        </div>
                                    </div>
                                    <p className="text-[8px] text-slate-400 font-medium leading-tight italic">
                                        {analysis.eda.skewness > 0.5 ? 'Cola derecha pesada: muchos valores bajos y pocos extremos altos.' : (analysis.eda.skewness < -0.5 ? 'Cola izquierda pesada: muchos registros altos concentrados.' : 'Distribución aproximadamente simétrica.')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 pt-0 grid grid-cols-1 md:grid-cols-3 gap-10 border-t border-slate-50 pt-8 mt-[-20px]">
                            {/* Columna 4: RSF */}
                            <div className="space-y-6">
                                <h5 className="text-[9px] font-black text-rose-600 uppercase tracking-widest border-b border-rose-50 pb-2 flex justify-between items-center">
                                    Factor de Tamaño Relativo (RSF)
                                    <button onClick={(e) => showHelp(e, 'RSF' as any)} className="text-rose-300 hover:text-rose-500"><i className="fas fa-info-circle text-[10px]"></i></button>
                                </h5>
                                <div className="space-y-4">
                                    <div
                                        className="flex justify-between items-end cursor-pointer group hover:bg-rose-50 p-1 rounded-lg transition-all"
                                        onClick={(e) => showHelp(e, 'RSF' as any)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-medium text-slate-500 uppercase">Ratio RSF</span>
                                            <i className="fas fa-calculator text-[8px] text-rose-300 opacity-0 group-hover:opacity-100"></i>
                                        </div>
                                        <span className={`text-sm font-black ${analysis.eda.rsf && analysis.eda.rsf.rsf > 10 ? 'text-rose-600' : 'text-slate-900'}`}>
                                            {analysis.eda.rsf?.rsf.toFixed(2) || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-rose-50/30 rounded-xl border border-rose-100 flex justify-between items-center cursor-default">
                                        <div className="text-[9px] font-bold text-rose-900">
                                            <div className="text-[8px] text-rose-400 uppercase tracking-tighter">Gap Top 1 vs Top 2</div>
                                            ${formatMoney(analysis.eda.rsf?.topValue || 0)} / ${formatMoney(analysis.eda.rsf?.secondTopValue || 0)}
                                        </div>
                                        <i className="fas fa-balance-scale-right text-rose-300 transform rotate-12"></i>
                                    </div>
                                </div>
                            </div>

                            {/* Columna 5: Fechas */}
                            <div className="space-y-6">
                                <h5 className="text-[9px] font-black text-amber-600 uppercase tracking-widest border-b border-amber-50 pb-2 flex justify-between items-center">
                                    Estadísticas de Fecha
                                    <button onClick={(e) => showHelp(e, 'DATE_STATS' as any)} className="text-amber-300 hover:text-amber-500"><i className="fas fa-info-circle text-[10px]"></i></button>
                                </h5>
                                {analysis.eda.dateStats ? (
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[10px] p-1">
                                            <span className="text-slate-500 uppercase">Brecha Temporal</span>
                                            <span className="font-black text-slate-700">{analysis.eda.dateStats.daysGap} días</span>
                                        </div>
                                        <div
                                            className="flex justify-between text-[10px] p-2 bg-amber-50 rounded-lg cursor-pointer hover:bg-amber-100 transition-all group"
                                            onClick={(e) => handleShowDetails(e, 'Fin de Semana (WD)')}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-amber-800 font-black uppercase">WD Count (Anomalía)</span>
                                                <i className="fas fa-eye text-[8px] text-amber-400 opacity-0 group-hover:opacity-100"></i>
                                            </div>
                                            <span className="font-black text-amber-900">{analysis.eda.dateStats.weekendCount}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-slate-400 italic">Mapee una columna de fecha para ver análisis cronológico.</p>
                                )}
                            </div>

                            {/* Columna 6: Textos */}
                            <div className="space-y-6">
                                <h5 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-50 pb-2 flex justify-between items-center">
                                    Estadísticas de Texto
                                    <button onClick={(e) => showHelp(e, 'CHAR_STATS' as any)} className="text-emerald-300 hover:text-emerald-500"><i className="fas fa-info-circle text-[10px]"></i></button>
                                </h5>
                                {analysis.eda.charStats ? (
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[10px] p-1">
                                            <span className="text-slate-500 uppercase">Campos Únicos</span>
                                            <span className="font-black text-slate-700">{analysis.eda.charStats.uniqueCount}</span>
                                        </div>
                                        <div
                                            className="flex justify-between text-[10px] p-2 bg-rose-50 rounded-lg cursor-pointer hover:bg-rose-100 transition-all group"
                                            onClick={(e) => handleShowDetails(e, 'Campos Vacíos')}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-rose-800 font-black uppercase">Vacíos / Nulos</span>
                                                <i className="fas fa-eye text-[8px] text-rose-400 opacity-0 group-hover:opacity-100"></i>
                                            </div>
                                            <span className="font-black text-rose-900">{analysis.eda.charStats.blankCount}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-slate-400 italic">Mapee al menos una columna de texto para ver este análisis.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-6 pt-4">
                    <div>
                        <label className="text-xs font-black text-slate-700 uppercase tracking-widest mb-2 block flex items-center">
                            Criterio de Selección <i className="fas fa-info-circle text-blue-400 ml-2"></i>
                        </label>
                        <textarea
                            name="criteria"
                            value={params.criteria}
                            onChange={(e) => setAppState(prev => ({ ...prev, samplingParams: { ...prev.samplingParams, nonStatistical: { ...prev.samplingParams.nonStatistical, criteria: e.target.value } } }))}
                            rows={3}
                            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm h-24"
                            placeholder="Describa qué elementos específicos seleccionará..."
                        />
                    </div>
                    <div>
                        <label className="text-xs font-black text-slate-700 uppercase tracking-widest mb-2 block">Justificación del Muestreo (Requerido)</label>
                        <textarea
                            name="justification"
                            value={params.justification}
                            onChange={(e) => setAppState(prev => ({ ...prev, samplingParams: { ...prev.samplingParams, nonStatistical: { ...prev.samplingParams.nonStatistical, justification: e.target.value } } }))}
                            rows={3}
                            className="w-full px-5 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm h-32"
                            placeholder="Explique por qué este criterio es relevante..."
                        />
                    </div>
                </div>

                <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={`Análisis Forense: ${detailType}`}>
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center border border-slate-200">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hallazgos</p>
                                <p className="text-2xl font-black text-slate-900">{detailItems.length}</p>
                            </div>
                            <button
                                onClick={() => {
                                    const ws = utils.json_to_sheet(detailItems);
                                    const wb = utils.book_new();
                                    utils.book_append_sheet(wb, ws, "Hallazgos");
                                    writeFile(wb, `AAMA_Forense_${detailType}.xlsx`);
                                }}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase shadow-md hover:bg-emerald-700"
                            >
                                <i className="fas fa-file-excel mr-2"></i> Exportar
                            </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar border rounded-2xl">
                            {isLoadingDetails ? (
                                <div className="p-10 text-center text-slate-400">Cargando...</div>
                            ) : (
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase">ID</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {detailItems.slice(0, 50).map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2 text-xs font-mono font-bold text-slate-600">{item.id}</td>
                                                <td className="px-4 py-2 text-xs text-right font-black text-slate-900">${formatMoney(item.value)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </Modal>

                <Modal isOpen={explanationOpen} onClose={() => setExplanationOpen(false)} title={explanationContent.title}>
                    <div className="space-y-6">
                        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                            <p className="text-xs font-bold text-indigo-900 uppercase tracking-widest mb-2">Definición Técnica</p>
                            <p className="text-sm text-indigo-800 leading-relaxed">{explanationContent.text}</p>
                        </div>
                        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-8 w-8 bg-amber-500 rounded-lg flex items-center justify-center text-white">
                                    <i className="fas fa-gavel text-xs"></i>
                                </div>
                                <p className="text-xs font-black text-amber-900 uppercase tracking-widest">Impacto en Auditoría</p>
                            </div>
                            <p className="text-sm text-amber-800 leading-relaxed font-medium">{explanationContent.auditImpact}</p>
                        </div>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default NonStatisticalSampling;
