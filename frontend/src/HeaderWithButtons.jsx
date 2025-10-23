import React from 'react';
import { Sync, Trash2, Wifi, WifiOff } from 'lucide-react';

function HeaderWithButtons() {
  const handleSync = () => {
    console.log('🔄 Sincronizando con Arduino...');
    alert('Comando de sincronización enviado al Arduino');
  };

  const handleClean = () => {
    const confirmar = window.confirm(
      '⚠️ ¿Estás seguro de que quieres limpiar TODOS los datos de Firebase?\n\n' +
      'Esto eliminará:\n' +
      '- Todas las lecturas históricas\n' +
      '- Todas las notificaciones\n' +
      '- Estadísticas\n\n' +
      'Esta acción NO se puede deshacer.'
    );
    
    if (confirmar) {
      console.log('🧹 Limpiando datos de Firebase...');
      alert('Datos de Firebase limpiados correctamente');
    }
  };

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderBottom: '2px solid #4facfe',
      padding: '1rem 2rem',
      boxShadow: '0 4px 20px rgba(79, 172, 254, 0.2)'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: '#4facfe', fontSize: '40px' }}>🔥</div>
          <div>
            <h1 style={{ 
              fontSize: '1.8rem', 
              fontWeight: '700', 
              color: '#ffffff', 
              margin: '0' 
            }}>
              SDGI - Sistema Detector de Gas Inteligente
            </h1>
            <p style={{ 
              fontSize: '0.9rem', 
              color: '#94a3b8', 
              margin: '0' 
            }}>
              Monitoreo en Tiempo Real con Arduino
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Indicador de conexión */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            border: '1px solid #10b981'
          }}>
            <Wifi size={20} />
            <span>Arduino Conectado</span>
          </div>
          
          {/* Botón de Sincronización */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid #10b981',
              borderRadius: '8px',
              color: '#10b981',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={handleSync}
            title="Sincronizar con Arduino"
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(16, 185, 129, 0.2)';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(16, 185, 129, 0.1)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <Sync size={24} />
          </button>
          
          {/* Botón de Limpieza */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#ef4444',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={handleClean}
            title="Limpiar datos de Firebase"
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(239, 68, 68, 0.2)';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(239, 68, 68, 0.1)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <Trash2 size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default HeaderWithButtons;
