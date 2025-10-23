// Script para verificar que los botones estén implementados
console.log('🔍 VERIFICANDO IMPLEMENTACIÓN DE BOTONES...');

// Verificar que los elementos estén en el DOM
setTimeout(() => {
  const syncButton = document.querySelector('.sync-button');
  const cleanButton = document.querySelector('.clean-button');
  const headerRight = document.querySelector('.header-right');
  
  console.log('📊 RESULTADOS DE VERIFICACIÓN:');
  console.log('   Header-right encontrado:', !!headerRight);
  console.log('   Botón de sincronización encontrado:', !!syncButton);
  console.log('   Botón de limpieza encontrado:', !!cleanButton);
  
  if (headerRight) {
    console.log('   Elementos en header-right:', headerRight.children.length);
    console.log('   Clases de header-right:', headerRight.className);
  }
  
  if (syncButton) {
    console.log('   Botón sync visible:', syncButton.offsetWidth > 0);
    console.log('   Botón sync estilos:', window.getComputedStyle(syncButton).display);
  }
  
  if (cleanButton) {
    console.log('   Botón clean visible:', cleanButton.offsetWidth > 0);
    console.log('   Botón clean estilos:', window.getComputedStyle(cleanButton).display);
  }
  
  // Verificar estilos CSS
  const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
  console.log('   Archivos CSS cargados:', styles.length);
  
  // Verificar si hay errores en la consola
  const errors = console.error.toString();
  console.log('   Errores en consola:', errors);
  
}, 2000);
