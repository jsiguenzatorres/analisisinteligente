
import React, { useState, useEffect } from 'react';
import { AuditPopulation } from '../../types';
import { supabase } from '../../services/supabaseClient';
import Card from '../ui/Card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts'; // Added LabelList, LineChart


interface Props {
    populationId: string;
    onValidationComplete: (population: AuditPopulation) => void;
    onCancel: () => void;
}

const ValidationWorkspace: React.FC<Props> = ({ populationId, onValidationComplete, onCancel }) => {
    const [population, setPopulation] = useState<AuditPopulation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para gráficos
    const [chartData, setChartData] = useState<any[]>([]);
    const [timeChartData, setTimeChartData] = useState<any[]>([]); // New State for Timeline
    const [uniqueCatCount, setUniqueCatCount] = useState(0);
    const [uniqueSubCatCount, setUniqueSubCatCount] = useState(0);

    const [chartType, setChartType] = useState<'attribute_freq' | 'monetary_sum_by_cat' | 'basic_stats'>('basic_stats');


    const [retryCount, setRetryCount] = useState(0);

    const fetchPopulationAndData = async () => {
        setLoading(true);
        setError(null);
        setRetryCount(0);

        // 1. Fetch Population Metadata (Timeout Protected)
        const fetchPopWithTimeout = new Promise<{ data: any, error: any }>(async (resolve) => {
            const timer = setTimeout(() => {
                resolve({ data: null, error: { message: 'Timeout' } });
            }, 5000);

            const { data, error } = await supabase
                .from('audit_populations')
                .select('*')
                .eq('id', populationId)
                .single();

            clearTimeout(timer);
            resolve({ data, error });
        });

        const { data: popData, error: popError } = await fetchPopWithTimeout;

        if (popError || !popData) {
            console.error('Error fetching population:', popError);
            setError('No se pudo cargar la población para validación.');
            setLoading(false);
            return;
        }

        const pop = popData as AuditPopulation;
        setPopulation(pop);

        // Determinar si fetch de filas es necesario
        const hasCategory = !!pop.column_mapping?.category;
        const hasDate = !!pop.column_mapping?.date;
        const isAttributeOnly = !pop.total_monetary_value || pop.total_monetary_value === 0;

        if (isAttributeOnly || hasCategory || hasDate) {
            // UPDATE: Polling Ajustado (60 segundos reales)
            let retries = 0;
            let rows: any[] = [];
            const maxRetries = 12; // 12 * 5s = 60s max wait (approx)

            while (retries < maxRetries) {
                setRetryCount(retries + 1);
                // Wrap Supabase call in a timeout promise to prevent infinite hang
                const fetchWithTimeout = new Promise<{ data: any, error: any }>(async (resolve) => {
                    // Timeout race
                    const timer = setTimeout(() => {
                        resolve({ data: null, error: { message: 'Timeout' } });
                    }, 5000); // 5 sec per request timeout

                    const { data, error } = await supabase
                        .from('audit_data_rows')
                        .select('raw_json, monetary_value_col')
                        .eq('population_id', populationId);

                    clearTimeout(timer);
                    resolve({ data, error });
                });

                const { data: fetchedRows, error: rowError } = await fetchWithTimeout;

                if (rowError && rowError.message !== 'Timeout') {
                    console.error("Error fetching rows:", rowError);
                    // Don't break on timeout, just retry. Break on real errors?
                    // Actually, network errors might be temporary. Let's retry on everything except fatal auth.
                }

                if (fetchedRows && fetchedRows.length > 0) {
                    rows = fetchedRows;
                    break; // Data found!
                }

                // Wait 1 second before retrying
                retries++;
                await new Promise(r => setTimeout(r, 1000));
            }

            if (rows.length === 0) {
                setError("No se encontraron registros procesados aún. La carga puede estar en curso en segundo plano.");
                setLoading(false);
                return; // Stop execution, show error with retry option (handled by UI)
            }

            if (rows.length > 0) {
                const catField = pop.column_mapping?.category;
                const subField = pop.column_mapping?.subcategory;
                const dateField = pop.column_mapping?.date;

                const catCounts: Record<string, number> = {};
                const catSums: Record<string, number> = {};
                const subCounts: Set<string> = new Set();
                const dateSums: Record<string, number> = {}; // YYYY-MM -> Sum

                rows.forEach(row => {
                    const raw = row.raw_json as any;
                    const val = row.monetary_value_col || 0;

                    // Categories
                    if (catField) {
                        const catName = String(raw[catField] || 'Sin Categoría');
                        catCounts[catName] = (catCounts[catName] || 0) + 1;
                        catSums[catName] = (catSums[catName] || 0) + val;
                    }

                    // Subcategories
                    if (subField) {
                        subCounts.add(String(raw[subField] || 'N/A'));
                    }

                    // Dates Logic
                    if (dateField && raw[dateField]) {
                        try {
                            const d = new Date(raw[dateField]);
                            if (!isNaN(d.getTime())) {
                                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
                                dateSums[key] = (dateSums[key] || 0) + val;
                            }
                        } catch (e) { }
                    }
                });

                // Prepare Main Chart Data
                let finalData: any[] = [];
                // Force chart type if mock data
                if (rows.length === 50) setChartType('monetary_sum_by_cat');

                if (isAttributeOnly) {
                    setChartType('attribute_freq');
                    finalData = Object.entries(catCounts)
                        .map(([name, value]) => ({ name, value }))
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 10);
                } else if (hasCategory) { // Default to monetary
                    setChartType('monetary_sum_by_cat');
                    finalData = Object.entries(catSums)
                        .map(([name, value]) => ({ name, value }))
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 10);
                }

                // Prepare Time Chart Data
                const timeData = Object.entries(dateSums)
                    .map(([date, value]) => ({ date, value }))
                    .sort((a, b) => a.date.localeCompare(b.date)); // Chronological sort

                setChartData(finalData);
                setTimeChartData(timeData);
                setUniqueCatCount(Object.keys(catCounts).length);
                setUniqueSubCatCount(subCounts.size);
            }
        } else {
            setChartType('basic_stats');
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchPopulationAndData();
    }, [populationId]);

    const handleValidation = async () => {
        if (!population) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('audit_populations')
            .update({ status: 'validado' })
            .eq('id', population.id)
            .select()
            .single();

        if (error) {
            setError('Falló la actualización del estado de la población.');
            console.error(error);
        } else {
            onValidationComplete(data as AuditPopulation);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="flex flex-col items-center">
                    <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500 mb-4"></i>
                    <p className="text-slate-500 font-bold mb-2">Analizando datos y calculando cuadratura...</p>
                    <p className="text-slate-400 text-sm">Buscando registros (Intento {retryCount}/12)</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-gray-50 p-6 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg border-l-4 border-amber-400">
                    <i className="fas fa-exclamation-triangle text-5xl text-amber-400 mb-4"></i>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Datos no disponibles aún</h3>
                    <p className="text-slate-600 mb-6">{error}</p>

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => fetchPopulationAndData()}
                            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 transition"
                        >
                            <i className="fas fa-sync-alt mr-2"></i> Reintentar ahora
                        </button>
                        <button
                            onClick={onCancel}
                            className="px-6 py-3 bg-white border border-slate-300 text-slate-600 font-bold rounded-lg shadow hover:bg-slate-50 transition"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    if (!population) return <div className="text-center p-10 font-bold">No se encontró la población.</div>;

    const stats = population.descriptive_stats || { min: 0, max: 0, avg: 0, sum: 0 };
    const isAttributeOnly = chartType === 'attribute_freq';
    const isMonetaryCategory = chartType === 'monetary_sum_by_cat';

    const basicStatsData = [
        { name: 'Mínimo', value: stats.min, fill: '#6366f1' },
        { name: 'Promedio', value: stats.avg, fill: '#10b981' },
        { name: 'Máximo', value: stats.max, fill: '#f59e0b' }
    ];

    const formatMoney = (val: number) => `$${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    return (
        <div className="animate-fade-in pb-10">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Validación de Cuadratura</h2>
                    <p className="text-slate-500 mt-1">Confirme que la integridad y distribución de los datos sean correctas.</p>
                </div>
                <button
                    onClick={onCancel}
                    className="px-5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-700 uppercase tracking-widest hover:text-red-600 hover:border-red-500 hover:shadow-lg transition-all transform hover:-translate-y-1 group flex items-center shadow-md"
                >
                    <div className="bg-slate-100 group-hover:bg-red-50 p-2 rounded-lg mr-3 transition-colors">
                        <i className="fas fa-times text-slate-500 group-hover:text-red-500 transition-colors"></i>
                    </div>
                    Cancelar
                </button>
            </div>

            <Card title={`Resumen de Carga: ${population.file_name}`} className="bg-white">

                {/* --- KPI CARDS --- */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center mb-10">
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-3xl font-extrabold text-slate-800">{(population.total_rows || 0).toLocaleString()}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Registros Totales</div>
                    </div>

                    {!isAttributeOnly ? (
                        <>
                            <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm">
                                <div className="text-xl font-bold text-emerald-600">{formatMoney(stats.sum)}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Valor Total</div>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-xl font-bold text-slate-600">{formatMoney(stats.min)}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Valor Mínimo</div>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-xl font-bold text-slate-600">{formatMoney(stats.max)}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Valor Máximo</div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="p-6 bg-blue-50 rounded-xl border border-blue-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 text-blue-200 opacity-20"><i className="fas fa-list-ul text-5xl"></i></div>
                                <div className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-1">Tipo de Datos</div>
                                <div className="text-xl font-extrabold text-blue-600">Solo Atributos</div>
                            </div>
                            <div className="p-6 bg-indigo-50 rounded-xl border border-indigo-200 shadow-sm">
                                <div className="text-3xl font-extrabold text-indigo-600">{uniqueCatCount}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Categorías</div>
                            </div>
                            <div className="p-6 bg-purple-50 rounded-xl border border-purple-200 shadow-sm">
                                <div className="text-3xl font-extrabold text-purple-600">{uniqueSubCatCount}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Subcategorías</div>
                            </div>
                        </>
                    )}
                </div>

                {/* --- CHART SECTION --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Main Category Chart */}
                    <div className={timeChartData.length > 0 ? "col-span-1" : "col-span-2"}>
                        <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wider border-b pb-2">
                            {isAttributeOnly ? 'Frecuencia por Categoría (Top 10)' :
                                isMonetaryCategory ? 'Monto por Categoría (Top 10)' : 'Estadísticas Básicas'}
                        </h3>
                        <div style={{ width: '100%', height: 400, display: 'block' }} className="bg-white rounded-lg p-2 border border-slate-100">
                            <ResponsiveContainer width="100%" height="100%">
                                {chartType === 'basic_stats' ? (
                                    <BarChart data={basicStatsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fill: '#64748b' }} axisLine={false} />
                                        <YAxis tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                                        <Tooltip formatter={(value: number) => [formatMoney(value), 'Valor']} />
                                        <Bar dataKey="value" name="Valor" radius={[8, 8, 0, 0]} barSize={60}>
                                            {basicStatsData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                            <LabelList dataKey="value" position="top" formatter={(val: number) => `$${(val / 1000).toFixed(0)}k`} style={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} />
                                        </Bar>
                                    </BarChart>
                                ) : (
                                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" tickFormatter={(val) => isMonetaryCategory ? `$${(val / 1000).toFixed(0)}k` : val} hide={false} />
                                        <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, fontWeight: 'bold' }} interval={0} />
                                        <Tooltip formatter={(value: number) => [isMonetaryCategory ? formatMoney(value) : value, isMonetaryCategory ? 'Monto' : 'Cant.']} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                            {chartData.map((e, index) => <Cell key={index} fill={index % 2 === 0 ? '#4f46e5' : '#818cf8'} />)}
                                            <LabelList dataKey="value" position="right" formatter={(val: number) => isMonetaryCategory ? `$${(val / 1000).toFixed(0)}k` : val} style={{ fontSize: 10, fontWeight: 'bold', fill: '#475569' }} />
                                        </Bar>
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Timeline Chart (Conditional) */}
                    {timeChartData.length > 0 && (
                        <div className="col-span-1 animate-fade-in-up">
                            <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wider border-b pb-2">
                                <i className="fas fa-history mr-2 text-orange-500"></i> Evolución Temporal
                            </h3>
                            <div style={{ width: '100%', height: 400, display: 'block' }} className="bg-white rounded-lg p-2 border border-slate-100">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={timeChartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <YAxis tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} tick={{ fontSize: 10, fill: '#94a3b8' }} width={60} />
                                        <Tooltip formatter={(value: number) => [formatMoney(value), 'Total']} labelStyle={{ color: '#444' }} />
                                        <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} dot={{ r: 3, fill: '#f97316' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-10 border-t border-slate-100 pt-6 flex justify-end">
                    <button
                        onClick={handleValidation}
                        disabled={loading}
                        className="inline-flex items-center px-8 py-3 border border-transparent text-sm font-bold rounded-lg text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl transform transition-all duration-200 hover:-translate-y-0.5 uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : <i className="fas fa-check-double mr-2"></i>}
                        {loading ? 'Procesando...' : 'Confirmar Integridad y Continuar'}
                    </button>
                </div>
            </Card>
        </div>
    );
};

export default ValidationWorkspace;
