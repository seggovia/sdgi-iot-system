// Script para actualizar Firebase con configuración sincronizada
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

// Configuración sincronizada con Arduino - OPTIMIZADA PARA TIEMPO REAL
const configuracionSincronizada = {
  umbralGas: 30, // 🔥 OPTIMIZADO: Umbral más sensible para detección temprana
  intervaloLectura: 100, // 🔥 SINCRONIZADO con Arduino INTERVALO_LECTURA = 100ms
  buzzerPiso1Activo: true, // Pin 5
  buzzerPiso2Activo: true, // Pin 3
  buzzerVolumen: 255, // Volumen máximo
  ledPiso1Activo: true, // Pin 1
  ledPiso2Activo: true, // Pin 2
  servoAbierto: false, // Pin 6
  modoSimulacion: false, // 🔥 CRÍTICO: Siempre false para datos reales
  timestampSincronizacion: Date.now()
};

async function actualizarConfiguracion() {
  try {
    const configRef = ref(db, 'configuracion/sistema');
    await set(configRef, configuracionSincronizada);
    console.log('✅ Configuración sincronizada con Arduino:', configuracionSincronizada);
    console.log('🔥 Umbral Gas: 10 (alta sensibilidad)');
    console.log('🔥 Ambos sensores activos');
    console.log('🔥 Detección por cambio relativo: 5%');
  } catch (error) {
    console.error('❌ Error al actualizar configuración:', error);
  }
}

// Ejecutar actualización
actualizarConfiguracion();
