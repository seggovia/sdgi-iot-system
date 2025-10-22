import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, set, update, push, get } from 'firebase/database';
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
  BarChart3,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import Edificio3D from './Edificio3D';
import SimulacionPanel from './SimulacionPanel';
import './App.css';

// 🔥 HOOK MEJORADO: Sistema de Conexión Inteligente con Reconexión Automática
function useArduinoConnectionPro(configuracion) {
  const [estadoConexion, setEstadoConexion] = useState({
    conectado: false,
    calidad: 'desconocida',
    latencia: 0,
    tiempoSinDatos: 0,
    ultimosDatos: [],
    intentosReconexion: 0,
    ultimaActualizacion: null,
    lecturaActual: null // ← lectura simulada o real
  });

  const [ultimaKey, setUltimaKey] = useState(null);

  // 🔥 Escuchar lecturas - FILTRANDO SIMULACIONES
  useEffect(() => {
    const lecturasRef = ref(db, 'lecturas');
    
    console.log('🔌 Conectando a Firebase para lecturas reales del Arduino...');
    
    const unsubscribe = onValue(lecturasRef, (snapshot) => {
      const data = snapshot.val() || {};
      const keys = Object.keys(data).sort((a, b) => b - a);

      let lecturaArduino = null;
      let keyArduino = null;

      // 🔹 MODO REAL - Filtrar lecturas de simulación
      if (!configuracion?.modoSimulacion) {
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const lectura = data[key];
          
          // ⚡ IGNORAR lecturas de simulación
          if (lectura.modoSimulacion === true || lectura.dispositivo === "simulacion_web") {
            console.log(`⏭️ Ignorando lectura ${key} (es simulación)`);
            continue;
          }
          
          // ✅ ACEPTAR solo lecturas del Arduino real
          if (lectura.dispositivo === "arduino_001" || !lectura.dispositivo) {
            lecturaArduino = lectura;
            keyArduino = key;
            console.log(`✅ Lectura REAL del Arduino encontrada:`, key, lectura);
            break;
          }
        }

        if (!lecturaArduino) {
          console.warn('⚠️ No hay lecturas del Arduino real disponibles');
          return;
        }
      } else {
        // Modo simulación (solo para panel de pruebas)
        lecturaArduino = {
          dispositivo: "simulacion_web",
          valorSensor1: Math.floor(Math.random() * 100),
          valorSensor2: Math.floor(Math.random() * 100),
          sensor1Alerta: Math.random() < 0.3,
          sensor2Alerta: Math.random() < 0.3,
          timestamp: Date.now()
        };
        keyArduino = "simulado_" + Date.now();
        console.log('🎮 Lectura SIMULADA:', lecturaArduino);
      }

      const ahora = Date.now();
      setUltimaKey(keyArduino);

      setEstadoConexion(prev => {
        const nuevosTimestamps = [ahora, ...prev.ultimosDatos.slice(0, 9)];
        const intervalos = nuevosTimestamps.slice(0, 5).map((t, i) => 
          i < nuevosTimestamps.length - 1 ? t - nuevosTimestamps[i + 1] : 0
        ).filter(i => i > 0);
        const promedioIntervalo = intervalos.length > 0 
          ? intervalos.reduce((a, b) => a + b, 0) / intervalos.length 
          : 1000;
        
        let calidad = 'excelente';
        if (promedioIntervalo > 2000) calidad = 'buena';
        if (promedioIntervalo > 5000) calidad = 'regular';
        if (promedioIntervalo > 10000) calidad = 'mala';

        return {
          conectado: !configuracion?.modoSimulacion,
          calidad,
          latencia: 0,
          tiempoSinDatos: 0,
          ultimosDatos: nuevosTimestamps,
          intentosReconexion: 0,
          ultimaActualizacion: ahora,
          lecturaActual: lecturaArduino // ← lectura real del Arduino
        };
      });
    }, (error) => {
      console.error('❌ Error Firebase:', error);
      setEstadoConexion(prev => ({ ...prev, conectado: false, calidad: 'mala' }));
    });

    return () => unsubscribe();
  }, [configuracion?.modoSimulacion]);

  // Watchdog
  useEffect(() => {
    const interval = setInterval(() => {
      setEstadoConexion(prev => {
        if (!prev.ultimaActualizacion) return prev;
        
        const ahora = Date.now();
        const tiempoSinDatos = Math.floor((ahora - prev.ultimaActualizacion) / 1000);
        const umbralDinamico = 15000;
        const deberiaEstarConectado = (ahora - prev.ultimaActualizacion) < umbralDinamico;

        if (deberiaEstarConectado !== prev.conectado) {
          if (!deberiaEstarConectado) {
            console.log(`⚠️ DESCONECTADO: ${tiempoSinDatos}s sin datos (umbral: 15s)`);
          } else {
            console.log('✅ RECONECTADO');
          }
        }

        return { ...prev, conectado: deberiaEstarConectado, tiempoSinDatos };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return estadoConexion;
}

function App() {
  // ==================== ESTADOS PRINCIPALES ====================
  const [notificacionActiva, setNotificacionActiva] = useState(null);
  const [mostrarPanelSimulacion, setMostrarPanelSimulacion] = useState(false);
  const [mostrarDebug, setMostrarDebug] = useState(false);
  
  // 🔥 CAMBIADO: modoSimulacion a FALSE para usar datos reales del Arduino
  const conexion = useArduinoConnectionPro({ modoSimulacion: false });
  
  // Estados para los sensores (se actualizarán con datos reales)
  const [sensor1, setSensor1] = useState(0);
  const [sensor2, setSensor2] = useState(0);
  const [alerta1, setAlerta1] = useState(false);
  const [alerta2, setAlerta2] = useState(false);

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

  // Estados UI
  const [vistaActual, setVistaActual] = useState('dashboard');
  const [notificaciones, setNotificaciones] = useState([]);
  const [editando, setEditando] = useState(false);
  const [editandoGlobal, setEditandoGlobal] = useState(false);
  const [configTemp, setConfigTemp] = useState(configuracion);
  const [configGlobalTemp, setConfigGlobalTemp] = useState(configGlobal);

  // Estadísticas
  const [estadisticas, setEstadisticas] = useState({
    totalAlertas: 0,
    tiempoPromedioRespuesta: 0,
    porcentajeAlertas: 0,
    alertasPiso1: 0,
    alertasPiso2: 0
  });

  // 🔥 NUEVO: Actualizar estados con datos reales del Arduino
  useEffect(() => {
    if (conexion.lecturaActual) {
      const lectura = conexion.lecturaActual;
      
      console.log('📊 Actualizando estados con lectura real:', {
        sensor1: lectura.valorSensor1,
        sensor2: lectura.valorSensor2,
        alerta1: lectura.sensor1Alerta,
        alerta2: lectura.sensor2Alerta
      });

      // Actualizar valores de sensores
      setSensor1(lectura.valorSensor1 || 0);
      setSensor2(lectura.valorSensor2 || 0);
      
      // Actualizar alertas
      setAlerta1(lectura.sensor1Alerta || false);
      setAlerta2(lectura.sensor2Alerta || false);
      
      // Actualizar última lectura
      setUltimaLectura(lectura);
    }
  }, [conexion.lecturaActual]);

  // Cargar configuración desde Firebase
  useEffect(() => {
    const configRef = ref(db, 'configuracion/sistema');
    const unsubscribe = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const config = snapshot.val();
        setConfiguracion(config);
        setConfigTemp(config);
        console.log('⚙️ Configuración cargada:', config);
      }
    });

    return () => unsubscribe();
  }, []);

  // Cargar configuración global
  useEffect(() => {
    const configGlobalRef = ref(db, 'configuracion/global');
    const unsubscribe = onValue(configGlobalRef, (snapshot) => {
      if (snapshot.exists()) {
        const config = snapshot.val();
        setConfigGlobal(config);
        setConfigGlobalTemp(config);
        console.log('🌍 Configuración global cargada:', config);
      }
    });

    return () => unsubscribe();
  }, []);

  // Cargar lecturas
  useEffect(() => {
    const lecturasRef = ref(db, 'lecturas');
    const unsubscribe = onValue(lecturasRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const lecturasArray = Object.entries(data)
          .filter(([key, val]) => {
            // 🔥 FILTRAR solo lecturas del Arduino real
            return val.dispositivo === "arduino_001" || 
                   (!val.dispositivo && !val.modoSimulacion);
          })
          .map(([key, val]) => ({
            id: key,
            ...val,
            timestamp: new Date(parseInt(key))
          }))
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 50);

        setLecturas(lecturasArray);
        
        if (lecturasArray.length > 0) {
          setUltimaLectura(lecturasArray[0]);
        }

        console.log(`📚 Cargadas ${lecturasArray.length} lecturas reales del Arduino`);
      }
    });

    return () => unsubscribe();
  }, []);

  // Cargar notificaciones
  useEffect(() => {
    const notifRef = ref(db, 'notificaciones');
    const unsubscribe = onValue(notifRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const notifArray = Object.entries(data)
          .map(([key, val]) => ({
            id: key,
            ...val,
            timestamp: new Date(val.timestamp)
          }))
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 20);

        setNotificaciones(notifArray);
      }
    });

    return () => unsubscribe();
  }, []);

  // Calcular estadísticas
  useEffect(() => {
    const alertas = lecturas.filter(l => l.sensor1Alerta || l.sensor2Alerta);
    const alertasPiso1 = lecturas.filter(l => l.sensor1Alerta).length;
    const alertasPiso2 = lecturas.filter(l => l.sensor2Alerta).length;

    setEstadisticas({
      totalAlertas: alertas.length,
      tiempoPromedioRespuesta: 0,
      porcentajeAlertas: lecturas.length > 0 ? (alertas.length / lecturas.length * 100).toFixed(1) : 0,
      alertasPiso1,
      alertasPiso2
    });
  }, [lecturas]);

  // Cargar información del dispositivo
  useEffect(() => {
    const dispositivoRef = ref(db, 'dispositivos/arduino_001');
    const unsubscribe = onValue(dispositivoRef, (snapshot) => {
      if (snapshot.exists()) {
        setDispositivo(snapshot.val());
      }
    });

    return () => unsubscribe();
  }, []);

  // Funciones de configuración
  const guardarConfiguracion = async () => {
    try {
      const configRef = ref(db, 'configuracion/sistema');
      await update(configRef, configTemp);
      setConfiguracion(configTemp);
      setEditando(false);
      mostrarNotificacion('✅ Configuración guardada correctamente');
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      mostrarNotificacion('❌ Error al guardar configuración', 'error');
    }
  };

  const guardarConfiguracionGlobal = async () => {
    try {
      const configRef = ref(db, 'configuracion/global');
      await set(configRef, configGlobalTemp);
      setConfigGlobal(configGlobalTemp);
      setEditandoGlobal(false);
      mostrarNotificacion('✅ Configuración global guardada');
    } catch (error) {
      console.error('Error al guardar configuración global:', error);
      mostrarNotificacion('❌ Error al guardar', 'error');
    }
  };

  const cancelarEdicion = () => {
    setConfigTemp(configuracion);
    setEditando(false);
  };

  const cancelarEdicionGlobal = () => {
    setConfigGlobalTemp(configGlobal);
    setEditandoGlobal(false);
  };

  const controlarServo = async (abrir) => {
    try {
      const configRef = ref(db, 'configuracion/sistema');
      await update(configRef, { servoAbierto: abrir });
      mostrarNotificacion(`🚪 Puerta ${abrir ? 'abierta' : 'cerrada'}`);
    } catch (error) {
      console.error('Error al controlar servo:', error);
      mostrarNotificacion('❌ Error al controlar puerta', 'error');
    }
  };

  const marcarNotificacionLeida = async (notifId) => {
    try {
      const notifRef = ref(db, `notificaciones/${notifId}`);
      await update(notifRef, { leido: true });
    } catch (error) {
      console.error('Error al marcar notificación:', error);
    }
  };

  // Preparar datos para el gráfico
  const datosGrafico = lecturas.slice(0, 20).reverse().map(l => ({
    tiempo: l.timestamp.toLocaleTimeString(),
    sensor1: l.valorSensor1 || l.valorGas || 0,
    sensor2: l.valorSensor2 || 0
  }));

  return (
    <div className="App">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <Flame className="logo-icon" size={40} />
            <div>
              <h1>SDGI - Sistema Detector de Gas Inteligente</h1>
              <p className="subtitle">Monitoreo en Tiempo Real con Arduino</p>
            </div>
          </div>
          <div className="header-right">
            {/* 🔥 Indicador de conexión real */}
            <div className={`status-indicator ${conexion.conectado ? 'connected' : 'disconnected'}`}>
              {conexion.conectado ? <Wifi size={20} /> : <WifiOff size={20} />}
              <span>{conexion.conectado ? 'Arduino Conectado' : 'Arduino Desconectado'}</span>
            </div>
            <button
              className="icon-button"
              onClick={() => setMostrarPanelSimulacion(true)}
              title="Panel de Simulación"
            >
              <PlayCircle size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Navegación */}
      <nav className="nav-tabs">
        <button
          className={vistaActual === 'dashboard' ? 'active' : ''}
          onClick={() => setVistaActual('dashboard')}
        >
          <Activity size={20} />
          <span>Dashboard</span>
        </button>
        <button
          className={vistaActual === 'notif' ? 'active' : ''}
          onClick={() => setVistaActual('notif')}
        >
          <Bell size={20} />
          <span>Notificaciones</span>
          {notificaciones.filter(n => !n.leido).length > 0 && (
            <span className="badge">{notificaciones.filter(n => !n.leido).length}</span>
          )}
        </button>
        <button
          className={vistaActual === 'config' ? 'active' : ''}
          onClick={() => setVistaActual('config')}
        >
          <Settings size={20} />
          <span>Configuración</span>
        </button>
        <button
          className={vistaActual === 'stats' ? 'active' : ''}
          onClick={() => setVistaActual('stats')}
        >
          <BarChart3 size={20} />
          <span>Estadísticas</span>
        </button>
      </nav>

      <div className="container">
        {/* VISTA DASHBOARD */}
        {vistaActual === 'dashboard' && (
          <>
            {/* Información de conexión */}
            <div className="connection-info">
              <div className="info-card">
                <span className="info-label">Estado Arduino:</span>
                <span className={`info-value ${conexion.conectado ? 'success' : 'danger'}`}>
                  {conexion.conectado ? '🟢 Conectado' : '🔴 Desconectado'}
                </span>
              </div>
              <div className="info-card">
                <span className="info-label">Calidad Conexión:</span>
                <span className="info-value">{conexion.calidad}</span>
              </div>
              <div className="info-card">
                <span className="info-label">Última Actualización:</span>
                <span className="info-value">
                  {conexion.ultimaActualizacion 
                    ? new Date(conexion.ultimaActualizacion).toLocaleTimeString()
                    : 'Nunca'}
                </span>
              </div>
              <div className="info-card">
                <span className="info-label">Tiempo sin datos:</span>
                <span className="info-value">{conexion.tiempoSinDatos}s</span>
              </div>
            </div>

            {/* Edificio 3D - AHORA CON DATOS REALES */}
            <div className="dashboard-section">
              <h2 className="section-title">
                <Flame size={24} />
                <span>Visualización 3D del Edificio (Datos Reales)</span>
              </h2>
              <Edificio3D
                piso1Alerta={alerta1}
                piso2Alerta={alerta2}
                puertaAbierta={configuracion.servoAbierto}
                buzzerPiso1={alerta1 && configuracion.buzzerPiso1Activo}
                buzzerPiso2={alerta2 && configuracion.buzzerPiso2Activo}
                ledPiso1={alerta1 && configuracion.ledPiso1Activo}
                ledPiso2={alerta2 && configuracion.ledPiso2Activo}
              />
            </div>

            {/* Sensores en tiempo real */}
            <div className="sensors-grid">
              <div className={`sensor-card ${alerta1 ? 'alert' : ''}`}>
                <div className="sensor-header">
                  <Flame size={24} />
                  <h3>Sensor Piso 1 (A0)</h3>
                </div>
                <div className="sensor-value">{sensor1}</div>
                <div className="sensor-info">
                  <span>Umbral: {configuracion.umbralGas}</span>
                  <span className={`status ${alerta1 ? 'danger' : 'success'}`}>
                    {alerta1 ? '🔴 Alerta' : '🟢 Normal'}
                  </span>
                </div>
                <div className="sensor-controls">
                  <label>
                    <input
                      type="checkbox"
                      checked={configuracion.buzzerPiso1Activo}
                      onChange={() => {}}
                      disabled
                    />
                    Buzzer (Pin 5)
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={configuracion.ledPiso1Activo}
                      onChange={() => {}}
                      disabled
                    />
                    LED (Pin 1)
                  </label>
                </div>
              </div>

              <div className={`sensor-card ${alerta2 ? 'alert' : ''}`}>
                <div className="sensor-header">
                  <Flame size={24} />
                  <h3>Sensor Piso 2 (A3)</h3>
                </div>
                <div className="sensor-value">{sensor2}</div>
                <div className="sensor-info">
                  <span>Umbral: {configuracion.umbralGas}</span>
                  <span className={`status ${alerta2 ? 'danger' : 'success'}`}>
                    {alerta2 ? '🔴 Alerta' : '🟢 Normal'}
                  </span>
                </div>
                <div className="sensor-controls">
                  <label>
                    <input
                      type="checkbox"
                      checked={configuracion.buzzerPiso2Activo}
                      onChange={() => {}}
                      disabled
                    />
                    Buzzer (Pin 3)
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={configuracion.ledPiso2Activo}
                      onChange={() => {}}
                      disabled
                    />
                    LED (Pin 2)
                  </label>
                </div>
              </div>
            </div>

            {/* Control de puerta */}
            <div className="door-control">
              <h3>
                <DoorOpen size={24} />
                Control de Puerta (Servo)
              </h3>
              <div className="door-buttons">
                <button
                  className={`door-btn ${configuracion.servoAbierto ? 'active' : ''}`}
                  onClick={() => controlarServo(true)}
                  disabled={configuracion.servoAbierto}
                >
                  <DoorOpen size={20} />
                  Abrir Puerta
                </button>
                <button
                  className={`door-btn ${!configuracion.servoAbierto ? 'active' : ''}`}
                  onClick={() => controlarServo(false)}
                  disabled={!configuracion.servoAbierto}
                >
                  <DoorClosed size={20} />
                  Cerrar Puerta
                </button>
              </div>
              <p className="door-status">
                Estado actual: <strong>{configuracion.servoAbierto ? '🚪 Abierta' : '🚪 Cerrada'}</strong>
              </p>
            </div>

            {/* Gráfico */}
            <div className="chart-container">
              <h2 className="section-title">
                <Activity size={24} />
                <span>Lecturas en Tiempo Real (Datos Reales del Arduino)</span>
              </h2>
              {datosGrafico.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={datosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="tiempo" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a2e',
                        border: '1px solid #4facfe',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sensor1"
                      stroke="#4facfe"
                      strokeWidth={2}
                      dot={{ fill: '#4facfe', r: 4 }}
                      name="Sensor Piso 1"
                    />
                    <Line
                      type="monotone"
                      dataKey="sensor2"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={{ fill: '#a78bfa', r: 4 }}
                      name="Sensor Piso 2"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="sin-datos">Esperando lecturas del Arduino...</p>
              )}
            </div>
          </>
        )}

        {/* VISTA NOTIFICACIONES */}
        {vistaActual === 'notif' && (
          <div className="notificaciones-container">
            <h2 className="section-title">
              <Bell size={24} />
              <span>Centro de Notificaciones</span>
            </h2>
            {notificaciones.length > 0 ? (
              <div className="notificaciones-lista">
                {notificaciones.map(notif => (
                  <div
                    key={notif.id}
                    className={`notificacion-item ${notif.tipo} ${notif.leido ? 'leida' : ''}`}
                    onClick={() => marcarNotificacionLeida(notif.id)}
                  >
                    <div className="notif-icon">
                      {notif.tipo === 'alerta' ? <AlertTriangle size={24} /> : <Bell size={24} />}
                    </div>
                    <div className="notif-content">
                      <p className="notif-mensaje">{notif.mensaje}</p>
                      <small className="notif-tiempo">
                        {notif.timestamp.toLocaleString()}
                      </small>
                    </div>
                    {!notif.leido && <span className="notif-badge">Nueva</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="sin-datos">No hay notificaciones</p>
            )}
          </div>
        )}

        {/* VISTA CONFIGURACIÓN */}
        {vistaActual === 'config' && (
          <>
            <div className="config-section">
              <div className="config-header">
                <h2 className="section-title">
                  <Settings size={24} />
                  <span>Configuración del Sistema</span>
                </h2>
                <div className="config-buttons">
                  {!editando ? (
                    <button className="btn-primary" onClick={() => setEditando(true)}>
                      Editar Configuración
                    </button>
                  ) : (
                    <>
                      <button className="btn-success" onClick={guardarConfiguracion}>
                        Guardar Cambios
                      </button>
                      <button className="btn-danger" onClick={cancelarEdicion}>
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="config-grid">
                <div className="config-item">
                  <label>🔥 Umbral de Gas</label>
                  <input
                    type="number"
                    value={editando ? configTemp.umbralGas : configuracion.umbralGas}
                    onChange={(e) => setConfigTemp({ ...configTemp, umbralGas: parseInt(e.target.value) })}
                    disabled={!editando}
                    min="10"
                    max="200"
                  />
                  <small>Valor mínimo para activar alerta (10-200)</small>
                </div>

                <div className="config-item">
                  <label>⏱️ Intervalo de Lectura (ms)</label>
                  <input
                    type="number"
                    value={editando ? configTemp.intervaloLectura : configuracion.intervaloLectura}
                    onChange={(e) => setConfigTemp({ ...configTemp, intervaloLectura: parseInt(e.target.value) })}
                    disabled={!editando}
                    min="50"
                    max="1000"
                  />
                  <small>Tiempo entre lecturas del sensor</small>
                </div>

                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={editando ? configTemp.buzzerPiso1Activo : configuracion.buzzerPiso1Activo}
                      onChange={(e) => setConfigTemp({ ...configTemp, buzzerPiso1Activo: e.target.checked })}
                      disabled={!editando}
                    />
                    Buzzer Piso 1 Activo
                  </label>
                  <small>Pin 5 - Alerta sonora primer piso</small>
                </div>

                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={editando ? configTemp.buzzerPiso2Activo : configuracion.buzzerPiso2Activo}
                      onChange={(e) => setConfigTemp({ ...configTemp, buzzerPiso2Activo: e.target.checked })}
                      disabled={!editando}
                    />
                    Buzzer Piso 2 Activo
                  </label>
                  <small>Pin 3 - Alerta sonora segundo piso</small>
                </div>

                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={editando ? configTemp.ledPiso1Activo : configuracion.ledPiso1Activo}
                      onChange={(e) => setConfigTemp({ ...configTemp, ledPiso1Activo: e.target.checked })}
                      disabled={!editando}
                    />
                    LED Piso 1 Activo
                  </label>
                  <small>Pin 1 - Indicador visual primer piso</small>
                </div>

                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={editando ? configTemp.ledPiso2Activo : configuracion.ledPiso2Activo}
                      onChange={(e) => setConfigTemp({ ...configTemp, ledPiso2Activo: e.target.checked })}
                      disabled={!editando}
                    />
                    LED Piso 2 Activo
                  </label>
                  <small>Pin 2 - Indicador visual segundo piso</small>
                </div>
              </div>
            </div>

            <div className="config-section">
              <div className="config-header">
                <h2 className="section-title">
                  <Clock size={24} />
                  <span>Configuración Global</span>
                </h2>
                <div className="config-buttons">
                  {!editandoGlobal ? (
                    <button className="btn-primary" onClick={() => setEditandoGlobal(true)}>
                      Editar
                    </button>
                  ) : (
                    <>
                      <button className="btn-success" onClick={guardarConfiguracionGlobal}>
                        Guardar
                      </button>
                      <button className="btn-danger" onClick={cancelarEdicionGlobal}>
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="config-grid">
                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={editandoGlobal ? configGlobalTemp.modoProgramado : configGlobal.modoProgramado}
                      onChange={(e) => setConfigGlobalTemp({ ...configGlobalTemp, modoProgramado: e.target.checked })}
                      disabled={!editandoGlobal}
                    />
                    <span>{(editandoGlobal ? configGlobalTemp.modoProgramado : configGlobal.modoProgramado) ? 'Activado' : 'Desactivado'}</span>
                  </label>
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

      {notificacionActiva && (
        <div className={`alert-${notificacionActiva.tipo}`}>
          {notificacionActiva.mensaje}
        </div>
      )}

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