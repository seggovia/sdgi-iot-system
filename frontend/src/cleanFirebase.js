// Script para limpiar Firebase
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, remove } from 'firebase/database';

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

async function limpiarFirebase() {
  try {
    console.log('🧹 Limpiando Firebase...');
    
    // Limpiar lecturas
    const lecturasRef = ref(db, 'lecturas');
    await remove(lecturasRef);
    console.log('✅ Lecturas eliminadas');
    
    // Limpiar notificaciones
    const notifRef = ref(db, 'notificaciones');
    await remove(notifRef);
    console.log('✅ Notificaciones eliminadas');
    
    // Limpiar dispositivos
    const dispositivosRef = ref(db, 'dispositivos');
    await remove(dispositivosRef);
    console.log('✅ Dispositivos eliminados');
    
    console.log('🎉 Firebase limpiado completamente');
    
  } catch (error) {
    console.error('❌ Error al limpiar Firebase:', error);
  }
}

// Ejecutar limpieza
limpiarFirebase();
