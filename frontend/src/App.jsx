import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, doc, onSnapshot, updateDoc, query, orderBy, limit } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Flame,
  Bell,
  Settings,
  Activity,
  AlertTriangle,
  Power,
  Volume2,
  DoorOpen,
  DoorClosed,
  PlayCircle,
  TrendingUp,
  Clock,
  BarChart3
} from 'lucide-react';
import Edificio3D from './Edificio3D';
import './App.css';

function App() {
  // ==================== ESTADOS PRINCIPALES ====================
  const [notificacionActiva, setNotificacionActiva] = useState(null);
  // Función helper para mostrar notificaciones
  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    setNotificacionActiva({ mensaje, tipo });
    setTimeout(() => setNotificacionActiva(null), 3000);
  };
  // Configuración del sistema
  const [configuracion, setConfiguracion] = useState({
    umbralGas: 60,
    intervaloLectura: 100,
    buzzerPiso1Activo: true,
    buzzerPiso2Activo: true,
    buzzerVolumen: 255,
    ledPiso1Activo: true,
    ledPiso2Activo: true,
    servoAbierto: false,
    modoSimulacion: false
  });


  // Configuración global
  const [configGlobal, setConfigGlobal] = useState({
    modoProgramado: false,
    horarioInicioSensible: "08:00",
    horarioFinSensible: "18:00",
    sensibilidadDia: 60,
    sensibilidadNoche: 100
  });

  // Datos en tiempo real
  const [ultimaLectura, setUltimaLectura] = useState(null);
  const [lecturas, setLecturas] = useState([]);
  const [dispositivo, setDispositivo] = useState(null);
  const [gasDetectado, setGasDetectado] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);

  // Estadísticas
  const [estadisticas, setEstadisticas] = useState({
    totalAlertas: 0,
    tiempoTotalAlerta: 0
  });

  // Estados de UI
  const [editando, setEditando] = useState(false);
  const [editandoGlobal, setEditandoGlobal] = useState(false);
  const [configTemp, setConfigTemp] = useState({});
  const [configGlobalTemp, setConfigGlobalTemp] = useState({});
  const [vistaActual, setVistaActual] = useState('general'); // 'general', 'config', 'stats'
  // ==================== EFECTOS (Firebase Listeners) ====================

  // Escuchar configuración del sistema
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

  // Escuchar configuración global
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'configuracion', 'global'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setConfigGlobal(data);
        setConfigGlobalTemp(data);
      }
    });
    return () => unsubscribe();
  }, []);

  // Escuchar lecturas históricas
  useEffect(() => {
    const q = query(collection(db, 'lecturas'), orderBy('timestamp', 'desc'), limit(50));
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
        setGasDetectado(ultima.gasDetectado || false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Escuchar estado del dispositivo
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'dispositivos', 'arduino_001'), (doc) => {
      if (doc.exists()) {
        setDispositivo(doc.data());
      }
    });
    return () => unsubscribe();
  }, []);

  // Escuchar notificaciones
  useEffect(() => {
    const q = query(collection(db, 'notificaciones'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notifs.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate?.() || new Date()
        });
      });
      setNotificaciones(notifs);
    });
    return () => unsubscribe();
  }, []);

  // Escuchar estadísticas
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'estadisticas', 'general'), (doc) => {
      if (doc.exists()) {
        setEstadisticas(doc.data());
      }
    });
    return () => unsubscribe();
  }, []);

  // ==================== FUNCIONES ====================

  // Guardar configuración del sistema
  const guardarConfiguracion = async () => {
    try {
      await updateDoc(doc(db, 'configuracion', 'sistema'), configTemp);
      setEditando(false);
      mostrarNotificacion('Configuración actualizada correctamente', 'success');
    } catch (error) {
      console.error('Error al guardar:', error);
      mostrarNotificacion('Error al guardar la configuración', 'error');
    }
  };

  // Guardar configuración global
  const guardarConfigGlobal = async () => {
    try {
      await updateDoc(doc(db, 'configuracion', 'global'), configGlobalTemp);
      setEditandoGlobal(false);
      alert('✅ Configuración global actualizada');
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al guardar');
    }
  };

  // Controlar servo (puerta)
  const toggleServo = async () => {
    try {
      const nuevoEstado = !configuracion.servoAbierto;
      await updateDoc(doc(db, 'configuracion', 'sistema'), {
        servoAbierto: nuevoEstado
      });
    } catch (error) {
      console.error('Error al controlar servo:', error);
    }
  };

  const toggleSimulacion = async () => {
    try {
      const nuevoEstado = !configuracion.modoSimulacion;
      await updateDoc(doc(db, 'configuracion', 'sistema'), {
        modoSimulacion: nuevoEstado
      });
      mostrarNotificacion(
        nuevoEstado ? 'Modo simulación activado' : 'Modo simulación desactivado',
        'info'
      );
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error al cambiar modo', 'error');
    }
  };

  // Datos para el gráfico
  const datosGrafico = lecturas.slice(-30).map((lectura, index) => ({
    nombre: `#${index + 1}`,
    valor: lectura.valorGas,
    umbral: configuracion.umbralGas,
    tiempo: lectura.timestamp.toLocaleTimeString()
  }));

  // Calcular porcentaje de tiempo en alerta
  const porcentajeAlerta = estadisticas.totalAlertas > 0
    ? ((estadisticas.tiempoTotalAlerta / (estadisticas.totalAlertas * 60)) * 100).toFixed(1)
    : 0;

  // ==================== RENDER ====================
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <Flame size={32} />
            <h1>SDGI - Sistema Detector de Gas IoT</h1>
          </div>
          <div className="header-right">
            <div className="tabs">
              <button
                className={`tab ${vistaActual === 'general' ? 'active' : ''}`}
                onClick={() => setVistaActual('general')}
              >
                <Activity size={18} />
                General
              </button>
              <button
                className={`tab ${vistaActual === 'config' ? 'active' : ''}`}
                onClick={() => setVistaActual('config')}
              >
                <Settings size={18} />
                Configuración
              </button>
              <button
                className={`tab ${vistaActual === 'stats' ? 'active' : ''}`}
                onClick={() => setVistaActual('stats')}
              >
                <BarChart3 size={18} />
                Estadísticas
              </button>
            </div>
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
          <span>⚠️ GAS DETECTADO EN EL EDIFICIO - Valor: {ultimaLectura?.valorGas}</span>
          <AlertTriangle size={24} />
        </div>
      )}

      <div className="container">
        {/* VISTA GENERAL */}
        {vistaActual === 'general' && (
          <>
            {/* Edificio 3D */}
            <div className="edificio-container">
              <h2 className="section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                  <path d="M9 22v-4h6v4"></path>
                  <path d="M8 6h.01"></path>
                  <path d="M16 6h.01"></path>
                  <path d="M12 6h.01"></path>
                  <path d="M12 10h.01"></path>
                  <path d="M12 14h.01"></path>
                  <path d="M16 10h.01"></path>
                  <path d="M16 14h.01"></path>
                  <path d="M8 10h.01"></path>
                  <path d="M8 14h.01"></path>
                </svg>
                <span>Edificio en Tiempo Real</span>
              </h2>
              <Edificio3D
                piso1Alerta={gasDetectado}
                piso2Alerta={gasDetectado}
                puertaAbierta={configuracion.servoAbierto}
              />
            </div>

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

            {/* Controles rápidos */}
            <div className="controles-rapidos">
              <h2 className="section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
                <span>Controles Rápidos</span>
              </h2>
              <div className="controles-grid">
                <button
                  className={`control-btn ${configuracion.servoAbierto ? 'active' : ''}`}
                  onClick={toggleServo}
                >
                  {configuracion.servoAbierto ? <DoorOpen size={24} /> : <DoorClosed size={24} />}
                  <span>{configuracion.servoAbierto ? 'Cerrar Puerta' : 'Abrir Puerta'}</span>
                </button>

                <button
                  className={`control-btn ${configuracion.modoSimulacion ? 'active' : ''}`}
                  onClick={toggleSimulacion}
                >
                  <PlayCircle size={24} />
                  <span>{configuracion.modoSimulacion ? 'Modo Real' : 'Modo Simulación'}</span>
                </button>

                <div className="control-info">
                  <Volume2 size={20} />
                  <div>
                    <span>Volumen Buzzer</span>
                    <div className="volume-bar">
                      <div
                        className="volume-fill"
                        style={{ width: `${(configuracion.buzzerVolumen / 255) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico */}
            <div className="grafico-container">
              <h2 className="section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                <span>Lecturas en Tiempo Real (Últimas 30)</span>
              </h2>
              {lecturas.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={datosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="nombre" stroke="#ccc" />
                    <YAxis stroke="#ccc" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #a78bfa',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="valor"
                      stroke="#a78bfa"
                      strokeWidth={3}
                      dot={{ fill: '#a78bfa', r: 4 }}
                      name="Valor del gas"
                    />
                    <Line
                      type="monotone"
                      dataKey="umbral"
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

            {/* Notificaciones */}
            <div className="notificaciones">
              <h2 className="section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span>Notificaciones Recientes</span>
              </h2>
              <div className="notif-lista">
                {notificaciones.length > 0 ? (
                  notificaciones.map(notif => (
                    <div key={notif.id} className={`notif-item ${notif.tipo}`}>
                      <div className="notif-icon">
                        {notif.tipo === 'alerta' ? <AlertTriangle size={20} /> : <Bell size={20} />}
                      </div>
                      <div className="notif-content">
                        <p>{notif.mensaje}</p>
                        <small>{notif.timestamp.toLocaleString()}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="sin-datos">No hay notificaciones</p>
                )}
              </div>
            </div>
          </>
        )}
        {/* VISTA CONFIGURACIÓN */}
        {vistaActual === 'config' && (
          <>
            {/* Configuración del Sistema */}
            <div className="configuracion">
              <div className="config-header">
                <h2 className="section-title">
                  <Settings size={24} />
                  <span>Configuración del Sistema</span>
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
                    onChange={(e) => setConfigTemp({ ...configTemp, umbralGas: parseInt(e.target.value) })}
                    disabled={!editando}
                    min="10"
                    max="200"
                  />
                  <small>Sensibilidad de detección (10-200)</small>
                </div>

                <div className="config-item">
                  <label>⏱️ Intervalo de Lectura (ms)</label>
                  <input
                    type="number"
                    value={editando ? configTemp.intervaloLectura : configuracion.intervaloLectura}
                    onChange={(e) => setConfigTemp({ ...configTemp, intervaloLectura: parseInt(e.target.value) })}
                    disabled={!editando}
                    min="100"
                    max="5000"
                    step="100"
                  />
                  <small>Tiempo entre lecturas (100-5000ms)</small>
                </div>

                <div className="config-item">
                  <label>🔊 Volumen Buzzer</label>
                  <input
                    type="range"
                    value={editando ? configTemp.buzzerVolumen : configuracion.buzzerVolumen}
                    onChange={(e) => setConfigTemp({ ...configTemp, buzzerVolumen: parseInt(e.target.value) })}
                    disabled={!editando}
                    min="0"
                    max="255"
                  />
                  <small>Volumen: {editando ? configTemp.buzzerVolumen : configuracion.buzzerVolumen}</small>
                </div>

                <div className="config-item">
                  <label>🔊 Buzzer Piso 1</label>
                  <div className="toggle">
                    <input
                      type="checkbox"
                      checked={editando ? configTemp.buzzerPiso1Activo : configuracion.buzzerPiso1Activo}
                      onChange={(e) => setConfigTemp({ ...configTemp, buzzerPiso1Activo: e.target.checked })}
                      disabled={!editando}
                    />
                    <span>{(editando ? configTemp.buzzerPiso1Activo : configuracion.buzzerPiso1Activo) ? 'Activado' : 'Desactivado'}</span>
                  </div>
                </div>

                <div className="config-item">
                  <label>🔊 Buzzer Piso 2</label>
                  <div className="toggle">
                    <input
                      type="checkbox"
                      checked={editando ? configTemp.buzzerPiso2Activo : configuracion.buzzerPiso2Activo}
                      onChange={(e) => setConfigTemp({ ...configTemp, buzzerPiso2Activo: e.target.checked })}
                      disabled={!editando}
                    />
                    <span>{(editando ? configTemp.buzzerPiso2Activo : configuracion.buzzerPiso2Activo) ? 'Activado' : 'Desactivado'}</span>
                  </div>
                </div>

                <div className="config-item">
                  <label>💡 LED Piso 1</label>
                  <div className="toggle">
                    <input
                      type="checkbox"
                      checked={editando ? configTemp.ledPiso1Activo : configuracion.ledPiso1Activo}
                      onChange={(e) => setConfigTemp({ ...configTemp, ledPiso1Activo: e.target.checked })}
                      disabled={!editando}
                    />
                    <span>{(editando ? configTemp.ledPiso1Activo : configuracion.ledPiso1Activo) ? 'Activado' : 'Desactivado'}</span>
                  </div>
                </div>

                <div className="config-item">
                  <label>💡 LED Piso 2</label>
                  <div className="toggle">
                    <input
                      type="checkbox"
                      checked={editando ? configTemp.ledPiso2Activo : configuracion.ledPiso2Activo}
                      onChange={(e) => setConfigTemp({ ...configTemp, ledPiso2Activo: e.target.checked })}
                      disabled={!editando}
                    />
                    <span>{(editando ? configTemp.ledPiso2Activo : configuracion.ledPiso2Activo) ? 'Activado' : 'Desactivado'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuración Global */}
            <div className="configuracion">
              <div className="config-header">
                <h2 className="section-title">
                  <Clock size={24} />
                  <span>Modo Programado</span>
                </h2>
                {!editandoGlobal ? (
                  <button className="btn-editar" onClick={() => setEditandoGlobal(true)}>
                    ✏️ Editar
                  </button>
                ) : (
                  <div className="btn-group">
                    <button className="btn-guardar" onClick={guardarConfigGlobal}>
                      💾 Guardar
                    </button>
                    <button className="btn-cancelar" onClick={() => {
                      setConfigGlobalTemp(configGlobal);
                      setEditandoGlobal(false);
                    }}>
                      ❌ Cancelar
                    </button>
                  </div>
                )}
              </div>

              <div className="config-grid">
                <div className="config-item">
                  <label>⏰ Modo Programado</label>
                  <div className="toggle">
                    <input
                      type="checkbox"
                      checked={editandoGlobal ? configGlobalTemp.modoProgramado : configGlobal.modoProgramado}
                      onChange={(e) => setConfigGlobalTemp({ ...configGlobalTemp, modoProgramado: e.target.checked })}
                      disabled={!editandoGlobal}
                    />
                    <span>{(editandoGlobal ? configGlobalTemp.modoProgramado : configGlobal.modoProgramado) ? 'Activado' : 'Desactivado'}</span>
                  </div>
                  <small>Ajusta la sensibilidad según el horario</small>
                </div>

                <div className="config-item">
                  <label>🌅 Horario Inicio (Día)</label>
                  <input
                    type="time"
                    value={editandoGlobal ? configGlobalTemp.horarioInicioSensible : configGlobal.horarioInicioSensible}
                    onChange={(e) => setConfigGlobalTemp({ ...configGlobalTemp, horarioInicioSensible: e.target.value })}
                    disabled={!editandoGlobal}
                  />
                </div>

                <div className="config-item">
                  <label>🌙 Horario Fin (Noche)</label>
                  <input
                    type="time"
                    value={editandoGlobal ? configGlobalTemp.horarioFinSensible : configGlobal.horarioFinSensible}
                    onChange={(e) => setConfigGlobalTemp({ ...configGlobalTemp, horarioFinSensible: e.target.value })}
                    disabled={!editandoGlobal}
                  />
                </div>

                <div className="config-item">
                  <label>☀️ Sensibilidad Día</label>
                  <input
                    type="number"
                    value={editandoGlobal ? configGlobalTemp.sensibilidadDia : configGlobal.sensibilidadDia}
                    onChange={(e) => setConfigGlobalTemp({ ...configGlobalTemp, sensibilidadDia: parseInt(e.target.value) })}
                    disabled={!editandoGlobal}
                    min="10"
                    max="200"
                  />
                  <small>Umbral durante el día</small>
                </div>

                <div className="config-item">
                  <label>🌙 Sensibilidad Noche</label>
                  <input
                    type="number"
                    value={editandoGlobal ? configGlobalTemp.sensibilidadNoche : configGlobal.sensibilidadNoche}
                    onChange={(e) => setConfigGlobalTemp({ ...configGlobalTemp, sensibilidadNoche: parseInt(e.target.value) })}
                    disabled={!editandoGlobal}
                    min="10"
                    max="200"
                  />
                  <small>Umbral durante la noche</small>
                </div>
              </div>
            </div>
          </>
        )}

        {/* VISTA ESTADÍSTICAS */}
        {vistaActual === 'stats' && (
          <>
            <div className="stats-container">
              <h2 className="section-title">
                <TrendingUp size={24} />
                <span>Estadísticas del Sistema</span>
              </h2>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon alerta">
                    <AlertTriangle size={32} />
                  </div>
                  <div className="stat-content">
                    <h3>Total de Alertas</h3>
                    <div className="stat-value">{estadisticas.totalAlertas}</div>
                    <small>Alertas detectadas en total</small>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon tiempo">
                    <Clock size={32} />
                  </div>
                  <div className="stat-content">
                    <h3>Tiempo en Alerta</h3>
                    <div className="stat-value">{estadisticas.tiempoTotalAlerta}s</div>
                    <small>Tiempo total en estado de alerta</small>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon porcentaje">
                    <BarChart3 size={32} />
                  </div>
                  <div className="stat-content">
                    <h3>Promedio por Alerta</h3>
                    <div className="stat-value">{porcentajeAlerta}%</div>
                    <small>Duración promedio de alertas</small>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon lecturas">
                    <Activity size={32} />
                  </div>
                  <div className="stat-content">
                    <h3>Total Lecturas</h3>
                    <div className="stat-value">{lecturas.length}</div>
                    <small>Lecturas registradas</small>
                  </div>
                </div>
              </div>

              {/* Mapa de calor simulado */}
              <div className="mapa-calor">
                <h3>🔥 Mapa de Calor - Alertas por Hora</h3>
                <div className="heatmap-grid">
                  {Array.from({ length: 24 }, (_, i) => {
                    const alertasHora = notificaciones.filter(n =>
                      n.tipo === 'alerta' && n.timestamp.getHours() === i
                    ).length;
                    const intensidad = Math.min((alertasHora / 5) * 100, 100);
                    return (
                      <div
                        key={i}
                        className="heatmap-cell"
                        style={{
                          backgroundColor: `rgba(239, 68, 68, ${intensidad / 100})`,
                          border: intensidad > 0 ? '2px solid #ef4444' : '1px solid #333'
                        }}
                        title={`${i}:00 - ${alertasHora} alertas`}
                      >
                        <span>{i}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="heatmap-legend">
                  <span>Menos alertas</span>
                  <div className="legend-gradient" />
                  <span>Más alertas</span>
                </div>
              </div>
            </div>

            {/* Tabla de lecturas históricas */}
            <div className="historial">
              <h2 className="section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v5h5"></path>
                  <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path>
                  <path d="M12 7v5l4 2"></path>
                </svg>
                <span>Historial de Lecturas (Últimas 20)</span>
              </h2>
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
                      {[...lecturas].reverse().slice(0, 20).map((lectura, index) => (
                        <tr key={lectura.id} className={lectura.gasDetectado ? 'alerta-row' : ''}>
                          <td>{lecturas.length - index}</td>
                          <td>{lectura.timestamp.toLocaleString()}</td>
                          <td className="valor">{lectura.valorGas}</td>
                          <td>
                            {lectura.gasDetectado ? (
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
          </>
        )}
      </div>

      <footer className="footer">
        <p>SDGI © 2024 - Cristian Segovia, Simón Contreras, Camilo Herrera, Diego Vera</p>
      </footer>
      {/* NOTIFICACIÓN TOAST */}
      {notificacionActiva && (
        <div className={`alert-${notificacionActiva.tipo}`}>
          {notificacionActiva.mensaje}
        </div>
      )}
    </div>
  );
}

export default App;