
import React, { useState } from 'react';
import { AppState, SamplingMethod, AuditPopulation, ColumnMapping, AuditResults } from './types';
import Header from './components/layout/Header';
import Step4Results from './components/steps/Step4_Results';
import Dashboard from './components/dashboard/Dashboard';
import SamplingWorkspace from './components/sampling/SamplingWorkspace';
import PopulationManager from './components/data/PopulationManager';
import DataUploadFlow from './components/data/DataUploadFlow';
import ValidationWorkspace from './components/data/ValidationWorkspace';
import DiscoveryModule from './components/data/DiscoveryModule';
import RiskProfiler from './components/risk/RiskProfiler';
import Stepper from './components/layout/Stepper';
import { ToastProvider } from './components/ui/ToastContext';
import { supabase } from './services/supabaseClient';

export type AppView = 'population_manager' | 'data_upload' | 'validation_workspace' | 'discovery_analysis' | 'risk_profiling' | 'dashboard' | 'sampling_config' | 'results';

const App: React.FC = () => {
    const [view, setView] = useState<AppView>('population_manager');
    const [activePopulation, setActivePopulation] = useState<AuditPopulation | null>(null);
    const [validationPopulationId, setValidationPopulationId] = useState<string | null>(null);

    const [appState, setAppState] = useState<AppState>({
        connection: { table: '', idColumn: '', valueColumn: '', validated: false, user: '', url: '' },
        selectedPopulation: null,
        generalParams: { objective: '', standard: 'NIA 530', template: 'NIA 530 Detalle', seed: Math.floor(Math.random() * 100000) },
        samplingMethod: SamplingMethod.Attribute,
        samplingParams: {
            attribute: { N: 0, NC: 95, ET: 5, PE: 1, useSequential: false },
            mus: { V: 0, TE: 50000, EE: 500, RIA: 5, optimizeTopStratum: true, handleNegatives: 'Separate', usePilotSample: false },
            cav: { sigma: 0, stratification: true, estimationTechnique: 'Media', usePilotSample: false, NC: 95, TE: 50000 },
            stratified: { basis: 'Monetary', strataCount: 3, allocationMethod: 'Óptima (Neyman)', certaintyStratumThreshold: 10000, detectOutliers: false, usePilotSample: false, selectedVariables: [], manualAllocations: undefined, NC: 95, ET: 5, PE: 1 },
            nonStatistical: { criteria: '', justification: '', sampleSize: 30, selectedInsight: 'Default', sizeJustification: '', materiality: 50000 },
        },
        results: null,
        isLocked: false,
        isCurrentVersion: false
    });

    const handlePopulationSelected = async (population: AuditPopulation) => {
        try {
            console.log("🔍 Cargando población:", population.id);
            // Cargar resultados guardados previamente para esta población
            const { data: existingResults, error: fetchError } = await supabase
                .from('audit_results')
                .select('results_json')
                .eq('population_id', population.id)
                .maybeSingle();

            if (fetchError) {
                console.error("❌ Error recuperando datos de Supabase:", fetchError);
            }

            const rawJson = existingResults?.results_json as any;

            // LÓGICA DE DETECCIÓN MULTI-MÉTODO:
            // Si el objeto tiene una propiedad que coincide con un método, es Multi-Método.
            const isMultiMethod = rawJson && (rawJson[SamplingMethod.MUS] || rawJson[SamplingMethod.Attribute] || rawJson[SamplingMethod.NonStatistical]);

            let loadedResults: AuditResults | null = null;
            let loadedParams = null;
            let activeMethod: SamplingMethod = appState.samplingMethod;

            if (isMultiMethod) {
                // Si es multi-método, restauramos el último usado
                activeMethod = rawJson.last_method as SamplingMethod || activeMethod;
                loadedResults = rawJson[activeMethod] || null;
                loadedParams = loadedResults?.sampling_params || null;
            } else if (rawJson) {
                // Datos Legacy (un solo objeto en la raíz)
                loadedResults = rawJson;
                loadedParams = rawJson.sampling_params || null;
                activeMethod = rawJson.method || activeMethod;
            }

            setAppState(prev => ({
                ...prev,
                selectedPopulation: population,
                isLocked: !!existingResults,
                isCurrentVersion: !!existingResults,
                full_results_storage: rawJson || {},
                results: loadedResults,
                samplingMethod: activeMethod,
                samplingParams: loadedParams ? { ...prev.samplingParams, ...loadedParams } : {
                    ...prev.samplingParams,
                    attribute: { ...prev.samplingParams.attribute, N: population.total_rows },
                    mus: { ...prev.samplingParams.mus, V: population.total_monetary_value }
                }
            }));

            setActivePopulation(population);
            setView('dashboard');
        } catch (e) {
            console.error("💥 Excepción crítica en handlePopulationSelected:", e);
            setActivePopulation(population);
            setView('dashboard');
        }
    };

    const handleUploadComplete = (populationId: string) => {
        setValidationPopulationId(populationId);
        setView('validation_workspace');
    };

    const handleValidationComplete = (population: AuditPopulation) => {
        setValidationPopulationId(population.id);
        // After validation, proceed to Discovery Analysis
        setView('discovery_analysis');
    };

    const handleDiscoveryComplete = async (mapping: ColumnMapping, activeTests: string[]) => {
        if (!validationPopulationId) return;

        // Save Discovery results (Mapping & Active Tests) to DB
        const { data, error } = await supabase
            .from('audit_populations')
            .update({
                column_mapping: mapping,
                advanced_analysis: { forensicDiscovery: activeTests }
            })
            .eq('id', validationPopulationId)
            .select()
            .single();

        if (error) {
            console.error("Error saving discovery results:", error);
            return;
        }

        // Proceed to Risk Profiling with updated population data
        setActivePopulation(data as AuditPopulation);
        setView('risk_profiling');
    };

    const handleRiskComplete = (updatedPop: AuditPopulation) => {
        setValidationPopulationId(null);
        handlePopulationSelected(updatedPop);
    };

    const handleMethodSelect = (method: SamplingMethod) => {
        setAppState(prev => {
            const storage = prev.full_results_storage || {};

            // Buscamos si hay resultados específicos para este método
            const methodSpecificResults = storage[method];
            const isLegacyMatch = prev.results && (prev.results as any).method === method;
            const existingWork = methodSpecificResults || (isLegacyMatch ? prev.results : null);

            if (existingWork) {
                setTimeout(() => setView('results'), 0);
            } else {
                setTimeout(() => setView('sampling_config'), 0);
            }

            return {
                ...prev,
                samplingMethod: method,
                results: existingWork,
                samplingParams: existingWork?.sampling_params ? { ...prev.samplingParams, ...existingWork.sampling_params } : prev.samplingParams
            };
        });
    };

    const navigateTo = (targetView: AppView) => {
        if (targetView === 'population_manager') {
            setAppState(prev => ({ ...prev, selectedPopulation: null, results: null, isLocked: false, isCurrentVersion: false }));
            setActivePopulation(null);
        }
        setView(targetView);
    };

    const renderView = () => {
        switch (view) {
            case 'population_manager':
                return <PopulationManager onPopulationSelected={handlePopulationSelected} onAddNew={() => setView('data_upload')} />;
            case 'data_upload':
                return <DataUploadFlow onComplete={handleUploadComplete} onCancel={() => setView('population_manager')} />;
            case 'validation_workspace':
                if (!validationPopulationId) return <p>ID de población no válido.</p>;
                return <ValidationWorkspace
                    populationId={validationPopulationId}
                    onValidationComplete={handleValidationComplete}
                    onCancel={() => setView('population_manager')}
                />;
            case 'discovery_analysis':
                if (!validationPopulationId) return <p>ID de población no válido para Descubrimiento.</p>;
                return <DiscoveryModule
                    populationId={validationPopulationId}
                    onComplete={handleDiscoveryComplete}
                />;
            case 'risk_profiling':
                if (!activePopulation) return <p>Datos de población no cargados para Perfilado de Riesgo.</p>;
                return <RiskProfiler
                    population={activePopulation}
                    onComplete={handleRiskComplete}
                />;
            case 'dashboard':
                if (!activePopulation) return <p>No hay una población activa.</p>;
                return <Dashboard onMethodSelect={handleMethodSelect} population={activePopulation} onNavigate={navigateTo} />;
            case 'sampling_config':
                if (!activePopulation) return null;
                return <SamplingWorkspace
                    appState={appState}
                    setAppState={setAppState}
                    currentMethod={appState.samplingMethod}
                    onBack={() => setView('dashboard')}
                    onComplete={() => setView('results')}
                />;
            case 'results':
                if (!appState.results) return null;
                return <Step4Results
                    appState={appState}
                    setAppState={setAppState}
                    onBack={() => setView('sampling_config')}
                    onRestart={() => navigateTo('population_manager')}
                />;
            default:
                return <PopulationManager onPopulationSelected={handlePopulationSelected} onAddNew={() => setView('data_upload')} />;
        }
    };

    return (
        <ToastProvider>
            <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-800">
                <Header onNavigate={navigateTo} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-8">
                    {!['population_manager'].includes(view) && (
                        <div className="mb-12">
                            <Stepper currentView={view} appState={appState} />
                        </div>
                    )}
                    {renderView()}
                </main>
            </div>
        </ToastProvider>
    );
};

export default App;
