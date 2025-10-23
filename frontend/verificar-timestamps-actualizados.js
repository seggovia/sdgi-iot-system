// Script para verificar los timestamps del Arduino actualizados
console.log('🔍 VERIFICANDO TIMESTAMPS ACTUALIZADOS DEL ARDUINO...');

// Timestamps del Arduino (del serial monitor)
const timestamp1 = 2337705519;
const timestamp2 = 2337711245;

console.log('Timestamp 1:', timestamp1);
console.log('Timestamp 2:', timestamp2);

// Aplicar conversión del frontend
function convertirTimestamp(timestamp) {
  let timestampMs = timestamp;
  
  if (timestamp < 20000000000) {
    timestampMs = timestamp * 1000;
    console.log('🔄 Timestamp convertido:', timestamp, '→', timestampMs);
  }
  
  return timestampMs;
}

// Convertir timestamps
const timestampMs1 = convertirTimestamp(timestamp1);
const timestampMs2 = convertirTimestamp(timestamp2);

// Crear fechas
const fecha1 = new Date(timestampMs1);
const fecha2 = new Date(timestampMs2);

console.log('Fecha 1:', fecha1.toLocaleString('es-CL'));
console.log('Fecha 2:', fecha2.toLocaleString('es-CL'));

// Verificar años
console.log('Año 1:', fecha1.getFullYear());
console.log('Año 2:', fecha2.getFullYear());

// Verificar diferencia de tiempo
const diferencia = timestamp2 - timestamp1;
console.log('Diferencia entre timestamps:', diferencia, 'segundos');

// Verificar que sean fechas de 2025
if (fecha1.getFullYear() === 2025 && fecha2.getFullYear() === 2025) {
  console.log('✅ CORRECTO: Ambos timestamps generan fechas de 2025');
} else {
  console.log('❌ INCORRECTO: Los timestamps no generan fechas de 2025');
}

// Verificar diferencia con tiempo actual
const ahora = Date.now();
const diferenciaMs1 = ahora - timestampMs1;
const diferenciaMs2 = ahora - timestampMs2;

console.log('Diferencia con tiempo actual (timestamp 1):', Math.floor(diferenciaMs1 / 1000), 'segundos');
console.log('Diferencia con tiempo actual (timestamp 2):', Math.floor(diferenciaMs2 / 1000), 'segundos');

// Verificar si deberían estar conectados
const conectado1 = diferenciaMs1 < 60000;
const conectado2 = diferenciaMs2 < 60000;

console.log('Debería estar conectado (timestamp 1):', conectado1 ? '✅ SÍ' : '❌ NO');
console.log('Debería estar conectado (timestamp 2):', conectado2 ? '✅ SÍ' : '❌ NO');
