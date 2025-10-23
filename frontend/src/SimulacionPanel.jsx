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

  // 🆕 Estados para feedback visual
  const [enviando, setEnviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');

  // Inicializar con valores actuales
  useEffect(() => {
    if (ultimaLectura) {
      setValorSensor1(ultimaLectura.valorSensor1 || 0);
      setValorSensor2(ultimaLectura.valorSensor2 || 0);
    }
  }, [ultimaLectura]);

  // ============================================
  // FUNCIONES DE SIMULACIÓN
  // ============================================

  // Función para enviar datos directamente (usada por escenarios)
  const enviarDatosDirecto = async (valor1, valor2, alertaPiso1, alertaPiso2) => {
    try {
      const timestamp = Date.now();
      const lecturaRef = ref(db, `lecturas/${timestamp}`);

      const alerta1 = alertaPiso1 || valor1 > configuracion.umbralGas;
      const alerta2 = alertaPiso2 || valor2 > configuracion.umbralGas;

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

      console.log(`📤 Datos enviados ->`, {
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
          mensaje: `Simulación: Gas detectado en ${alerta1 ? 'Piso 1' : ''} ${alerta2 ? 'Piso 2' : ''}`,
          timestamp: timestamp,
          leido: false,
          simulacion: true
        });
      }

      return true;
    } catch (error) {
      console.error('❌ Error al enviar datos:', error);
      throw error;
    }
  };

  // Auto-incremento CON auto-envío en tiempo real
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
    }, 2000); // Cada 2 segundos actualiza los valores

    return () => clearInterval(interval);
  }, [autoIncremento]);

  // Efecto separado para enviar los datos cuando cambian los valores en modo auto-incremento
  useEffect(() => {
    if (!autoIncremento) return;

    const enviarDatos = async () => {
      try {
        await enviarDatosDirecto(
          valorSensor1, 
          valorSensor2, 
          forzarAlertaPiso1, 
          forzarAlertaPiso2
        );
      } catch (error) {
        console.error('Error en auto-envío:', error);
      }
    };

    // Pequeño delay para asegurar que los estados se actualizaron
    const timeout = setTimeout(() => {
      enviarDatos();
    }, 100);

    return () => clearTimeout(timeout);
  }, [valorSensor1, valorSensor2]);

  // 🆕 Mostrar mensaje de éxito temporal
  const mostrarMensajeExito = (mensaje) => {
    setMensajeExito(mensaje);
    setTimeout(() => {
      setMensajeExito('');
    }, 3000);
  };

  // Enviar valores simulados manualmente
  const enviarValoresSimulados = async () => {
    if (enviando) return; // Evitar doble clic

    try {
      setEnviando(true);
      console.log('📤 Enviando valores manualmente...');
      console.log('Valores actuales:', { valorSensor1, valorSensor2 });
      
      await enviarDatosDirecto(
        valorSensor1,
        valorSensor2,
        forzarAlertaPiso1,
        forzarAlertaPiso2
      );

      console.log('✅ Valores enviados correctamente');
      mostrarMensajeExito('✅ Valores enviados exitosamente');
    } catch (error) {
      console.error('❌ Error al enviar valores:', error);
      mostrarMensajeExito('❌ Error al enviar valores');
    } finally {
      setEnviando(false);
    }
  };

  // Resetear valores
  const resetearValores = async () => {
    if (enviando) return; // Evitar doble clic

    try {
      setEnviando(true);
      console.log('🔄 Reseteando valores...');
      
      // Detener auto-incremento primero
      setAutoIncremento(false);
      
      // Resetear estados
      setValorSensor1(0);
      setValorSensor2(0);
      setForzarAlertaPiso1(false);
      setForzarAlertaPiso2(false);
      setEscenarioActivo(null);

      // Esperar un momento para que los estados se actualicen
      await new Promise(resolve => setTimeout(resolve, 100));

      // Enviar valores reseteados a Firebase
      await enviarDatosDirecto(0, 0, false, false);

      console.log('✅ Valores reseteados y enviados a Firebase');
      mostrarMensajeExito('✅ Sistema reseteado correctamente');
    } catch (error) {
      console.error('❌ Error al resetear valores:', error);
      mostrarMensajeExito('❌ Error al resetear valores');
    } finally {
      setEnviando(false);
    }
  };

  // Activar alerta específica de piso
  const activarAlertaPiso = async (piso) => {
    if (enviando) return;

    try {
      setEnviando(true);

      if (piso === 1) {
        const nuevoValor = configuracion.umbralGas + 20;
        setValorSensor1(nuevoValor);
        setForzarAlertaPiso1(true);
        console.log(`🔴 Activando alerta Piso 1 con valor: ${nuevoValor}`);

        // Enviar inmediatamente
        await new Promise(resolve => setTimeout(resolve, 100));
        await enviarDatosDirecto(nuevoValor, valorSensor2, true, forzarAlertaPiso2);

        setTimeout(() => {
          setForzarAlertaPiso1(false);
        }, 3000);
      } else {
        const nuevoValor = configuracion.umbralGas + 20;
        setValorSensor2(nuevoValor);
        setForzarAlertaPiso2(true);
        console.log(`🔴 Activando alerta Piso 2 con valor: ${nuevoValor}`);

        // Enviar inmediatamente
        await new Promise(resolve => setTimeout(resolve, 100));
        await enviarDatosDirecto(valorSensor1, nuevoValor, forzarAlertaPiso1, true);

        setTimeout(() => {
          setForzarAlertaPiso2(false);
        }, 3000);
      }

      mostrarMensajeExito(`✅ Alerta Piso ${piso} activada`);
    } catch (error) {
      console.error('Error al activar alerta:', error);
      mostrarMensajeExito('❌ Error al activar alerta');
    } finally {
      setEnviando(false);
    }
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
        if (enviando) return;

        try {
          setEnviando(true);
          console.log('💨 Ejecutando escenario: Fuga Leve');
          setEscenarioActivo('fugaLeve');

          const nuevoValor1 = 30;
          const nuevoValor2 = 25;
          setValorSensor1(nuevoValor1);
          setValorSensor2(nuevoValor2);

          // Enviar manualmente con los nuevos valores
          await new Promise(resolve => setTimeout(resolve, 100));
          await enviarDatosDirecto(nuevoValor1, nuevoValor2, false, false);

          // Activar auto-incremento DESPUÉS del envío inicial
          setTimeout(() => {
            setAutoIncremento(true);
          }, 200);

          mostrarMensajeExito('✅ Escenario "Fuga Leve" activado');
        } catch (error) {
          console.error('Error en escenario:', error);
          mostrarMensajeExito('❌ Error al activar escenario');
        } finally {
          setEnviando(false);
        }
      }
    },
    fugaSevera: {
      nombre: 'Fuga Severa',
      icono: '⚠️',
      descripcion: 'Alerta inmediata en Piso 1',
      ejecutar: async () => {
        if (enviando) return;

        try {
          setEnviando(true);
          console.log('⚠️ Ejecutando escenario: Fuga Severa');
          setEscenarioActivo('fugaSevera');

          const nuevoValor1 = configuracion.umbralGas + 50;
          const nuevoValor2 = 40;
          setValorSensor1(nuevoValor1);
          setValorSensor2(nuevoValor2);
          setForzarAlertaPiso1(true);

          await new Promise(resolve => setTimeout(resolve, 100));
          await enviarDatosDirecto(nuevoValor1, nuevoValor2, true, false);

          setTimeout(() => {
            setForzarAlertaPiso1(false);
          }, 3000);

          mostrarMensajeExito('✅ Escenario "Fuga Severa" activado');
        } catch (error) {
          console.error('Error en escenario:', error);
          mostrarMensajeExito('❌ Error al activar escenario');
        } finally {
          setEnviando(false);
        }
      }
    },
    evacuacion: {
      nombre: 'Evacuación',
      icono: '🚨',
      descripcion: 'Alerta crítica en ambos pisos',
      ejecutar: async () => {
        if (enviando) return;

        try {
          setEnviando(true);
          console.log('🚨 Ejecutando escenario: Evacuación');
          setEscenarioActivo('evacuacion');

          const nuevoValor1 = configuracion.umbralGas + 80;
          const nuevoValor2 = configuracion.umbralGas + 70;
          setValorSensor1(nuevoValor1);
          setValorSensor2(nuevoValor2);
          setForzarAlertaPiso1(true);
          setForzarAlertaPiso2(true);

          await new Promise(resolve => setTimeout(resolve, 100));
          await enviarDatosDirecto(nuevoValor1, nuevoValor2, true, true);

          setTimeout(() => {
            setForzarAlertaPiso1(false);
            setForzarAlertaPiso2(false);
          }, 5000);

          mostrarMensajeExito('✅ Escenario "Evacuación" activado');
        } catch (error) {
          console.error('Error en escenario:', error);
          mostrarMensajeExito('❌ Error al activar escenario');
        } finally {
          setEnviando(false);
        }
      }
    },
    normal: {
      nombre: 'Estado Normal',
      icono: '✅',
      descripcion: 'Valores seguros, sin alertas',
      ejecutar: async () => {
        if (enviando) return;

        try {
          setEnviando(true);
          console.log('✅ Ejecutando escenario: Normal');
          setEscenarioActivo('normal');

          const nuevoValor1 = 15;
          const nuevoValor2 = 12;
          setValorSensor1(nuevoValor1);
          setValorSensor2(nuevoValor2);
          setForzarAlertaPiso1(false);
          setForzarAlertaPiso2(false);
          setAutoIncremento(false);

          await new Promise(resolve => setTimeout(resolve, 100));
          await enviarDatosDirecto(nuevoValor1, nuevoValor2, false, false);

          mostrarMensajeExito('✅ Escenario "Normal" activado');
        } catch (error) {
          console.error('Error en escenario:', error);
          mostrarMensajeExito('❌ Error al activar escenario');
        } finally {
          setEnviando(false);
        }
      }
    }
  };

  return (
    <div className="simulacion-overlay">
      <div className="simulacion-panel">
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
            <XCircle size={24} />
          </button>
        </div>

        <div className="sim-content">
          {/* 🆕 Mensaje de éxito/error */}
          {mensajeExito && (
            <div className={`mensaje-feedback ${mensajeExito.includes('❌') ? 'error' : 'exito'}`}>
              {mensajeExito}
            </div>
          )}

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
                <span className={`sim-sensor-value ${valorSensor1 > configuracion.umbralGas ? 'alerta-rojo' : ''}`}>
                  {valorSensor1}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={valorSensor1}
                onChange={(e) => setValorSensor1(parseInt(e.target.value))}
                className="sim-slider"
                disabled={autoIncremento || enviando}
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
                <span className={`sim-sensor-value ${valorSensor2 > configuracion.umbralGas ? 'alerta-rojo' : ''}`}>
                  {valorSensor2}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={valorSensor2}
                onChange={(e) => setValorSensor2(parseInt(e.target.value))}
                className="sim-slider"
                disabled={autoIncremento || enviando}
              />
              <div className="sim-sensor-indicators">
                <span>0</span>
                <span className="umbral-indicator">Umbral: {configuracion.umbralGas}</span>
                <span>200</span>
              </div>
            </div>

            {/* Información de estado actual */}
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
                disabled={enviando}
              >
                <Zap size={20} />
                {autoIncremento ? 'Detener Auto-Incremento' : 'Auto-Incremento'}
              </button>

              <button
                className="sim-btn sim-btn-success"
                onClick={enviarValoresSimulados}
                disabled={autoIncremento || enviando}
              >
                <Play size={20} />
                {enviando ? 'Enviando...' : 'Enviar Valores'}
              </button>

              <button
                className="sim-btn sim-btn-danger"
                onClick={resetearValores}
                disabled={enviando}
              >
                <RotateCcw size={20} />
                {enviando ? 'Reseteando...' : 'Resetear'}
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
                disabled={enviando}
              >
                <Volume2 size={24} />
                <span>Activar Alerta Piso 1</span>
                <small>Sensor A0 + Buzzer Pin 5 + LED Pin 1</small>
              </button>

              <button
                className="sim-alert-btn piso2"
                onClick={() => activarAlertaPiso(2)}
                disabled={enviando}
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
                  disabled={enviando}
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