/**
 * 🚨 ACTIVADOR DE MODO EMERGENCIA
 * 
 * Ejecuta este script en la consola del navegador para activar
 * el modo emergencia que evita el guardado en BD.
 */

console.log('🚨 ACTIVANDO MODO EMERGENCIA...');

// Activar modo emergencia
localStorage.setItem('SKIP_SAVE_MODE', 'true');
localStorage.setItem('EMERGENCY_MODE_ACTIVATED', new Date().toISOString());

console.log('✅ MODO EMERGENCIA ACTIVADO');
console.log('   - Las muestras se generarán sin guardar en BD');
console.log('   - El botón no se quedará pegado');
console.log('   - Para desactivar: localStorage.removeItem("SKIP_SAVE_MODE")');

// Mostrar estado actual
console.log('\n📊 ESTADO ACTUAL:');
console.log('   SKIP_SAVE_MODE:', localStorage.getItem('SKIP_SAVE_MODE'));
console.log('   SAVE_FAIL_COUNT:', localStorage.getItem('SAVE_FAIL_COUNT') || '0');
console.log('   EMERGENCY_ACTIVATED:', localStorage.getItem('EMERGENCY_MODE_ACTIVATED'));

alert('🚨 MODO EMERGENCIA ACTIVADO\n\nAhora las muestras se generarán sin guardar en BD.\nEl botón debería funcionar correctamente.');