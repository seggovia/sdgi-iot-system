import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';

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

    // Animación de sensores - AHORA CAMBIAN DE COLOR SEGÚN ALERTA
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

    // Animación de buzzers (vibración cuando están activos)
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

    // Animación de LEDs (parpadeo)
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

  // Colores de los pisos según estado
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
        {/* Estructura Piso 1 */}
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

        {/* SENSOR PISO 1 - CAMBIA DE COLOR SI HAY ALERTA */}
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

        {/* Texto Piso 1 - EN PARED IZQUIERDA */}
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
        {/* Estructura Piso 2 */}
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

        {/* SENSOR PISO 2 - CAMBIA DE COLOR SI HAY ALERTA */}
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

        {/* Texto Piso 2 - EN PARED IZQUIERDA */}
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

      {/* PUERTA PRINCIPAL */}
      <group position={[0, 0.8, 1.76]}>
        <mesh
          ref={puertaRef}
          rotation={[0, puertaAbierta ? -Math.PI / 2 : 0, 0]}
          position={[puertaAbierta ? 0.4 : 0, 0, 0]}
        >
          <boxGeometry args={[0.8, 1.4, 0.1]} />
          <meshStandardMaterial
            color={puertaAbierta ? '#34d399' : '#64748b'}
            emissive={puertaAbierta ? '#10b981' : '#1e293b'}
            emissiveIntensity={0.3}
          />
        </mesh>

        <Text
          position={[0, 0.9, 0.06]}
          fontSize={0.15}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {puertaAbierta ? 'ABIERTA' : 'CERRADA'}
        </Text>
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
    </group>
  );
}

// Componente principal exportable
export default function Edificio3D({
  piso1Alerta,
  piso2Alerta,
  puertaAbierta,
  buzzerPiso1 = false,
  buzzerPiso2 = false,
  ledPiso1 = false,
  ledPiso2 = false
}) {
  // Estados para controlar las posiciones
  const [posiciones, setPosiciones] = useState({
    sensor: { x: 1.8, y: 0, z: 1.0 },
    buzzer: { x: -1.8, y: 0, z: 1.0 },
    led: { x: 0, y: 0, z: 1.0 }
  });

  // Estado para mostrar/ocultar controles
  const [mostrarControles, setMostrarControles] = useState(false);

  const actualizarPosicion = (componente, eje, valor) => {
    setPosiciones(prev => ({
      ...prev,
      [componente]: {
        ...prev[componente],
        [eje]: parseFloat(valor)
      }
    }));
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Botón para mostrar/ocultar controles */}
      <button
        onClick={() => setMostrarControles(!mostrarControles)}
        style={{
          alignSelf: 'flex-end',
          padding: '0.75rem 1.5rem',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          fontWeight: '700',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
        }}
      >
        <span>⚙️ Editar Posiciones</span>
        <span style={{ 
          transform: mostrarControles ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease'
        }}>
          ▼
        </span>
      </button>

      {/* Controles (se muestran/ocultan con animación) */}
      <div style={{
        maxHeight: mostrarControles ? '1000px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px',
        boxShadow: mostrarControles ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
      }}>
        <div style={{ padding: mostrarControles ? '20px' : '0' }}>
          <h3 style={{ marginBottom: '15px', color: '#6366f1', fontWeight: 'bold' }}>
            🎮 Controles de Posición (Límites: X: -2.75 a 2.75, Z: -1.75 a 1.75)
          </h3>
          
          {/* Sensor */}
          <div style={{ marginBottom: '15px', padding: '10px', background: '#f0f9ff', borderRadius: '8px' }}>
            <h4 style={{ color: '#10b981', marginBottom: '10px' }}>📡 Sensor (Derecha)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>X: {posiciones.sensor.x}</span>
                <input
                  type="range"
                  min="-2.75"
                  max="2.75"
                  step="0.1"
                  value={posiciones.sensor.x}
                  onChange={(e) => actualizarPosicion('sensor', 'x', e.target.value)}
                  style={{ width: '100%' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Y: {posiciones.sensor.y}</span>
                <input
                  type="range"
                  min="-0.5"
                  max="0.7"
                  step="0.1"
                  value={posiciones.sensor.y}
                  onChange={(e) => actualizarPosicion('sensor', 'y', e.target.value)}
                  style={{ width: '100%' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Z: {posiciones.sensor.z}</span>
                <input
                  type="range"
                  min="-1.75"
                  max="1.75"
                  step="0.1"
                  value={posiciones.sensor.z}
                  onChange={(e) => actualizarPosicion('sensor', 'z', e.target.value)}
                  style={{ width: '100%' }}
                />
              </label>
            </div>
          </div>

          {/* Buzzer */}
          <div style={{ marginBottom: '15px', padding: '10px', background: '#fef3c7', borderRadius: '8px' }}>
            <h4 style={{ color: '#f59e0b', marginBottom: '10px' }}>🔊 Buzzer (Izquierda)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>X: {posiciones.buzzer.x}</span>
                <input
                  type="range"
                  min="-2.75"
                  max="2.75"
                  step="0.1"
                  value={posiciones.buzzer.x}
                  onChange={(e) => actualizarPosicion('buzzer', 'x', e.target.value)}
                  style={{ width: '100%' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Y: {posiciones.buzzer.y}</span>
                <input
                  type="range"
                  min="-0.5"
                  max="0.7"
                  step="0.1"
                  value={posiciones.buzzer.y}
                  onChange={(e) => actualizarPosicion('buzzer', 'y', e.target.value)}
                  style={{ width: '100%' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Z: {posiciones.buzzer.z}</span>
                <input
                  type="range"
                  min="-1.75"
                  max="1.75"
                  step="0.1"
                  value={posiciones.buzzer.z}
                  onChange={(e) => actualizarPosicion('buzzer', 'z', e.target.value)}
                  style={{ width: '100%' }}
                />
              </label>
            </div>
          </div>

          {/* LED */}
          <div style={{ padding: '10px', background: '#fee2e2', borderRadius: '8px' }}>
            <h4 style={{ color: '#ef4444', marginBottom: '10px' }}>💡 LED (Centro)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>X: {posiciones.led.x}</span>
                <input
                  type="range"
                  min="-2.75"
                  max="2.75"
                  step="0.1"
                  value={posiciones.led.x}
                  onChange={(e) => actualizarPosicion('led', 'x', e.target.value)}
                  style={{ width: '100%' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Y: {posiciones.led.y}</span>
                <input
                  type="range"
                  min="-0.5"
                  max="0.7"
                  step="0.1"
                  value={posiciones.led.y}
                  onChange={(e) => actualizarPosicion('led', 'y', e.target.value)}
                  style={{ width: '100%' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Z: {posiciones.led.z}</span>
                <input
                  type="range"
                  min="-1.75"
                  max="1.75"
                  step="0.1"
                  value={posiciones.led.z}
                  onChange={(e) => actualizarPosicion('led', 'z', e.target.value)}
                  style={{ width: '100%' }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas 3D */}
      <div style={{ width: '100%', height: '500px' }}>
        <Canvas
          camera={{ position: [8, 4, 8], fov: 50 }}
          shadows
          style={{ background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)' }}
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