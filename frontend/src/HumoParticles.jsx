import { useEffect, useState } from "react";

const HumoParticles = ({ activo, piso }) => {
  const [particulas, setParticulas] = useState([]);

  useEffect(() => {
    if (!activo) {
      setParticulas([]);
      return;
    }

    // Crear partículas de humo más densas y notorias
    const nuevasParticulas = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 80 + 10, // Solo dentro del edificio (10% a 90%)
      y: Math.random() * 60 + 20,  // Desde la parte inferior hacia arriba del piso
      size: Math.random() * 12 + 8, // Más grandes (8-20px)
      opacity: Math.random() * 0.6 + 0.4, // Más opacas (0.4-1.0)
      speed: Math.random() * 0.3 + 0.2, // Más lentas
      delay: Math.random() * 2,
    }));

    setParticulas(nuevasParticulas);

    // Animar partículas
    const interval = setInterval(() => {
      setParticulas(prev => 
        prev.map(particula => ({
          ...particula,
          y: particula.y - particula.speed,
          x: particula.x + (Math.random() - 0.5) * 0.5,
          opacity: Math.max(0, particula.opacity - 0.01),
        })).filter(particula => particula.y > 0 && particula.opacity > 0.05)
      );

      // Agregar nuevas partículas más frecuentemente
      if (Math.random() < 0.6) {
        setParticulas(prev => [
          ...prev,
          {
            id: Date.now(),
            x: Math.random() * 80 + 10, // Solo dentro del edificio
            y: 80, // Desde la parte inferior del piso
            size: Math.random() * 12 + 8, // Más grandes
            opacity: Math.random() * 0.6 + 0.4, // Más opacas
            speed: Math.random() * 0.3 + 0.2, // Más lentas
            delay: 0,
          }
        ]);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [activo]);

  if (!activo) return null;

  return (
    <div 
      style={{
        position: "absolute",
        top: piso === "piso1" ? "45%" : "25%", // Dentro de cada piso específico
        left: "50%",
        transform: "translateX(-50%)",
        width: "120px", // Ajustado al ancho del edificio
        height: "80px", // Solo la altura del piso
        pointerEvents: "none",
        zIndex: 10,
        overflow: "hidden",
        border: "1px solid rgba(255,0,0,0.3)", // Debug: borde rojo para ver el área
      }}
    >
      {particulas.map(particula => (
        <div
          key={particula.id}
          style={{
            position: "absolute",
            left: `${particula.x}%`,
            top: `${particula.y}%`,
            width: `${particula.size}px`,
            height: `${particula.size}px`,
            backgroundColor: `rgba(80, 80, 80, ${particula.opacity})`,
            borderRadius: "50%",
            filter: "blur(2px)",
            transition: "all 0.1s ease-out",
            boxShadow: `0 0 ${particula.size}px rgba(100, 100, 100, ${particula.opacity * 0.5})`,
          }}
        />
      ))}
    </div>
  );
};

export default HumoParticles;