// Script para calcular el timestamp correcto para 2025
console.log('🔍 CALCULANDO TIMESTAMP CORRECTO PARA 2025...');

// Timestamp actual (2025-10-22)
const ahora = Date.now();
console.log('Timestamp actual (milisegundos):', ahora);
console.log('Fecha actual:', new Date(ahora).toLocaleString('es-CL'));

// Calcular timestamp para 2025-01-22 (fecha base del Arduino)
const fechaBase = new Date('2025-01-22T00:00:00Z');
const timestampBase2025 = Math.floor(fechaBase.getTime() / 1000); // En segundos
console.log('Timestamp base 2025-01-22 (segundos):', timestampBase2025);
console.log('Fecha base:', fechaBase.toLocaleString('es-CL'));

// Simular timestamp del Arduino usando la base correcta
const segundosTranscurridos = 1000; // Simular 1000 segundos transcurridos
const timestampArduinoCorrecto = timestampBase2025 + segundosTranscurridos;
console.log('Timestamp del Arduino correcto (segundos):', timestampArduinoCorrecto);

// Convertir a milisegundos
const timestampMs = timestampArduinoCorrecto * 1000;
console.log('Fecha del Arduino correcta:', new Date(timestampMs).toLocaleString('es-CL'));

// Verificar que sea 2025
const fecha = new Date(timestampMs);
console.log('Año:', fecha.getFullYear());

if (fecha.getFullYear() === 2025) {
  console.log('✅ CORRECTO: Timestamp genera fechas de 2025');
} else {
  console.log('❌ INCORRECTO: Timestamp genera fechas de', fecha.getFullYear());
}

// Mostrar el timestamp que debería usar el Arduino
console.log('\n🎯 TIMESTAMP QUE DEBERÍA USAR EL ARDUINO:');
console.log('Timestamp base (segundos):', timestampBase2025);
console.log('Fecha base:', new Date(timestampBase2025 * 1000).toLocaleString('es-CL'));
