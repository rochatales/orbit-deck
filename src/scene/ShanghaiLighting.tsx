import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SoftShadows } from '@react-three/drei';
import type { DirectionalLight } from 'three';
import { ShadowFit } from './shadowFrustum';
// Mesma direção de sol da S6.3, (35, 65, 24), afastada para manter a caixa à frente da luz.
const SUN_POSITION: [number, number, number] = [70, 130, 48];
/** Luz de céu empoeirado. A caixa de sombra cobre a tela com passo de texel (ShadowFit, S6.12). */
export function ShanghaiLighting() {
    const sun = useRef<DirectionalLight>(null);
    const shadowFit = useMemo(() => new ShadowFit(), []);
    useFrame(({ camera }) => {
        if (sun.current) shadowFit.fit(sun.current, camera);
    });
    return <>
      <SoftShadows size={22} samples={10} focus={.35}/>
      <hemisphereLight args={['#e5e2cf', '#999181', 1.5]}/>
      <directionalLight ref={sun} castShadow position={SUN_POSITION} color="#fff0d2" intensity={1.2}
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-.0002}/>
    </>;
}
