
import React, { useState, useEffect } from 'react';
import { HistoricalSample, SamplingMethod } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { samplingProxyFetch, FetchTimeoutError, FetchNetworkError } from '../../services/fetchUtils';

interface Props {
    populationId: string;
    onLoadSample: (sample: HistoricalSample) => void;
    onBack: () => void;
}

const SampleHistoryManager: React.FC<Props> = ({ populationId, onLoadSample, onBack }) => {
    const [history, setHistory] = useState<HistoricalSample[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            
            try {
                console.log("🌐 Cargando historial vía proxy con timeout...");
                
                // Usar el proxy con timeout y manejo de errores mejorado
                const { history: historyData } = await samplingProxyFetch('get_history', {
                    population_id: populationId
                });
                
                if (historyData) {
                    setHistory(historyData as HistoricalSample[]);
                } else {
                    setHistory([]);
                }
                
            } catch (err: any) {
                console.error("Error fetching history:", err);
                
                let errorMessage = "Error al cargar el historial";
                
                if (err instanceof FetchTimeoutError) {
                    errorMessage = "Timeout: La carga tardó demasiado tiempo. Verifique su conexión.";
                } else if (err instanceof FetchNetworkError) {
                    errorMessage = "Error de conexión: " + err.message;
                } else {
                    errorMessage += ": " + (err.message || "Error desconocido");
                }
                
                setError(errorMessage);
                setHistory([]);
            } finally {
                setLoading(false);
            }
        };
        
        if (populationId) {
            fetchHistory();
        }
    }, [populationId]);

    const getMethodBadge = (method: SamplingMethod) => {
        const styles: any = {
            [SamplingMethod.Attribute]: 'bg-blue-100 text-blue-700 border-blue-200',
            [SamplingMethod.MUS]: 'bg-amber-100 text-amber-700 border-amber-200',
            [SamplingMethod.CAV]: 'bg-orange-100 text-orange-700 border-orange-200',
            [SamplingMethod.Stratified]: 'bg-indigo-100 text-indigo-700 border-indigo-200',
            [SamplingMethod.NonStatistical]: 'bg-teal-100 text-teal-700 border-teal-200',
        };
        return <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${styles[method]}`}>{method}</span>;
    };

    return (
        <div className="animate-fade-in max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Archivo Histórico</h2>
                    <p className="text-slate-500 font-medium">Registro inmutable de papeles de trabajo generados.</p>
                </div>
                <button
                    onClick={onBack}
                    className="px-6 py-3 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-700 uppercase tracking-widest hover:text-blue-800 hover:border-blue-500 hover:shadow-xl transition-all transform hover:-translate-y-1 group flex items-center shadow-md"
                >
                    <div className="bg-slate-100 group-hover:bg-blue-50 p-2 rounded-lg mr-3 transition-colors">
                        <i className="fas fa-arrow-left text-blue-600 transform group-hover:-translate-x-1 transition-transform"></i>
                    </div>
                    Volver
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500 mb-4"></i>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Consultando Archivo Digital...</p>
                    <p className="text-slate-300 text-xs mt-2">Esto puede tomar unos segundos</p>
                </div>
            ) : error ? (
                <div className="py-20 bg-red-50 rounded-3xl border border-red-200">
                    <div className="text-center max-w-md mx-auto">
                        <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                        <h3 className="text-xl font-bold text-red-800 mb-2">Error al Cargar Historial</h3>
                        <p className="text-red-700 text-sm mb-6">{error}</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => {
                                    setError(null);
                                    // Trigger re-fetch by updating a dependency
                                    const fetchHistory = async () => {
                                        setLoading(true);
                                        setError(null);
                                        
                                        try {
                                            const { history: historyData } = await samplingProxyFetch('get_history', {
                                                population_id: populationId
                                            });
                                            
                                            if (historyData) {
                                                setHistory(historyData as HistoricalSample[]);
                                            } else {
                                                setHistory([]);
                                            }
                                        } catch (err: any) {
                                            console.error("Error fetching history:", err);
                                            
                                            let errorMessage = "Error al cargar el historial";
                                            if (err instanceof FetchTimeoutError) {
                                                errorMessage = "Timeout: La carga tardó demasiado tiempo";
                                            } else if (err instanceof FetchNetworkError) {
                                                errorMessage = "Error de conexión: " + err.message;
                                            } else {
                                                errorMessage += ": " + (err.message || "Error desconocido");
                                            }
                                            
                                            setError(errorMessage);
                                            setHistory([]);
                                        } finally {
                                            setLoading(false);
                                        }
                                    };
                                    fetchHistory();
                                }}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition-all"
                            >
                                <i className="fas fa-redo mr-2"></i>Reintentar
                            </button>
                            <button
                                onClick={onBack}
                                className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 transition-all"
                            >
                                Volver
                            </button>
                        </div>
                    </div>
                </div>
            ) : history.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <i className="fas fa-folder-open text-5xl text-slate-300 mb-4"></i>
                    <h3 className="text-xl font-bold text-slate-600">Sin antecedentes</h3>
                    <p className="text-slate-400 mt-2">Aún no se han bloqueado muestras definitivas para esta población.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {history.map((sample) => (
                        <div
                            key={sample.id}
                            onClick={() => onLoadSample(sample)}
                            className={`bg-white rounded-3xl border p-7 shadow-sm hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden ${sample.is_current ? 'border-emerald-500 ring-4 ring-emerald-50' : 'border-slate-200'}`}
                        >
                            {sample.is_current && (
                                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest shadow-lg">
                                    Versión Definitiva
                                </div>
                            )}

                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <i className={`fas ${sample.is_current ? 'fa-check-double' : 'fa-history'} text-6xl`}></i>
                            </div>

                            <div className="flex justify-between items-start mb-5">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                                        {new Date(sample.created_at).toLocaleString()}
                                    </span>
                                    {getMethodBadge(sample.method)}
                                </div>
                                <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-700 transition-all shadow-sm">
                                    <i className="fas fa-eye text-lg"></i>
                                </div>
                            </div>

                            <h4 className="text-xl font-black text-slate-800 line-clamp-1 mb-2 group-hover:text-blue-900 transition-colors">
                                {sample.objective || "Validación General"}
                            </h4>

                            <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-50">
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Items (n)</p>
                                    <p className="text-2xl font-black text-slate-800">{sample.sample_size}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Semilla</p>
                                    <p className="text-2xl font-mono font-black text-blue-600 tracking-tighter">{sample.seed}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SampleHistoryManager;
