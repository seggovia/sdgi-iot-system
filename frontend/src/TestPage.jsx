import React from 'react';
import HeaderWithButtons from './HeaderWithButtons';

function TestPage() {
  return (
    <div style={{ 
      background: '#0f0f23', 
      minHeight: '100vh', 
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <HeaderWithButtons />
      
      <div style={{ 
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h2>🧪 Página de Prueba - Botones del Dashboard</h2>
        
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '2px solid #4facfe',
          borderRadius: '16px',
          padding: '24px',
          margin: '20px 0',
          boxShadow: '0 8px 32px rgba(79, 172, 254, 0.2)'
        }}>
          <h3 style={{ color: '#4facfe', marginTop: 0 }}>
            ✅ Botones Implementados Correctamente
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid #10b981',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <h4 style={{ color: '#10b981', marginTop: 0 }}>
                🔄 Botón de Sincronización
              </h4>
              <p>Ubicado en el header del dashboard</p>
              <p>Envía comando de sincronización al Arduino</p>
              <p>Color: Verde (#10b981)</p>
            </div>
            
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <h4 style={{ color: '#ef4444', marginTop: 0 }}>
                🗑️ Botón de Limpieza
              </h4>
              <p>Ubicado en el header del dashboard</p>
              <p>Limpia todos los datos de Firebase</p>
              <p>Color: Rojo (#ef4444)</p>
            </div>
          </div>
          
          <div style={{
            background: 'rgba(79, 172, 254, 0.1)',
            border: '1px solid #4facfe',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '20px'
          }}>
            <h4 style={{ color: '#4facfe', marginTop: 0 }}>
              🔧 Instrucciones de Uso
            </h4>
            <ol>
              <li>Haz clic en el botón verde (🔄) para sincronizar con Arduino</li>
              <li>Haz clic en el botón rojo (🗑️) para limpiar datos de Firebase</li>
              <li>Los botones tienen efectos hover y tooltips</li>
              <li>La función de limpieza pide confirmación antes de proceder</li>
            </ol>
          </div>
        </div>
        
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid #10b981',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '20px'
        }}>
          <h4 style={{ color: '#10b981', marginTop: 0 }}>
            🎯 Estado Actual
          </h4>
          <p>✅ Botones implementados en el código</p>
          <p>✅ Estilos CSS agregados</p>
          <p>✅ Funciones de Firebase implementadas</p>
          <p>✅ Efectos hover y tooltips funcionando</p>
        </div>
      </div>
    </div>
  );
}

export default TestPage;
