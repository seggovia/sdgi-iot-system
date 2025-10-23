#!/usr/bin/env node

// 🔥 SCRIPT: Sincronización de Configuración para Tiempo Real
// Ejecutar con: node syncArduinoConfig.js

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

// 🔥 CONFIGURACIÓN OPTIMIZADA PARA TIEMPO REAL
const configuracionTiempoReal = {
  umbralGas: 30, // 🔥 Umbral optimizado para detección temprana
  intervaloLectura: 100, // 🔥 Sincronizado con Arduino (100ms)
  buzzerPiso1Activo: true, // Pin 5
  buzzerPiso2Activo: true, // Pin 3
  buzzerVolumen: 255, // Volumen máximo
  ledPiso1Activo: true, // Pin 1
  ledPiso2Activo: true, // Pin 2
  servoAbierto: false, // Pin 6
  modoSimulacion: false, // 🔥 CRÍTICO: Siempre false para datos reales
  timestampSincronizacion: Date.now(),
  version: "2.0-tiempo-real"
};

async function sincronizarConfiguracionTiempoReal() {
  try {
    console.log('🚀 Iniciando sincronización de configuración para tiempo real...');
    console.log('');
    
    const configRef = ref(db, 'configuracion/sistema');
    await set(configRef, configuracionTiempoReal);
    
    console.log('✅ Configuración sincronizada exitosamente:');
    console.log(`   🔥 Umbral Gas: ${configuracionTiempoReal.umbralGas} (detección temprana)`);
    console.log(`   ⏱️ Intervalo Lectura: ${configuracionTiempoReal.intervaloLectura}ms`);
    console.log(`   🔊 Buzzer Piso 1: ${configuracionTiempoReal.buzzerPiso1Activo ? 'ON' : 'OFF'} (Pin 5)`);
    console.log(`   🔊 Buzzer Piso 2: ${configuracionTiempoReal.buzzerPiso2Activo ? 'ON' : 'OFF'} (Pin 3)`);
    console.log(`   💡 LED Piso 1: ${configuracionTiempoReal.ledPiso1Activo ? 'ON' : 'OFF'} (Pin 1)`);
    console.log(`   💡 LED Piso 2: ${configuracionTiempoReal.ledPiso2Activo ? 'ON' : 'OFF'} (Pin 2)`);
    console.log(`   🚪 Servo: ${configuracionTiempoReal.servoAbierto ? 'ABIERTO' : 'CERRADO'} (Pin 6)`);
    console.log(`   🎮 Modo Simulación: ${configuracionTiempoReal.modoSimulacion ? 'SÍ' : 'NO'}`);
    console.log(`   📅 Timestamp: ${new Date(configuracionTiempoReal.timestampSincronizacion).toLocaleString()}`);
    console.log(`   🔄 Versión: ${configuracionTiempoReal.version}`);
    console.log('');
    console.log('🔥 Sistema listo para funcionar en tiempo real con Arduino');
    
  } catch (error) {
    console.error('❌ Error al sincronizar configuración:', error);
    process.exit(1);
  }
}

// Ejecutar sincronización
sincronizarConfiguracionTiempoReal();
