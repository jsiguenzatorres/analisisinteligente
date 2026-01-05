export const SUPABASE_CONFIG = {
    // URL del proyecto Supabase (cargada desde variables de entorno)
    url: import.meta.env.VITE_SUPABASE_URL || '',

    // Clave anónima (anon key) (cargada desde variables de entorno)
    apiKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',

    // Usuario de base de datos dedicado y de solo lectura para auditoría.
    user: 'auditor',
};
