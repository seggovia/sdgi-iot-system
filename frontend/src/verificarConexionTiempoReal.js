// Script para verificar la conexión en tiempo real con Arduino
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, get } from 'firebase/database';

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

// 🔥 FUNCIÓN: Verificar estado de conexión en tiempo real
async function verificarConexionTiempoReal() {
  console.log('🔍 Verificando conexión en tiempo real...');
  
  try {
    // Verificar lecturas recientes del Arduino
    const lecturasRef = ref(db, 'lecturas');
    const snapshot = await get(lecturasRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      const keys = Object.keys(data).sort((a, b) => b - a);
      
      let ultimaLecturaArduino = null;
      let tiempoUltimaLectura = 0;
      
      // Buscar la última lectura del Arduino
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const lectura = data[key];
        
        if (lectura.dispositivo === "arduino_001" || 
            (!lectura.dispositivo && !lectura.modoSimulacion)) {
          ultimaLecturaArduino = lectura;
          tiempoUltimaLectura = parseInt(key);
          break;
        }
      }
      
      if (ultimaLecturaArduino) {
        const ahora = Date.now();
        const diferenciaSegundos = Math.floor((ahora - tiempoUltimaLectura) / 1000);
        
        console.log('📊 Estado de conexión:');
        console.log(`   ✅ Arduino conectado: ${ultimaLecturaArduino.dispositivo || 'Sin ID'}`);
        console.log(`   📡 Última lectura: ${new Date(tiempoUltimaLectura).toLocaleString()}`);
        console.log(`   ⏱️ Tiempo transcurrido: ${diferenciaSegundos} segundos`);
        console.log(`   🔥 Sensor 1: ${ultimaLecturaArduino.valorSensor1} (Alerta: ${ultimaLecturaArduino.sensor1Alerta})`);
        console.log(`   🔥 Sensor 2: ${ultimaLecturaArduino.valorSensor2} (Alerta: ${ultimaLecturaArduino.sensor2Alerta})`);
        
        if (diferenciaSegundos < 30) {
          console.log('   🟢 Estado: CONECTADO EN TIEMPO REAL');
          return { conectado: true, tiempoSinDatos: diferenciaSegundos, lectura: ultimaLecturaArduino };
        } else {
          console.log('   🔴 Estado: DESCONECTADO (más de 30s sin datos)');
          return { conectado: false, tiempoSinDatos: diferenciaSegundos, lectura: ultimaLecturaArduino };
        }
      } else {
        console.log('   ❌ No se encontraron lecturas del Arduino');
        return { conectado: false, tiempoSinDatos: -1, lectura: null };
      }
    } else {
      console.log('   ❌ No hay lecturas en Firebase');
      return { conectado: false, tiempoSinDatos: -1, lectura: null };
    }
  } catch (error) {
    console.error('❌ Error al verificar conexión:', error);
    return { conectado: false, tiempoSinDatos: -1, lectura: null, error: error.message };
  }
}

// 🔥 FUNCIÓN: Monitoreo continuo en tiempo real
function iniciarMonitoreoTiempoReal() {
  console.log('🚀 Iniciando monitoreo en tiempo real...');
  
  const lecturasRef = ref(db, 'lecturas');
  
  const unsubscribe = onValue(lecturasRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const keys = Object.keys(data).sort((a, b) => b - a);
      
      // Buscar la última lectura del Arduino
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const lectura = data[key];
        
        if (lectura.dispositivo === "arduino_001" || 
            (!lectura.dispositivo && !lectura.modoSimulacion)) {
          
          const ahora = Date.now();
          const tiempoLectura = parseInt(key);
          const diferenciaSegundos = Math.floor((ahora - tiempoLectura) / 1000);
          
          console.log(`📊 [${new Date().toLocaleTimeString()}] Nueva lectura Arduino:`);
          console.log(`   Sensor 1: ${lectura.valorSensor1} ${lectura.sensor1Alerta ? '🔴 ALERTA' : '✅ Normal'}`);
          console.log(`   Sensor 2: ${lectura.valorSensor2} ${lectura.sensor2Alerta ? '🔴 ALERTA' : '✅ Normal'}`);
          console.log(`   Tiempo: ${diferenciaSegundos}s atrás`);
          
          break;
        }
      }
    }
  }, (error) => {
    console.error('❌ Error en monitoreo:', error);
  });
  
  return unsubscribe;
}

// 🔥 FUNCIÓN: Verificar configuración del sistema
async function verificarConfiguracionSistema() {
  console.log('⚙️ Verificando configuración del sistema...');
  
  try {
    const configRef = ref(db, 'configuracion/sistema');
    const snapshot = await get(configRef);
    
    if (snapshot.exists()) {
      const config = snapshot.val();
      console.log('📋 Configuración actual:');
      console.log(`   🔥 Umbral Gas: ${config.umbralGas}`);
      console.log(`   ⏱️ Intervalo Lectura: ${config.intervaloLectura}ms`);
      console.log(`   🔊 Buzzer Piso 1: ${config.buzzerPiso1Activo ? 'ON' : 'OFF'}`);
      console.log(`   🔊 Buzzer Piso 2: ${config.buzzerPiso2Activo ? 'ON' : 'OFF'}`);
      console.log(`   💡 LED Piso 1: ${config.ledPiso1Activo ? 'ON' : 'OFF'}`);
      console.log(`   💡 LED Piso 2: ${config.ledPiso2Activo ? 'ON' : 'OFF'}`);
      console.log(`   🚪 Servo Abierto: ${config.servoAbierto ? 'SÍ' : 'NO'}`);
      console.log(`   🎮 Modo Simulación: ${config.modoSimulacion ? 'SÍ' : 'NO'}`);
      
      return config;
    } else {
      console.log('   ❌ No hay configuración en Firebase');
      return null;
    }
  } catch (error) {
    console.error('❌ Error al verificar configuración:', error);
    return null;
  }
}

// 🔥 FUNCIÓN: Ejecutar diagnóstico completo
async function ejecutarDiagnosticoCompleto() {
  console.log('🔍 === DIAGNÓSTICO COMPLETO DEL SISTEMA ===');
  console.log('');
  
  // 1. Verificar configuración
  await verificarConfiguracionSistema();
  console.log('');
  
  // 2. Verificar conexión
  const estadoConexion = await verificarConexionTiempoReal();
  console.log('');
  
  // 3. Iniciar monitoreo continuo
  console.log('🔄 Iniciando monitoreo continuo...');
  const unsubscribe = iniciarMonitoreoTiempoReal();
  
  // Retornar función para detener el monitoreo
  return {
    estadoConexion,
    detenerMonitoreo: unsubscribe
  };
}

// Exportar funciones
export {
  verificarConexionTiempoReal,
  iniciarMonitoreoTiempoReal,
  verificarConfiguracionSistema,
  ejecutarDiagnosticoCompleto
};

// Si se ejecuta directamente
if (typeof window === 'undefined') {
  // Ejecutar diagnóstico completo
  ejecutarDiagnosticoCompleto().then(resultado => {
    console.log('✅ Diagnóstico completado');
    console.log('Estado de conexión:', resultado.estadoConexion);
  });
}
