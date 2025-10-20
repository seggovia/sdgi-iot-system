import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, push, set, update } from 'firebase/database';
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

  // 🔥 CORREGIDO: Auto-incremento CON auto-envío
  useEffect(() => {
    if (!autoIncremento) return;

    const interval = setInterval(() => {
      setValorSensor1(prev => {
        const nuevoValor = Math.min(prev + 5, 200);
        return nuevoValor;
      });
      setValorSensor2(prev => {
        const nuevoValor = Math.min(prev + 5, 200);
        return nuevoValor;
      });

      // 🔥 NUEVO: Enviar automáticamente cuando está en auto-incremento
      enviarValoresSimuladosDirecto();
    }, 2000); // Cada 2 segundos

    return () => clearInterval(interval);
  }, [autoIncremento, valorSensor1, valorSensor2, configuracion, forzarAlertaPiso1, forzarAlertaPiso2]);

  // ============================================
  // FUNCIONES DE SIMULACIÓN
  // ============================================

  // 🔥 NUEVO: Función auxiliar para enviar sin dependencias
  const enviarValoresSimuladosDirecto = async () => {
    try {
      const timestamp = Date.now();
      const lecturaRef = ref(db, `lecturas/${timestamp}`);

      const alerta1 = valorSensor1 > configuracion.umbralGas;
      const alerta2 = valorSensor2 > configuracion.umbralGas;

      const datos = {
        valorSensor1: valorSensor1,
        valorSensor2: valorSensor2,
        sensor1Alerta: forzarAlertaPiso1 || alerta1,
        sensor2Alerta: forzarAlertaPiso2 || alerta2,
        dispositivo: 'simulacion_web',
        timestamp: timestamp,
        modoSimulacion: true
      };

      await set(lecturaRef, datos);

      console.log(`📤 Enviado ->`, {
        P1: valorSensor1,
        P2: valorSensor2,
        alerta1,
        alerta2,
        umbral: configuracion.umbralGas
      });

      // 🔥 NUEVO: Enviar notificación si hay alerta
      if (alerta1 || alerta2) {
        const notifRef = push(ref(db, 'notificaciones'));
        await set(notifRef, {
          tipo: 'alerta',
          mensaje: `Simulación: Gas detectado en ${alerta1 ? 'Piso 1' : ''} ${alerta2 ? 'Piso 2' : ''}`,
          timestamp: timestamp,
          leido: false,
          simulacion: true
        });
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };


  // Enviar valores simulados a Firebase Realtime Database
  const enviarValoresSimulados = async () => {
    try {
      const alerta1 = valorSensor1 > configuracion.umbralGas;
      const alerta2 = valorSensor2 > configuracion.umbralGas;

      // Crear referencia con timestamp como ID
      const timestamp = Date.now();
      const lecturaRef = ref(db, `lecturas/${timestamp}`);

      await set(lecturaRef, {
        valorSensor1: valorSensor1,
        valorSensor2: valorSensor2,
        sensor1Alerta: forzarAlertaPiso1 || alerta1,
        sensor2Alerta: forzarAlertaPiso2 || alerta2,
        dispositivo: 'simulacion_web',
        timestamp: timestamp,
        modoSimulacion: true
      });

      // Notificación si hay alerta
      if (forzarAlertaPiso1 || alerta1 || forzarAlertaPiso2 || alerta2) {
        let mensaje = 'Simulación: Gas detectado en ';
        if (forzarAlertaPiso1 || alerta1) mensaje += 'Piso 1 ';
        if (forzarAlertaPiso2 || alerta2) mensaje += 'Piso 2';

        const notifRef = push(ref(db, 'notificaciones'));
        await set(notifRef, {
          tipo: 'alerta',
          mensaje: mensaje,
          timestamp: timestamp,
          leido: false,
          simulacion: true
        });
      }

      console.log('✅ Valores simulados enviados manualmente');
      console.log(`📊 Sensor 1: ${valorSensor1} | Sensor 2: ${valorSensor2}`);
      console.log(`🚨 Alerta P1: ${alerta1} | Alerta P2: ${alerta2}`);
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
    console.log('🔄 Valores reseteados');
  };

  // Activar alerta específica de piso
  const activarAlertaPiso = async (piso) => {
    if (piso === 1) {
      const nuevoValor = configuracion.umbralGas + 20;
      setValorSensor1(nuevoValor);
      setForzarAlertaPiso1(true);
      console.log(`🔴 Activando alerta Piso 1 con valor: ${nuevoValor}`);

      setTimeout(() => {
        setForzarAlertaPiso1(false);
      }, 3000);
    } else {
      const nuevoValor = configuracion.umbralGas + 20;
      setValorSensor2(nuevoValor);
      setForzarAlertaPiso2(true);
      console.log(`🔴 Activando alerta Piso 2 con valor: ${nuevoValor}`);

      setTimeout(() => {
        setForzarAlertaPiso2(false);
      }, 3000);
    }

    // Esperar un poco para que se actualicen los estados
    setTimeout(() => {
      enviarValoresSimulados();
    }, 100);
  };

  // ============================================
  // ESCENARIOS PREDEFINIDOS
  // ============================================

  // Reemplazar TODOS los escenarios con esta versión corregida:

  const escenarios = {
    fugaLeve: {
      nombre: 'Fuga Leve',
      icono: '💨',
      descripcion: 'Incremento gradual en ambos pisos',
      ejecutar: async () => {
        console.log('💨 Ejecutando escenario: Fuga Leve');
        setEscenarioActivo('fugaLeve');

        // 🔥 IMPORTANTE: Actualizar estados y enviar inmediatamente
        const nuevoValor1 = 30;
        const nuevoValor2 = 25;
        setValorSensor1(nuevoValor1);
        setValorSensor2(nuevoValor2);

        // Enviar manualmente con los nuevos valores
        await enviarDatosDirecto(nuevoValor1, nuevoValor2, false, false);

        // Activar auto-incremento DESPUÉS del envío inicial
        setAutoIncremento(true);
      }
    },
    fugaSevera: {
      nombre: 'Fuga Severa',
      icono: '⚠️',
      descripcion: 'Alerta inmediata en Piso 1',
      ejecutar: async () => {
        console.log('⚠️ Ejecutando escenario: Fuga Severa');
        setEscenarioActivo('fugaSevera');

        const nuevoValor1 = configuracion.umbralGas + 50;
        const nuevoValor2 = 40;
        setValorSensor1(nuevoValor1);
        setValorSensor2(nuevoValor2);
        setForzarAlertaPiso1(true);

        // Enviar con alerta forzada
        await enviarDatosDirecto(nuevoValor1, nuevoValor2, true, false);

        setTimeout(() => {
          setForzarAlertaPiso1(false);
        }, 5000);
      }
    },
    emergenciaTotal: {
      nombre: 'Emergencia Total',
      icono: '🚨',
      descripcion: 'Ambos pisos en alerta crítica',
      ejecutar: async () => {
        console.log('🚨 Ejecutando escenario: Emergencia Total');
        setEscenarioActivo('emergenciaTotal');

        const nuevoValor1 = configuracion.umbralGas + 80;
        const nuevoValor2 = configuracion.umbralGas + 75;
        setValorSensor1(nuevoValor1);
        setValorSensor2(nuevoValor2);
        setForzarAlertaPiso1(true);
        setForzarAlertaPiso2(true);

        // Enviar con ambas alertas forzadas
        await enviarDatosDirecto(nuevoValor1, nuevoValor2, true, true);

        // Notificación de emergencia
        const notifRef = push(ref(db, 'notificaciones'));
        await set(notifRef, {
          tipo: 'alerta',
          mensaje: '🚨 EMERGENCIA TOTAL - Evacuación inmediata del edificio',
          timestamp: Date.now(),
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
        console.log('🔧 Ejecutando escenario: Prueba de Actuadores');
        setEscenarioActivo('pruebaActuadores');

        // Activar todo gradualmente
        const configRef = ref(db, 'configuracion/sistema');
        await update(configRef, {
          buzzerPiso1Activo: true,
          buzzerPiso2Activo: true,
          ledPiso1Activo: true,
          ledPiso2Activo: true
        });

        // Valores moderados para activar alertas
        const nuevoValor1 = configuracion.umbralGas + 10;
        const nuevoValor2 = configuracion.umbralGas + 10;
        setValorSensor1(nuevoValor1);
        setValorSensor2(nuevoValor2);

        await enviarDatosDirecto(nuevoValor1, nuevoValor2, false, false);

        // Abrir puerta después de 2 segundos
        setTimeout(async () => {
          await update(configRef, {
            servoAbierto: true
          });
        }, 2000);
      }
    }
  };
  // 🔥 NUEVA FUNCIÓN: Enviar datos directamente sin depender de estados
  const enviarDatosDirecto = async (valor1, valor2, forzarP1, forzarP2) => {
    try {
      const timestamp = Date.now();
      const lecturaRef = ref(db, `lecturas/${timestamp}`);

      const alerta1 = valor1 > configuracion.umbralGas || forzarP1;
      const alerta2 = valor2 > configuracion.umbralGas || forzarP2;

      const datos = {
        valorSensor1: valor1,
        valorSensor2: valor2,
        sensor1Alerta: alerta1,
        sensor2Alerta: alerta2,
        dispositivo: 'simulacion_web',
        timestamp: timestamp,
        modoSimulacion: true
      };

      await set(lecturaRef, datos);

      console.log(`📤 Enviado directamente:`, {
        P1: valor1,
        P2: valor2,
        alerta1,
        alerta2,
        umbral: configuracion.umbralGas
      });

      // Enviar notificación si hay alerta
      if (alerta1 || alerta2) {
        const notifRef = push(ref(db, 'notificaciones'));
        await set(notifRef, {
          tipo: 'alerta',
          mensaje: `Simulación: Gas detectado en ${alerta1 ? 'Piso 1' : ''} ${alerta1 && alerta2 ? 'y' : ''} ${alerta2 ? 'Piso 2' : ''}`,
          timestamp: timestamp,
          leido: false,
          simulacion: true
        });
      }
    } catch (error) {
      console.error('❌ Error al enviar datos:', error);
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
          <button
            className="sim-close-btn"
            onClick={onClose}
            title="Cerrar"
          >
            ✕
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
                disabled={autoIncremento}
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
                disabled={autoIncremento}
              />
              <div className="sim-sensor-indicators">
                <span>0</span>
                <span className="umbral-indicator">Umbral: {configuracion.umbralGas}</span>
                <span>200</span>
              </div>
            </div>

            {/* 🔥 NUEVO: Información de estado actual */}
            <div className="sim-info-box">
              <p><strong>Estado actual:</strong></p>
              <p>
                Sensor 1: {valorSensor1}
                {valorSensor1 > configuracion.umbralGas && <span className="alerta-badge">🔴 ALERTA</span>}
              </p>
              <p>
                Sensor 2: {valorSensor2}
                {valorSensor2 > configuracion.umbralGas && <span className="alerta-badge">🔴 ALERTA</span>}
              </p>
              {autoIncremento && (
                <p className="auto-incr-info">⚡ Auto-incremento activo - Enviando cada 2 segundos</p>
              )}
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
                disabled={autoIncremento}
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