// Script para verificar la conversión corregida
console.log('🔍 VERIFICANDO CONVERSIÓN CORREGIDA...');

// Timestamp del Arduino (en segundos)
const timestampArduino = 2337460913;
console.log('Timestamp del Arduino (segundos):', timestampArduino);

// Aplicar la lógica corregida
let timestampMs = timestampArduino;

if (timestampArduino < 20000000000) {
  timestampMs = timestampArduino * 1000;
  console.log('🔄 Timestamp convertido:', timestampArduino, '→', timestampMs);
} else {
  console.log('⚠️ Timestamp ya está en milisegundos');
}

// Crear fecha
const fecha = new Date(timestampMs);
console.log('Fecha convertida:', fecha.toLocaleString('es-CL'));
console.log('Año:', fecha.getFullYear());

// Verificar que sea 2025
if (fecha.getFullYear() === 2025) {
  console.log('✅ CORRECTO: Fecha de 2025');
} else {
  console.log('❌ INCORRECTO: Fecha de', fecha.getFullYear());
}

// Verificar diferencia de tiempo
const ahora = Date.now();
const diferenciaMs = ahora - timestampMs;
const diferenciaSeg = Math.floor(diferenciaMs / 1000);

console.log('Diferencia de tiempo:', diferenciaSeg, 'segundos');
console.log('Debería estar conectado:', diferenciaMs < 60000 ? '✅ SÍ' : '❌ NO');
