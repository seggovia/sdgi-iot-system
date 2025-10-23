// Script para limpiar Firebase y resetear el sistema
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, remove } from 'firebase/database';

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

async function limpiarFirebaseCompleto() {
  try {
    console.log('🧹 Limpiando Firebase completamente...');
    console.log('');
    
    // 1. Limpiar todas las lecturas antiguas
    console.log('🗑️ Eliminando lecturas antiguas...');
    const lecturasRef = ref(db, 'lecturas');
    await remove(lecturasRef);
    console.log('✅ Lecturas eliminadas');
    
    // 2. Limpiar notificaciones antiguas
    console.log('🗑️ Eliminando notificaciones antiguas...');
    const notifRef = ref(db, 'notificaciones');
    await remove(notifRef);
    console.log('✅ Notificaciones eliminadas');
    
    // 3. Resetear configuración a estado limpio
    console.log('⚙️ Configurando sistema en estado limpio...');
    const configRef = ref(db, 'configuracion/sistema');
    await set(configRef, {
      umbralGas: 30,
      intervaloLectura: 100,
      buzzerPiso1Activo: true,
      buzzerPiso2Activo: true,
      buzzerVolumen: 255,
      ledPiso1Activo: true,
      ledPiso2Activo: true,
      servoAbierto: false,
      modoSimulacion: false,
      timestampReset: Date.now(),
      estado: 'limpio'
    });
    console.log('✅ Configuración reseteada');
    
    // 4. Limpiar estado del dispositivo
    console.log('🔌 Limpiando estado del dispositivo...');
    const dispositivoRef = ref(db, 'dispositivos/arduino_001');
    await set(dispositivoRef, {
      estado: 'offline',
      ultimaConexion: null,
      rssi: null,
      timestampReset: Date.now()
    });
    console.log('✅ Estado del dispositivo limpiado');
    
    // 5. Crear una lectura inicial limpia
    console.log('📊 Creando lectura inicial limpia...');
    const lecturaInicialRef = ref(db, `lecturas/${Date.now()}`);
    await set(lecturaInicialRef, {
      dispositivo: 'sistema_reset',
      timestamp: Date.now(),
      valorSensor1: 0,
      valorSensor2: 0,
      sensor1Alerta: false,
      sensor2Alerta: false,
      alarmaGeneral: false,
      buzzer1Estado: false,
      buzzer2Estado: false,
      led1Estado: false,
      led2Estado: false,
      ledGeneralEstado: false,
      servoAbierto: false,
      servoAngulo: 0,
      umbralActivo: 30,
      baseline1: 0,
      baseline2: 0,
      sensor2Fault: false,
      modoSimulacion: false,
      estado: 'limpio'
    });
    console.log('✅ Lectura inicial creada');
    
    console.log('');
    console.log('🎉 Firebase limpiado completamente');
    console.log('🔥 Sistema listo para recibir datos del Arduino');
    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('1. Verifica que tu Arduino esté conectado a WiFi');
    console.log('2. Sube el código detector_gas.ino a tu Arduino');
    console.log('3. El sistema debería mostrar "Arduino Conectado"');
    console.log('4. Los sensores deberían mostrar valores de calibración');
    
  } catch (error) {
    console.error('❌ Error al limpiar Firebase:', error);
  }
}

// Ejecutar limpieza
limpiarFirebaseCompleto();
