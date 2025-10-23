// Script para probar la configuración del servo en Firebase
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set } from 'firebase/database';

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

async function probarServo() {
  try {
    console.log('🔍 Verificando configuración actual...');
    
    // Leer configuración actual
    const configRef = ref(db, 'configuracion/sistema');
    const snapshot = await get(configRef);
    
    if (snapshot.exists()) {
      const config = snapshot.val();
      console.log('📋 Configuración actual:', config);
      console.log('🚪 Servo actual:', config.servoAbierto);
    } else {
      console.log('❌ No hay configuración en Firebase');
    }
    
    // Probar cambiar el servo
    console.log('🔄 Probando cambio de servo...');
    await set(configRef, {
      umbralGas: 10,
      intervaloLectura: 100,
      buzzerPiso1Activo: true,
      buzzerPiso2Activo: true,
      buzzerVolumen: 255,
      ledPiso1Activo: true,
      ledPiso2Activo: true,
      servoAbierto: true, // 🔥 FORZAR A ABIERTO
      modoSimulacion: false
    });
    
    console.log('✅ Servo configurado a ABIERTO');
    
    // Esperar 5 segundos y cerrar
    setTimeout(async () => {
      await set(configRef, {
        umbralGas: 10,
        intervaloLectura: 100,
        buzzerPiso1Activo: true,
        buzzerPiso2Activo: true,
        buzzerVolumen: 255,
        ledPiso1Activo: true,
        ledPiso2Activo: true,
        servoAbierto: false, // 🔥 FORZAR A CERRADO
        modoSimulacion: false
      });
      console.log('✅ Servo configurado a CERRADO');
    }, 5000);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar prueba
probarServo();
