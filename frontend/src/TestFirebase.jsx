import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue } from 'firebase/database';

function TestFirebase() {
  const [lecturas, setLecturas] = useState([]);
  const [error, setError] = useState(null);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    console.log('🔥 Iniciando test de Firebase...');
    
    try {
      const lecturasRef = ref(db, 'lecturas');
      
      const unsubscribe = onValue(lecturasRef, (snapshot) => {
        console.log('📡 Snapshot recibido:', snapshot.exists());
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const lecturasArray = Object.entries(data)
            .map(([key, value]) => ({
              key,
              ...value,
              timestamp: value.timestamp || parseInt(key)
            }))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5); // Solo las últimas 5
          
          console.log('✅ Lecturas recibidas:', lecturasArray);
          setLecturas(lecturasArray);
          setConectado(true);
          setError(null);
        } else {
          console.log('⚠️ No hay lecturas en Firebase');
          setError('No hay lecturas en la base de datos');
        }
      }, (error) => {
        console.error('❌ Error al escuchar Firebase:', error);
        setError(error.message);
        setConectado(false);
      });

      return () => {
        console.log('🛑 Deteniendo test');
        unsubscribe();
      };
    } catch (err) {
      console.error('❌ Error al configurar listener:', err);
      setError(err.message);
    }
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      width: '300px',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      border: '2px solid #3b82f6',
      borderRadius: '12px',
      padding: '15px',
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 10000,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#3b82f6' }}>
        🔥 Test Firebase
      </h3>
      
      <div style={{
        padding: '8px',
        background: conectado ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        border: `2px solid ${conectado ? '#10b981' : '#ef4444'}`,
        borderRadius: '6px',
        marginBottom: '10px'
      }}>
        <strong>Estado:</strong> {conectado ? '✅ Conectado' : '❌ Desconectado'}
      </div>

      {error && (
        <div style={{
          padding: '8px',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '2px solid #ef4444',
          borderRadius: '6px',
          marginBottom: '10px',
          color: '#fca5a5',
          fontSize: '10px'
        }}>
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      <div>
        <strong>Últimas lecturas:</strong>
        {lecturas.length > 0 ? (
          <div style={{ marginTop: '8px' }}>
            {lecturas.map((lectura, index) => (
              <div
                key={lectura.key}
                style={{
                  padding: '6px',
                  background: index === 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  fontSize: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>S1: {lectura.valorSensor1}</span>
                  <span>S2: {lectura.valorSensor2}</span>
                </div>
                <div style={{ fontSize: '9px', opacity: 0.7 }}>
                  {new Date(lectura.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: '8px', fontSize: '10px', opacity: 0.7 }}>
            Esperando lecturas...
          </div>
        )}
      </div>
    </div>
  );
}

export default TestFirebase;
