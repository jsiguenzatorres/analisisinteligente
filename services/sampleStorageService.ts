/**
 * 🗄️ SERVICIO DE ALMACENAMIENTO DE MUESTRAS - MODO EMERGENCIA
 * 
 * ⚠️ IMPORTANTE: Este servicio NO guarda en base de datos para evitar problemas de RLS.
 * Los datos se mantienen solo en memoria del navegador durante la sesión.
 * 
 * RAZÓN: No podemos exponer el service_role_key en el cliente por seguridad.
 * 
 * SOLUCIONES PARA HABILITAR GUARDADO EN BD:
 * 1. Desplegar Edge Function de Supabase (ver DESPLIEGUE_EDGE_FUNCTION.md)
 * 2. Crear endpoint API en backend con service_role_key
 * 3. Configurar RLS policies correctamente en Supabase
 */

import { AuditResults, SamplingMethod } from '../types';

export interface SampleStorageData {
    population_id: string;
    method: SamplingMethod;
    objective: string;
    seed: number;
    sample_size: number;
    params_snapshot: any;
    results_snapshot: AuditResults;
    is_final: boolean;
    is_current: boolean;
}

export interface SaveSampleResult {
    id: string;
    created_at: string;
    method: 'emergency_mode';
    duration_ms: number;
}

/**
 * 🚨 MODO EMERGENCIA: Guardado solo en memoria
 * 
 * Los datos se guardan en el estado de React pero NO en la base de datos.
 * Esto permite que la aplicación funcione sin problemas de RLS.
 */
export async function saveSample(data: SampleStorageData): Promise<SaveSampleResult> {
    console.log('🚨 MODO EMERGENCIA ACTIVO');
    console.log('📝 Guardando muestra solo en memoria (NO en base de datos)');
    console.log(`   Población: ${data.population_id}`);
    console.log(`   Método: ${data.method}`);
    console.log(`   Tamaño: ${data.sample_size} ítems`);
    
    const startTime = Date.now();
    
    // Simular un pequeño delay para UX
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Generar ID temporal único
    const mockId = `emergency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = Date.now() - startTime;
    
    console.log(`✅ Muestra guardada en memoria (${duration}ms)`);
    console.log(`   ID temporal: ${mockId}`);
    console.warn('⚠️ ADVERTENCIA: Los datos NO se guardaron en base de datos');
    console.warn('⚠️ Los datos se perderán al recargar la página');
    console.warn('⚠️ Para habilitar guardado persistente, ver: DESPLIEGUE_EDGE_FUNCTION.md');
    
    return {
        id: mockId,
        created_at: new Date().toISOString(),
        method: 'emergency_mode',
        duration_ms: duration
    };
}

/**
 * 🔍 VERIFICAR MUESTRA (MODO EMERGENCIA)
 * 
 * En modo emergencia, siempre retorna true ya que no hay BD que verificar
 */
export async function verifySavedSample(sampleId: string): Promise<boolean> {
    console.log('🚨 MODO EMERGENCIA: Verificación simulada');
    return true;
}

/**
 * 📊 ESTADÍSTICAS (MODO EMERGENCIA)
 * 
 * En modo emergencia, no hay estadísticas disponibles
 */
export async function getSaveStatistics(populationId: string) {
    console.log('🚨 MODO EMERGENCIA: Estadísticas no disponibles');
    return { 
        total: 0, 
        samples: [], 
        lastSaved: null 
    };
}

export default {
    saveSample,
    verifySavedSample,
    getSaveStatistics
};
