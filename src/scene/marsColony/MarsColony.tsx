import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { Mesh } from 'three';
import { playerPosition } from '../../state/playerTransient';
import colonyUrl from '../../assets/colony-v006.glb';
import manifest from '../../assets/colony-v006.manifest.json';
import { ColonyVisibility } from './visibility';
import { applyColonyLayout } from './layout';

/** A geometria exportada é apenas visual: colisão continua nos retângulos do mapa. */
export function MarsColony() {
    const gltf = useGLTF(colonyUrl);
    const scene = useMemo(() => {
        const copy = gltf.scene.clone(true);
        copy.traverse(object => {
            if (object instanceof Mesh) { object.castShadow = true; object.receiveShadow = true; }
        });
        applyColonyLayout(copy);
        return copy;
    }, [gltf.scene]);
    const visibility = useMemo(() => new ColonyVisibility(scene, manifest.parts), [scene]);
    useEffect(() => () => visibility.dispose(), [visibility]);
    useFrame(({ camera }, delta) => visibility.update(playerPosition, camera.position, delta));
    return <primitive object={scene} dispose={null} />;
}
