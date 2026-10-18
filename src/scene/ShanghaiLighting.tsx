import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SoftShadows } from '@react-three/drei';
import type { DirectionalLight, Object3D } from 'three';
import { playerPosition } from '../state/playerTransient';
/** Luz de céu empoeirado. A área de sombra acompanha o jogador sem ampliar o mapa de sombras. */
export function ShanghaiLighting() {
    const sun = useRef<DirectionalLight>(null), target = useRef<Object3D>(null);
    useFrame(() => {
        if (!sun.current || !target.current) return;
        target.current.position.set(playerPosition.x, 0, playerPosition.z);
        target.current.updateMatrixWorld();
        sun.current.position.set(playerPosition.x + 35, 65, playerPosition.z + 24);
        sun.current.target = target.current;
    });
    return <>
      <SoftShadows size={22} samples={10} focus={.35}/>
      <hemisphereLight args={['#e5e2cf', '#999181', 1.5]}/>
      <object3D ref={target}/>
      <directionalLight ref={sun} castShadow position={[35,65,24]} color="#fff0d2" intensity={1.2}
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-near={5} shadow-camera-far={160}
        shadow-camera-left={-32} shadow-camera-right={32} shadow-camera-top={32} shadow-camera-bottom={-32} shadow-bias={-.0002}/>
    </>;
}
