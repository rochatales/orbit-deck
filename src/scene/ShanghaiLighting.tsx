import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SoftShadows } from '@react-three/drei';
import type { DirectionalLight } from 'three';
import { SHANGHAI_DAWN } from './lightingConfig';
import { ShadowFit } from './shadowFrustum';
/** Fim de noite: céu baixo, claridade distante; visor é a fonte próxima principal. */
export function ShanghaiLighting() {
    const sun = useRef<DirectionalLight>(null);
    const shadowFit = useMemo(() => new ShadowFit(), []);
    useFrame(({ camera }) => {
        if (sun.current) shadowFit.fit(sun.current, camera);
    });
    return <>
      <SoftShadows size={22} samples={10} focus={.35}/>
      <hemisphereLight args={[SHANGHAI_DAWN.skyColor, SHANGHAI_DAWN.groundColor, SHANGHAI_DAWN.hemisphereIntensity]}/>
      <directionalLight ref={sun} castShadow position={SHANGHAI_DAWN.sunPosition} color={SHANGHAI_DAWN.sunColor} intensity={SHANGHAI_DAWN.sunIntensity}
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-.0002} shadow-normalBias={SHANGHAI_DAWN.shadowNormalBias}/>
    </>;
}
