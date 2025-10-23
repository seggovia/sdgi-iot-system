import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, query, orderByKey, limitToLast } from 'firebase/database';

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

async function diagnosticoTimestamp() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DE TIMESTAMPS...');
  
  try {
    const lecturasRef = ref(db, 'lecturas');
    const q = query(lecturasRef, orderByKey(), limitToLast(5));
    const snapshot = await get(q);

    if (snapshot.exists()) {
      const data = snapshot.val();
      const keys = Object.keys(data);
      
      console.log(`\n📊 Total de lecturas encontradas: ${keys.length}`);
      
      keys.forEach((key, index) => {
        const lectura = data[key];
        const timestamp = lectura.timestamp || parseInt(key);
        const fecha = new Date(timestamp);
        
        console.log(`\n--- Lectura ${index + 1} ---`);
        console.log(`Key: ${key}`);
        console.log(`Timestamp: ${timestamp}`);
        console.log(`Fecha: ${fecha.toLocaleString()}`);
        console.log(`Dispositivo: ${lectura.dispositivo || 'Sin ID'}`);
        console.log(`Sensor 1: ${lectura.valorSensor1 || 0}`);
        console.log(`Sensor 2: ${lectura.valorSensor2 || 0}`);
        
        // Verificar si el timestamp es correcto
        if (timestamp > 1000000000) {
          console.log('✅ Timestamp CORRECTO');
        } else {
          console.log('❌ Timestamp INCORRECTO (muy pequeño)');
        }
      });
      
      // Verificar la última lectura
      const ultimaKey = keys[keys.length - 1];
      const ultimaLectura = data[ultimaKey];
      const ultimoTimestamp = ultimaLectura.timestamp || parseInt(ultimaKey);
      const ahora = Date.now();
      const diferenciaMs = ahora - ultimoTimestamp;
      
      console.log('\n--- ESTADO DE CONEXIÓN ---');
      console.log(`Último timestamp: ${ultimoTimestamp}`);
      console.log(`Fecha del último: ${new Date(ultimoTimestamp).toLocaleString()}`);
      console.log(`Ahora: ${new Date(ahora).toLocaleString()}`);
      console.log(`Diferencia: ${Math.floor(diferenciaMs / 1000)} segundos`);
      
      if (ultimaLectura.dispositivo === 'arduino_001' && diferenciaMs < 60000) {
        console.log('✅ ARDUINO CONECTADO');
      } else {
        console.log('❌ ARDUINO DESCONECTADO');
        if (ultimaLectura.dispositivo !== 'arduino_001') {
          console.log('   Razón: No es lectura del Arduino real');
        }
        if (diferenciaMs >= 60000) {
          console.log('   Razón: Timestamp muy antiguo');
        }
      }
      
    } else {
      console.log('❌ No se encontraron lecturas en Firebase');
    }
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    process.exit(0);
  }
}

diagnosticoTimestamp();