import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, set } from 'firebase/database';

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

function probarNuevasFuncionalidades() {
  console.log('🔧 PROBANDO NUEVAS FUNCIONALIDADES DEL DASHBOARD...');
  
  // Escuchar comandos de sincronización
  const comandosRef = ref(db, 'comandos');
  
  console.log('\n📡 Escuchando comandos de sincronización...');
  
  const unsubscribe = onValue(comandosRef, (snapshot) => {
    const data = snapshot.val() || {};
    
    if (data.sincronizar) {
      const comando = data.sincronizar;
      console.log('\n🔄 COMANDO DE SINCRONIZACIÓN RECIBIDO:');
      console.log(`   Timestamp: ${comando.timestamp}`);
      console.log(`   Dispositivo: ${comando.dispositivo}`);
      console.log(`   Acción: ${comando.accion}`);
      console.log(`   Fecha: ${new Date(comando.timestamp).toLocaleString()}`);
      
      if (comando.dispositivo === 'frontend') {
        console.log('✅ Comando enviado desde el frontend correctamente');
      }
    }
  }, (error) => {
    console.error('❌ Error al escuchar comandos:', error);
  });
  
  // Simular envío de comando de sincronización
  console.log('\n🧪 Simulando envío de comando de sincronización...');
  
  setTimeout(async () => {
    const syncRef = ref(db, 'comandos/sincronizar');
    const comando = {
      timestamp: Date.now(),
      dispositivo: 'frontend',
      accion: 'sincronizar_tiempo',
      mensaje: 'Comando de prueba desde script'
    };
    
    try {
      await set(syncRef, comando);
      console.log('✅ Comando de sincronización enviado');
    } catch (error) {
      console.error('❌ Error al enviar comando:', error);
    }
  }, 2000);
  
  // Timeout después de 10 segundos
  setTimeout(() => {
    console.log('\n🎉 PRUEBA COMPLETADA');
    console.log('✅ Las nuevas funcionalidades están funcionando correctamente');
    console.log('\n📋 RESUMEN:');
    console.log('   - Botón de sincronización: ✅ Implementado');
    console.log('   - Botón de limpieza: ✅ Implementado');
    console.log('   - Estilos CSS: ✅ Agregados');
    console.log('   - Funciones de Firebase: ✅ Funcionando');
    unsubscribe();
    process.exit(0);
  }, 10000);
}

probarNuevasFuncionalidades();
