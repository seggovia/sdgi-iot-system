import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, doc, onSnapshot, updateDoc, query, orderBy, limit } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Flame, Bell, Settings, Activity, AlertTriangle } from 'lucide-react';
import './App.css';

function App() {
  // Estados para datos en tiempo real
  const [configuracion, setConfiguracion] = useState({
    umbralGas: 350,
    intervaloLectura: 500,
    buzzerActivo: true,
    ledActivo: true
  });
  
  const [ultimaLectura, setUltimaLectura] = useState(null);
  const [lecturas, setLecturas] = useState([]);
  const [dispositivo, setDispositivo] = useState(null);
  const [gasDetectado, setGasDetectado] = useState(false);

  // Estados para edición de configuración
  const [editando, setEditando] = useState(false);
  const [configTemp, setConfigTemp] = useState({});

  // Escuchar cambios en configuración
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'configuracion', 'sistema'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setConfiguracion(data);
        setConfigTemp(data);
      }
    });
    return () => unsubscribe();
  }, []);

  // Escuchar lecturas históricas (últimas 20)
  useEffect(() => {
    const q = query(collection(db, 'lecturas'), orderBy('timestamp', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lecturasData = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        lecturasData.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate?.() || new Date()
        });
      });
      setLecturas(lecturasData.reverse());
      if (lecturasData.length > 0) {
        const ultima = lecturasData[lecturasData.length - 1];
        setUltimaLectura(ultima);
        setGasDetectado(ultima.valorGas > configuracion.umbralGas);
      }
    });
    return () => unsubscribe();
  }, [configuracion.umbralGas]);

  // Escuchar estado del dispositivo
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'dispositivos', 'arduino_001'), (doc) => {
      if (doc.exists()) {
        setDispositivo(doc.data());
      }
    });
    return () => unsubscribe();
  }, []);

  // Guardar configuración
  const guardarConfiguracion = async () => {
    try {
      await updateDoc(doc(db, 'configuracion', 'sistema'), configTemp);
      setEditando(false);
      alert('✅ Configuración actualizada correctamente');
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('❌ Error al guardar la configuración');
    }
  };

  // Datos para el gráfico
  const datosGrafico = lecturas.map((lectura, index) => ({
    nombre: `#${index + 1}`,
    valor: lectura.valorGas,
    tiempo: lectura.timestamp.toLocaleTimeString()
  }));

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <Flame size={32} />
            <h1>SDGI - Sistema Detector de Gas IoT</h1>
          </div>
          <div className="header-status">
            {dispositivo && (
              <span className={`status ${dispositivo.estado === 'online' ? 'online' : 'offline'}`}>
                <Activity size={16} />
                {dispositivo.estado === 'online' ? 'Conectado' : 'Desconectado'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Alerta de gas */}
      {gasDetectado && (
        <div className="alerta-gas">
          <AlertTriangle size={24} />
          <span>⚠️ GAS DETECTADO - Valor: {ultimaLectura?.valorGas}</span>
          <AlertTriangle size={24} />
        </div>
      )}

      <div className="container">
        {/* Tarjetas de información */}
        <div className="cards">
          <div className="card">
            <div className="card-header">
              <Activity size={20} />
              <h3>Lectura Actual</h3>
            </div>
            <div className="card-value">
              {ultimaLectura ? ultimaLectura.valorGas : '---'}
            </div>
            <div className="card-label">Valor del sensor MQ-2</div>
          </div>

          <div className="card">
            <div className="card-header">
              <Bell size={20} />
              <h3>Umbral</h3>
            </div>
            <div className="card-value">{configuracion.umbralGas}</div>
            <div className="card-label">Límite de detección</div>
          </div>

          <div className={`card ${gasDetectado ? 'alerta' : ''}`}>
            <div className="card-header">
              <Flame size={20} />
              <h3>Estado</h3>
            </div>
            <div className="card-value">
              {gasDetectado ? '🔴 ALERTA' : '🟢 NORMAL'}
            </div>
            <div className="card-label">
              {gasDetectado ? 'Gas detectado' : 'Todo OK'}
            </div>
          </div>
        </div>

        {/* Gráfico */}
        <div className="grafico-container">
          <h2>📊 Lecturas en Tiempo Real</h2>
          {lecturas.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={datosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="nombre" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="#00d4ff" 
                  strokeWidth={2}
                  dot={{ fill: '#00d4ff', r: 4 }}
                  name="Valor del gas"
                />
                <Line 
                  type="monotone" 
                  dataKey={() => configuracion.umbralGas} 
                  stroke="#ff4444" 
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  name="Umbral"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="sin-datos">
              <p>📡 Esperando datos del Arduino...</p>
            </div>
          )}
        </div>

        {/* Panel de configuración */}
        <div className="configuracion">
          <div className="config-header">
            <h2>
              <Settings size={24} />
              Configuración del Sistema
            </h2>
            {!editando ? (
              <button className="btn-editar" onClick={() => setEditando(true)}>
                ✏️ Editar
              </button>
            ) : (
              <div className="btn-group">
                <button className="btn-guardar" onClick={guardarConfiguracion}>
                  💾 Guardar
                </button>
                <button className="btn-cancelar" onClick={() => {
                  setConfigTemp(configuracion);
                  setEditando(false);
                }}>
                  ❌ Cancelar
                </button>
              </div>
            )}
          </div>

          <div className="config-grid">
            <div className="config-item">
              <label>🎚️ Umbral de Gas</label>
              <input
                type="number"
                value={editando ? configTemp.umbralGas : configuracion.umbralGas}
                onChange={(e) => setConfigTemp({...configTemp, umbralGas: parseInt(e.target.value)})}
                disabled={!editando}
              />
              <small>Mayor valor = menos sensible</small>
            </div>

            <div className="config-item">
              <label>⏱️ Intervalo de Lectura (ms)</label>
              <input
                type="number"
                value={editando ? configTemp.intervaloLectura : configuracion.intervaloLectura}
                onChange={(e) => setConfigTemp({...configTemp, intervaloLectura: parseInt(e.target.value)})}
                disabled={!editando}
              />
              <small>Tiempo entre lecturas</small>
            </div>

            <div className="config-item">
              <label>🔊 Buzzer</label>
              <div className="toggle">
                <input
                  type="checkbox"
                  checked={editando ? configTemp.buzzerActivo : configuracion.buzzerActivo}
                  onChange={(e) => setConfigTemp({...configTemp, buzzerActivo: e.target.checked})}
                  disabled={!editando}
                />
                <span>{(editando ? configTemp.buzzerActivo : configuracion.buzzerActivo) ? 'Activado' : 'Desactivado'}</span>
              </div>
            </div>

            <div className="config-item">
              <label>💡 LED de Alerta</label>
              <div className="toggle">
                <input
                  type="checkbox"
                  checked={editando ? configTemp.ledActivo : configuracion.ledActivo}
                  onChange={(e) => setConfigTemp({...configTemp, ledActivo: e.target.checked})}
                  disabled={!editando}
                />
                <span>{(editando ? configTemp.ledActivo : configuracion.ledActivo) ? 'Activado' : 'Desactivado'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de lecturas históricas */}
        <div className="historial">
          <h2>📜 Historial de Lecturas (Últimas 20)</h2>
          <div className="tabla-container">
            {lecturas.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha/Hora</th>
                    <th>Valor</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {[...lecturas].reverse().map((lectura, index) => (
                    <tr key={lectura.id} className={lectura.valorGas > configuracion.umbralGas ? 'alerta-row' : ''}>
                      <td>{lecturas.length - index}</td>
                      <td>{lectura.timestamp.toLocaleString()}</td>
                      <td className="valor">{lectura.valorGas}</td>
                      <td>
                        {lectura.valorGas > configuracion.umbralGas ? (
                          <span className="badge alerta">🔴 ALERTA</span>
                        ) : (
                          <span className="badge normal">🟢 Normal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="sin-datos">No hay lecturas registradas</p>
            )}
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>SDGI © 2024 - Cristian Segovia, Simón Contreras, Camilo Herrera, Diego Vera</p>
      </footer>
    </div>
  );
}

export default App;