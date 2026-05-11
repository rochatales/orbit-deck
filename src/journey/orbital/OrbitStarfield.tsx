import { useMemo } from "react";

interface Star {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

const STAR_COUNT = 90;

/**
 * Campo de estrelas decorativo do plano de fundo.
 * Não interativo. Gera uma vez por sessão para evitar reflow.
 */
export function OrbitStarfield() {
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: STAR_COUNT }, (_, index) => ({
      id: index,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 0.6 + Math.random() * 1.6,
      delay: Math.random() * 6,
      duration: 4 + Math.random() * 4,
      opacity: 0.2 + Math.random() * 0.7
    }));
  }, []);

  return (
    <div className="orbit-starfield" aria-hidden="true">
      <span className="orbit-nebula orbit-nebula-cyan" />
      <span className="orbit-nebula orbit-nebula-violet" />
      {stars.map((star) => (
        <span
          key={star.id}
          className="orbit-star"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`
          }}
        />
      ))}
    </div>
  );
}
