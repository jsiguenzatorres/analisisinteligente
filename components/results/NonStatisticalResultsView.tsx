import React, { useState, useEffect, useMemo } from 'react';
import { AppState, AuditResults, UserRole, AuditSampleItem } from '../../types';
import SharedResultsLayout from './SharedResultsLayout';
import { supabase } from '../../services/supabaseClient';
import { calculateInference, calculateVariableExpansion, formatMoney } from '../../services/statisticalService';
import Modal from '../ui/Modal';
import { RichInfoCard } from '../ui/RichInfoCard';

interface Props {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
    role: UserRole;
    onBack: () => void;
}

const NonStatisticalResultsView: React.FC<Props> = ({ appState, setAppState, role, onBack }) => {
    const [currentResults, setCurrentResults] = useState<AuditResults>(appState.results!);
    const [isSaving, setIsSaving] = useState(false);
    const [isExpanding, setIsExpanding] = useState(false);
    const [helpKey, setHelpKey] = useState<string | null>(null);
    const [saveFeedback, setSaveFeedback] = useState<{ show: boolean, title: string, message: string, type: 'success' | 'error' }>({
        show: false,
        title: '',
        message: '',
        type: 'success'
    });
    const [helpContent, setHelpContent] = useState<{ title: string, text: string, auditImpact: string } | null>(null);

    const AUDIT_HELP = useMemo(() => {
        const expandedItems = currentResults.sample.filter(i => i.risk_factors?.some(f => f.includes('Ampliación'))).length;
        const initialItems = currentResults.sample.length - expandedItems;

        return {
            STRATEGY: {
                title: "Estrategia de Selección",
                text: "Determina el método cualitativo de extracción de la muestra.",
                auditImpact: "La selección dirigida (Smart Selection) garantiza que el auditor revise los ítems donde convergen múltiples alertas forenses, maximizando la probabilidad de detectar irregularidades en comparación con una muestra aleatoria."
            },
            SIZE: {
                title: "Tamaño de la Muestra (n)",
                text: expandedItems > 0
                    ? `Alcance técnico desglosado: Muestra Inicial (${initialItems}) + Ampliación por Riesgo (${expandedItems}) = Total de ${currentResults.sample.length} unidades físicas bajo revisión.`
                    : `Número de unidades físicas seleccionadas para inspección (${initialItems} ítems).`,
                auditImpact: expandedItems > 0
                    ? "La NIA 530 exige ampliar el alcance cuando los hallazgos iniciales superan la materialidad. Esta expansión permite al auditor mitigar el riesgo de detección y validar si los errores son sistemáticos."
                    : "Un tamaño de muestra robusto, ponderado por los Gaps de Riesgo de la población, permite al auditor alcanzar una conclusión con mayor grado de seguridad sobre el universo total."
            },
            MATERIALITY: {
                title: "Materialidad (TE)",
                text: "Umbral de Error Tolerable definido para esta prueba específica.",
                auditImpact: "Si el error acumulado supera este monto, el auditor debe considerar la expansión de la muestra o calificar su opinión, ya que las desviaciones identificadas tienen el potencial de distorsionar los estados financieros o el control interno."
            },
            COVERAGE: {
                title: "Cobertura Monetaria",
                text: "Porcentaje del valor total de la población cubierto por los ítems de la muestra.",
                auditImpact: "Representa el 'Cubrimiento Económico' de la prueba. Una cobertura alta reduce el riesgo de que existan errores significativos en la parte no probada de la población."
            },
            ERROR_ACCUM: {
                title: "Evaluación de Hallazgos",
                text: "Suma de las diferencias cuantitativas identificadas en la ejecución.",
                auditImpact: "Permite una evaluación técnica inmediata. La barra de progreso muestra visualmente qué tan cerca estamos de agotar la Materialidad (TE) asignada."
            }
        };
    }, [currentResults.sample, currentResults.sampleSize]);

    const isApproved = appState.results?.findings?.[0]?.isApproved || false;
    const nsParams = appState.samplingParams.nonStatistical;
    const selectedInsight = nsParams.selectedInsight || 'Default';
    const totalValue = appState.selectedPopulation?.total_monetary_value || 0;
    const totalRows = appState.selectedPopulation?.total_rows || 0;
    const materiality = nsParams.materiality || 50000;

    // Métricas de Ejecución
    const exceptions = currentResults.sample.filter(i => i.compliance_status === 'EXCEPCION');
    const errorsFound = exceptions.length;
    const totalErrorAmount = exceptions.reduce((acc, curr) => acc + (curr.error_amount || 0), 0);

    const inference = useMemo(() => calculateInference(currentResults, appState.samplingMethod, totalValue, totalRows), [currentResults]);
    const expansionMetrics = useMemo(() => calculateVariableExpansion(appState, currentResults, errorsFound, 0, totalRows), [appState, currentResults, errorsFound, totalRows]);

    const isAcceptable = totalErrorAmount <= materiality;
    const canExpand = errorsFound > 0 && expansionMetrics.recommendedExpansion > 0 && currentResults.sampleSize < totalRows;

    const saveToDb = async (updatedResults: AuditResults, silent = true) => {
        if (!appState.selectedPopulation?.id) return;
        setIsSaving(true);
        try {
            const currentMethodResults = {
                ...updatedResults,
                method: appState.samplingMethod,
                sampling_params: appState.samplingParams
            };

            const updatedStorage = {
                ...(appState.full_results_storage || {}),
                [appState.samplingMethod]: currentMethodResults,
                last_method: appState.samplingMethod
            };

            const { error } = await supabase
                .from('audit_results')
                .upsert({
                    population_id: appState.selectedPopulation.id,
                    results_json: updatedStorage,
                    sample_size: updatedResults.sampleSize,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'population_id' });

            if (error) {
                setSaveFeedback({ show: true, title: "Error", message: error.message, type: 'error' });
            } else {
                setAppState(prev => ({ ...prev, full_results_storage: updatedStorage }));
                if (!silent) setSaveFeedback({ show: true, title: "Sincronizado", message: "Papel de trabajo actualizado.", type: 'success' });
            }
        } catch (err: any) {
            if (!silent) setSaveFeedback({ show: true, title: "Error", message: "Falla de red.", type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleExpandSample = async () => {
        if (!appState.selectedPopulation) return;
        setIsExpanding(true);
        try {
            const amountToFetch = expansionMetrics.recommendedExpansion;

            // Lógica de expansión: Buscar los siguientes con mayor riesgo que no estén en la muestra
            const existingIds = currentResults.sample.map(i => i.id);

            let query = supabase
                .from('audit_data_rows')
                .select('*')
                .eq('population_id', appState.selectedPopulation.id)
                .not('unique_id_col', 'in', `(${existingIds.map(id => `'${id}'`).join(',')})`)
                .order('risk_score', { ascending: false })
                .limit(amountToFetch);

            const { data: newRows, error } = await query;

            if (error) throw error;

            if (newRows && newRows.length > 0) {
                const mapping = appState.selectedPopulation.column_mapping;
                const newItems: AuditSampleItem[] = newRows.map((r, i) => ({
                    id: String(r.unique_id_col),
                    value: r.monetary_value_col || 0,
                    risk_score: r.risk_score,
                    risk_factors: [...(r.risk_factors || []), "Fase: Ampliación"],
                    risk_flag: 'AMPLIACIÓN RIESGO',
                    risk_justification: `Ítem seleccionado por riesgo (${r.risk_score}) ante hallazgos detectados.`,
                    compliance_status: 'OK',
                    error_description: '',
                    raw_row: r.raw_json
                }));

                const updatedResults: AuditResults = {
                    ...currentResults,
                    sampleSize: currentResults.sampleSize + newItems.length,
                    sample: [...currentResults.sample, ...newItems],
                    methodologyNotes: [
                        ...currentResults.methodologyNotes,
                        `Ampliación: Se agregaron ${newItems.length} registros (Riesgo Top) por hallazgos previos.`
                    ]
                };

                await saveToDb(updatedResults, true);
                setCurrentResults(updatedResults);
                setAppState(prev => ({ ...prev, results: updatedResults }));
                setSaveFeedback({ show: true, title: "Muestra Ampliada", message: `Se integraron ${newItems.length} registros adicionales.`, type: 'success' });
            }
        } catch (e: any) {
            setSaveFeedback({ show: true, title: "Error", message: e.message, type: 'error' });
        } finally {
            setIsExpanding(false);
        }
    };

    useEffect(() => {
        if (saveFeedback.show) {
            const timer = setTimeout(() => setSaveFeedback(prev => ({ ...prev, show: false })), 3000);
            return () => clearTimeout(timer);
        }
    }, [saveFeedback.show]);

    const sidebar = (
        <div className="space-y-6">
            {/* Dashboard summary */}
            <div className="bg-[#0f172a] p-10 rounded-[2.5rem] shadow-2xl text-white border border-slate-800 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl"></div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-6 flex items-center gap-3">
                    <i className="fas fa-stethoscope"></i> Evaluación de Muestra
                </h4>

                <div className="space-y-6">
                    <div>
                        <span className="text-[9px] font-black text-rose-300/50 uppercase block mb-1">Hallazgos Detectados</span>
                        <span className="text-4xl font-black text-white">{errorsFound}</span>
                    </div>

                    <div className="h-[1px] bg-slate-800"></div>

                    <div>
                        <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Error Acumulado</span>
                        <span className={`text-2xl font-black ${isAcceptable ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {formatMoney(totalErrorAmount)}
                        </span>
                    </div>

                    <div className="pt-2">
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${isAcceptable ? 'bg-emerald-400' : 'bg-rose-500'}`}
                                style={{ width: `${Math.min(100, (totalErrorAmount / materiality) * 100)}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Materialidad: {formatMoney(materiality)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {canExpand && (
                <div className="animate-fade-in-up">
                    <button
                        onClick={handleExpandSample}
                        disabled={isExpanding}
                        className="w-full py-6 bg-rose-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all flex items-center justify-center gap-3 animate-pulse"
                    >
                        {isExpanding ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus-circle"></i>}
                        Ampliar Muestra (+{expansionMetrics.recommendedExpansion})
                    </button>
                    <p className="text-[9px] text-slate-400 font-medium text-center mt-3 leading-relaxed">
                        Recomendado por NIA 530 ante hallazgos identificados.
                    </p>
                </div>
            )}

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Alcance Total</span>
                    <button
                        onClick={() => setHelpContent(AUDIT_HELP.SIZE)}
                        className="text-slate-300 hover:text-indigo-500 transition-colors"
                    >
                        <i className="fas fa-info-circle"></i>
                    </button>
                </div>
                <span className="text-4xl font-black text-slate-900">{currentResults.sampleSize}</span>
                <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">Partidas Bajo Revisión</p>
            </div>

        </div>
    );

    const main = (
        <div className="space-y-6">
            {/* RIBBON DE CONFIGURACIÓN */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-colors">
                    <div className="flex justify-between items-start">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estrategia</div>
                        <button onClick={() => setHelpContent(AUDIT_HELP.STRATEGY)} className="text-slate-300 hover:text-indigo-500"><i className="fas fa-info-circle text-[10px]"></i></button>
                    </div>
                    <div className="text-lg font-black text-indigo-600 flex items-center gap-2">
                        {selectedInsight === 'RiskScoring' ? 'Smart Selection' : selectedInsight}
                        <span className="px-2 py-0.5 bg-indigo-50 text-[7px] font-black text-indigo-400 rounded border border-indigo-100 uppercase">Analytics-Backed</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium">Bajo Juicio Profesional</div>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-200 transition-colors">
                    <div className="flex justify-between items-start">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tamaño (n)</div>
                        <button onClick={() => setHelpContent(AUDIT_HELP.SIZE)} className="text-slate-300 hover:text-slate-600"><i className="fas fa-info-circle text-[10px]"></i></button>
                    </div>
                    <div className="text-lg font-black text-slate-800">{currentResults.sampleSize}</div>
                    <div className="text-[9px] text-slate-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                        Sugerido: {30 + (appState.selectedPopulation?.risk_profile?.gapAlerts || 0) * 5}
                    </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:border-rose-200 transition-colors">
                    <div className="flex justify-between items-start">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Materialidad (TE)</div>
                        <button onClick={() => setHelpContent(AUDIT_HELP.MATERIALITY)} className="text-slate-300 hover:text-rose-500"><i className="fas fa-info-circle text-[10px]"></i></button>
                    </div>
                    <div className="text-lg font-black text-rose-600">{formatMoney(materiality)}</div>
                    <div className="text-[9px] text-slate-400 font-medium">Umbral Decisorio</div>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-colors">
                    <div className="flex justify-between items-start">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cobertura</div>
                        <button onClick={() => setHelpContent(AUDIT_HELP.COVERAGE)} className="text-slate-300 hover:text-emerald-500"><i className="fas fa-info-circle text-[10px]"></i></button>
                    </div>
                    <div className="text-lg font-black text-emerald-600">
                        {((currentResults.sample.reduce((a, b) => a + (b.value || 0), 0) / (totalValue || 1)) * 100).toFixed(1)}%
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium">Del Valor Total</div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                    <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Ejecución de Auditoría por Riesgo</h4>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            <span className="text-[8px] font-black text-slate-400 uppercase">Crítico</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span className="text-[8px] font-black text-slate-400 uppercase">Medio</span>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-10 py-6 w-16 text-center">#</th>
                                <th className="px-10 py-6">ID Registro</th>
                                <th className="px-10 py-6">Riesgo IA</th>
                                <th className="px-10 py-6 text-right">Valor Libro</th>
                                <th className="px-10 py-6 text-center">Revisión</th>
                                <th className="px-10 py-6">Punto de Auditoría / Hallazgo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentResults.sample.map((item, idx) => {
                                const isEx = item.compliance_status === 'EXCEPCION';
                                const riskScore = item.risk_score || 0;
                                const riskLevel = riskScore > 80 ? 'CRÍTICO' : riskScore > 50 ? 'MEDIO' : 'ESTÁNDAR';
                                const riskColor = riskScore > 80 ? 'bg-rose-500' : riskScore > 50 ? 'bg-amber-500' : 'bg-emerald-500';

                                return (
                                    <tr key={idx} className={`hover:bg-slate-50 transition-colors ${isEx ? 'bg-rose-50/40' : riskScore > 80 ? 'bg-rose-50/10' : ''}`}>
                                        <td className="px-10 py-6 text-[11px] font-black text-slate-300 text-center">{idx + 1}</td>
                                        <td className="px-10 py-6">
                                            <div className="font-black text-[12px] text-slate-800">{item.id}</div>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate max-w-[150px]">
                                                {item.risk_flag || 'Selección Aleatoria'}
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-1.5 w-12 rounded-full overflow-hidden bg-slate-100`}>
                                                    <div className={`h-full ${riskColor}`} style={{ width: `${riskScore}%` }}></div>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-500">{riskLevel}</span>
                                            </div>
                                            <div className="text-[8px] text-slate-300 font-bold mt-1 uppercase truncate max-w-[140px]">
                                                {item.risk_factors?.join(', ') || 'Sin factores clave'}
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <div className="text-[12px] font-bold text-slate-600 font-mono italic">{formatMoney(item.value || 0)}</div>
                                        </td>
                                        <td className="px-10 py-6 text-center">
                                            <button
                                                onClick={() => {
                                                    const ns = [...currentResults.sample];
                                                    ns[idx].compliance_status = ns[idx].compliance_status === 'OK' ? 'EXCEPCION' : 'OK';
                                                    if (ns[idx].compliance_status === 'OK') ns[idx].error_amount = 0;
                                                    const updated = { ...currentResults, sample: ns };
                                                    setCurrentResults(updated);
                                                    setAppState(prev => ({ ...prev, results: updated }));
                                                    saveToDb(updated, true);
                                                }}
                                                disabled={isApproved}
                                                className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isEx ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                            >
                                                {isEx ? 'CON ERROR' : 'SIN NOVEDAD'}
                                            </button>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex flex-col gap-2">
                                                <textarea
                                                    disabled={isApproved}
                                                    value={item.error_description || ''}
                                                    onChange={e => {
                                                        const ns = [...currentResults.sample];
                                                        ns[idx].error_description = e.target.value;
                                                        const updated = { ...currentResults, sample: ns };
                                                        setCurrentResults(updated);
                                                        setAppState(prev => ({ ...prev, results: updated }));
                                                    }}
                                                    onBlur={() => saveToDb(currentResults, true)}
                                                    className={`w-full bg-slate-50 border-none p-4 rounded-xl text-[11px] font-medium min-h-[60px] focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-300 ${isEx ? 'bg-white shadow-inner' : ''}`}
                                                    placeholder="Observaciones de auditoría..."
                                                />
                                                {isEx && (
                                                    <div className="flex items-center gap-2 animate-fade-in">
                                                        <span className="text-[9px] font-black text-rose-400 uppercase">Impacto $:</span>
                                                        <input
                                                            type="number"
                                                            value={item.error_amount || ''}
                                                            onChange={e => {
                                                                const val = parseFloat(e.target.value);
                                                                const ns = [...currentResults.sample];

                                                                if (val > item.value) {
                                                                    setSaveFeedback({
                                                                        show: true,
                                                                        title: "Validación Profesional",
                                                                        message: `El error (${formatMoney(val)}) no puede exceder el valor del ítem (${formatMoney(item.value)}).`,
                                                                        type: 'error'
                                                                    });
                                                                    ns[idx].error_amount = item.value;
                                                                } else if (val <= 0) {
                                                                    setSaveFeedback({
                                                                        show: true,
                                                                        title: "Aviso Técnico",
                                                                        message: "Un hallazgo cuantitativo requiere un valor positivo mayor a cero.",
                                                                        type: 'error'
                                                                    });
                                                                    ns[idx].error_amount = 0;
                                                                } else {
                                                                    ns[idx].error_amount = val;
                                                                }

                                                                const updated = { ...currentResults, sample: ns };
                                                                setCurrentResults(updated);
                                                                setAppState(prev => ({ ...prev, results: updated }));
                                                            }}
                                                            onBlur={() => saveToDb(currentResults, true)}
                                                            className="w-32 bg-rose-50 border border-rose-100 rounded-lg px-2 py-1 text-[11px] font-bold text-rose-700 focus:ring-2 focus:ring-rose-200 shadow-inner"
                                                            placeholder="Monto"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <SharedResultsLayout
                appState={appState} role={role} onBack={onBack} title="Muestreo No Estadístico: Panel de Control"
                onSaveManual={() => saveToDb(currentResults, false)}
                isSaving={isSaving}
                sidebarContent={sidebar} mainContent={main}
                certificationContent={
                    <div className="mt-10 p-10 bg-slate-900 rounded-[3rem] text-center border border-slate-800">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Certificación de Juicio Profesional</div>
                        <p className="text-slate-400 text-xs italic font-medium">
                            "He evaluado los resultados de la muestra anterior y considero que proporcionan evidencia de auditoría {(errorsFound === 0 || isAcceptable) ? 'suficiente y adecuada' : 'insuficiente'} para concluir sobre el objetivo planteado."
                        </p>
                    </div>
                }
            />

            {saveFeedback.show && (
                <div className="fixed bottom-10 right-10 z-[100] animate-fade-in-up">
                    <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border ${saveFeedback.type === 'success' ? 'bg-emerald-600 border-emerald-400' : 'bg-rose-600 border-rose-400'} text-white`}>
                        <i className={`fas ${saveFeedback.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">{saveFeedback.title}</p>
                            <p className="text-sm font-medium opacity-90">{saveFeedback.message}</p>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                isOpen={!!helpContent}
                onClose={() => setHelpContent(null)}
                title={helpContent?.title || ''}
            >
                <div className="space-y-6">
                    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 font-medium">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Definición Técnica</p>
                        <p className="text-sm text-indigo-900 leading-relaxed">{helpContent?.text}</p>
                    </div>
                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 font-medium">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-8 w-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shadow-sm">
                                <i className="fas fa-microscope text-xs"></i>
                            </div>
                            <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Impacto en Auditoría</p>
                        </div>
                        <p className="text-sm text-amber-900 leading-relaxed">{helpContent?.auditImpact}</p>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default NonStatisticalResultsView;
