import React from 'react';
import { Sync, Trash2 } from 'lucide-react';

function TestButtons() {
  const handleSync = () => {
    console.log('Botón de sincronización clickeado');
    alert('Botón de sincronización funcionando!');
  };

  const handleClean = () => {
    console.log('Botón de limpieza clickeado');
    alert('Botón de limpieza funcionando!');
  };

  return (
    <div style={{ padding: '20px', background: '#1a1a2e', color: 'white' }}>
      <h2>Prueba de Botones</h2>
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
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
            cursor: 'pointer'
          }}
          onClick={handleSync}
          title="Sincronizar con Arduino"
        >
          <Sync size={24} />
        </button>
        
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
            cursor: 'pointer'
          }}
          onClick={handleClean}
          title="Limpiar datos de Firebase"
        >
          <Trash2 size={24} />
        </button>
      </div>
    </div>
  );
}

export default TestButtons;
