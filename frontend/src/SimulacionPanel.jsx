import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, set, update, push, get } from 'firebase/database';
import { Play, Zap, AlertTriangle, Volume2, Lightbulb, DoorOpen, RotateCcw, TrendingUp, XCircle } from 'lucide-react';
import './SimulacionPanel.css';

function SimulacionPanel({ onClose, configuracion, ultimaLectura }) {
  // Estados para control manual de sensores
  const [valorSensor1, setValorSensor1] = useState(0);
  const [valorSensor2, setValorSensor2] = useState(0);
  const [autoIncremento, setAutoIncremento] = useState(false);

  // Estados de alertas manuales
  const [forzarAlertaPiso1, setForzarAlertaPiso1] = useState(false);
  const [forzarAlertaPiso2, setForzarAlertaPiso2] = useState(false);

  // Estado de escenario activo
  const [escenarioActivo, setEscenarioActivo] = useState(null);

  // Inicializar con valores actuales
  useEffect(() => {
    if (ultimaLectura) {
      setValorSensor1(ultimaLectura.valorSensor1 || 0);
      setValorSensor2(ultimaLectura.valorSensor2 || 0);
    }
  }, [ultimaLectura]);

  // Auto-incremento de valores
  useEffect(() => {
    if (!autoIncremento) return;

    const interval = setInterval(() => {
      setValorSensor1(prev => Math.min(prev + 5, 200));
      setValorSensor2(prev => Math.min(prev + 5, 200));
    }, 1000);

    return () => clearInterval(interval);
  }, [autoIncremento]);

  // ============================================
  // FUNCIONES DE SIMULACIÓN
  // ============================================

  // Enviar valores simulados a Firebase
  const enviarValoresSimulados = async () => {
    try {
      const alerta1 = valorSensor1 > configuracion.umbralGas;
      const alerta2 = valorSensor2 > configuracion.umbralGas;

      const timestamp = Date.now();

      // Enviar a /lecturas/{timestamp}
      await set(ref(db, `lecturas/${timestamp}`), {
        valorSensor1: valorSensor1,
        valorSensor2: valorSensor2,
        sensor1Alerta: forzarAlertaPiso1 || alerta1,
        sensor2Alerta: forzarAlertaPiso2 || alerta2,
        dispositivo: 'simulacion_web',
        timestamp: timestamp
      });

      // Notificación si hay alerta
      if (forzarAlertaPiso1 || alerta1 || forzarAlertaPiso2 || alerta2) {
        let mensaje = 'Simulación: Gas detectado en ';
        if (forzarAlertaPiso1 || alerta1) mensaje += 'Piso 1 ';
        if (forzarAlertaPiso2 || alerta2) mensaje += 'Piso 2';

        const notifTimestamp = Date.now();
        await set(ref(db, `notificaciones/${notifTimestamp}`), {
          tipo: 'alerta',
          mensaje: mensaje,
          timestamp: notifTimestamp,
          leido: false,
          simulacion: true
        });
      }

      console.log('✅ Valores simulados enviados');
    } catch (error) {
      console.error('❌ Error al enviar simulación:', error);
    }
  };

  // Resetear valores
  const resetearValores = () => {
    setValorSensor1(0);
    setValorSensor2(0);
    setForzarAlertaPiso1(false);
    setForzarAlertaPiso2(false);
    setAutoIncremento(false);
    setEscenarioActivo(null);
  };

  // Activar alerta específica de piso
  const activarAlertaPiso = async (piso) => {
    if (piso === 1) {
      setForzarAlertaPiso1(true);
      setValorSensor1(configuracion.umbralGas + 20);
      setTimeout(() => setForzarAlertaPiso1(false), 3000);
    } else {
      setForzarAlertaPiso2(true);
      setValorSensor2(configuracion.umbralGas + 20);
      setTimeout(() => setForzarAlertaPiso2(false), 3000);
    }
    await enviarValoresSimulados();
  };

  // ============================================
  // ESCENARIOS PREDEFINIDOS
  // ============================================

  const escenarios = {
    fugaLeve: {
      nombre: 'Fuga Leve',
      icono: '💨',
      descripcion: 'Incremento gradual en ambos pisos',
      ejecutar: async () => {
        setEscenarioActivo('fugaLeve');
        setAutoIncremento(true);
        setValorSensor1(30);
        setValorSensor2(25);
        await enviarValoresSimulados();
      }
    },
    fugaSevera: {
      nombre: 'Fuga Severa',
      icono: '⚠️',
      descripcion: 'Alerta inmediata en Piso 1',
      ejecutar: async () => {
        setEscenarioActivo('fugaSevera');
        setValorSensor1(configuracion.umbralGas + 50);
        setValorSensor2(40);
        setForzarAlertaPiso1(true);
        await enviarValoresSimulados();
        setTimeout(() => setForzarAlertaPiso1(false), 5000);
      }
    },
    emergenciaTotal: {
      nombre: 'Emergencia Total',
      icono: '🚨',
      descripcion: 'Ambos pisos en alerta crítica',
      ejecutar: async () => {
        setEscenarioActivo('emergenciaTotal');
        setValorSensor1(configuracion.umbralGas + 80);
        setValorSensor2(configuracion.umbralGas + 75);
        setForzarAlertaPiso1(true);
        setForzarAlertaPiso2(true);
        await enviarValoresSimulados();

        // Enviar notificación de emergencia
        await addDoc(collection(db, 'notificaciones'), {
          tipo: 'alerta',
          mensaje: '🚨 EMERGENCIA TOTAL - Evacuación inmediata del edificio',
          timestamp: new Date(),
          leido: false,
          simulacion: true
        });

        setTimeout(() => {
          setForzarAlertaPiso1(false);
          setForzarAlertaPiso2(false);
        }, 8000);
      }
    },
    pruebaActuadores: {
      nombre: 'Prueba de Actuadores',
      icono: '🔧',
      descripcion: 'Activa buzzers, LEDs y puerta',
      ejecutar: async () => {
        setEscenarioActivo('pruebaActuadores');
        
        // Activar todo en Realtime Database
        await update(ref(db, 'configuracion/sistema'), {
          buzzerPiso1Activo: true,
          buzzerPiso2Activo: true,
          ledPiso1Activo: true,
          ledPiso2Activo: true
        });

        setTimeout(async () => {
          await update(ref(db, 'configuracion/sistema'), {
            servoAbierto: true
          });
        }, 2000);

        setValorSensor1(configuracion.umbralGas + 10);
        setValorSensor2(configuracion.umbralGas + 10);
        await enviarValoresSimulados();
      }
    }
  };


  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="simulacion-overlay">
      <div className="simulacion-panel">
        {/* Header */}
        <div className="sim-header">
          <div className="sim-header-left">
            <Play className="sim-icon-main" size={32} />
            <div>
              <h2>Panel de Simulación</h2>
              <p>Control manual del sistema de detección</p>
            </div>
          </div>
          <button className="sim-close-btn" onClick={onClose}>
            <XCircle size={24} />
          </button>
        </div>

        <div className="sim-content">
          {/* Control Manual de Sensores */}
          <div className="sim-section">
            <div className="sim-section-header">
              <TrendingUp size={24} />
              <h3>Control Manual de Sensores</h3>
            </div>

            {/* Sensor Piso 1 */}
            <div className="sim-sensor-control">
              <div className="sim-sensor-header">
                <span className="sim-sensor-label">📡 Sensor Piso 1 (A0)</span>
                <span className="sim-sensor-value">{valorSensor1}</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={valorSensor1}
                onChange={(e) => setValorSensor1(parseInt(e.target.value))}
                className="sim-slider"
              />
              <div className="sim-sensor-indicators">
                <span>0</span>
                <span className="umbral-indicator">Umbral: {configuracion.umbralGas}</span>
                <span>200</span>
              </div>
            </div>

            {/* Sensor Piso 2 */}
            <div className="sim-sensor-control">
              <div className="sim-sensor-header">
                <span className="sim-sensor-label">📡 Sensor Piso 2 (A3)</span>
                <span className="sim-sensor-value">{valorSensor2}</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={valorSensor2}
                onChange={(e) => setValorSensor2(parseInt(e.target.value))}
                className="sim-slider"
              />
              <div className="sim-sensor-indicators">
                <span>0</span>
                <span className="umbral-indicator">Umbral: {configuracion.umbralGas}</span>
                <span>200</span>
              </div>
            </div>

            {/* Botones de control */}
            <div className="sim-controls-grid">
              <button
                className={`sim-btn sim-btn-primary ${autoIncremento ? 'active' : ''}`}
                onClick={() => setAutoIncremento(!autoIncremento)}
              >
                <Zap size={20} />
                {autoIncremento ? 'Detener Auto-Incremento' : 'Auto-Incremento'}
              </button>

              <button
                className="sim-btn sim-btn-success"
                onClick={enviarValoresSimulados}
              >
                <Play size={20} />
                Enviar Valores
              </button>

              <button
                className="sim-btn sim-btn-danger"
                onClick={resetearValores}
              >
                <RotateCcw size={20} />
                Resetear
              </button>
            </div>
          </div>

          {/* Alertas Rápidas por Piso */}
          <div className="sim-section">
            <div className="sim-section-header">
              <AlertTriangle size={24} />
              <h3>Alertas Rápidas por Piso</h3>
            </div>

            <div className="sim-alert-grid">
              <button
                className="sim-alert-btn piso1"
                onClick={() => activarAlertaPiso(1)}
              >
                <Volume2 size={24} />
                <span>Activar Alerta Piso 1</span>
                <small>Sensor A0 + Buzzer Pin 5 + LED Pin 1</small>
              </button>

              <button
                className="sim-alert-btn piso2"
                onClick={() => activarAlertaPiso(2)}
              >
                <Lightbulb size={24} />
                <span>Activar Alerta Piso 2</span>
                <small>Sensor A3 + Buzzer Pin 3 + LED Pin 2</small>
              </button>
            </div>
          </div>

          {/* Escenarios Predefinidos */}
          <div className="sim-section">
            <div className="sim-section-header">
              <Play size={24} />
              <h3>Escenarios Predefinidos</h3>
            </div>

            <div className="sim-scenarios-grid">
              {Object.entries(escenarios).map(([key, escenario]) => (
                <button
                  key={key}
                  className={`sim-scenario-card ${escenarioActivo === key ? 'active' : ''}`}
                  onClick={escenario.ejecutar}
                >
                  <div className="scenario-icon">{escenario.icono}</div>
                  <h4>{escenario.nombre}</h4>
                  <p>{escenario.descripcion}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Estado Actual */}
          <div className="sim-section">
            <div className="sim-section-header">
              <DoorOpen size={24} />
              <h3>Estado Actual del Sistema</h3>
            </div>

            <div className="sim-status-grid">
              <div className="sim-status-item">
                <span className="status-label">Buzzer Piso 1</span>
                <span className={`status-badge ${configuracion.buzzerPiso1Activo ? 'active' : 'inactive'}`}>
                  {configuracion.buzzerPiso1Activo ? '✓ Activo' : '✕ Inactivo'}
                </span>
              </div>

              <div className="sim-status-item">
                <span className="status-label">Buzzer Piso 2</span>
                <span className={`status-badge ${configuracion.buzzerPiso2Activo ? 'active' : 'inactive'}`}>
                  {configuracion.buzzerPiso2Activo ? '✓ Activo' : '✕ Inactivo'}
                </span>
              </div>

              <div className="sim-status-item">
                <span className="status-label">LED Piso 1</span>
                <span className={`status-badge ${configuracion.ledPiso1Activo ? 'active' : 'inactive'}`}>
                  {configuracion.ledPiso1Activo ? '✓ Activo' : '✕ Inactivo'}
                </span>
              </div>

              <div className="sim-status-item">
                <span className="status-label">LED Piso 2</span>
                <span className={`status-badge ${configuracion.ledPiso2Activo ? 'active' : 'inactive'}`}>
                  {configuracion.ledPiso2Activo ? '✓ Activo' : '✕ Inactivo'}
                </span>
              </div>

              <div className="sim-status-item">
                <span className="status-label">Puerta (Servo)</span>
                <span className={`status-badge ${configuracion.servoAbierto ? 'active' : 'inactive'}`}>
                  {configuracion.servoAbierto ? '🚪 Abierta' : '🚪 Cerrada'}
                </span>
              </div>

              <div className="sim-status-item">
                <span className="status-label">Auto-Incremento</span>
                <span className={`status-badge ${autoIncremento ? 'active' : 'inactive'}`}>
                  {autoIncremento ? '⚡ Activo' : '⏸️ Pausado'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimulacionPanel;