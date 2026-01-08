const cleanEnv = (val: string | undefined) => {
    if (!val) return '';
    let clean = val.trim();
    if (clean.startsWith("'") && clean.endsWith("'")) clean = clean.slice(1, -1);
    if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
    return clean;
};

// PROXY MODE ACTIVADO: Usamos el proxy local para evitar bloqueos del navegador
// PROXY KAMEHAMEHA: Usamos el origen actual + /supaproxy para que funcione tanto en Localhost como en Netlify
// Esto fuerza a que TODO el tráfico (Auth y DB) pase por nuestro 'túnel' y burle el bloqueo.
const getProxyUrl = () => {
    if (typeof window !== 'undefined') {
        return `${window.location.origin}/supaproxy`;
    }
    return 'http://localhost:3000/supaproxy'; // Fallback para SSR o build time
};

const SUPABASE_URL = getProxyUrl();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const SUPABASE_CONFIG = {
    // URL del proyecto Supabase (cargada desde variables de entorno)
    url: cleanEnv(SUPABASE_URL),

    // Clave anónima (anon key) (cargada desde variables de entorno)
    apiKey: cleanEnv(SUPABASE_ANON_KEY),

    // Usuario de base de datos dedicado y de solo lectura para auditoría.
    user: 'auditor',
};
