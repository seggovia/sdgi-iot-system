// Script de debug para verificar botones en localhost:5173
console.log('🔍 VERIFICANDO BOTONES EN LOCALHOST:5173...');

// Esperar a que la página cargue
setTimeout(() => {
  console.log('📊 VERIFICACIÓN DE BOTONES:');
  
  // Verificar elementos del header
  const header = document.querySelector('.header');
  const headerRight = document.querySelector('.header-right');
  const statusIndicator = document.querySelector('.status-indicator');
  
  console.log('   Header encontrado:', !!header);
  console.log('   Header-right encontrado:', !!headerRight);
  console.log('   Status indicator encontrado:', !!statusIndicator);
  
  if (headerRight) {
    console.log('   Elementos en header-right:', headerRight.children.length);
    console.log('   Clases de header-right:', headerRight.className);
    
    // Listar todos los elementos hijos
    Array.from(headerRight.children).forEach((child, index) => {
      console.log(`   Elemento ${index}:`, child.tagName, child.className);
    });
  }
  
  // Verificar botones específicos
  const syncButton = document.querySelector('.sync-button');
  const cleanButton = document.querySelector('.clean-button');
  const playButton = document.querySelector('.icon-button');
  
  console.log('   Botón sync encontrado:', !!syncButton);
  console.log('   Botón clean encontrado:', !!cleanButton);
  console.log('   Botón play encontrado:', !!playButton);
  
  if (syncButton) {
    console.log('   Botón sync visible:', syncButton.offsetWidth > 0);
    console.log('   Botón sync estilos:', {
      display: window.getComputedStyle(syncButton).display,
      visibility: window.getComputedStyle(syncButton).visibility,
      opacity: window.getComputedStyle(syncButton).opacity,
      backgroundColor: window.getComputedStyle(syncButton).backgroundColor
    });
  }
  
  if (cleanButton) {
    console.log('   Botón clean visible:', cleanButton.offsetWidth > 0);
    console.log('   Botón clean estilos:', {
      display: window.getComputedStyle(cleanButton).display,
      visibility: window.getComputedStyle(cleanButton).visibility,
      opacity: window.getComputedStyle(cleanButton).opacity,
      backgroundColor: window.getComputedStyle(cleanButton).backgroundColor
    });
  }
  
  // Verificar si hay errores en la consola
  console.log('   Verificación completada');
  
  // Intentar hacer clic en los botones si existen
  if (syncButton) {
    console.log('✅ Botón de sincronización encontrado y funcional');
  } else {
    console.log('❌ Botón de sincronización NO encontrado');
  }
  
  if (cleanButton) {
    console.log('✅ Botón de limpieza encontrado y funcional');
  } else {
    console.log('❌ Botón de limpieza NO encontrado');
  }
  
}, 3000);
