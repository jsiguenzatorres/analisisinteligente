
import React, { useState, useCallback } from 'react';
import { read, utils, WorkSheet } from 'xlsx';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../services/AuthContext'; // Re-added for current DB requirements
import { ColumnMapping, DescriptiveStats, AdvancedAnalysis, BenfordAnalysis } from '../../types';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
// import { analyzePopulationAndRecommend } from '../../services/recommendationService'; // Commented out to reduce dependencies risks
import { ASSISTANT_CONTENT } from '../../constants';

interface Props {
    onComplete: (populationId: string) => void;
    onCancel: () => void;
}

// Agregamos 'create_population' al flujo
type Stage = 'select_file' | 'map_columns' | 'preview' | 'create_population' | 'uploading' | 'error';
type DataRow = { [key: string]: string | number };

const DataUploadFlow: React.FC<Props> = ({ onComplete, onCancel }) => {
    const { user } = useAuth(); // Re-added
    const [stage, setStage] = useState<Stage>('select_file');
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [data, setData] = useState<DataRow[]>([]);
    const [mapping, setMapping] = useState<ColumnMapping>({ uniqueId: '', monetaryValue: '', category: '', subcategory: '', user: '', vendor: '', date: '', timestamp: '' });
    const [hasMonetaryCols, setHasMonetaryCols] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [populationName, setPopulationName] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0); // 0 to 100
    const [helpContent, setHelpContent] = useState<{ title: string; content: React.ReactNode } | null>(null);

    // LOGGER SYSTEM (Minimal version restoration for debugging functionality without overhead)
    const [logs, setLogs] = useState<string[]>([]);
    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${time}] ${msg}`]);
        console.log(msg);
    };


    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            try {
                const buffer = await selectedFile.arrayBuffer();
                const workbook = read(buffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = utils.sheet_to_json<DataRow>(worksheet, { defval: null });
                const fileHeaders = Object.keys(jsonData[0]);
                setHeaders(fileHeaders);
                setData(jsonData);
                setStage('map_columns');
            } catch (err: any) {
                setError(`Error: ${err.message}`);
                setStage('error');
            }
        }
    };

    const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
        setMapping(prev => ({ ...prev, [field]: value }));
    };

    const validateMapping = () => {
        if (!mapping.uniqueId) return "Debe seleccionar una columna para el ID Único.";
        if (hasMonetaryCols && !mapping.monetaryValue) return "Debe seleccionar una columna para el Valor Monetario.";
        return null;
    };

    const handleUpload = async () => {
        addLog("🚀 INICIANDO UPLOAD (Restored Logic)...");
        if (!file) return;
        const validationError = validateMapping();
        if (validationError) {
            setError(validationError);
            return;
        }

        if (!user || !user.id) {
            setError("Error de sesión: Usuario no identificado.");
            setStage('error');
            return;
        }

        setStage('uploading');
        setError(null);
        setUploadProgress(0);

        try {
            // 1. Crear registro de Población
            // Helper para parsear moneda
            const parseMoney = (val: any): number => {
                if (typeof val === 'number') return val;
                if (!val) return 0;
                // Eliminar todo excepto números, puntos y menos (soporte básico)
                const str = String(val).replace(/[^0-9.-]+/g, "");
                return parseFloat(str) || 0;
            };

            // Calcular Total Monetario y Estadísticas PREVIO a la inserción
            let totalMonetaryValue = 0;
            let descriptiveStats: DescriptiveStats = { min: 0, max: 0, sum: 0, avg: 0, std_dev: 0, cv: 0 };

            if (hasMonetaryCols && mapping.monetaryValue) {
                // Extraer valores válidos
                const values = data.map(row => parseMoney(row[mapping.monetaryValue!]));
                const validValues = values.filter(v => !isNaN(v)); // Asegurar que no haya NaNs

                if (validValues.length > 0) {
                    totalMonetaryValue = validValues.reduce((a, b) => a + b, 0);
                    const min = Math.min(...validValues);
                    const max = Math.max(...validValues);
                    const avg = totalMonetaryValue / validValues.length;

                    // Calcular Desviación Estándar (Std Dev)
                    const squareDiffs = validValues.map(value => Math.pow(value - avg, 2));
                    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / validValues.length;
                    const stdDev = Math.sqrt(avgSquareDiff);

                    descriptiveStats = {
                        min,
                        max,
                        sum: totalMonetaryValue,
                        avg,
                        std_dev: stdDev,
                        cv: avg !== 0 ? stdDev / avg : 0
                    };
                }
            }

            addLog("📊 Estadísticas calculadas.");

            // 1. Crear registro de Población (BACKEND PROXY)
            addLog("🚀 Enviando población a Netlify Backend...");

            const popPayload = {
                file_name: populationName || file.name,
                audit_name: populationName || file.name.split('.')[0],
                area: 'GENERAL',
                status: 'pendiente_validacion',
                upload_timestamp: new Date().toISOString(),
                total_rows: data.length,
                total_monetary_value: totalMonetaryValue,
                descriptive_stats: descriptiveStats,
                column_mapping: mapping,
                user_id: user.id
            };

            // Llamada al Backend Function (Vercel)
            const popRes = await fetch('/api/create_population', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(popPayload)
            });

            if (!popRes.ok) {
                const errText = await popRes.text();
                throw new Error(`Error Backend Población: ${errText}`);
            }

            const popData = await popRes.json();
            const populationId = popData.id;
            addLog(`✅ Población creada en Server (ID: ${populationId})`);

            addLog(`⏩ Iniciando carga de ${data.length} filas vía Backend...`);

            // 2. Preparar y subir datos por lotes (Batching) - BACKEND PROXY
            // Reducimos lote a 50 para no estresar el firewall
            const BATCH_SIZE = 50;
            const batches = [];

            for (let i = 0; i < data.length; i += BATCH_SIZE) {
                const chunk = data.slice(i, i + BATCH_SIZE).map(row => ({
                    population_id: populationId,
                    unique_id_col: String(row[mapping.uniqueId]),
                    monetary_value_col: hasMonetaryCols && mapping.monetaryValue ? parseMoney(row[mapping.monetaryValue]) : 0,
                    category_col: mapping.category ? String(row[mapping.category]) : null,
                    subcategory_col: mapping.subcategory ? String(row[mapping.subcategory]) : null,
                    raw_json: row // Guardamos la fila original completa como JSON
                }));
                batches.push(chunk);
            }

            addLog(`📦 Enviando ${batches.length} lotes al Backend...`);

            // Enviamos lotes SECUENCIALMENTE para evitar saturar la red/firewall y detectar errores específicos
            let completedBatches = 0;

            for (const [idx, batch] of batches.entries()) {
                addLog(`⏳ Subiendo lote ${idx + 1} de ${batches.length}...`);

                try {
                    const res = await fetch('/api/insert_batch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rows: batch })
                    });

                    if (!res.ok) {
                        const errText = await res.text();
                        console.error(`Error Batch ${idx + 1}:`, errText);

                        // Si falla un lote, intentamos borrar la población para no dejar basura
                        // (Opcional: se podría dejar para depuración, pero mejor limpiar)
                        try {
                            await supabase.from('audit_populations').delete().eq('id', populationId);
                            addLog("❌ Error en carga. Se eliminó el registro parcial.");
                        } catch (delErr) {
                            console.error("Error cleanup:", delErr);
                        }

                        throw new Error(`Fallo en lote ${idx + 1}: ${errText}`);
                    }

                    completedBatches++;
                    const progress = Math.round(((idx + 1) / batches.length) * 100);
                    setUploadProgress(progress);

                } catch (batchErr: any) {
                    throw new Error(batchErr.message || "Error de red al subir lote");
                }

                // Pequeña pausa para no saturar el servidor/firewall (Throttle)
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Validación final de conteo
            if (completedBatches !== batches.length) {
                throw new Error("No se completaron todos los lotes.");
            }

            addLog("✅ Carga Completada (Backend Proxy).");

            // 3. Finalizar Inmediatamente
            onComplete(populationId);

        } catch (err: any) {
            console.error("Upload error:", err);
            addLog(`❌ ERROR: ${err.message}`);
            setError("Error al subir los datos: " + err.message);
            setStage('error');
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold gradient-text">Carga de Población (Versión Estable)</h2>
                <button onClick={onCancel} className="text-sm text-slate-400 hover:text-white">Cancelar</button>
            </div>

            <Card className="border-t-4 border-t-slate-900">
                {stage === 'select_file' && (
                    <div className="text-center p-12">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                            <i className="fas fa-file-excel text-5xl text-slate-300"></i>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Seleccione su Origen de Datos</h3>
                        <p className="text-slate-500 mb-8 max-w-md mx-auto">Soporta Excel (.xlsx) y CSV. Asegúrese de incluir encabezados en la primera fila.</p>

                        <div className="mb-6 flex justify-center gap-4">
                            <button
                                onClick={async () => {
                                    try {
                                        addLog("📡 Probando Conectividad Proxy...");
                                        // @ts-ignore
                                        const url = `${window.location.origin}/supaproxy/auth/v1/health`;
                                        const t0 = performance.now();
                                        const res = await fetch(url);
                                        const t1 = performance.now();
                                        addLog(`📡 Status: ${res.status} (${(t1 - t0).toFixed(0)}ms)`);
                                        const txt = await res.text();
                                        addLog(`📡 Response: ${txt.substring(0, 100)}...`);
                                        if (!res.ok) alert(`Error Proxy: ${res.status}`);
                                        else alert("¡Conexión Exitosa! El Proxy funciona.");
                                    } catch (e: any) {
                                        addLog(`❌ Error Conectividad: ${e.message}`);
                                        alert("Fallo de Conexión: " + e.message);
                                    }
                                }}
                                className="px-4 py-2 bg-blue-100 text-blue-700 rounded text-xs font-bold hover:bg-blue-200"
                            >
                                📡 Probar Conexión (Ping)
                            </button>
                        </div>

                        <input type="file" id="file-upload" className="hidden" accept=".xlsx, .csv" onChange={handleFileChange} />
                        <label
                            htmlFor="file-upload"
                            className="cursor-pointer inline-flex items-center px-8 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg hover:bg-slate-800 transition-all transform hover:-translate-y-1"
                        >
                            <i className="fas fa-search mr-2 text-cyan-400"></i> Buscar Archivo
                        </label>
                    </div>
                )}

                {stage === 'map_columns' && (
                    <div className="p-8 animate-fade-in-up">
                        {/* Simplified Mapping UI from Old Version */}
                        <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Mapeo de Estructura</h3>
                                <p className="text-sm text-slate-500">Vincule las columnas de su archivo.</p>
                            </div>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                    <input type="checkbox" checked={hasMonetaryCols} onChange={() => setHasMonetaryCols(!hasMonetaryCols)} />
                                    Tiene columnas de dinero
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">ID Único *</label>
                                <select className="w-full p-2 border rounded" value={mapping.uniqueId} onChange={(e) => handleMappingChange('uniqueId', e.target.value)}>
                                    <option value="">Seleccionar...</option>
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>

                            {hasMonetaryCols && (
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Valor Monetario *</label>
                                    <select className="w-full p-2 border rounded" value={mapping.monetaryValue} onChange={(e) => handleMappingChange('monetaryValue', e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {['category', 'subcategory', 'user', 'vendor', 'date'].map(field => (
                                <div key={field} className="p-3 border rounded">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{field}</label>
                                    <select className="w-full p-1 text-sm bg-white"
                                        // @ts-ignore
                                        value={mapping[field] || ''}
                                        // @ts-ignore
                                        onChange={(e) => handleMappingChange(field, e.target.value)}>
                                        <option value="">(Opcional)</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 flex justify-between items-center border-t border-slate-100 pt-8">
                            <button onClick={onCancel} className="text-slate-500">Cancelar</button>
                            <button
                                onClick={() => {
                                    const err = validateMapping();
                                    if (err) { setError(err); setStage('error'); }
                                    else { setError(null); setStage('create_population'); }
                                }}
                                className="px-8 py-3 bg-slate-900 text-white rounded-lg font-bold shadow-lg"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}

                {stage === 'create_population' && (
                    <div className="p-8 max-w-lg mx-auto">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Confirmar Carga</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Nombre de la Auditoría</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-lg"
                                    placeholder={file?.name || "Ej. Auditoría 2024Q1"}
                                    value={populationName}
                                    onChange={(e) => setPopulationName(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleUpload}
                                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-lg"
                            >
                                Iniciar Carga Real
                            </button>
                            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                        </div>
                    </div>
                )}

                {stage === 'uploading' && (
                    <div className="p-12 text-center bg-slate-900 text-green-400 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                        <div className="mb-4 text-4xl animate-spin">⚙️</div>
                        <h3 className="text-xl font-bold text-white mb-2">Procesando...</h3>
                        <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
                            <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <div className="text-left space-y-1">
                            {logs.map((l, i) => <div key={i}>{l}</div>)}
                        </div>
                    </div>
                )}

                {stage === 'error' && (
                    <div className="p-8 text-center text-red-600">
                        <h3 className="font-bold text-xl">Error</h3>
                        <p>{error}</p>
                        <button onClick={() => setStage('select_file')} className="mt-4 px-4 py-2 bg-slate-800 text-white rounded">Reintentar</button>
                    </div>
                )}
            </Card>

            <Modal isOpen={!!helpContent} onClose={() => setHelpContent(null)} title={helpContent?.title || ''}>
                {helpContent?.content}
            </Modal>
        </div>
    );
};

export default DataUploadFlow;
