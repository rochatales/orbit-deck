import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Mesh } from 'three';
import rocketUrl from '../assets/rocket-b3/rocket-b3.glb';
import { playerPosition } from '../state/playerTransient';
import { MAPS } from './config';
import { RocketFade } from './rocketFade';
import type { MapId } from './session';

/**
 * Shanghai: só o foguete da colônia estacionado no chão, sem base (pedido do
 * autor, 18/10/2026; asset de scripts/export-rocket-b3.py). Colisão em
 * addRocketCollisions. Marte mantém a nave provisória até a S6.12.
 */
function ParkedRocket({ x, z }: { x: number; z: number }) {
    const gltf = useGLTF(rocketUrl);
    // Cópia e materiais próprios juntos: o cache do GLTF nunca é alterado nem descartado.
    const { scene, fade } = useMemo(() => {
        const copy = gltf.scene.clone(true);
        copy.position.set(x, 0, z);
        copy.traverse(o => { if (o instanceof Mesh) { o.castShadow = true; o.receiveShadow = true; } });
        return { scene: copy, fade: new RocketFade(copy) };
    }, [gltf, x, z]);
    useEffect(() => () => fade.dispose(), [fade]);
    useFrame(({ camera }, dt) => fade.update(playerPosition.x, playerPosition.z, camera, Math.min(dt, 0.1)));
    return <primitive object={scene}/>;
}

export function Spacecraft({ map }: {
    map: MapId;
}) {
    const p = MAPS[map].ship;
    if (map === 'shanghai') return <ParkedRocket x={p.x} z={p.z}/>;
    return <group position={[p.x, 0, p.z]}>
    {/* Open-roof cabin: the boarded explorer remains visible. Front is the access ramp. */}
    <mesh position={[0, 0.08, 0]} receiveShadow><boxGeometry args={[3.4, 0.16, 4.2]}/><meshStandardMaterial color="#d2dce0"/></mesh>
    {[-1.8, 1.8].map(x => <group key={x} position={[x, 0.6, 0]}>
      <mesh castShadow><boxGeometry args={[0.45, 1.2, 4.5]}/><meshStandardMaterial color="#b4c1c8"/></mesh>
      <mesh position={[x < 0 ? -0.65 : 0.65, -0.15, 0.5]} castShadow><boxGeometry args={[1.4, 0.25, 2]}/><meshStandardMaterial color="#78939f"/></mesh>
    </group>)}
    <mesh position={[0, 0.65, 2]} castShadow><boxGeometry args={[3.4, 1.3, 0.5]}/><meshStandardMaterial color="#466578"/></mesh>
    <mesh position={[0, 0.015, -2.8]} receiveShadow><boxGeometry args={[2, 0.06, 1.6]}/><meshStandardMaterial color="#69dfee"/></mesh>
    <mesh position={[0, 0.8, 1.45]}><boxGeometry args={[1.6, 0.18, 0.4]}/><meshStandardMaterial color="#66e6ff" emissive="#2299aa" emissiveIntensity={0.5}/></mesh>
  </group>;
}
