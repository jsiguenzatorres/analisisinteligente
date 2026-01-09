import React, { useState, useEffect } from 'react';
import { AuditPopulation, RiskProfile } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { performRiskProfiling, parseCurrency } from '../../services/riskAnalysisService';
import { analyzePopulationAndRecommend } from '../../services/recommendationService'; // Import Recommendation Service
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
    const [analysisData, setAnalysisData] = useState<any>(null);

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
            }).filter(d => d.y > 0);

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
            setInsight(`El motor forense ha detectado una vulnerabilidad ${riskLevel}. Se identificaron ${newProfile.gapAlerts} puntos críticos que requieren inspección manual obligatoria para cumplir con la NIA 530.`);

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
