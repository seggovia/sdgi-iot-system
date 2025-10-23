// Script para verificar que los timestamps se muestren correctamente
console.log('🔍 VERIFICANDO CORRECCIÓN DE TIMESTAMPS...');

// Simular timestamp del Arduino (en segundos)
const timestampArduino = 2337961256; // Ejemplo del Arduino
console.log('Timestamp del Arduino (segundos):', timestampArduino);

// Convertir a milisegundos
const timestampMs = timestampArduino * 1000;
console.log('Timestamp convertido (milisegundos):', timestampMs);

// Crear fecha
const fecha = new Date(timestampMs);
console.log('Fecha convertida:', fecha.toLocaleString('es-CL'));

// Verificar que no sea 1970
if (fecha.getFullYear() === 1970) {
  console.log('❌ ERROR: Fecha sigue siendo 1970');
} else {
  console.log('✅ CORRECTO: Fecha convertida correctamente');
}

// Verificar diferencia de tiempo
const ahora = Date.now();
const diferenciaMs = ahora - timestampMs;
const diferenciaSeg = Math.floor(diferenciaMs / 1000);

console.log('Diferencia de tiempo:', diferenciaSeg, 'segundos');

if (diferenciaSeg < 60) {
  console.log('✅ Arduino debería aparecer como CONECTADO');
} else {
  console.log('⚠️ Arduino aparecerá como DESCONECTADO');
}
