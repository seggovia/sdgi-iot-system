// Script para verificar qué timestamp está usando el Arduino
console.log('🔍 VERIFICANDO TIMESTAMP DEL ARDUINO...');

// Timestamp del Arduino (de la consola)
const timestampArduino = 2337460913;
console.log('Timestamp del Arduino:', timestampArduino);

// Timestamp base correcto para 2025-01-22
const timestampBaseCorrecto = 1737504000;
console.log('Timestamp base correcto:', timestampBaseCorrecto);

// Calcular diferencia
const diferencia = timestampArduino - timestampBaseCorrecto;
console.log('Diferencia:', diferencia, 'segundos');
console.log('Diferencia en días:', Math.floor(diferencia / 86400), 'días');

// Verificar si el Arduino está usando un timestamp base diferente
const timestampBaseArduino = timestampArduino - (diferencia % 86400); // Restar segundos del día
console.log('Timestamp base del Arduino:', timestampBaseArduino);

// Convertir a fecha
const fechaBaseArduino = new Date(timestampBaseArduino * 1000);
console.log('Fecha base del Arduino:', fechaBaseArduino.toLocaleString('es-CL'));

// Mostrar el timestamp que debería usar
console.log('\n🎯 CORRECCIÓN NECESARIA:');
console.log('El Arduino debería usar timestamp base:', timestampBaseCorrecto);
console.log('Fecha base correcta:', new Date(timestampBaseCorrecto * 1000).toLocaleString('es-CL'));
