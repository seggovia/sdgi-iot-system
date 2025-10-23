// Script para actualizar configuración de Firebase
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, update } from 'firebase/database';

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

async function actualizarConfiguracion() {
  try {
    console.log('⚙️ Actualizando configuración de Firebase...');
    
    const configRef = ref(db, 'configuracion/sistema');
    
    await update(configRef, {
      umbralGas: 10,
      intervaloLectura: 100,
      buzzerPiso1Activo: true,
      buzzerPiso2Activo: true,
      buzzerVolumen: 255,
      ledPiso1Activo: true,
      ledPiso2Activo: true,
      servoAbierto: false,
      modoSimulacion: false
    });
    
    console.log('✅ Configuración actualizada');
    
  } catch (error) {
    console.error('❌ Error al actualizar:', error);
  }
}

// Ejecutar actualización
actualizarConfiguracion();
