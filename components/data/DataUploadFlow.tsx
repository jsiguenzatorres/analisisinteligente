
import React, { useState, useCallback } from 'react';
import { read, utils, WorkSheet } from 'xlsx';
import { supabase } from '../../services/supabaseClient';
import { ColumnMapping, DescriptiveStats, AdvancedAnalysis, BenfordAnalysis } from '../../types';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import { analyzePopulationAndRecommend } from '../../services/recommendationService';
import { ASSISTANT_CONTENT } from '../../constants';

interface Props {
    onComplete: (populationId: string) => void;
    onCancel: () => void;
}

// Agregamos 'create_population' al flujo
type Stage = 'select_file' | 'map_columns' | 'preview' | 'create_population' | 'uploading' | 'error';
type DataRow = { [key: string]: string | number };

const DataUploadFlow: React.FC<Props> = ({ onComplete, onCancel }) => {
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
        if (!file) return;
        const validationError = validateMapping();
        if (validationError) {
            setError(validationError);
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
                const values = data.map(row => parseMoney(row[mapping.monetaryValue]));
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

            // 1. Crear registro de Población
            const { data: popData, error: popError } = await supabase
                .from('audit_populations')
                .insert({
                    file_name: populationName || file.name,
                    status: 'pendiente_validacion',
                    upload_timestamp: new Date().toISOString(),
                    total_rows: data.length,
                    total_monetary_value: totalMonetaryValue,
                    descriptive_stats: descriptiveStats,
                    column_mapping: mapping
                })
                .select()
                .single();

            if (popError) throw popError;
            if (!popData) throw new Error("No se pudo crear la población.");

            const populationId = popData.id;

            // 2. Preparar y subir datos por lotes (Batching)
            const BATCH_SIZE = 500;
            const totalBatches = Math.ceil(data.length / BATCH_SIZE);

            for (let i = 0; i < totalBatches; i++) {
                const start = i * BATCH_SIZE;
                const end = start + BATCH_SIZE;
                const batch = data.slice(start, end);

                const rowsToInsert = batch.map(row => ({
                    population_id: populationId,
                    unique_id_col: String(row[mapping.uniqueId]),
                    monetary_value_col: hasMonetaryCols ? parseMoney(row[mapping.monetaryValue]) : 0,
                    category_col: mapping.category ? String(row[mapping.category]) : null,
                    subcategory_col: mapping.subcategory ? String(row[mapping.subcategory]) : null,
                    raw_json: row // Guardamos la fila original completa como JSON
                }));

                const { error: insertError } = await supabase
                    .from('audit_data_rows')
                    .insert(rowsToInsert);

                if (insertError) throw insertError;

                setUploadProgress(Math.round(((i + 1) / totalBatches) * 100));
            }

            // 3. Finalizar
            onComplete(populationId);

        } catch (err: any) {
            console.error("Upload error:", err);
            setError("Error al subir los datos: " + err.message);
            setStage('error');
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Carga de Población</h2>
                    <p className="text-slate-500 mt-1">Siga el asistente para importar sus datos.</p>
                </div>
                <button
                    onClick={onCancel}
                    className="px-6 py-3 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-700 uppercase tracking-widest hover:text-blue-800 hover:border-blue-500 hover:shadow-xl transition-all transform hover:-translate-y-1 group flex items-center shadow-md"
                >
                    <div className="bg-slate-100 group-hover:bg-blue-50 p-2 rounded-lg mr-3 transition-colors">
                        <i className="fas fa-arrow-left text-blue-600 transform group-hover:-translate-x-1 transition-transform"></i>
                    </div>
                    Volver al Gestor
                </button>
            </div>

            <Card className="border-t-4 border-t-slate-900">
                {stage === 'select_file' && (
                    <div className="text-center p-12">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                            <i className="fas fa-file-excel text-5xl text-slate-300"></i>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Seleccione su Origen de Datos</h3>
                        <p className="text-slate-500 mb-8 max-w-md mx-auto">Soporta Excel (.xlsx) y CSV. Asegúrese de incluir encabezados en la primera fila.</p>

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
                        <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Mapeo de Estructura</h3>
                                <p className="text-sm text-slate-500">Vincule las columnas de su archivo con los parámetros técnicos de auditoría.</p>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${!hasMonetaryCols ? 'text-blue-600' : 'text-slate-400'}`}>Solo Atributos</span>
                                <button
                                    onClick={() => setHasMonetaryCols(!hasMonetaryCols)}
                                    className={`w-12 h-6 rounded-full transition-all relative ${hasMonetaryCols ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hasMonetaryCols ? 'left-7' : 'left-1'}`}></div>
                                </button>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${hasMonetaryCols ? 'text-emerald-600' : 'text-slate-400'}`}>Importes Monetarios</span>
                            </div>
                        </div>

                        {/* Grupo 1: Auditoría Base */}
                        <div className="mb-10">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <span className="w-8 h-[1px] bg-slate-200"></span>
                                Campos de Auditoría Base (Nivel 1)
                                <span className="flex-grow h-[1px] bg-slate-200"></span>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Id Único */}
                                <div className={`group p-5 rounded-3xl border-2 transition-all ${mapping.uniqueId ? 'bg-blue-50/30 border-blue-200 ring-4 ring-blue-500/5' : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
                                                <i className="fas fa-fingerprint text-lg"></i>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest">ID ÚNICO</label>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">Transacción / Factura</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setHelpContent(ASSISTANT_CONTENT.mappingUniqueId)} className="text-slate-300 hover:text-blue-500 transition-colors">
                                            <i className="fas fa-info-circle"></i>
                                        </button>
                                    </div>
                                    <select
                                        className="w-full bg-white border-0 focus:ring-0 text-sm font-bold text-slate-700 p-0"
                                        value={mapping.uniqueId}
                                        onChange={(e) => handleMappingChange('uniqueId', e.target.value)}
                                    >
                                        <option value="">Seleccione columna...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>

                                {/* Valor Monetario */}
                                {hasMonetaryCols && (
                                    <div className={`group p-5 rounded-3xl border-2 transition-all ${mapping.monetaryValue ? 'bg-emerald-50/30 border-emerald-200 ring-4 ring-emerald-500/5' : 'bg-white border-slate-100 hover:border-emerald-200 shadow-sm'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-emerald-500 shadow-sm group-hover:scale-110 transition-transform">
                                                    <i className="fas fa-dollar-sign text-lg"></i>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest">VALOR MONETARIO</label>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Importe de la Operación</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setHelpContent(ASSISTANT_CONTENT.mappingMonetary)} className="text-slate-300 hover:text-emerald-500 transition-colors">
                                                <i className="fas fa-info-circle"></i>
                                            </button>
                                        </div>
                                        <select
                                            className="w-full bg-white border-0 focus:ring-0 text-sm font-bold text-slate-700 p-0"
                                            value={mapping.monetaryValue}
                                            onChange={(e) => handleMappingChange('monetaryValue', e.target.value)}
                                        >
                                            <option value="">Seleccione columna...</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Grupo 2: Análisis Forense y Temporal */}
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <span className="w-8 h-[1px] bg-slate-200"></span>
                                Parámetros de Análisis Avanzado (Forensic/EDA)
                                <span className="flex-grow h-[1px] bg-slate-200"></span>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Fecha */}
                                <div className={`p-5 rounded-3xl border-2 transition-all ${mapping.date ? 'bg-indigo-50/30 border-indigo-200' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-indigo-400">
                                                <i className="fas fa-calendar-alt text-sm"></i>
                                            </div>
                                            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Fecha</label>
                                        </div>
                                        <button onClick={() => setHelpContent(ASSISTANT_CONTENT.mappingDate)} className="text-slate-300 hover:text-indigo-500">
                                            <i className="fas fa-info-circle text-xs"></i>
                                        </button>
                                    </div>
                                    <select
                                        className="w-full bg-transparent border-0 focus:ring-0 text-xs font-bold text-slate-600 p-0"
                                        value={mapping.date || ''}
                                        onChange={(e) => handleMappingChange('date', e.target.value)}
                                    >
                                        <option value="">Ignorar...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>

                                {/* Timestamp */}
                                <div className={`p-5 rounded-3xl border-2 transition-all ${mapping.timestamp ? 'bg-blue-50/30 border-blue-200' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-blue-400">
                                                <i className="fas fa-clock text-sm"></i>
                                            </div>
                                            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Hora / Timestamp</label>
                                        </div>
                                        <button onClick={() => setHelpContent(ASSISTANT_CONTENT.mappingTimestamp)} className="text-slate-300 hover:text-blue-500">
                                            <i className="fas fa-info-circle text-xs"></i>
                                        </button>
                                    </div>
                                    <select
                                        className="w-full bg-transparent border-0 focus:ring-0 text-xs font-bold text-slate-600 p-0"
                                        value={mapping.timestamp || ''}
                                        onChange={(e) => handleMappingChange('timestamp', e.target.value)}
                                    >
                                        <option value="">Ignorar...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>

                                {/* Usuario */}
                                <div className={`p-5 rounded-3xl border-2 transition-all ${mapping.user ? 'bg-violet-50/30 border-violet-200' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-violet-400">
                                                <i className="fas fa-user-shield text-sm"></i>
                                            </div>
                                            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Usuario / Actor</label>
                                        </div>
                                        <button onClick={() => setHelpContent(ASSISTANT_CONTENT.mappingUser)} className="text-slate-300 hover:text-violet-500">
                                            <i className="fas fa-info-circle text-xs"></i>
                                        </button>
                                    </div>
                                    <select
                                        className="w-full bg-transparent border-0 focus:ring-0 text-xs font-bold text-slate-600 p-0"
                                        value={mapping.user || ''}
                                        onChange={(e) => handleMappingChange('user', e.target.value)}
                                    >
                                        <option value="">Ignorar...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>

                                {/* Proveedor */}
                                <div className={`p-5 rounded-3xl border-2 transition-all ${mapping.vendor ? 'bg-cyan-50/30 border-cyan-200' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-cyan-400">
                                                <i className="fas fa-truck text-sm"></i>
                                            </div>
                                            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Proveedor / Tercero</label>
                                        </div>
                                        <button onClick={() => setHelpContent(ASSISTANT_CONTENT.mappingVendor)} className="text-slate-300 hover:text-cyan-500">
                                            <i className="fas fa-info-circle text-xs"></i>
                                        </button>
                                    </div>
                                    <select
                                        className="w-full bg-transparent border-0 focus:ring-0 text-xs font-bold text-slate-600 p-0"
                                        value={mapping.vendor || ''}
                                        onChange={(e) => handleMappingChange('vendor', e.target.value)}
                                    >
                                        <option value="">Ignorar...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>

                                {/* Categoría */}
                                <div className={`p-5 rounded-3xl border-2 transition-all ${mapping.category ? 'bg-amber-50/30 border-amber-200' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-amber-400">
                                                <i className="fas fa-tags text-sm"></i>
                                            </div>
                                            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Categoría</label>
                                        </div>
                                        <button onClick={() => setHelpContent(ASSISTANT_CONTENT.mappingCategory)} className="text-slate-300 hover:text-amber-500">
                                            <i className="fas fa-info-circle text-xs"></i>
                                        </button>
                                    </div>
                                    <select
                                        className="w-full bg-transparent border-0 focus:ring-0 text-xs font-bold text-slate-600 p-0"
                                        value={mapping.category || ''}
                                        onChange={(e) => handleMappingChange('category', e.target.value)}
                                    >
                                        <option value="">Ignorar...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>

                                {/* Subcategoría */}
                                <div className={`p-5 rounded-3xl border-2 transition-all ${mapping.subcategory ? 'bg-orange-50/30 border-orange-200' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-orange-400">
                                                <i className="fas fa-tag text-sm"></i>
                                            </div>
                                            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Subcategoría</label>
                                        </div>
                                        <button onClick={() => setHelpContent(ASSISTANT_CONTENT.mappingSubcategory)} className="text-slate-300 hover:text-orange-500">
                                            <i className="fas fa-info-circle text-xs"></i>
                                        </button>
                                    </div>
                                    <select
                                        className="w-full bg-transparent border-0 focus:ring-0 text-xs font-bold text-slate-600 p-0"
                                        value={mapping.subcategory || ''}
                                        onChange={(e) => handleMappingChange('subcategory', e.target.value)}
                                    >
                                        <option value="">Ignorar...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 flex justify-between items-center border-t border-slate-100 pt-8">
                            <button
                                onClick={() => setStage('select_file')}
                                className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-colors"
                            >
                                <i className="fas fa-chevron-left mr-2"></i> Cambiar Archivo
                            </button>
                            <button
                                onClick={() => {
                                    const err = validateMapping();
                                    if (err) {
                                        setError(err);
                                        setStage('error');
                                    } else {
                                        setError(null);
                                        setStage('create_population');
                                    }
                                }}
                                className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 hover:-translate-y-1 transition-all active:translate-y-0"
                            >
                                Siguiente: Confirmar Carga
                            </button>
                        </div>
                    </div>
                )}

                {stage === 'create_population' && (
                    <div className="p-8 max-w-lg mx-auto">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Detalles de la Carga</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Nombre de la Población</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-lg"
                                    placeholder={file?.name || "Ej. Auditoría 2024Q1"}
                                    value={populationName}
                                    onChange={(e) => setPopulationName(e.target.value)}
                                />
                            </div>
                            <div className="bg-slate-50 p-4 rounded text-sm text-slate-600">
                                <p><strong>Filas detectadas:</strong> {data.length.toLocaleString()}</p>
                                <p><strong>Columnas:</strong> {headers.length}</p>
                            </div>
                            <button
                                onClick={handleUpload}
                                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-lg"
                            >
                                Iniciar Carga a Base de Datos
                            </button>
                            {error && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm text-center">
                                    <i className="fas fa-exclamation-circle mr-2"></i>
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {stage === 'uploading' && (
                    <div className="p-12 text-center">
                        <div className="mb-4 text-4xl text-blue-500 animate-spin">
                            <i className="fas fa-circle-notch"></i>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Subiendo Datos...</h3>
                        <p className="text-slate-500 mb-4">Por favor espere, procesando {data.length.toLocaleString()} registros.</p>
                        <div className="w-full bg-slate-200 rounded-full h-4 max-w-md mx-auto overflow-hidden">
                            <div
                                className="bg-blue-500 h-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                        <p className="mt-2 text-sm font-bold text-blue-600">{uploadProgress}%</p>
                    </div>
                )}

                {stage === 'error' && (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 text-2xl">
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <h3 className="text-lg font-bold text-red-600 mb-2">Error en la Carga</h3>
                        <p className="text-slate-600 mb-6">{error}</p>
                        <button onClick={() => setStage('select_file')} className="px-4 py-2 bg-slate-800 text-white rounded">Intentar de nuevo</button>
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
