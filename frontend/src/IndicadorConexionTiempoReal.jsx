import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue } from 'firebase/database';
import { Wifi, WifiOff, Activity, Clock, AlertTriangle } from 'lucide-react';

// 🔥 COMPONENTE: Indicador de Estado de Conexión en Tiempo Real
export default function IndicadorConexionTiempoReal() {
  const [estadoConexion, setEstadoConexion] = useState({
    conectado: false,
    ultimaLectura: null,
    tiempoSinDatos: 0,
    calidad: 'desconocida',
    dispositivo: 'Desconocido'
  });

  useEffect(() => {
    console.log('🔌 Iniciando monitoreo de conexión en tiempo real...');

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
          
          // Determinar calidad de conexión
          let calidad = 'excelente';
          if (tiempoSinDatos > 5) calidad = 'buena';
          if (tiempoSinDatos > 15) calidad = 'regular';
          if (tiempoSinDatos > 30) calidad = 'mala';

          setEstadoConexion({
            conectado: tiempoSinDatos < 30,
            ultimaLectura: lecturaArduino,
            tiempoSinDatos,
            calidad,
            dispositivo: lecturaArduino.dispositivo || 'Arduino'
          });
        }
      }
    }, (error) => {
      console.error('❌ Error en monitoreo de conexión:', error);
      setEstadoConexion(prev => ({ ...prev, conectado: false }));
    });

    return () => {
      console.log('🛑 Deteniendo monitoreo de conexión');
      unsubscribe();
    };
  }, []);

  return (
    <div className={`indicador-conexion-tiempo-real ${estadoConexion.conectado ? 'conectado' : 'desconectado'}`}>
      <div className="indicador-header">
        {estadoConexion.conectado ? (
          <Wifi className="indicador-icono conectado" size={20} />
        ) : (
          <WifiOff className="indicador-icono desconectado" size={20} />
        )}
        <span className="indicador-titulo">
          {estadoConexion.conectado ? 'Arduino Conectado' : 'Arduino Desconectado'}
        </span>
      </div>

      <div className="indicador-detalles">
        <div className="indicador-item">
          <Activity size={16} />
          <span>Dispositivo: {estadoConexion.dispositivo}</span>
        </div>
        
        <div className="indicador-item">
          <Clock size={16} />
          <span>Tiempo sin datos: {estadoConexion.tiempoSinDatos}s</span>
        </div>
        
        <div className="indicador-item">
          <span className={`calidad-badge ${estadoConexion.calidad}`}>
            Calidad: {estadoConexion.calidad}
          </span>
        </div>

        {estadoConexion.ultimaLectura && (
          <div className="indicador-sensores">
            <div className="sensor-item">
              <span className="sensor-label">Sensor 1:</span>
              <span className={`sensor-valor ${estadoConexion.ultimaLectura.sensor1Alerta ? 'alerta' : 'normal'}`}>
                {estadoConexion.ultimaLectura.valorSensor1}
                {estadoConexion.ultimaLectura.sensor1Alerta && ' 🔴'}
              </span>
            </div>
            <div className="sensor-item">
              <span className="sensor-label">Sensor 2:</span>
              <span className={`sensor-valor ${estadoConexion.ultimaLectura.sensor2Alerta ? 'alerta' : 'normal'}`}>
                {estadoConexion.ultimaLectura.valorSensor2}
                {estadoConexion.ultimaLectura.sensor2Alerta && ' 🔴'}
              </span>
            </div>
          </div>
        )}

        {!estadoConexion.conectado && (
          <div className="indicador-alerta">
            <AlertTriangle size={16} />
            <span>Verificar conexión WiFi del Arduino</span>
          </div>
        )}
      </div>
    </div>
  );
}
