// Script para verificar el timestamp corregido
console.log('🔍 VERIFICANDO TIMESTAMP CORREGIDO...');

// Timestamp base corregido (2025-01-22 en segundos)
const timestampBase = 1737504000; // 2025-01-22 en segundos
console.log('Timestamp base (segundos):', timestampBase);
console.log('Fecha base:', new Date(timestampBase * 1000).toLocaleString('es-CL'));

// Simular timestamp del Arduino (base + segundos transcurridos)
const segundosTranscurridos = 1000; // Simular 1000 segundos transcurridos
const timestampArduino = timestampBase + segundosTranscurridos;
console.log('Timestamp del Arduino (segundos):', timestampArduino);

// Convertir a milisegundos para mostrar fecha
const timestampMs = timestampArduino * 1000;
console.log('Fecha del Arduino:', new Date(timestampMs).toLocaleString('es-CL'));

// Verificar que sea 2025
const fecha = new Date(timestampMs);
console.log('Año:', fecha.getFullYear());

if (fecha.getFullYear() === 2025) {
  console.log('✅ CORRECTO: Timestamp genera fechas de 2025');
} else {
  console.log('❌ INCORRECTO: Timestamp genera fechas de', fecha.getFullYear());
}
