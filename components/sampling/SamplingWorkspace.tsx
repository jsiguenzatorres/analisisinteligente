
import React, { useEffect, useState } from 'react';
import { AppState, SamplingMethod, HistoricalSample } from '../../types';
import Modal from '../ui/Modal';
import AttributeSampling from '../samplingMethods/AttributeSampling';
import MonetaryUnitSampling from '../samplingMethods/MonetaryUnitSampling';
import ClassicalVariablesSampling from '../samplingMethods/ClassicalVariablesSampling';
import NonStatisticalSampling from '../samplingMethods/NonStatisticalSampling';
import StratifiedSampling from '../samplingMethods/StratifiedSampling';
import ObservationsManager from './ObservationsManager';
import { calculateSampleSize } from '../../services/statisticalService';
import { supabase } from '../../services/supabaseClient';
import SampleHistoryManager from './SampleHistoryManager';
import { useToast } from '../ui/ToastContext';
import StratumAllocationPreview from './StratumAllocationPreview';

interface Props {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
    currentMethod: SamplingMethod;
    onBack: () => void;
    onComplete: () => void;
}

const methodTitles: { [key in SamplingMethod]: string } = {
    [SamplingMethod.Attribute]: 'Muestreo de Atributos',
    [SamplingMethod.MUS]: 'Muestreo por Unidad Monetaria (MUS)',
    [SamplingMethod.CAV]: 'Muestreo de Variables Clásicas (CAV)',
    [SamplingMethod.Stratified]: 'Muestreo Estratificado',
    [SamplingMethod.NonStatistical]: 'Muestreo No Estadístico / de Juicio',
};

const methodColors: { [key in SamplingMethod]: string } = {
    [SamplingMethod.Attribute]: 'bg-blue-600',
    [SamplingMethod.MUS]: 'bg-amber-500',
    [SamplingMethod.CAV]: 'bg-orange-500',
    [SamplingMethod.Stratified]: 'bg-indigo-600',
    [SamplingMethod.NonStatistical]: 'bg-teal-500',
};

const SamplingWorkspace: React.FC<Props> = ({ appState, setAppState, currentMethod, onBack, onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [viewHistory, setViewHistory] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showReplaceWarning, setShowReplaceWarning] = useState(false);
    const [showAllocationPreview, setShowAllocationPreview] = useState(false);
    const [activeTab, setActiveTab] = useState<'config' | 'findings'>('config');
    const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
    const { addToast } = useToast();

    const checkExistingAndLock = async () => {
        if (!appState.selectedPopulation) return;
        setLoading(true);

        try {
            const { count, error } = await supabase
                .from('audit_historical_samples')
                .select('*', { count: 'exact', head: true })
                .eq('population_id', appState.selectedPopulation.id)
                .eq('is_current', true);

            if (error) throw error;

            if (count && count > 0) {
                setShowConfirmModal(false);
                setShowReplaceWarning(true);
                setLoading(false);
            } else {
                await handleRunSampling(true);
            }
        } catch (err: any) {
            addToast("Error al verificar historial: " + err.message, 'error');
            setLoading(false);
        }
    };

    const handleRunSampling = async (isFinal: boolean, manualAllocations?: Record<string, number>) => {
        if (!appState.selectedPopulation) return;
        setLoading(true);
        setShowConfirmModal(false);
        setShowReplaceWarning(false);
        setShowAllocationPreview(false);

        // Update local state with allocations if provided
        if (manualAllocations) {
            setAppState(prev => ({
                ...prev,
                samplingParams: {
                    ...prev.samplingParams,
                    stratified: { ...prev.samplingParams.stratified, manualAllocations }
                }
            }));
        }

        try {
            // Use Proxy for fetching data (Bypass Firewall)
            const res = await fetch(`/api/get_universe?population_id=${appState.selectedPopulation.id}`);
            if (!res.ok) throw new Error('Failed to fetch population data via proxy');

            const { rows: realRows } = await res.json();

            // Use updated appState with manualAllocations if applicable
            const currentAppState = manualAllocations ? {
                ...appState,
                samplingParams: {
                    ...appState.samplingParams,
                    stratified: { ...appState.samplingParams.stratified, manualAllocations }
                }
            } : appState;

            const results = calculateSampleSize(currentAppState, realRows || []);

            // Adjuntar las observaciones al snapshot de resultados para el reporte
            results.observations = appState.observations;

            // ... (rest of the logic remains similar but ensures result.sampling_params is correct)

            if (isFinal) {
                await supabase
                    .from('audit_historical_samples')
                    .update({ is_current: false })
                    .eq('population_id', appState.selectedPopulation.id)
                    .eq('is_current', true);

                const historicalData = {
                    population_id: appState.selectedPopulation.id,
                    method: appState.samplingMethod,
                    objective: appState.generalParams.objective,
                    seed: appState.generalParams.seed,
                    sample_size: results.sampleSize,
                    params_snapshot: appState.samplingParams,
                    results_snapshot: results,
                    is_final: true,
                    is_current: true
                };

                // Use Proxy for Saving to avoid Firewall issues
                const savePayload = {
                    population_id: appState.selectedPopulation.id,
                    method: appState.samplingMethod,
                    sample_data: historicalData,
                    is_final: true
                };

                const saveRes = await fetch('/api/save_sample', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(savePayload)
                });

                if (!saveRes.ok) throw new Error(await saveRes.text());

                const savedSample = await saveRes.json();

                // if (saveError) throw saveError; // Handled by proxy check above

                setAppState(prev => {
                    const currentMethodResults = {
                        ...results,
                        method: prev.samplingMethod,
                        sampling_params: prev.samplingParams
                    };
                    return {
                        ...prev,
                        results,
                        isLocked: true,
                        isCurrentVersion: true,
                        historyId: savedSample.id,
                        full_results_storage: {
                            ...(prev.full_results_storage || {}),
                            [prev.samplingMethod]: currentMethodResults,
                            last_method: prev.samplingMethod
                        }
                    };
                });
            } else {
                setAppState(prev => {
                    const currentMethodResults = {
                        ...results,
                        method: prev.samplingMethod,
                        sampling_params: prev.samplingParams
                    };
                    return {
                        ...prev,
                        results,
                        isLocked: false,
                        isCurrentVersion: false,
                        full_results_storage: {
                            ...(prev.full_results_storage || {}),
                            [prev.samplingMethod]: currentMethodResults,
                            last_method: prev.samplingMethod
                        }
                    };
                });
            }
            onComplete();
        } catch (error: any) {
            console.error("Error en flujo de muestreo:", error);
            addToast(`ERROR EN EL PROCESO: ${error?.message || "Error inesperado"}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const onLoadHistory = (sample: HistoricalSample) => {
        setAppState(prev => ({
            ...prev,
            samplingMethod: sample.method,
            generalParams: { ...prev.generalParams, objective: sample.objective, seed: sample.seed },
            samplingParams: sample.params_snapshot,
            results: sample.results_snapshot,
            observations: sample.results_snapshot.observations || [],
            isLocked: true,
            isCurrentVersion: sample.is_current,
            historyId: sample.id
        }));
        onComplete();
    };

    if (viewHistory && appState.selectedPopulation) {
        return <SampleHistoryManager
            populationId={appState.selectedPopulation.id}
            onLoadSample={onLoadHistory}
            onBack={() => setViewHistory(false)}
        />;
    }

    return (
        <div className="animate-fade-in max-w-6xl mx-auto">
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center space-x-3 mb-3">
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black text-white shadow-lg uppercase tracking-widest ${methodColors[currentMethod]}`}>
                            {activeTab === 'config' ? 'Configuración Técnica' : 'Levantamiento de Observaciones'}
                        </span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                        {methodTitles[currentMethod]}
                    </h2>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setViewHistory(true)}
                        className="px-6 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-black text-white uppercase tracking-widest hover:bg-slate-800 transition-all transform hover:-translate-y-1 flex items-center shadow-lg"
                    >
                        <i className="fas fa-history mr-2 text-cyan-400"></i>
                        Ver Historial
                    </button>
                    <button
                        onClick={onBack}
                        className="px-6 py-3 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-700 uppercase tracking-widest hover:text-blue-800 hover:border-blue-500 hover:shadow-xl transition-all transform hover:-translate-y-1 group flex items-center shadow-md"
                    >
                        <div className="bg-slate-100 group-hover:bg-blue-50 p-2 rounded-lg mr-3 transition-colors">
                            <i className="fas fa-chevron-left text-blue-600 transform group-hover:-translate-x-1 transition-transform"></i>
                        </div>
                        Volver
                    </button>
                </div>
            </div>

            {/* CONTROL DE SUB-PESTAÑAS */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-10">
                <div className="flex bg-slate-100/50 p-2 border-b border-slate-100">
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center ${activeTab === 'config' ? 'bg-white text-blue-700 shadow-md border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <i className="fas fa-cog mr-3 text-lg"></i> Parámetros Técnicos
                    </button>
                    <button
                        onClick={() => setActiveTab('findings')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center ${activeTab === 'findings' ? 'bg-white text-blue-700 shadow-md border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <i className="fas fa-clipboard-list mr-3 text-lg"></i> Levantamiento de Observaciones ({(appState.observations || []).length})
                    </button>
                </div>

                <div className="p-8">
                    {activeTab === 'config' ? (
                        <div className="space-y-10 animate-fade-in">
                            {showAllocationPreview ? (
                                <StratumAllocationPreview
                                    appState={appState}
                                    onConfirm={(allocations) => handleRunSampling(true, allocations)}
                                    onCancel={() => setShowAllocationPreview(false)}
                                />
                            ) : (
                                <>
                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                        <label className="block text-sm font-black text-slate-600 mb-3 uppercase tracking-widest flex items-center">
                                            <i className="fas fa-bullseye mr-2 text-blue-500"></i> Objetivo Específico del Muestreo
                                        </label>
                                        <textarea
                                            name="objective"
                                            value={appState.generalParams.objective}
                                            onChange={(e) => setAppState(prev => ({ ...prev, generalParams: { ...prev.generalParams, objective: e.target.value } }))}
                                            rows={2}
                                            className="block w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-inner focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all resize-none text-slate-700 font-medium text-sm"
                                            placeholder="Defina el alcance y objetivo de esta selección..."
                                        />
                                    </div>

                                    <div className="pt-4">
                                        {currentMethod === SamplingMethod.Attribute && <AttributeSampling appState={appState} setAppState={setAppState} />}
                                        {currentMethod === SamplingMethod.MUS && <MonetaryUnitSampling appState={appState} setAppState={setAppState} />}
                                        {currentMethod === SamplingMethod.CAV && <ClassicalVariablesSampling appState={appState} setAppState={setAppState} />}
                                        {currentMethod === SamplingMethod.Stratified && <StratifiedSampling appState={appState} setAppState={setAppState} />}
                                        {currentMethod === SamplingMethod.NonStatistical && <NonStatisticalSampling appState={appState} setAppState={setAppState} />}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <ObservationsManager
                                populationId={appState.selectedPopulation!.id}
                                method={currentMethod}
                                onObservationsUpdate={(obs) => setAppState(prev => ({ ...prev, observations: obs }))}
                            />
                        </div>
                    )}
                </div>

                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center space-x-4">
                    {appState.results && (
                        <button
                            onClick={onComplete}
                            className="px-8 py-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest hover:border-blue-500 hover:text-blue-700 transition-all flex items-center shadow-md"
                        >
                            <i className="fas fa-eye mr-3 text-blue-500"></i>
                            Ver Resultados Existentes
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (currentMethod === SamplingMethod.Stratified && (appState.samplingParams.stratified.basis === 'Category' || appState.samplingParams.stratified.basis === 'Subcategory' || appState.samplingParams.stratified.basis === 'MultiVariable')) {
                                setShowAllocationPreview(true);
                                return;
                            }

                            if (appState.results) {
                                setShowOverwriteConfirm(true);
                            } else {
                                setShowConfirmModal(true);
                            }
                        }}
                        disabled={loading || showAllocationPreview}
                        className="px-12 py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-[0_10px_25px_rgba(0,0,0,0.2)] hover:bg-slate-800 transition-all transform hover:-translate-y-1 flex items-center"
                    >
                        {loading ? <i className="fas fa-circle-notch fa-spin mr-3"></i> : <i className="fas fa-bolt mr-3 text-cyan-400"></i>}
                        {showAllocationPreview ? 'Configurando Estratos...' : 'Ejecutar Nueva Selección'}
                    </button>
                </div>
            </div>

            {/* Modal de Advertencia de Sobreescritura */}
            <Modal
                isOpen={showOverwriteConfirm}
                onClose={() => setShowOverwriteConfirm(false)}
                title="Resultados Existentes"
            >
                <div className="p-2 text-center">
                    <div className="flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mx-auto mb-6">
                        <i className="fas fa-history text-3xl text-amber-600"></i>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-4">¿Ejecutar Nuevo Muestreo?</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-8">
                        Ya existen resultados y hallazgos registrados para esta población. Ejecutar una nueva acción <span className="text-amber-600 font-bold">borrará el historial actual</span> del área de trabajo.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setShowOverwriteConfirm(false)} className="py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">Conservar Actual</button>
                        <button
                            onClick={() => {
                                setShowOverwriteConfirm(false);
                                setShowConfirmModal(true);
                            }}
                            className="py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg uppercase text-[10px] tracking-widest hover:bg-black transition-all transform hover:-translate-y-1"
                        >
                            <i className="fas fa-sync mr-2"></i> Sobreescribir
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODAL DE OPCIONES DE MUESTREO */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="Protocolo de Selección de Muestra"
            >
                <div className="space-y-8">
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-2xl">
                        <div className="flex items-start gap-4">
                            <i className="fas fa-shield-halved text-amber-500 text-xl mt-1"></i>
                            <div>
                                <h4 className="font-black text-amber-900 uppercase text-xs tracking-widest mb-1">Guía Metodológica</h4>
                                <p className="text-sm text-amber-800 leading-relaxed">
                                    Ha configurado los parámetros técnicos. Seleccione el destino de esta ejecución para su Papel de Trabajo:
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                        <button
                            onClick={checkExistingAndLock}
                            className="group text-left border-2 border-slate-100 rounded-3xl p-6 hover:border-blue-500 hover:bg-blue-50 transition-all shadow-sm hover:shadow-xl transform hover:-translate-y-1"
                        >
                            <div className="flex items-center gap-6">
                                <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                                    <i className="fas fa-lock text-2xl"></i>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xl font-black text-slate-800 group-hover:text-blue-900 mb-1">Bloquear como Papel de Trabajo</h4>
                                    <p className="text-sm text-slate-500 group-hover:text-blue-700 leading-snug font-medium">
                                        Genera la muestra definitiva y archiva la versión anterior en el histórico de trazabilidad.
                                    </p>
                                </div>
                                <i className="fas fa-chevron-right text-slate-300 group-hover:text-blue-500 transition-colors"></i>
                            </div>
                        </button>

                        <button
                            onClick={() => handleRunSampling(false)}
                            className="group text-left border-2 border-slate-100 rounded-3xl p-6 hover:border-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-xl transform hover:-translate-y-1"
                        >
                            <div className="flex items-center gap-6">
                                <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-all shadow-inner">
                                    <i className="fas fa-vial text-2xl"></i>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xl font-black text-slate-800 group-hover:text-slate-900 mb-1">Ejecutar Simulación / Ensayo</h4>
                                    <p className="text-sm text-slate-500 leading-snug font-medium">
                                        Visualice los resultados para calibrar. <span className="text-red-500 font-bold uppercase text-[10px]">No se persistirá en la base de datos.</span>
                                    </p>
                                </div>
                                <i className="fas fa-chevron-right text-slate-300 group-hover:text-blue-500 transition-colors"></i>
                            </div>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODAL DE ADVERTENCIA DE SUSTITUCIÓN */}
            <Modal
                isOpen={showReplaceWarning}
                onClose={() => setShowReplaceWarning(false)}
                title="Advertencia: Protocolo de Sustitución de Versión"
            >
                <div className="space-y-8 py-4">
                    <div className="bg-rose-50 border-2 border-rose-200 p-8 rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <i className="fas fa-triangle-exclamation text-7xl text-rose-600"></i>
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-rose-900 font-black text-xl mb-4 flex items-center">
                                <i className="fas fa-history mr-3"></i>
                                Papel de Trabajo Activo Detectado
                            </h3>
                            <p className="text-rose-800 leading-relaxed font-medium mb-6">
                                Se ha identificado que esta población ya cuenta con una <span className="font-black underline">Muestra Definitiva Vigente</span> en el sistema.
                                <br /><br />
                                Al proceder con esta acción:
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 bg-white/60 p-4 rounded-2xl border border-rose-200">
                                    <div className="h-10 w-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <i className="fas fa-box-archive"></i>
                                    </div>
                                    <p className="text-xs text-rose-900 font-bold leading-normal">
                                        La muestra actual será desplazada al <span className="text-indigo-700">Archivo Histórico (Legacy)</span> manteniendo su integridad para futuras auditorías de calidad.
                                    </p>
                                </div>
                                <div className="flex items-start gap-4 bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                                    <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <i className="fas fa-star"></i>
                                    </div>
                                    <p className="text-xs text-emerald-900 font-bold leading-normal">
                                        La nueva selección se establecerá como la <span className="text-emerald-700">Versión Vigente de Auditoría</span> para sus actuales papeles de trabajo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowReplaceWarning(false)}
                            className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-700 hover:border-slate-300 transition-all"
                        >
                            Cancelar Acción
                        </button>
                        <button
                            onClick={() => handleRunSampling(true)}
                            className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black shadow-2xl uppercase text-xs tracking-widest transition-all transform hover:-translate-y-1 flex items-center justify-center"
                        >
                            <i className="fas fa-check-double mr-2 text-cyan-400"></i>
                            Confirmar Sustitución
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SamplingWorkspace;
