// Test script para verificar configuración SERVICE_ROLE_KEY
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración de variables de entorno...\n');

// Leer .env.local manualmente
const envPath = path.join(__dirname, '.env.local');
let envVars = {};

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#') && line.includes('=')) {
            const [key, ...valueParts] = line.split('=');
            const value = valueParts.join('=');
            envVars[key.trim()] = value.trim();
        }
    });
} catch (err) {
    console.error('❌ Error leyendo .env.local:', err.message);
    process.exit(1);
}

// Verificar variables de entorno
const SUPABASE_URL = envVars.SUPABASE_URL || envVars.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY;

console.log('Variables encontradas en .env.local:');
console.log('✓ SUPABASE_URL:', SUPABASE_URL ? '✅ Configurada' : '❌ Faltante');
console.log('✓ SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✅ Configurada' : '❌ Faltante');
console.log('✓ ANON_KEY:', ANON_KEY ? '✅ Configurada' : '❌ Faltante');
console.log('');

if (!SUPABASE_URL) {
    console.error('❌ Error: Falta SUPABASE_URL en .env.local');
    process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
    console.error('❌ Error: Falta SUPABASE_SERVICE_ROLE_KEY en .env.local');
    console.log('📋 Para obtener tu SERVICE_ROLE_KEY:');
    console.log('   1. Ve a https://supabase.com/dashboard');
    console.log('   2. Selecciona tu proyecto');
    console.log('   3. Ve a Settings → API');
    console.log('   4. En "Project API keys", busca "service_role"');
    console.log('   5. Haz clic en "Reveal" y copia la key');
    console.log('   6. En .env.local, descomenta y reemplaza:');
    console.log('      SUPABASE_SERVICE_ROLE_KEY=tu_key_real_aqui');
    process.exit(1);
}

console.log('✅ Todas las variables están configuradas correctamente!');
console.log('');
console.log('🎯 Próximos pasos:');
console.log('   1. Reinicia tu servidor de desarrollo: npm run dev');
console.log('   2. Prueba PopulationManager - debería cargar sin errores 500');
console.log('   3. Prueba AdminUserManagement - debería mostrar usuarios');
console.log('');
console.log('💡 Si aún tienes errores 500, verifica que la SERVICE_ROLE_KEY sea correcta.');