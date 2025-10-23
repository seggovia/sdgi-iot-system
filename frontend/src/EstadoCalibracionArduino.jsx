import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue } from 'firebase/database';
import { Activity, Clock, AlertCircle, CheckCircle } from 'lucide-react';

// 🔥 COMPONENTE: Estado de Calibración del Arduino
export default function EstadoCalibracionArduino() {
  const [estadoCalibracion, setEstadoCalibracion] = useState({
    calibrando: false,
    progreso: 0,
    fase: 'inicial',
    tiempoRestante: 0,
    baseline1: 0,
    baseline2: 0,
    muestras: 0
  });

  useEffect(() => {
    console.log('🔬 Iniciando monitoreo de calibración...');

    const lecturasRef = ref(db, 'lecturas');
    
    const unsubscribe = onValue(lecturasRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const keys = Object.keys(data).sort((a, b) => b - a);

        // Buscar la última lectura del Arduino
        let lecturaArduino = null;
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const lectura = data[key];
          
          if (lectura.dispositivo === "arduino_001" || 
              (!lectura.dispositivo && !lectura.modoSimulacion)) {
            lecturaArduino = lectura;
            break;
          }
        }

        if (lecturaArduino) {
          const ahora = Date.now();
          const tiempoLectura = lecturaArduino.timestamp || parseInt(keys[0]);
          const tiempoSinDatos = Math.floor((ahora - tiempoLectura) / 1000);
          
          // Determinar estado de calibración
          const calibrando = lecturaArduino.calibrando || false;
          const progreso = lecturaArduino.progresoCalibracion || 0;
          
          let fase = 'operativo';
          if (calibrando) {
            if (progreso < 50) fase = 'calibrando_sensor1';
            else if (progreso < 100) fase = 'calibrando_sensor2';
            else fase = 'completando';
          }

          setEstadoCalibracion({
            calibrando,
            progreso: Math.round(progreso),
            fase,
            tiempoRestante: calibrando ? Math.max(0, 20 - Math.floor(progreso * 0.2)) : 0,
            baseline1: lecturaArduino.baseline1 || 0,
            baseline2: lecturaArduino.baseline2 || 0,
            muestras: lecturaArduino.muestrasCal || 0,
            tiempoSinDatos,
            conectado: tiempoSinDatos < 60
          });
        }
      }
    }, (error) => {
      console.error('❌ Error en monitoreo de calibración:', error);
    });

    return () => {
      console.log('🛑 Deteniendo monitoreo de calibración');
      unsubscribe();
    };
  }, []);

  const getFaseTexto = (fase) => {
    switch (fase) {
      case 'calibrando_sensor1': return 'Calibrando Sensor 1 (A0)';
      case 'calibrando_sensor2': return 'Calibrando Sensor 2 (A3)';
      case 'completando': return 'Completando calibración';
      case 'operativo': return 'Sistema operativo';
      default: return 'Estado desconocido';
    }
  };

  const getFaseIcono = (fase) => {
    switch (fase) {
      case 'calibrando_sensor1':
      case 'calibrando_sensor2':
      case 'completando':
        return <Activity className="icono-calibrando" size={20} />;
      case 'operativo':
        return <CheckCircle className="icono-operativo" size={20} />;
      default:
        return <AlertCircle className="icono-desconocido" size={20} />;
    }
  };

  return (
    <div className={`estado-calibracion ${estadoCalibracion.calibrando ? 'calibrando' : 'operativo'}`}>
      <div className="calibracion-header">
        {getFaseIcono(estadoCalibracion.fase)}
        <span className="calibracion-titulo">
          {getFaseTexto(estadoCalibracion.fase)}
        </span>
      </div>

      {estadoCalibracion.calibrando && (
        <div className="calibracion-progreso">
          <div className="progreso-bar">
            <div 
              className="progreso-fill" 
              style={{ width: `${estadoCalibracion.progreso}%` }}
            />
          </div>
          <span className="progreso-texto">
            {estadoCalibracion.progreso}% completado
          </span>
        </div>
      )}

      <div className="calibracion-detalles">
        <div className="calibracion-item">
          <Clock size={16} />
          <span>Tiempo sin datos: {estadoCalibracion.tiempoSinDatos}s</span>
        </div>
        
        {estadoCalibracion.calibrando && (
          <>
            <div className="calibracion-item">
              <span>Baseline Sensor 1: {estadoCalibracion.baseline1}</span>
            </div>
            <div className="calibracion-item">
              <span>Baseline Sensor 2: {estadoCalibracion.baseline2}</span>
            </div>
            <div className="calibracion-item">
              <span>Muestras: {estadoCalibracion.muestras}</span>
            </div>
            {estadoCalibracion.tiempoRestante > 0 && (
              <div className="calibracion-item">
                <span>Tiempo restante: ~{estadoCalibracion.tiempoRestante}s</span>
              </div>
            )}
          </>
        )}

        {!estadoCalibracion.conectado && (
          <div className="calibracion-alerta">
            <AlertCircle size={16} />
            <span>Arduino desconectado - Verificar conexión WiFi</span>
          </div>
        )}

        {estadoCalibracion.conectado && !estadoCalibracion.calibrando && (
          <div className="calibracion-exito">
            <CheckCircle size={16} />
            <span>Sistema listo para detección de gas</span>
          </div>
        )}
      </div>
    </div>
  );
}
