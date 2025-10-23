import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off } from 'firebase/database';

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

function verificarTimestampCorregido() {
  console.log('🔍 VERIFICANDO TIMESTAMP CORREGIDO...');
  console.log('Esperando nueva lectura del Arduino...');
  
  const lecturasRef = ref(db, 'lecturas');
  
  const unsubscribe = onValue(lecturasRef, (snapshot) => {
    const data = snapshot.val() || {};
    const keys = Object.keys(data).sort((a, b) => b - a);
    
    if (keys.length > 0) {
      const ultimaKey = keys[0];
      const ultimaLectura = data[ultimaKey];
      
      // Solo mostrar lecturas del Arduino real
      if (ultimaLectura.dispositivo === 'arduino_001') {
        const timestamp = ultimaLectura.timestamp || parseInt(ultimaKey);
        const fecha = new Date(timestamp);
        const ahora = Date.now();
        const diferenciaMs = ahora - timestamp;
        
        console.log('\n📊 NUEVA LECTURA DEL ARDUINO:');
        console.log(`   Timestamp: ${timestamp}`);
        console.log(`   Fecha: ${fecha.toLocaleString()}`);
        console.log(`   Diferencia: ${Math.floor(diferenciaMs / 1000)} segundos`);
        console.log(`   Sensor 1: ${ultimaLectura.valorSensor1 || 0}`);
        console.log(`   Sensor 2: ${ultimaLectura.valorSensor2 || 0}`);
        
        // Verificar si el timestamp es correcto
        if (timestamp > 1735689600000 && timestamp < 2000000000000) {
          console.log('✅ TIMESTAMP CORRECTO (2025)');
        } else if (timestamp < 2000000000) {
          console.log('❌ TIMESTAMP INCORRECTO (1970)');
        } else {
          console.log('⚠️ TIMESTAMP EXTRAÑO');
        }
        
        // Verificar si es tiempo real
        if (diferenciaMs < 10000) { // Menos de 10 segundos
          console.log('✅ CONEXIÓN EN TIEMPO REAL FUNCIONANDO');
        } else {
          console.log('⚠️ Datos antiguos');
        }
        
        // Detener después de la primera lectura nueva
        unsubscribe();
        process.exit(0);
      }
    }
  }, (error) => {
    console.error('❌ Error en conexión:', error);
    process.exit(1);
  });
  
  // Timeout después de 30 segundos
  setTimeout(() => {
    console.log('\n⏰ TIMEOUT - No se recibieron datos nuevos del Arduino');
    console.log('❌ El Arduino puede no estar enviando datos o el timestamp sigue incorrecto');
    unsubscribe();
    process.exit(1);
  }, 30000);
}

verificarTimestampCorregido();
