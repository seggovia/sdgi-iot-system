import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { db } from './firebase';
import { ref, get, set, onValue, query, orderByKey, limitToLast } from 'firebase/database';
import './Edificio3D.css';

// Componente de humo 3D dentro del edificio
function Humo3D({ activo, piso, posicionY }) {
  const particulasRef = useRef([]);
  
  useFrame((state) => {
    if (!activo) return;
    
    const time = state.clock.getElapsedTime();
    
    particulasRef.current.forEach((particula, index) => {
      if (particula) {
        // Movimiento ascendente más lento para mayor densidad
        particula.position.y += 0.005;
        
        // Movimiento lateral controlado dentro del contorno del piso
        const movimientoX = Math.sin(time * 0.3 + index) * 0.002;
        const movimientoZ = Math.cos(time * 0.4 + index) * 0.002;
        
        // Aplicar movimiento solo si se mantiene dentro de los límites
        const nuevaX = particula.position.x + movimientoX;
        const nuevaZ = particula.position.z + movimientoZ;
        
        // Límites más dispersos del piso: X entre -1.75 y 1.75, Z entre -1.25 y 1.25
        if (nuevaX >= -1.75 && nuevaX <= 1.75) {
          particula.position.x = nuevaX;
        }
        if (nuevaZ >= -1.25 && nuevaZ <= 1.25) {
          particula.position.z = nuevaZ;
        }
        
        // Rotación más lenta
        particula.rotation.y += 0.005;
        
        // Escalado más sutil
        const escala = 1 + Math.sin(time * 1.5 + index) * 0.15;
        particula.scale.setScalar(escala);
        
        // Opacidad que disminuye más gradualmente
        const alturaRelativa = (particula.position.y - posicionY) / 0.8; // Solo altura del piso inferior
        particula.material.opacity = Math.max(0.2, 1 - alturaRelativa * 0.6);
        
        // Resetear cuando sube mucho, manteniendo a la altura del piso
        if (particula.position.y > posicionY + 0.8) {
          particula.position.y = posicionY;
          particula.position.x = (Math.random() - 0.5) * 3.5; // Más disperso horizontalmente
          particula.position.z = (Math.random() - 0.5) * 2.5; // Más disperso en profundidad
        }
      }
    });
  });

  if (!activo) return null;

  return (
    <group position={[0, posicionY, 0]}>
      {/* Partículas de humo densas dentro del piso */}
      {[...Array(60)].map((_, i) => (
        <mesh
          key={`humo-${piso}-${i}`}
          ref={(el) => (particulasRef.current[i] = el)}
          position={[
            (Math.random() - 0.5) * 3.5, // Más disperso horizontalmente (-1.75 a 1.75)
            Math.random() * 0.8, // Solo en la parte inferior del piso (0 a 0.8)
            (Math.random() - 0.5) * 2.5 // Más disperso en profundidad (-1.25 a 1.25)
          ]}
        >
          <sphereGeometry args={[0.08 + Math.random() * 0.15, 8, 8]} />
          <meshStandardMaterial
            color="#666666"
            transparent
            opacity={0.7}
            emissive="#333333"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

// Componente del edificio
function Edificio({ piso1Alerta, piso2Alerta, puertaAbierta, buzzerPiso1, buzzerPiso2, ledPiso1, ledPiso2, posiciones }) {
  const piso1Ref = useRef();
  const piso2Ref = useRef();
  const puertaRef = useRef();

  // Referencias para sensores, buzzers y LEDs
  const sensorPiso1Ref = useRef();
  const sensorPiso2Ref = useRef();
  const buzzerPiso1Ref = useRef();
  const buzzerPiso2Ref = useRef();
  const ledPiso1Ref = useRef();
  const ledPiso2Ref = useRef();

  // Animación de parpadeo cuando hay alerta
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Animación de pisos
    if (piso1Ref.current && piso1Alerta) {
      piso1Ref.current.material.emissiveIntensity = Math.sin(time * 5) * 0.5 + 0.5;
    }

    if (piso2Ref.current && piso2Alerta) {
      piso2Ref.current.material.emissiveIntensity = Math.sin(time * 5) * 0.5 + 0.5;
    }

    // Animación de la puerta - MEJORADA PARA MAYOR VISIBILIDAD
    if (puertaRef.current) {
      const targetRotation = puertaAbierta ? -Math.PI / 2 : 0;
      const targetPosition = puertaAbierta ? 0.6 : 0; // Aumentado para mayor apertura

      // Interpolación muy lenta y suave
      puertaRef.current.rotation.y += (targetRotation - puertaRef.current.rotation.y) * 0.02;
      puertaRef.current.position.x += (targetPosition - puertaRef.current.position.x) * 0.02;

      // Efecto de brillo cuando se abre
      if (puertaAbierta) {
        puertaRef.current.material.emissiveIntensity = Math.sin(time * 3) * 0.2 + 0.8;
      } else {
        puertaRef.current.material.emissiveIntensity = 0.3;
      }
    }

    // Animación de sensores
    if (sensorPiso1Ref.current) {
      sensorPiso1Ref.current.material.emissiveIntensity = piso1Alerta
        ? Math.sin(time * 6) * 0.4 + 0.6
        : 0.3;
      if (piso1Alerta) {
        sensorPiso1Ref.current.rotation.y += 0.02;
      }
    }

    if (sensorPiso2Ref.current) {
      sensorPiso2Ref.current.material.emissiveIntensity = piso2Alerta
        ? Math.sin(time * 6) * 0.4 + 0.6
        : 0.3;
      if (piso2Alerta) {
        sensorPiso2Ref.current.rotation.y += 0.02;
      }
    }

    // Animación de buzzers
    if (buzzerPiso1Ref.current && buzzerPiso1) {
      const baseX = posiciones.buzzer.x;
      buzzerPiso1Ref.current.position.x = baseX + Math.sin(time * 20) * 0.05;
      buzzerPiso1Ref.current.material.emissiveIntensity = Math.sin(time * 10) * 0.3 + 0.7;
    } else if (buzzerPiso1Ref.current) {
      buzzerPiso1Ref.current.position.x = posiciones.buzzer.x;
    }

    if (buzzerPiso2Ref.current && buzzerPiso2) {
      const baseX = posiciones.buzzer.x;
      buzzerPiso2Ref.current.position.x = baseX + Math.sin(time * 20) * 0.05;
      buzzerPiso2Ref.current.material.emissiveIntensity = Math.sin(time * 10) * 0.3 + 0.7;
    } else if (buzzerPiso2Ref.current) {
      buzzerPiso2Ref.current.position.x = posiciones.buzzer.x;
    }

    // Animación de LEDs
    if (ledPiso1Ref.current) {
      ledPiso1Ref.current.material.emissiveIntensity = ledPiso1
        ? Math.sin(time * 8) * 0.4 + 0.6
        : 0.2;
    }

    if (ledPiso2Ref.current) {
      ledPiso2Ref.current.material.emissiveIntensity = ledPiso2
        ? Math.sin(time * 8) * 0.4 + 0.6
        : 0.2;
    }
  });

  const colorPiso1 = piso1Alerta ? '#ff4444' : '#4facfe';
  const colorPiso2 = piso2Alerta ? '#ff4444' : '#a78bfa';

  return (
    <group position={[0, -1.5, 0]}>
      {/* Base del edificio */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[6, 0.2, 4]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* ========== PISO 1 ========== */}
      <group position={[0, 1, 0]}>
        <mesh ref={piso1Ref} castShadow receiveShadow>
          <boxGeometry args={[5.5, 1.5, 3.5]} />
          <meshStandardMaterial
            color={colorPiso1}
            emissive={colorPiso1}
            emissiveIntensity={piso1Alerta ? 0.8 : 0.2}
            transparent
            opacity={0.5}
          />
        </mesh>

        {/* Ventanas Piso 1 */}
        {[-1.5, 0, 1.5].map((x, i) => (
          <mesh key={`ventana-p1-${i}`} position={[x, 0, 1.76]}>
            <planeGeometry args={[0.6, 0.8]} />
            <meshStandardMaterial
              color={piso1Alerta ? '#ff0000' : '#ffffff'}
              emissive={piso1Alerta ? '#ff0000' : '#4facfe'}
              emissiveIntensity={piso1Alerta ? 1 : 0.3}
            />
          </mesh>
        ))}

        {/* SENSOR PISO 1 */}
        <group position={[posiciones.sensor.x, posiciones.sensor.y, posiciones.sensor.z]}>
          <mesh ref={sensorPiso1Ref} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.4, 16]} />
            <meshStandardMaterial
              color={piso1Alerta ? '#ff0000' : '#10b981'}
              emissive={piso1Alerta ? '#ff0000' : '#059669'}
              emissiveIntensity={0.8}
            />
          </mesh>
          <Text
            position={[0, -0.35, 0]}
            fontSize={0.12}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            A0
          </Text>
        </group>

        {/* BUZZER PISO 1 */}
        <group position={[posiciones.buzzer.x, posiciones.buzzer.y, posiciones.buzzer.z]}>
          <mesh ref={buzzerPiso1Ref} castShadow>
            <coneGeometry args={[0.18, 0.3, 8]} />
            <meshStandardMaterial
              color={buzzerPiso1 ? '#fbbf24' : '#64748b'}
              emissive={buzzerPiso1 ? '#f59e0b' : '#475569'}
              emissiveIntensity={buzzerPiso1 ? 1 : 0.2}
            />
          </mesh>
          <Text
            position={[0, -0.3, 0]}
            fontSize={0.1}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            BUZ
          </Text>
        </group>

        {/* LED PISO 1 */}
        <group position={[posiciones.led.x, posiciones.led.y, posiciones.led.z]}>
          <mesh ref={ledPiso1Ref} castShadow>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial
              color={ledPiso1 ? '#ef4444' : '#94a3b8'}
              emissive={ledPiso1 ? '#dc2626' : '#64748b'}
              emissiveIntensity={ledPiso1 ? 1 : 0.2}
            />
          </mesh>
          {ledPiso1 && (
            <pointLight
              position={[0, 0, 0]}
              color="#ff0000"
              intensity={2}
              distance={2}
            />
          )}
        </group>

        <Text
          position={[-2.76, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.4}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          PISO 1
        </Text>
      </group>

      {/* ========== PISO 2 ========== */}
      <group position={[0, 2.8, 0]}>
        <mesh ref={piso2Ref} castShadow receiveShadow>
          <boxGeometry args={[5.5, 1.5, 3.5]} />
          <meshStandardMaterial
            color={colorPiso2}
            emissive={colorPiso2}
            emissiveIntensity={piso2Alerta ? 0.8 : 0.2}
            transparent
            opacity={0.5}
          />
        </mesh>

        {/* Ventanas Piso 2 */}
        {[-1.5, 0, 1.5].map((x, i) => (
          <mesh key={`ventana-p2-${i}`} position={[x, 0, 1.76]}>
            <planeGeometry args={[0.6, 0.8]} />
            <meshStandardMaterial
              color={piso2Alerta ? '#ff0000' : '#ffffff'}
              emissive={piso2Alerta ? '#ff0000' : '#a78bfa'}
              emissiveIntensity={piso2Alerta ? 1 : 0.3}
            />
          </mesh>
        ))}

        {/* SENSOR PISO 2 */}
        <group position={[posiciones.sensor.x, posiciones.sensor.y, posiciones.sensor.z]}>
          <mesh ref={sensorPiso2Ref} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.4, 16]} />
            <meshStandardMaterial
              color={piso2Alerta ? '#ff0000' : '#10b981'}
              emissive={piso2Alerta ? '#ff0000' : '#059669'}
              emissiveIntensity={0.8}
            />
          </mesh>
          <Text
            position={[0, -0.35, 0]}
            fontSize={0.12}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            A3
          </Text>
        </group>

        {/* BUZZER PISO 2 */}
        <group position={[posiciones.buzzer.x, posiciones.buzzer.y, posiciones.buzzer.z]}>
          <mesh ref={buzzerPiso2Ref} castShadow>
            <coneGeometry args={[0.18, 0.3, 8]} />
            <meshStandardMaterial
              color={buzzerPiso2 ? '#fbbf24' : '#64748b'}
              emissive={buzzerPiso2 ? '#f59e0b' : '#475569'}
              emissiveIntensity={buzzerPiso2 ? 1 : 0.2}
            />
          </mesh>
          <Text
            position={[0, -0.3, 0]}
            fontSize={0.1}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            BUZ
          </Text>
        </group>

        {/* LED PISO 2 */}
        <group position={[posiciones.led.x, posiciones.led.y, posiciones.led.z]}>
          <mesh ref={ledPiso2Ref} castShadow>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial
              color={ledPiso2 ? '#ef4444' : '#94a3b8'}
              emissive={ledPiso2 ? '#dc2626' : '#64748b'}
              emissiveIntensity={ledPiso2 ? 1 : 0.2}
            />
          </mesh>
          {ledPiso2 && (
            <pointLight
              position={[0, 0, 0]}
              color="#ff0000"
              intensity={2}
              distance={2}
            />
          )}
        </group>

        <Text
          position={[-2.76, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.4}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          PISO 2
        </Text>
      </group>

      {/* PUERTA PRINCIPAL - ANIMACIÓN DINÁMICA */}
      <group position={[0, 0.8, 1.76]}>
        <mesh
          ref={puertaRef}
        // Removidos valores estáticos - solo animación dinámica
        >
          <boxGeometry args={[0.8, 1.4, 0.1]} />
          <meshStandardMaterial
            color={puertaAbierta ? '#34d399' : '#64748b'}
            emissive={puertaAbierta ? '#10b981' : '#1e293b'}
            emissiveIntensity={puertaAbierta ? 0.8 : 0.3}
          />
        </mesh>

        {/* Marco de la puerta */}
        <mesh position={[0, 0, -0.05]}>
          <boxGeometry args={[0.9, 1.5, 0.05]} />
          <meshStandardMaterial color="#374151" />
        </mesh>

        <Text
          position={[0, 0.9, 0.06]}
          fontSize={0.12}
          color={puertaAbierta ? '#10b981' : '#ffffff'}
          anchorX="center"
          anchorY="middle"
        >
          {puertaAbierta ? 'ABIERTA' : 'CERRADA'}
        </Text>

        {/* Indicador visual de estado - MEJORADO */}
        <mesh position={[0, -0.5, 0.06]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial
            color={puertaAbierta ? '#10b981' : '#ef4444'}
            emissive={puertaAbierta ? '#10b981' : '#ef4444'}
            emissiveIntensity={puertaAbierta ? 1.5 : 1}
          />
        </mesh>

        {/* Efecto de apertura - Línea de luz cuando está abierta */}
        {puertaAbierta && (
          <mesh position={[0.3, 0, 0.05]}>
            <boxGeometry args={[0.02, 1.4, 0.01]} />
            <meshStandardMaterial
              color="#10b981"
              emissive="#10b981"
              emissiveIntensity={2}
            />
          </mesh>
        )}
      </group>

      {/* Techo */}
      <mesh position={[0, 4.2, 0]} castShadow>
        <boxGeometry args={[6, 0.3, 4]} />
        <meshStandardMaterial color="#0f0f23" />
      </mesh>

      {/* Letrero del edificio */}
      <Text
        position={[0, 4.6, 2]}
        fontSize={0.4}
        color="#a78bfa"
        anchorX="center"
        anchorY="middle"
      >
        SDGI
      </Text>

      {/* Indicador de estado general en el techo */}
      <group position={[0, 4.5, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial
            color={piso1Alerta || piso2Alerta ? '#ff4444' : '#10b981'}
            emissive={piso1Alerta || piso2Alerta ? '#ff0000' : '#059669'}
            emissiveIntensity={1}
          />
        </mesh>
        {(piso1Alerta || piso2Alerta) && (
          <pointLight
            position={[0, 0, 0]}
            color="#ff0000"
            intensity={3}
            distance={5}
          />
        )}
      </group>

      {/* HUMO 3D DENTRO DEL EDIFICIO */}
      {/* Humo Piso 1 */}
      <Humo3D 
        activo={piso1Alerta} 
        piso="piso1"
        posicionY={1}
      />
      
      {/* Humo Piso 2 */}
      <Humo3D 
        activo={piso2Alerta} 
        piso="piso2"
        posicionY={2.8}
      />

    </group>
  );
}

// ============================================
// MODAL DE CONFIRMACIÓN PERSONALIZADO
// ============================================
function ConfirmModal({ isOpen, onConfirm, onCancel, title, message }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <div className="modal-icon-warning">⚠️</div>
          <h3>{title}</h3>
        </div>

        <div className="modal-body">
          <p>{message}</p>
        </div>

        <div className="modal-footer">
          <button
            className="modal-btn modal-btn-cancel"
            onClick={onCancel}
          >
            ✕ Cancelar
          </button>
          <button
            className="modal-btn modal-btn-confirm"
            onClick={onConfirm}
          >
            ✓ Activar Modo Edición
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL EXPORTABLE
// ============================================
export default function Edificio3D() {
  // Posiciones por defecto
  const posicionesDefault = {
    sensor: { x: 1.8, y: 0, z: 1.0 },
    buzzer: { x: -1.8, y: 0, z: 1.0 },
    led: { x: 0, y: 0, z: 1.0 }
  };

  // Estados de posiciones
  const [posiciones, setPosiciones] = useState(posicionesDefault);
  const [posicionesCargadas, setPosicionesCargadas] = useState(false);
  const [mostrarControles, setMostrarControles] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // 🔥 NUEVO: Estados para lecturas en tiempo real
  const [piso1Alerta, setPiso1Alerta] = useState(false);
  const [piso2Alerta, setPiso2Alerta] = useState(false);
  const [puertaAbierta, setPuertaAbierta] = useState(false);
  const [buzzerPiso1, setBuzzerPiso1] = useState(false);
  const [buzzerPiso2, setBuzzerPiso2] = useState(false);
  const [ledPiso1, setLedPiso1] = useState(false);
  const [ledPiso2, setLedPiso2] = useState(false);
  const [ultimaLectura, setUltimaLectura] = useState(null);

  // ============================================
  // 🔥 MEJORADO: ESCUCHAR LECTURAS EN TIEMPO REAL CON FILTRO ARDUINO
  // ============================================
  useEffect(() => {
    console.log('🔥 Iniciando escucha en tiempo real de Firebase (solo Arduino)...');

    // Escuchar todas las lecturas y filtrar solo las del Arduino
    const lecturasRef = ref(db, 'lecturas');

    const unsubscribe = onValue(lecturasRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const keys = Object.keys(data).sort((a, b) => b - a);

        // Buscar la última lectura del Arduino (no simulación)
        let lecturaArduino = null;
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const lectura = data[key];

          // Filtrar solo lecturas del Arduino real
          if (lectura.dispositivo === "arduino_001" ||
            (!lectura.dispositivo && !lectura.modoSimulacion)) {
            lecturaArduino = lectura;
            break;
          }
        }

        if (lecturaArduino) {
          console.log('📊 Nueva lectura Arduino recibida:', lecturaArduino);

          // Actualizar estados con la nueva lectura
          setUltimaLectura(lecturaArduino);
          setPiso1Alerta(lecturaArduino.sensor1Alerta || false);
          setPiso2Alerta(lecturaArduino.sensor2Alerta || false);

          // También actualizar el indicador visual
          console.log('🏢 Estado del edificio actualizado:', {
            piso1: lecturaArduino.sensor1Alerta ? '🔴 ALERTA' : '✅ Normal',
            piso2: lecturaArduino.sensor2Alerta ? '🔴 ALERTA' : '✅ Normal',
            timestamp: new Date(lecturaArduino.timestamp).toLocaleTimeString()
          });
        } else {
          console.log('⚠️ No hay lecturas del Arduino disponibles');
        }
      }
    }, (error) => {
      console.error('❌ Error al escuchar lecturas:', error);
    });

    // Limpiar el listener cuando el componente se desmonte
    return () => {
      console.log('🛑 Deteniendo escucha de Firebase');
      unsubscribe();
    };
  }, []);

  // ============================================
  // 🔥 NUEVO: ESCUCHAR CONFIGURACIÓN EN TIEMPO REAL
  // ============================================
  useEffect(() => {
    console.log('🔥 Iniciando escucha de configuración en tiempo real...');

    const configRef = ref(db, 'configuracion/sistema');

    const unsubscribe = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const config = snapshot.val();
        console.log('⚙️ Configuración actualizada:', config);

        // Actualizar estados de dispositivos
        setBuzzerPiso1(config.buzzerPiso1Activo || false);
        setBuzzerPiso2(config.buzzerPiso2Activo || false);
        setLedPiso1(config.ledPiso1Activo || false);
        setLedPiso2(config.ledPiso2Activo || false);
        setPuertaAbierta(config.servoAbierto || false);
      }
    }, (error) => {
      console.error('❌ Error al escuchar configuración:', error);
    });

    return () => {
      console.log('🛑 Deteniendo escucha de configuración');
      unsubscribe();
    };
  }, []);

  // ============================================
  // CARGAR POSICIONES DESDE FIREBASE
  // ============================================
  useEffect(() => {
    const cargarPosiciones = async () => {
      try {
        const posRef = ref(db, 'edificioPosiciones/posicionesEdificio');
        const snapshot = await get(posRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          setPosiciones(data);
          console.log('✅ Posiciones cargadas desde Realtime DB:', data);
        } else {
          console.log('ℹ️ No hay posiciones guardadas, usando valores por defecto');
          await set(posRef, posicionesDefault);
        }
      } catch (error) {
        console.error('❌ Error al cargar posiciones:', error);
      } finally {
        setPosicionesCargadas(true);
      }
    };

    cargarPosiciones();
  }, []);

  // ============================================
  // GUARDAR POSICIONES EN FIREBASE
  // ============================================
  const guardarPosiciones = async (nuevasPosiciones) => {
    if (!modoEdicion) return;

    try {
      const posRef = ref(db, 'edificioPosiciones/posicionesEdificio');
      await set(posRef, nuevasPosiciones);
      console.log('💾 Posiciones guardadas en Realtime DB:', nuevasPosiciones);
    } catch (error) {
      console.error('❌ Error al guardar posiciones:', error);
    }
  };

  // ============================================
  // ACTUALIZAR POSICIÓN CON AUTOSAVE
  // ============================================
  const actualizarPosicion = (componente, eje, valor) => {
    const nuevasPosiciones = {
      ...posiciones,
      [componente]: {
        ...posiciones[componente],
        [eje]: parseFloat(valor)
      }
    };

    setPosiciones(nuevasPosiciones);
    guardarPosiciones(nuevasPosiciones);
  };

  // ============================================
  // TOGGLE MODO EDICIÓN CON MODAL
  // ============================================
  const handleToggleModoEdicion = () => {
    if (!modoEdicion) {
      setShowModal(true);
    } else {
      setModoEdicion(false);
      console.log('🔒 Modo edición DESACTIVADO');
    }
  };

  const confirmarActivacion = () => {
    setModoEdicion(true);
    setShowModal(false);
    console.log('✏️ Modo edición ACTIVADO');
  };

  const cancelarActivacion = () => {
    setShowModal(false);
  };

  if (!posicionesCargadas) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: 'white',
        fontSize: '1.5rem'
      }}>
        Cargando edificio...
      </div>
    );
  }

  return (
    <div className="edificio-3d-container">
      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={showModal}
        onConfirm={confirmarActivacion}
        onCancel={cancelarActivacion}
        title="⚠️ Activar Modo Edición"
        message="Estás a punto de activar el modo de edición. Esto te permitirá mover los componentes del edificio (sensores, buzzers y LEDs). ¿Deseas continuar?"
      />

      {/* PANEL DE CONTROLES - AHORA COLAPSABLE */}
      <div className={`panel-controles ${mostrarControles ? 'expandido' : 'colapsado'}`}>
        {/* 🔥 BOTÓN PARA EXPANDIR/COLAPSAR */}
        <button
          className="toggle-panel-btn"
          onClick={() => setMostrarControles(!mostrarControles)}
          title={mostrarControles ? "Ocultar controles" : "Mostrar controles"}
        >
          {mostrarControles ? '▼ Ocultar Controles' : '▶ Mostrar Controles de Posición'}
        </button>

        {/* 🔥 CONTENIDO COLAPSABLE */}
        {mostrarControles && (
          <div className="controles-content">
            <div className="controles-header">
              <h3>🎮 Panel de Control</h3>
              <p className="controles-subtitle">Configuración del edificio</p>

              {/* 🔥 ESTADO EN TIEMPO REAL */}
              <div className="estado-tiempo-real">
                <div className="estado-item">
                  <span className={`estado-badge ${piso1Alerta ? 'alerta' : 'normal'}`}>
                    Piso 1: {piso1Alerta ? '🔴 ALERTA' : '✅ Normal'}
                  </span>
                </div>
                <div className="estado-item">
                  <span className={`estado-badge ${piso2Alerta ? 'alerta' : 'normal'}`}>
                    Piso 2: {piso2Alerta ? '🔴 ALERTA' : '✅ Normal'}
                  </span>
                </div>
                <div className="estado-item">
                  <span className={`estado-badge ${puertaAbierta ? 'puerta-abierta' : 'puerta-cerrada'}`}>
                    Puerta: {puertaAbierta ? '🚪 ABIERTA' : '🚪 CERRADA'}
                  </span>
                </div>
                {ultimaLectura && (
                  <div className="lecturas-actuales">
                    <small>Sensor 1: {ultimaLectura.valorSensor1}</small>
                    <small>Sensor 2: {ultimaLectura.valorSensor2}</small>
                  </div>
                )}
              </div>

              {/* 🔥 TOGGLE MODO EDICIÓN - AHORA DENTRO DEL PANEL COLAPSABLE */}
              <div className="modo-edicion-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={modoEdicion}
                    onChange={handleToggleModoEdicion}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-label">
                  {modoEdicion ? '🔓 Modo Edición' : '🔒 Bloqueado'}
                </span>
              </div>

              {modoEdicion && (
                <div className="modo-edicion-badge">
                  <span className="badge-icon">✏️</span>
                  <span className="badge-text">Modo Edición Activo</span>
                  <span className="badge-pulse"></span>
                </div>
              )}
            </div>

            {/* CONTROLES DE POSICIÓN */}
            <div className={`posicion-controls ${!modoEdicion ? 'disabled' : ''}`}>
              {!modoEdicion && (
                <div className="overlay-disabled">
                  <div className="overlay-message">
                    <span className="overlay-icon">🔒</span>
                    <p>Activa el <strong>Modo Edición</strong> para modificar las posiciones</p>
                  </div>
                </div>
              )}

              <div className="controls-header">
                <h4>🎮 Controles de Posición</h4>
                <span className="autosave-badge">
                  💾 AUTOSAVE ACTIVO
                </span>
              </div>

              <p className="controls-subtitle">
                Límites: X: -2.75 a 2.75, Z: -1.75 a 1.75
              </p>

              {/* SENSOR */}
              <div className="control-group sensor-group">
                <div className="control-group-header">
                  <span className="control-icon">📡</span>
                  <h5>Sensor (Derecha)</h5>
                </div>
                <div className="sliders-grid">
                  <label className="slider-control">
                    <span className="slider-label">X: {posiciones.sensor.x}</span>
                    <input
                      type="range"
                      min="-2.75"
                      max="2.75"
                      step="0.1"
                      value={posiciones.sensor.x}
                      onChange={(e) => actualizarPosicion('sensor', 'x', e.target.value)}
                      disabled={!modoEdicion}
                    />
                  </label>
                  <label className="slider-control">
                    <span className="slider-label">Y: {posiciones.sensor.y}</span>
                    <input
                      type="range"
                      min="-0.5"
                      max="0.7"
                      step="0.1"
                      value={posiciones.sensor.y}
                      onChange={(e) => actualizarPosicion('sensor', 'y', e.target.value)}
                      disabled={!modoEdicion}
                    />
                  </label>
                  <label className="slider-control">
                    <span className="slider-label">Z: {posiciones.sensor.z}</span>
                    <input
                      type="range"
                      min="-1.75"
                      max="1.75"
                      step="0.1"
                      value={posiciones.sensor.z}
                      onChange={(e) => actualizarPosicion('sensor', 'z', e.target.value)}
                      disabled={!modoEdicion}
                    />
                  </label>
                </div>
              </div>

              {/* BUZZER */}
              <div className="control-group buzzer-group">
                <div className="control-group-header">
                  <span className="control-icon">🔊</span>
                  <h5>Buzzer (Izquierda)</h5>
                </div>
                <div className="sliders-grid">
                  <label className="slider-control">
                    <span className="slider-label">X: {posiciones.buzzer.x}</span>
                    <input
                      type="range"
                      min="-2.75"
                      max="2.75"
                      step="0.1"
                      value={posiciones.buzzer.x}
                      onChange={(e) => actualizarPosicion('buzzer', 'x', e.target.value)}
                      disabled={!modoEdicion}
                    />
                  </label>
                  <label className="slider-control">
                    <span className="slider-label">Y: {posiciones.buzzer.y}</span>
                    <input
                      type="range"
                      min="-0.5"
                      max="0.7"
                      step="0.1"
                      value={posiciones.buzzer.y}
                      onChange={(e) => actualizarPosicion('buzzer', 'y', e.target.value)}
                      disabled={!modoEdicion}
                    />
                  </label>
                  <label className="slider-control">
                    <span className="slider-label">Z: {posiciones.buzzer.z}</span>
                    <input
                      type="range"
                      min="-1.75"
                      max="1.75"
                      step="0.1"
                      value={posiciones.buzzer.z}
                      onChange={(e) => actualizarPosicion('buzzer', 'z', e.target.value)}
                      disabled={!modoEdicion}
                    />
                  </label>
                </div>
              </div>

              {/* LED */}
              <div className="control-group led-group">
                <div className="control-group-header">
                  <span className="control-icon">💡</span>
                  <h5>LED (Centro)</h5>
                </div>
                <div className="sliders-grid">
                  <label className="slider-control">
                    <span className="slider-label">X: {posiciones.led.x}</span>
                    <input
                      type="range"
                      min="-2.75"
                      max="2.75"
                      step="0.1"
                      value={posiciones.led.x}
                      onChange={(e) => actualizarPosicion('led', 'x', e.target.value)}
                      disabled={!modoEdicion}
                    />
                  </label>
                  <label className="slider-control">
                    <span className="slider-label">Y: {posiciones.led.y}</span>
                    <input
                      type="range"
                      min="-0.5"
                      max="0.7"
                      step="0.1"
                      value={posiciones.led.y}
                      onChange={(e) => actualizarPosicion('led', 'y', e.target.value)}
                      disabled={!modoEdicion}
                    />
                  </label>
                  <label className="slider-control">
                    <span className="slider-label">Z: {posiciones.led.z}</span>
                    <input
                      type="range"
                      min="-1.75"
                      max="1.75"
                      step="0.1"
                      value={posiciones.led.z}
                      onChange={(e) => actualizarPosicion('led', 'z', e.target.value)}
                      disabled={!modoEdicion}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CANVAS 3D */}
      <div className="edificio-canvas">
        <Canvas
          camera={{ position: [8, 4, 8], fov: 50 }}
          shadows
        >
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-5, 5, -5]} intensity={0.5} color="#a78bfa" />
          <pointLight position={[5, 5, 5]} intensity={0.5} color="#4facfe" />

          <Edificio
            piso1Alerta={piso1Alerta}
            piso2Alerta={piso2Alerta}
            puertaAbierta={puertaAbierta}
            buzzerPiso1={buzzerPiso1}
            buzzerPiso2={buzzerPiso2}
            ledPiso1={ledPiso1}
            ledPiso2={ledPiso2}
            posiciones={posiciones}
          />

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#0a0a1a" />
          </mesh>

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={20}
            maxPolarAngle={Math.PI / 2}
            target={[0, 1, 0]}
          />
        </Canvas>
      </div>
    </div>
  );
}