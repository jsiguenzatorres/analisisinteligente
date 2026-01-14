// Deshabilitar MUS temporalmente para que puedas trabajar con otros métodos
const fs = require('fs');
const path = require('path');

console.log('🚫 Deshabilitando MUS temporalmente...\n');

// Buscar el componente que muestra los métodos de muestreo
const files = [
    'App.tsx',
    'components/sampling/SamplingMethodSelector.tsx',
    'components/sampling/MethodSelector.tsx'
];

let found = false;

for (const file of files) {
    const filePath = path.join(__dirname, file);
    
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Buscar referencias a MUS
        if (content.includes('SamplingMethod.MUS') || content.includes('MUS') || content.includes('Monetaria')) {
            console.log(`✅ Encontrado archivo: ${file}`);
            
            // Comentar o deshabilitar MUS
            if (content.includes('SamplingMethod.MUS')) {
                // Comentar la opción MUS
                content = content.replace(
                    /(\s*)(.*SamplingMethod\.MUS.*)/g,
                    '$1// TEMPORALMENTE DESHABILITADO: $2'
                );
                
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`🚫 MUS deshabilitado en ${file}`);
                found = true;
            }
        }
    }
}

if (!found) {
    console.log('⚠️ No se encontraron archivos de selección de métodos');
    console.log('💡 Alternativa: Usa directamente otros métodos que funcionan:');
    console.log('   - Muestreo de Atributos');
    console.log('   - Muestreo de Variables Clásicas');
    console.log('   - Muestreo No Estadístico');
    console.log('   - Muestreo Estratificado');
}

console.log('\n✅ MUS deshabilitado temporalmente');
console.log('🎯 Ahora puedes usar los otros métodos sin problemas');
console.log('💡 Cuando tengas tiempo, podemos revisar MUS con calma');