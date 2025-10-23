import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, push } from 'firebase/database';

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

async function verificarFirebase() {
  console.log('🔍 VERIFICANDO CONEXIÓN A FIREBASE...');
  
  try {
    // 1. Probar escritura simple
    console.log('\n1️⃣ Probando escritura...');
    const testRef = ref(db, 'test/conexion');
    await set(testRef, {
      timestamp: Date.now(),
      mensaje: 'Prueba de conexión desde frontend',
      dispositivo: 'frontend_test'
    });
    console.log('✅ Escritura exitosa');
    
    // 2. Probar lectura
    console.log('\n2️⃣ Probando lectura...');
    const snapshot = await get(testRef);
    if (snapshot.exists()) {
      console.log('✅ Lectura exitosa:', snapshot.val());
    }
    
    // 3. Verificar estructura de lecturas
    console.log('\n3️⃣ Verificando estructura de lecturas...');
    const lecturasRef = ref(db, 'lecturas');
    const lecturasSnapshot = await get(lecturasRef);
    
    if (lecturasSnapshot.exists()) {
      const data = lecturasSnapshot.val();
      const keys = Object.keys(data);
      console.log(`✅ Encontradas ${keys.length} lecturas`);
      
      // Mostrar las últimas 3 lecturas
      const ultimasKeys = keys.sort((a, b) => b - a).slice(0, 3);
      ultimasKeys.forEach((key, index) => {
        const lectura = data[key];
        console.log(`   ${index + 1}. Key: ${key}, Dispositivo: ${lectura.dispositivo || 'Sin ID'}`);
      });
    } else {
      console.log('⚠️ No hay lecturas en Firebase');
    }
    
    // 4. Verificar configuración
    console.log('\n4️⃣ Verificando configuración...');
    const configRef = ref(db, 'configuracion/sistema');
    const configSnapshot = await get(configRef);
    
    if (configSnapshot.exists()) {
      console.log('✅ Configuración encontrada:', configSnapshot.val());
    } else {
      console.log('⚠️ No hay configuración en Firebase');
    }
    
    // 5. Probar escritura de nueva lectura
    console.log('\n5️⃣ Probando escritura de nueva lectura...');
    const nuevaLecturaRef = ref(db, 'lecturas');
    const nuevaLectura = {
      dispositivo: 'frontend_test',
      timestamp: Date.now(),
      valorSensor1: 100,
      valorSensor2: 200,
      sensor1Alerta: false,
      sensor2Alerta: false,
      alarmaGeneral: false,
      modoSimulacion: true
    };
    
    await push(nuevaLecturaRef, nuevaLectura);
    console.log('✅ Nueva lectura de prueba creada');
    
    console.log('\n🎉 VERIFICACIÓN COMPLETA - Firebase funciona correctamente');
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
    console.error('   Código:', error.code);
    console.error('   Mensaje:', error.message);
  } finally {
    process.exit(0);
  }
}

verificarFirebase();
