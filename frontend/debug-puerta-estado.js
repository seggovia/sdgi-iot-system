// Script para verificar el estado actual de la puerta en Firebase
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

async function verificarEstadoPuerta() {
  console.log('🔍 === VERIFICACIÓN DEL ESTADO DE LA PUERTA ===');
  
  try {
    // Verificar configuración actual
    const configRef = ref(db, 'configuracion/sistema');
    const snapshot = await get(configRef);
    
    if (snapshot.exists()) {
      const config = snapshot.val();
      console.log('📋 Estado actual en Firebase:');
      console.log(`   🚪 servoAbierto: ${config.servoAbierto}`);
      console.log(`   📅 Timestamp: ${new Date(config.timestampPrueba || Date.now()).toLocaleString()}`);
      console.log('');
      
      // Forzar apertura para prueba
      console.log('🚪 Forzando apertura de puerta...');
      await set(configRef, {
        umbralGas: 30,
        intervaloLectura: 100,
        buzzerPiso1Activo: true,
        buzzerPiso2Activo: true,
        buzzerVolumen: 255,
        ledPiso1Activo: true,
        ledPiso2Activo: true,
        servoAbierto: true, // FORZAR A ABIERTO
        modoSimulacion: false,
        timestampPrueba: Date.now(),
        debug: 'PUERTA_FORZADA_ABIERTA'
      });
      
      console.log('✅ Puerta forzada a ABIERTA en Firebase');
      console.log('');
      console.log('🔍 VERIFICACIÓN:');
      console.log('   1. Abre el navegador en http://localhost:5173');
      console.log('   2. Ve a la sección "Visualización 3D del Edificio"');
      console.log('   3. La puerta debería mostrar "ABIERTA" y estar abierta');
      console.log('   4. Si no funciona, hay un problema en el código del modelo 3D');
      
    } else {
      console.log('❌ No hay configuración en Firebase');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarEstadoPuerta();
