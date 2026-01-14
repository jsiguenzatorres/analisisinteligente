// Debug script para probar la API de poblaciones directamente
const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnosticando API de poblaciones...\n');

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

console.log('Variables:');
console.log('✓ SUPABASE_URL:', SUPABASE_URL);
console.log('✓ SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? 'Configurada (longitud: ' + SERVICE_ROLE_KEY.length + ')' : 'Faltante');
console.log('');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Variables de entorno faltantes');
    process.exit(1);
}

async function testAPIProxy() {
    console.log('🧪 Test: Probando API proxy local...');
    
    try {
        const response = await fetch('http://localhost:3000/api/sampling_proxy?action=get_populations', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('   Status:', response.status);
        console.log('   Status Text:', response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error en API proxy:', errorText);
            return false;
        }

        const data = await response.json();
        console.log('✅ API proxy exitoso');
        console.log(`   Poblaciones via proxy: ${data.populations?.length || 0}`);
        
        if (data.populations && data.populations.length > 0) {
            console.log('   Primeras poblaciones:');
            data.populations.slice(0, 3).forEach(pop => {
                console.log(`   - ${pop.audit_name || 'Sin nombre'} (${pop.total_rows || 0} registros) - ${pop.status}`);
            });
        }
        
        return true;
        
    } catch (err) {
        console.error('❌ Error en API proxy:', err.message);
        console.log('   Posibles causas:');
        console.log('   - El servidor no está corriendo en localhost:3000');
        console.log('   - Problema de CORS');
        console.log('   - Error en el API proxy');
        return false;
    }
}

async function runDiagnostics() {
    const proxyOk = await testAPIProxy();
    
    console.log('\n🎯 Diagnóstico:');
    
    if (proxyOk) {
        console.log('✅ API proxy funciona correctamente');
        console.log('   El problema puede ser timeout en el frontend');
        console.log('   Revisa la consola del navegador para más detalles');
    } else {
        console.log('❌ Problema en API proxy');
        console.log('   Verifica que:');
        console.log('   1. El servidor esté corriendo: npm run dev');
        console.log('   2. No haya errores en la terminal del servidor');
        console.log('   3. El puerto 3000 esté disponible');
    }
}

runDiagnostics().catch(console.error);