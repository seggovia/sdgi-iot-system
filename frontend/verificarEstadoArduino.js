// Script para verificar el estado real de conexión del Arduino
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

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

async function verificarEstadoRealArduino() {
  try {
    console.log('🔍 Verificando estado real del Arduino...');
    console.log('');
    
    // Verificar lecturas recientes
    const lecturasRef = ref(db, 'lecturas');
    const snapshot = await get(lecturasRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      const keys = Object.keys(data).sort((a, b) => b - a);
      
      console.log(`📊 Total de lecturas en Firebase: ${keys.length}`);
      
      // Buscar lecturas del Arduino
      let lecturasArduino = [];
      let ultimaLecturaArduino = null;
      
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const lectura = data[key];
        
        if (lectura.dispositivo === "arduino_001" || 
            (!lectura.dispositivo && !lectura.modoSimulacion)) {
          lecturasArduino.push({ key, ...lectura });
          if (!ultimaLecturaArduino) {
            ultimaLecturaArduino = { key, ...lectura };
          }
        }
      }
      
      console.log(`🔌 Lecturas del Arduino encontradas: ${lecturasArduino.length}`);
      
      if (ultimaLecturaArduino) {
        const ahora = Date.now();
        const tiempoLectura = ultimaLecturaArduino.timestamp || parseInt(ultimaLecturaArduino.key);
        const tiempoSinDatos = Math.floor((ahora - tiempoLectura) / 1000);
        
        console.log('');
        console.log('📋 Estado de la última lectura del Arduino:');
        console.log(`   Dispositivo: ${ultimaLecturaArduino.dispositivo || 'Sin ID'}`);
        console.log(`   Timestamp: ${new Date(tiempoLectura).toLocaleString()}`);
        console.log(`   Tiempo sin datos: ${tiempoSinDatos} segundos`);
        console.log(`   Sensor 1: ${ultimaLecturaArduino.valorSensor1 || 0}`);
        console.log(`   Sensor 2: ${ultimaLecturaArduino.valorSensor2 || 0}`);
        console.log(`   Alerta 1: ${ultimaLecturaArduino.sensor1Alerta ? 'SÍ' : 'NO'}`);
        console.log(`   Alerta 2: ${ultimaLecturaArduino.sensor2Alerta ? 'SÍ' : 'NO'}`);
        console.log(`   Calibrando: ${ultimaLecturaArduino.calibrando ? 'SÍ' : 'NO'}`);
        
        if (tiempoSinDatos < 60) {
          console.log('');
          console.log('✅ ARDUINO CONECTADO');
          console.log('   El Arduino está enviando datos correctamente');
        } else {
          console.log('');
          console.log('❌ ARDUINO DESCONECTADO');
          console.log('   No hay datos recientes del Arduino');
          console.log('   Verificar:');
          console.log('   1. Conexión WiFi del Arduino');
          console.log('   2. Código subido correctamente');
          console.log('   3. Sensores conectados');
        }
      } else {
        console.log('');
        console.log('❌ NO SE ENCONTRARON LECTURAS DEL ARDUINO');
        console.log('   Posibles causas:');
        console.log('   1. Arduino no está conectado a WiFi');
        console.log('   2. Código no subido al Arduino');
        console.log('   3. Error en la configuración de Firebase');
      }
      
      // Mostrar últimas 5 lecturas del Arduino
      if (lecturasArduino.length > 0) {
        console.log('');
        console.log('📚 Últimas 5 lecturas del Arduino:');
        lecturasArduino.slice(0, 5).forEach((lectura, index) => {
          const tiempo = new Date(lectura.timestamp || parseInt(lectura.key)).toLocaleTimeString();
          console.log(`   ${index + 1}. ${tiempo} - S1: ${lectura.valorSensor1} S2: ${lectura.valorSensor2}`);
        });
      }
      
    } else {
      console.log('❌ No hay lecturas en Firebase');
    }
    
  } catch (error) {
    console.error('❌ Error al verificar estado:', error);
  }
}

// Ejecutar verificación
verificarEstadoRealArduino();
