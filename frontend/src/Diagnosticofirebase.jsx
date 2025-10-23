import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, query, orderByKey, limitToLast } from 'firebase/database';

/**
 * COMPONENTE DE DIAGNÓSTICO
 * Muestra en tiempo real las lecturas de Firebase para verificar
 * que el Arduino esté enviando datos correctamente
 */
function DiagnosticoFirebase() {
  const [ultimaLectura, setUltimaLectura] = useState(null);
  const [todasLecturas, setTodasLecturas] = useState([]);
  const [configuracion, setConfiguracion] = useState(null);
  const [conectado, setConectado] = useState(false);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  // Escuchar la última lectura
  useEffect(() => {
    console.log('🔍 Iniciando diagnóstico de Firebase...');
    
    try {
      const lecturasRef = ref(db, 'lecturas');
      const lecturasQuery = query(lecturasRef, orderByKey(), limitToLast(1));

      const unsubscribe = onValue(lecturasQuery, (snapshot) => {
        console.log('📡 Snapshot recibido:', snapshot.exists());
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const keys = Object.keys(data);
          const ultimaKey = keys[keys.length - 1];
          const lectura = data[ultimaKey];
          
          console.log('✅ Última lectura:', lectura);
          
          setUltimaLectura({
            ...lectura,
            key: ultimaKey,
            timestamp: lectura.timestamp || parseInt(ultimaKey)
          });
          setConectado(true);
          setUltimaActualizacion(new Date());
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
        console.log('🛑 Deteniendo diagnóstico');
        unsubscribe();
      };
    } catch (err) {
      console.error('❌ Error al configurar listener:', err);
      setError(err.message);
    }
  }, []);

  // Escuchar las últimas 10 lecturas
  useEffect(() => {
    const lecturasRef = ref(db, 'lecturas');
    const lecturasQuery = query(lecturasRef, orderByKey(), limitToLast(10));

    const unsubscribe = onValue(lecturasQuery, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const lecturas = Object.entries(data).map(([key, value]) => ({
          ...value,
          key,
          timestamp: value.timestamp || parseInt(key)
        }));
        setTodasLecturas(lecturas.reverse());
      }
    });

    return () => unsubscribe();
  }, []);

  // Escuchar configuración
  useEffect(() => {
    const configRef = ref(db, 'configuracion');

    const unsubscribe = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        setConfiguracion(snapshot.val());
        console.log('⚙️ Configuración:', snapshot.val());
      }
    });

    return () => unsubscribe();
  }, []);

  const formatearFecha = (timestamp) => {
    if (!timestamp) return 'N/A';
    const fecha = new Date(timestamp);
    return fecha.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const tiempoTranscurrido = (timestamp) => {
    if (!timestamp) return 'N/A';
    const ahora = Date.now();
    const diferencia = Math.floor((ahora - timestamp) / 1000);
    
    if (diferencia < 60) return `${diferencia} segundos`;
    if (diferencia < 3600) return `${Math.floor(diferencia / 60)} minutos`;
    return `${Math.floor(diferencia / 3600)} horas`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '400px',
      maxHeight: '90vh',
      overflow: 'auto',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      border: '2px solid #3b82f6',
      borderRadius: '16px',
      padding: '20px',
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      zIndex: 9999
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: '2px solid #3b82f6'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#3b82f6' }}>
          🔍 Diagnóstico Firebase
        </h2>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: conectado ? '#10b981' : '#ef4444',
          boxShadow: conectado ? '0 0 10px #10b981' : '0 0 10px #ef4444',
          animation: 'pulse 2s infinite'
        }}></div>
      </div>

      {/* Estado de Conexión */}
      <div style={{
        padding: '12px',
        background: conectado ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        border: `2px solid ${conectado ? '#10b981' : '#ef4444'}`,
        borderRadius: '8px',
        marginBottom: '15px'
      }}>
        <strong>Estado:</strong> {conectado ? '✅ Conectado' : '❌ Desconectado'}
        {ultimaActualizacion && (
          <div style={{ fontSize: '10px', marginTop: '5px', opacity: 0.8 }}>
            Última actualización: {ultimaActualizacion.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '2px solid #ef4444',
          borderRadius: '8px',
          marginBottom: '15px',
          color: '#fca5a5'
        }}>
          <strong>❌ Error:</strong>
          <div style={{ marginTop: '5px', fontSize: '11px' }}>{error}</div>
        </div>
      )}

      {/* Última Lectura */}
      {ultimaLectura && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            color: '#60a5fa',
            fontSize: '14px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📊 Última Lectura
          </h3>
          
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Dispositivo:</strong> {ultimaLectura.dispositivo || 'N/A'}
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '8px'
            }}>
              <div style={{
                padding: '8px',
                background: ultimaLectura.sensor1Alerta ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                border: `2px solid ${ultimaLectura.sensor1Alerta ? '#ef4444' : '#10b981'}`,
                borderRadius: '6px'
              }}>
                <div style={{ fontSize: '10px', opacity: 0.8 }}>Sensor 1 (A0)</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>
                  {ultimaLectura.valorSensor1}
                </div>
                {ultimaLectura.sensor1Alerta && (
                  <div style={{ fontSize: '10px', marginTop: '4px', color: '#fca5a5' }}>
                    🔴 ALERTA
                  </div>
                )}
              </div>

              <div style={{
                padding: '8px',
                background: ultimaLectura.sensor2Alerta ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                border: `2px solid ${ultimaLectura.sensor2Alerta ? '#ef4444' : '#10b981'}`,
                borderRadius: '6px'
              }}>
                <div style={{ fontSize: '10px', opacity: 0.8 }}>Sensor 2 (A3)</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>
                  {ultimaLectura.valorSensor2}
                </div>
                {ultimaLectura.sensor2Alerta && (
                  <div style={{ fontSize: '10px', marginTop: '4px', color: '#fca5a5' }}>
                    🔴 ALERTA
                  </div>
                )}
              </div>
            </div>

            <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '8px' }}>
              <div>Timestamp: {formatearFecha(ultimaLectura.timestamp)}</div>
              <div>Hace: {tiempoTranscurrido(ultimaLectura.timestamp)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Configuración */}
      {configuracion && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            color: '#60a5fa',
            fontSize: '14px',
            marginBottom: '10px'
          }}>
            ⚙️ Configuración Actual
          </h3>
          
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '11px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>Umbral Gas: <strong>{configuracion.umbralGas}</strong></div>
              <div>Servo: <strong>{configuracion.servoAbierto ? '🚪 Abierta' : '🚪 Cerrada'}</strong></div>
              <div>Buzzer P1: <strong>{configuracion.buzzerPiso1Activo ? '✅' : '❌'}</strong></div>
              <div>Buzzer P2: <strong>{configuracion.buzzerPiso2Activo ? '✅' : '❌'}</strong></div>
              <div>LED P1: <strong>{configuracion.ledPiso1Activo ? '✅' : '❌'}</strong></div>
              <div>LED P2: <strong>{configuracion.ledPiso2Activo ? '✅' : '❌'}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Historial de Lecturas */}
      {todasLecturas.length > 0 && (
        <div>
          <h3 style={{
            color: '#60a5fa',
            fontSize: '14px',
            marginBottom: '10px'
          }}>
            📜 Últimas 10 Lecturas
          </h3>
          
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {todasLecturas.map((lectura, index) => (
              <div
                key={lectura.key}
                style={{
                  padding: '8px',
                  background: index === 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  marginBottom: '6px',
                  fontSize: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ opacity: 0.7 }}>{formatearFecha(lectura.timestamp)}</span>
                  <span style={{ fontSize: '9px', opacity: 0.5 }}>
                    {lectura.dispositivo || 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ color: lectura.sensor1Alerta ? '#fca5a5' : '#86efac' }}>
                    S1: {lectura.valorSensor1} {lectura.sensor1Alerta && '🔴'}
                  </span>
                  <span style={{ color: lectura.sensor2Alerta ? '#fca5a5' : '#86efac' }}>
                    S2: {lectura.valorSensor2} {lectura.sensor2Alerta && '🔴'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: 'rgba(251, 191, 36, 0.1)',
        border: '2px solid #fbbf24',
        borderRadius: '8px',
        fontSize: '10px',
        color: '#fde68a'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>💡 Instrucciones:</div>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Si ves lecturas pero el edificio no cambia, el problema está en Edificio3D</li>
          <li>Si no ves lecturas, revisa la conexión de Arduino</li>
          <li>Verifica que el Arduino envíe a la ruta correcta: /lecturas</li>
          <li>Los timestamps deben ser números (milisegundos)</li>
        </ul>
      </div>
    </div>
  );
}

export default DiagnosticoFirebase;