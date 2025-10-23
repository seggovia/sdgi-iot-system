// Script para sincronizar configuración con el Arduino optimizado
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCzj116N3yttGaBGFCKAClWWxzmwFAyLL8",
  authDomain: "sdgi-detector-gas.firebaseapp.com",
  databaseURL: "https://sdgi-detector-gas-default-rtdb.firebaseio.com",
  projectId: "sdgi-detector-gas",
  storageBucket: "sdgi-detector-gas.firebasestorage.app",
  messagingSenderId: "19396364195",
  appId: "1:19396364195:web:0aa5225e49b73f49427c16"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🔥 CONFIGURACIÓN SINCRONIZADA CON TU ARDUINO OPTIMIZADO
const configuracionArduinoOptimizada = {
  umbralGas: 10, // 🔥 SINCRONIZADO con tu Arduino (UMBRAL_DELTA = 10)
  intervaloLectura: 100, // 🔥 SINCRONIZADO con tu Arduino (INTERVALO_LECTURA = 100)
  buzzerPiso1Activo: true, // Pin 5
  buzzerPiso2Activo: true, // Pin 3
  buzzerVolumen: 255, // Volumen máximo
  ledPiso1Activo: true, // Pin 1
  ledPiso2Activo: true, // Pin 2
  servoAbierto: false, // Pin 6
  modoSimulacion: false, // 🔥 CRÍTICO: Siempre false para datos reales
  timestampSincronizacion: Date.now(),
  version: "3.0-arduino-optimizado",
  configuracionEspecial: {
    calibracionRapida: true, // 3s + 5s
    sensibilidadAlta: true, // Umbral 10
    ambosSensoresActivos: true, // Sin verificación de fallo
    respuestaRapida: true, // ALPHA 0.7, CONFIRM_ON 300ms
    histéresisReducida: true // HISTERESIS 5
  }
};

async function sincronizarConArduinoOptimizado() {
  try {
    console.log('🚀 Sincronizando configuración con Arduino optimizado...');
    console.log('');
    
    const configRef = ref(db, 'configuracion/sistema');
    await set(configRef, configuracionArduinoOptimizada);
    
    console.log('✅ Configuración sincronizada exitosamente:');
    console.log(`   🔥 Umbral Gas: ${configuracionArduinoOptimizada.umbralGas} (alta sensibilidad)`);
    console.log(`   ⏱️ Intervalo Lectura: ${configuracionArduinoOptimizada.intervaloLectura}ms`);
    console.log(`   🔊 Buzzer Piso 1: ${configuracionArduinoOptimizada.buzzerPiso1Activo ? 'ON' : 'OFF'} (Pin 5)`);
    console.log(`   🔊 Buzzer Piso 2: ${configuracionArduinoOptimizada.buzzerPiso2Activo ? 'ON' : 'OFF'} (Pin 3)`);
    console.log(`   💡 LED Piso 1: ${configuracionArduinoOptimizada.ledPiso1Activo ? 'ON' : 'OFF'} (Pin 1)`);
    console.log(`   💡 LED Piso 2: ${configuracionArduinoOptimizada.ledPiso2Activo ? 'ON' : 'OFF'} (Pin 2)`);
    console.log(`   🚪 Servo: ${configuracionArduinoOptimizada.servoAbierto ? 'ABIERTO' : 'CERRADO'} (Pin 6)`);
    console.log(`   🎮 Modo Simulación: ${configuracionArduinoOptimizada.modoSimulacion ? 'SÍ' : 'NO'}`);
    console.log(`   📅 Timestamp: ${new Date(configuracionArduinoOptimizada.timestampSincronizacion).toLocaleString()}`);
    console.log(`   🔄 Versión: ${configuracionArduinoOptimizada.version}`);
    console.log('');
    
    console.log('🔥 Configuración especial del Arduino:');
    console.log(`   ⚡ Calibración rápida: ${configuracionArduinoOptimizada.configuracionEspecial.calibracionRapida ? 'SÍ' : 'NO'} (3s + 5s)`);
    console.log(`   🎯 Sensibilidad alta: ${configuracionArduinoOptimizada.configuracionEspecial.sensibilidadAlta ? 'SÍ' : 'NO'} (Umbral 10)`);
    console.log(`   🔌 Ambos sensores activos: ${configuracionArduinoOptimizada.configuracionEspecial.ambosSensoresActivos ? 'SÍ' : 'NO'}`);
    console.log(`   ⚡ Respuesta rápida: ${configuracionArduinoOptimizada.configuracionEspecial.respuestaRapida ? 'SÍ' : 'NO'} (ALPHA 0.7)`);
    console.log(`   📉 Histéresis reducida: ${configuracionArduinoOptimizada.configuracionEspecial.histéresisReducida ? 'SÍ' : 'NO'} (HISTERESIS 5)`);
    console.log('');
    
    console.log('🎉 Sistema listo para funcionar en tiempo real');
    console.log('📋 Próximos pasos:');
    console.log('1. Sube el código optimizado a tu Arduino');
    console.log('2. El sistema debería mostrar "Arduino Conectado"');
    console.log('3. Calibración rápida: 5 segundos');
    console.log('4. Ambos sensores activos para detección');
    console.log('5. Prueba con alcohol cerca de cualquier sensor');
    
  } catch (error) {
    console.error('❌ Error al sincronizar configuración:', error);
  }
}

// Ejecutar sincronización
sincronizarConArduinoOptimizado();
