import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

// Componente del edificio
function Edificio({ piso1Alerta, piso2Alerta, puertaAbierta }) {
  const piso1Ref = useRef();
  const piso2Ref = useRef();
  const puertaRef = useRef();
  
  // Animación de parpadeo cuando hay alerta
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (piso1Ref.current && piso1Alerta) {
      piso1Ref.current.material.emissiveIntensity = Math.sin(time * 5) * 0.5 + 0.5;
    }
    
    if (piso2Ref.current && piso2Alerta) {
      piso2Ref.current.material.emissiveIntensity = Math.sin(time * 5) * 0.5 + 0.5;
    }
  });

  // Color de los pisos según estado
  const colorPiso1 = piso1Alerta ? '#ff4444' : '#4facfe';
  const colorPiso2 = piso2Alerta ? '#ff4444' : '#a78bfa';

  return (
    <group position={[0, -1.5, 0]}>
      {/* Base del edificio */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[6, 0.2, 4]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* PISO 1 */}
      <group position={[0, 1, 0]}>
        {/* Estructura Piso 1 */}
        <mesh ref={piso1Ref} castShadow receiveShadow>
          <boxGeometry args={[5.5, 1.5, 3.5]} />
          <meshStandardMaterial 
            color={colorPiso1}
            emissive={colorPiso1}
            emissiveIntensity={piso1Alerta ? 0.8 : 0.2}
            transparent
            opacity={0.7}
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

        {/* Texto Piso 1 */}
        <Text
          position={[0, 0, 1.8]}
          fontSize={0.3}
          color={piso1Alerta ? '#ffffff' : '#000000'}
          anchorX="center"
          anchorY="middle"
        >
          PISO 1
        </Text>
      </group>

      {/* PISO 2 */}
      <group position={[0, 2.8, 0]}>
        {/* Estructura Piso 2 */}
        <mesh ref={piso2Ref} castShadow receiveShadow>
          <boxGeometry args={[5.5, 1.5, 3.5]} />
          <meshStandardMaterial 
            color={colorPiso2}
            emissive={colorPiso2}
            emissiveIntensity={piso2Alerta ? 0.8 : 0.2}
            transparent
            opacity={0.7}
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

        {/* Texto Piso 2 */}
        <Text
          position={[0, 0, 1.8]}
          fontSize={0.3}
          color={piso2Alerta ? '#ffffff' : '#000000'}
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

        {/* Cartel de puerta */}
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

      {/* Sensor en el medio (simulado) */}
      <group position={[0, 2.1, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.4, 16]} />
          <meshStandardMaterial 
            color={piso1Alerta || piso2Alerta ? '#ff4444' : '#10b981'}
            emissive={piso1Alerta || piso2Alerta ? '#ff0000' : '#059669'}
            emissiveIntensity={0.8}
          />
        </mesh>
        <Text
          position={[0, -0.4, 0]}
          fontSize={0.12}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          SENSOR
        </Text>
      </group>
    </group>
  );
}

// Componente principal exportable
export default function Edificio3D({ piso1Alerta, piso2Alerta, puertaAbierta }) {
  return (
    <div style={{ width: '100%', height: '500px' }}>
      <Canvas
        camera={{ position: [8, 4, 8], fov: 50 }}
        shadows
        style={{ background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)' }}
      >
        {/* Iluminación */}
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

        {/* Edificio */}
        <Edificio 
          piso1Alerta={piso1Alerta}
          piso2Alerta={piso2Alerta}
          puertaAbierta={puertaAbierta}
        />

        {/* Plano del suelo */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#0a0a1a" />
        </mesh>

        {/* Controles de órbita (rotar con mouse) */}
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
  );
}