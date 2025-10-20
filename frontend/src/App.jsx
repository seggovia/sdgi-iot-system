import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, set, update } from 'firebase/database';
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
import SimulacionPanel from './SimulacionPanel';

function App() {
  // ==================== ESTADOS PRINCIPALES ====================
  const [notificacionActiva, setNotificacionActiva] = useState(null);
  const [mostrarPanelSimulacion, setMostrarPanelSimulacion] = useState(false);

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

  // Estados separados para cada piso
  const [piso1Alerta, setPiso1Alerta] = useState(false);
  const [piso2Alerta, setPiso2Alerta] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);

  // Estadísticas
  const [estadisticas, setEstadisticas] = useState({
    totalAlertas: 0,
    tiempoTotalAlerta: 0,
    alertasPiso1: 0,
    alertasPiso2: 0
  });

  // Estados de UI
  const [editando, setEditando] = useState(false);
  const [editandoGlobal, setEditandoGlobal] = useState(false);
  const [configTemp, setConfigTemp] = useState({});
  const [configGlobalTemp, setConfigGlobalTemp] = useState({});
  const [vistaActual, setVistaActual] = useState('general');

  // ==================== EFECTOS (Realtime Database) ====================

  // Escuchar configuración del sistema
  useEffect(() => {
    const configRef = ref(db, 'configuracion/sistema');
    const unsubscribe = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setConfiguracion(data);
        setConfigTemp(data);
      } else {
        // Crear configuración por defecto
        const defaultConfig = {
          umbralGas: 60,
          intervaloLectura: 100,
          buzzerPiso1Activo: true,
          buzzerPiso2Activo: true,
          buzzerVolumen: 255,
          ledPiso1Activo: true,
          ledPiso2Activo: true,
          servoAbierto: false,
          modoSimulacion: false
        };
        set(configRef, defaultConfig);
      }
    });
    return () => unsubscribe();
  }, []);

  // Escuchar configuración global
  useEffect(() => {
    const configGlobalRef = ref(db, 'configuracion/global');
    const unsubscribe = onValue(configGlobalRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setConfigGlobal(data);
        setConfigGlobalTemp(data);
      } else {
        // Crear configuración global por defecto
        const defaultGlobal = {
          modoProgramado: false,
          horarioInicioSensible: "08:00",
          horarioFinSensible: "18:00",
          sensibilidadDia: 60,
          sensibilidadNoche: 100
        };
        set(configGlobalRef, defaultGlobal);
      }
    });
    return () => unsubscribe();
  }, []);

  // Escuchar lecturas (últimas 50)
  useEffect(() => {
    const lecturasRef = ref(db, 'lecturas');
    const unsubscribe = onValue(lecturasRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const lecturasArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
          timestamp: new Date(parseInt(key)) // Usar el timestamp como ID
        })).sort((a, b) => a.timestamp - b.timestamp).slice(-50); // Últimas 50

        setLecturas(lecturasArray);

        if (lecturasArray.length > 0) {
          const ultima = lecturasArray[lecturasArray.length - 1];
          setUltimaLectura(ultima);
          setPiso1Alerta(ultima.sensor1Alerta || false);
          setPiso2Alerta(ultima.sensor2Alerta || false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Escuchar estado del dispositivo
  useEffect(() => {
    const dispositivoRef = ref(db, 'dispositivos/arduino_001');
    const unsubscribe = onValue(dispositivoRef, (snapshot) => {
      if (snapshot.exists()) {
        setDispositivo(snapshot.val());
      } else {
        // Crear dispositivo por defecto
        set(dispositivoRef, {
          estado: 'offline',
          ultimaConexion: Date.now()
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Escuchar notificaciones (últimas 10)
  useEffect(() => {
    const notificacionesRef = ref(db, 'notificaciones');
    const unsubscribe = onValue(notificacionesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const notifsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
          timestamp: new Date(data[key].timestamp)
        })).sort((a, b) => b.timestamp - a.timestamp).slice(0, 10); // Últimas 10

        setNotificaciones(notifsArray);
      }
    });
    return () => unsubscribe();
  }, []);

  // Escuchar estadísticas
  useEffect(() => {
    const estadisticasRef = ref(db, 'estadisticas/general');
    const unsubscribe = onValue(estadisticasRef, (snapshot) => {
      if (snapshot.exists()) {
        setEstadisticas(snapshot.val());
      } else {
        // Crear estadísticas por defecto
        set(estadisticasRef, {
          totalAlertas: 0,
          tiempoTotalAlerta: 0,
          alertasPiso1: 0,
          alertasPiso2: 0
        });
      }
    });
    return () => unsubscribe();
  }, []);
  // ==================== FUNCIONES ====================

  // Guardar configuración del sistema
  const guardarConfiguracion = async () => {
    try {
      const configRef = ref(db, 'configuracion/sistema');
      await update(configRef, configTemp);
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
      const configGlobalRef = ref(db, 'configuracion/global');
      await update(configGlobalRef, configGlobalTemp);
      setEditandoGlobal(false);
      mostrarNotificacion('Configuración global actualizada', 'success');
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error al guardar', 'error');
    }
  };

  // Controlar servo (puerta)
  const toggleServo = async () => {
    try {
      const nuevoEstado = !configuracion.servoAbierto;
      const configRef = ref(db, 'configuracion/sistema');
      await update(configRef, {
        servoAbierto: nuevoEstado
      });
      mostrarNotificacion(
        nuevoEstado ? 'Puerta abierta' : 'Puerta cerrada',
        'info'
      );
    } catch (error) {
      console.error('Error al controlar servo:', error);
      mostrarNotificacion('Error al controlar puerta', 'error');
    }
  };

  const toggleSimulacion = async () => {
    try {
      const nuevoEstado = !configuracion.modoSimulacion;
      const configRef = ref(db, 'configuracion/sistema');
      await update(configRef, {
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
    sensor1: lectura.valorSensor1 || lectura.valorGas || 0,
    sensor2: lectura.valorSensor2 || 0,
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

      {/* MODIFICADO: Alerta de gas con información de ambos pisos */}
      {(piso1Alerta || piso2Alerta) && (
        <div className="alerta-gas">
          <AlertTriangle size={24} />
          <span>
            ⚠️ GAS DETECTADO -
            {piso1Alerta && ` PISO 1 (Sensor A0: ${ultimaLectura?.valorSensor1 || 0})`}
            {piso1Alerta && piso2Alerta && ' | '}
            {piso2Alerta && ` PISO 2 (Sensor A3: ${ultimaLectura?.valorSensor2 || 0})`}
          </span>
          <AlertTriangle size={24} />
        </div>
      )}

      <div className="container">
        {/* VISTA GENERAL */}
        {vistaActual === 'general' && (
          <>
            {/* Edificio 3D - CON SENSORES, BUZZERS Y LEDS POR PISO */}
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
                piso1Alerta={piso1Alerta}
                piso2Alerta={piso2Alerta}
                puertaAbierta={configuracion.servoAbierto}
                buzzerPiso1={configuracion.buzzerPiso1Activo && piso1Alerta}
                buzzerPiso2={configuracion.buzzerPiso2Activo && piso2Alerta}
                ledPiso1={configuracion.ledPiso1Activo && piso1Alerta}
                ledPiso2={configuracion.ledPiso2Activo && piso2Alerta}
              />
            </div>

            {/* CARDS CON INFORMACIÓN DETALLADA POR PISO */}
            <div className="cards">
              <div className={`card ${piso1Alerta ? 'alerta' : ''}`}>
                <div className="card-header">
                  <Activity size={20} />
                  <h3>Sensor Piso 1 (A0)</h3>
                </div>
                <div className="card-value">
                  {ultimaLectura ? (ultimaLectura.valorSensor1 || ultimaLectura.valorGas || 0) : '---'}
                </div>
                <div className="card-status-indicators">
                  <div className={`indicator ${piso1Alerta ? 'active' : ''}`}>
                    🔊 Buzzer {configuracion.buzzerPiso1Activo ? (piso1Alerta ? 'ON' : 'Listo') : 'OFF'}
                  </div>
                  <div className={`indicator ${piso1Alerta ? 'active' : ''}`}>
                    💡 LED {configuracion.ledPiso1Activo ? (piso1Alerta ? 'ON' : 'Listo') : 'OFF'}
                  </div>
                </div>
                <div className="card-label">
                  {piso1Alerta ? '🔴 ALERTA ACTIVA' : '🟢 Normal'}
                </div>
              </div>

              <div className={`card ${piso2Alerta ? 'alerta' : ''}`}>
                <div className="card-header">
                  <Activity size={20} />
                  <h3>Sensor Piso 2 (A3)</h3>
                </div>
                <div className="card-value">
                  {ultimaLectura ? (ultimaLectura.valorSensor2 || 0) : '---'}
                </div>
                <div className="card-status-indicators">
                  <div className={`indicator ${piso2Alerta ? 'active' : ''}`}>
                    🔊 Buzzer {configuracion.buzzerPiso2Activo ? (piso2Alerta ? 'ON' : 'Listo') : 'OFF'}
                  </div>
                  <div className={`indicator ${piso2Alerta ? 'active' : ''}`}>
                    💡 LED {configuracion.ledPiso2Activo ? (piso2Alerta ? 'ON' : 'Listo') : 'OFF'}
                  </div>
                </div>
                <div className="card-label">
                  {piso2Alerta ? '🔴 ALERTA ACTIVA' : '🟢 Normal'}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <Bell size={20} />
                  <h3>Umbral</h3>
                </div>
                <div className="card-value">{configuracion.umbralGas}</div>
                <div className="card-label">Límite de detección</div>
                <div className="card-info-extra">
                  <small>🎚️ Sensibilidad ajustable</small>
                </div>
              </div>

              <div className={`card ${piso1Alerta || piso2Alerta ? 'alerta' : ''}`}>
                <div className="card-header">
                  <Flame size={20} />
                  <h3>Estado General</h3>
                </div>
                <div className="card-value-emoji">
                  {piso1Alerta || piso2Alerta ? '🔴' : '🟢'}
                </div>
                <div className="card-status-text">
                  {piso1Alerta || piso2Alerta ? 'ALERTA' : 'NORMAL'}
                </div>
                <div className="card-label">
                  {piso1Alerta || piso2Alerta ? 'Gas detectado en edificio' : 'Todo OK'}
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
                  className={`control-btn ${mostrarPanelSimulacion ? 'active' : ''}`}
                  onClick={() => setMostrarPanelSimulacion(true)}
                >
                  <PlayCircle size={24} />
                  <span>Abrir Panel de Simulación</span>
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
            {/* Gráfico con ambos sensores */}
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
                      dataKey="sensor1"
                      stroke="#4facfe"
                      strokeWidth={3}
                      dot={{ fill: '#4facfe', r: 4 }}
                      name="Sensor Piso 1 (A0)"
                    />
                    <Line
                      type="monotone"
                      dataKey="sensor2"
                      stroke="#a78bfa"
                      strokeWidth={3}
                      dot={{ fill: '#a78bfa', r: 4 }}
                      name="Sensor Piso 2 (A3)"
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
                  <small>Sensibilidad de detección (10-200) | Actual: {configuracion.umbralGas}</small>
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
                  <small>Volumen: {editando ? configTemp.buzzerVolumen : configuracion.buzzerVolumen}/255</small>
                </div>

                <div className="config-item">
                  <label>🔊 Buzzer Piso 1 (Pin 5)</label>
                  <div className="toggle">
                    <input
                      type="checkbox"
                      checked={editando ? configTemp.buzzerPiso1Activo : configuracion.buzzerPiso1Activo}
                      onChange={(e) => setConfigTemp({ ...configTemp, buzzerPiso1Activo: e.target.checked })}
                      disabled={!editando}
                    />
                    <span>{(editando ? configTemp.buzzerPiso1Activo : configuracion.buzzerPiso1Activo) ? 'Activado' : 'Desactivado'}</span>
                  </div>
                  <small>Sensor A0 - Buzzer activo (digitalWrite)</small>
                </div>

                <div className="config-item">
                  <label>🔊 Buzzer Piso 2 (Pin 3)</label>
                  <div className="toggle">
                    <input
                      type="checkbox"
                      checked={editando ? configTemp.buzzerPiso2Activo : configuracion.buzzerPiso2Activo}
                      onChange={(e) => setConfigTemp({ ...configTemp, buzzerPiso2Activo: e.target.checked })}
                      disabled={!editando}
                    />
                    <span>{(editando ? configTemp.buzzerPiso2Activo : configuracion.buzzerPiso2Activo) ? 'Activado' : 'Desactivado'}</span>
                  </div>
                  <small>Sensor A3 - Buzzer pasivo (tone 2000Hz)</small>
                </div>

                <div className="config-item">
                  <label>💡 LED Piso 1 (Pin 1)</label>
                  <div className="toggle">
                    <input
                      type="checkbox"
                      checked={editando ? configTemp.ledPiso1Activo : configuracion.ledPiso1Activo}
                      onChange={(e) => setConfigTemp({ ...configTemp, ledPiso1Activo: e.target.checked })}
                      disabled={!editando}
                    />
                    <span>{(editando ? configTemp.ledPiso1Activo : configuracion.ledPiso1Activo) ? 'Activado' : 'Desactivado'}</span>
                  </div>
                  <small>Indicador visual para Sensor A0</small>
                </div>

                <div className="config-item">
                  <label>💡 LED Piso 2 (Pin 2)</label>
                  <div className="toggle">
                    <input
                      type="checkbox"
                      checked={editando ? configTemp.ledPiso2Activo : configuracion.ledPiso2Activo}
                      onChange={(e) => setConfigTemp({ ...configTemp, ledPiso2Activo: e.target.checked })}
                      disabled={!editando}
                    />
                    <span>{(editando ? configTemp.ledPiso2Activo : configuracion.ledPiso2Activo) ? 'Activado' : 'Desactivado'}</span>
                  </div>
                  <small>Indicador visual para Sensor A3</small>
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

        {/* VISTA ESTADÍSTICAS - SE MANTIENE IGUAL */}
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
                    <h3>Alertas Piso 1</h3>
                    <div className="stat-value">{estadisticas.alertasPiso1 || 0}</div>
                    <small>Sensor MQ-2 A0 (Pin 5 buzzer, Pin 1 LED)</small>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon porcentaje">
                    <BarChart3 size={32} />
                  </div>
                  <div className="stat-content">
                    <h3>Alertas Piso 2</h3>
                    <div className="stat-value">{estadisticas.alertasPiso2 || 0}</div>
                    <small>Sensor MQ-2 A3 (Pin 3 buzzer, Pin 2 LED)</small>
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

              {/* Mapa de calor */}
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
                        <th>Sensor 1 (A0)</th>
                        <th>Sensor 2 (A3)</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...lecturas].reverse().slice(0, 20).map((lectura, index) => (
                        <tr key={lectura.id} className={lectura.sensor1Alerta || lectura.sensor2Alerta ? 'alerta-row' : ''}>
                          <td>{lecturas.length - index}</td>
                          <td>{lectura.timestamp.toLocaleString()}</td>
                          <td className="valor">{lectura.valorSensor1 || lectura.valorGas || 0}</td>
                          <td className="valor">{lectura.valorSensor2 || 0}</td>
                          <td>
                            {lectura.sensor1Alerta || lectura.sensor2Alerta ? (
                              <span className="badge alerta">
                                🔴 {lectura.sensor1Alerta && 'P1'} {lectura.sensor2Alerta && 'P2'}
                              </span>
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
      
      {/* PANEL DE SIMULACIÓN */}
      {mostrarPanelSimulacion && (
        <SimulacionPanel
          onClose={() => setMostrarPanelSimulacion(false)}
          configuracion={configuracion}
          ultimaLectura={ultimaLectura}
        />
      )}
    </div>
  );
}

export default App;