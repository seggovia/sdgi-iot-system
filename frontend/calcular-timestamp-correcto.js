// Script para calcular el timestamp correcto
console.log('🔍 CALCULANDO TIMESTAMP CORRECTO...');

// Timestamp actual (2025-01-22)
const ahora = Date.now();
console.log('Timestamp actual (milisegundos):', ahora);
console.log('Fecha actual:', new Date(ahora).toLocaleString('es-CL'));

// Timestamp del Arduino (en segundos)
const timestampArduino = 2337460913;
console.log('Timestamp del Arduino (segundos):', timestampArduino);

// Convertir a milisegundos
const timestampMs = timestampArduino * 1000;
console.log('Timestamp convertido (milisegundos):', timestampMs);
console.log('Fecha convertida:', new Date(timestampMs).toLocaleString('es-CL'));

// Calcular el timestamp base correcto
const timestampBaseCorrecto = ahora - (timestampArduino * 1000);
console.log('Timestamp base correcto:', timestampBaseCorrecto);
console.log('Fecha base:', new Date(timestampBaseCorrecto).toLocaleString('es-CL'));

// Verificar que el timestamp base sea de 2025
const fechaBase = new Date(timestampBaseCorrecto);
console.log('Año del timestamp base:', fechaBase.getFullYear());

if (fechaBase.getFullYear() === 2025) {
  console.log('✅ Timestamp base correcto para 2025');
} else {
  console.log('❌ Timestamp base incorrecto');
}
