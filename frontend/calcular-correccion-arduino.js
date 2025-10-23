// Script para calcular el timestamp base correcto que debería usar el Arduino
console.log('🔍 CALCULANDO TIMESTAMP BASE CORRECTO PARA EL ARDUINO...');

// Timestamp del Arduino (del serial monitor)
const timestampArduino = 2337705519;
console.log('Timestamp del Arduino:', timestampArduino);

// Timestamp base correcto para 2025-01-22
const timestampBaseCorrecto = 1737504000; // 2025-01-22 en segundos
console.log('Timestamp base correcto:', timestampBaseCorrecto);

// Calcular diferencia
const diferencia = timestampArduino - timestampBaseCorrecto;
console.log('Diferencia:', diferencia, 'segundos');
console.log('Diferencia en días:', Math.floor(diferencia / 86400), 'días');

// Calcular el timestamp base que está usando el Arduino
const timestampBaseArduino = timestampArduino - (diferencia % 86400);
console.log('Timestamp base del Arduino:', timestampBaseArduino);

// Convertir a fecha
const fechaBaseArduino = new Date(timestampBaseArduino * 1000);
console.log('Fecha base del Arduino:', fechaBaseArduino.toLocaleString('es-CL'));

// Mostrar la corrección necesaria
console.log('\n🎯 CORRECCIÓN NECESARIA EN EL ARDUINO:');
console.log('El Arduino debería usar timestamp base:', timestampBaseCorrecto);
console.log('Fecha base correcta:', new Date(timestampBaseCorrecto * 1000).toLocaleString('es-CL'));

// Verificar que el timestamp base correcto genere fechas de 2025
const fechaCorrecta = new Date(timestampBaseCorrecto * 1000);
console.log('Año del timestamp base correcto:', fechaCorrecta.getFullYear());

if (fechaCorrecta.getFullYear() === 2025) {
  console.log('✅ CORRECTO: El timestamp base correcto genera fechas de 2025');
} else {
  console.log('❌ INCORRECTO: El timestamp base correcto no genera fechas de 2025');
}
