// Script para verificar la conversión de timestamps con datos reales del Arduino
console.log('🔍 VERIFICANDO CONVERSIÓN DE TIMESTAMPS CON DATOS REALES...');

// Datos reales del Arduino (de la consola)
const timestampArduino = 2337303240; // Ejemplo de la consola
console.log('Timestamp del Arduino:', timestampArduino);

// Aplicar la misma lógica que en el código
let timestampMs = timestampArduino;

if (timestampArduino < 10000000000) {
  timestampMs = timestampArduino * 1000;
  console.log('🔄 Timestamp convertido:', timestampArduino, '→', timestampMs);
} else {
  console.log('⚠️ Timestamp ya está en milisegundos');
}

// Crear fecha
const fecha = new Date(timestampMs);
console.log('Fecha convertida:', fecha.toLocaleString('es-CL'));

// Verificar diferencia de tiempo
const ahora = Date.now();
const diferenciaMs = ahora - timestampMs;
const diferenciaSeg = Math.floor(diferenciaMs / 1000);

console.log('Diferencia de tiempo:', diferenciaSeg, 'segundos');

// Verificar si debería estar conectado
const estaConectado = diferenciaMs < 60000;
console.log('Debería estar conectado:', estaConectado ? '✅ SÍ' : '❌ NO');

// Verificar que no sea 1970
if (fecha.getFullYear() === 1970) {
  console.log('❌ ERROR: Fecha sigue siendo 1970');
  console.log('   Posible causa: El timestamp no se está convirtiendo correctamente');
} else {
  console.log('✅ CORRECTO: Fecha convertida correctamente');
  console.log('   Año:', fecha.getFullYear());
}
