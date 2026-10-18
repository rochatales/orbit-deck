import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { SoftShadows } from "@react-three/drei";
import type { DirectionalLight } from "three";
import { ShadowFit } from "./shadowFrustum";

// Mesma direção de sol de antes, (11, 16, 9); a distância maior mantém toda a
// caixa ajustada à frente da luz (profundidades positivas).
const SUN_POSITION: [number, number, number] = [44, 64, 36];

export function Lighting() {
  const sun = useRef<DirectionalLight>(null);
  const shadowFit = useMemo(() => new ShadowFit(), []);
  // A caixa de sombra acompanha a área vista pela câmera (ver shadowFrustum.ts).
  useFrame(({ camera }) => {
    if (sun.current) shadowFit.fit(sun.current, camera);
  });
  return (
    <>
      <SoftShadows size={18} samples={10} focus={0.45} />
      <hemisphereLight args={["#fff5df", "#c8b8a5", 1.05]} />
      <directionalLight
        ref={sun}
        castShadow
        position={SUN_POSITION}
        intensity={1.6}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0003}
      />
      <pointLight position={[0, 6.5, 2]} intensity={16} distance={40} decay={2} color="#ffe9c8" />
    </>
  );
}
