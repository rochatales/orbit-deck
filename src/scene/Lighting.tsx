import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { SoftShadows } from "@react-three/drei";
import type { DirectionalLight } from "three";
import { MARS_SUNRISE } from "./lightingConfig";
import { ShadowFit, DEFAULT_SHADOW_FIT } from "./shadowFrustum";

export function Lighting() {
  const sun = useRef<DirectionalLight>(null);
  const shadowFit = useMemo(() => new ShadowFit({ ...DEFAULT_SHADOW_FIT, casterReach: MARS_SUNRISE.shadowReach }), []);
  // A caixa de sombra acompanha a área vista pela câmera (ver shadowFrustum.ts).
  useFrame(({ camera }) => {
    if (sun.current) shadowFit.fit(sun.current, camera);
  });
  return (
    <>
      <SoftShadows size={18} samples={10} focus={0.45} />
      <hemisphereLight args={[MARS_SUNRISE.skyColor, MARS_SUNRISE.groundColor, MARS_SUNRISE.hemisphereIntensity]} />
      <directionalLight
        ref={sun}
        castShadow
        position={MARS_SUNRISE.sunPosition}
        color={MARS_SUNRISE.sunColor}
        intensity={MARS_SUNRISE.sunIntensity}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0003}
        shadow-normalBias={MARS_SUNRISE.shadowNormalBias}
      />
    </>
  );
}
