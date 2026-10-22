import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { OfficeWorld } from '../../world/createOfficeMap';
import { Mesh, Vector3 } from 'three';
import { playerPosition } from '../../state/playerTransient';
import colonyUrl from '../../assets/colony-v006.glb';
import manifest from '../../assets/colony-v006.manifest.json';
import { ColonyVisibility } from './visibility';
import { applyColonyLayout } from './layout';
import { AresLanding } from './AresLanding';

/** A geometria exportada é apenas visual: colisão continua nos retângulos do mapa. */
export function MarsColony({ world }: { world: OfficeWorld }) {
    const gltf = useGLTF(colonyUrl);
    const scene = useMemo(() => {
        const copy = gltf.scene.clone(true);
        copy.traverse(object => {
            if (object instanceof Mesh) { object.castShadow = true; object.receiveShadow = true; }
        });
        applyColonyLayout(copy);
        return copy;
    }, [gltf.scene]);
    const visibility = useMemo(() => new ColonyVisibility(scene, manifest.parts, world.group), [scene, world]);
    useEffect(() => () => visibility.dispose(), [visibility]);
    const position = useMemo(() => new Vector3(), []);
    useFrame(({ camera }, delta) => {
        position.set(playerPosition.x, playerPosition.y, playerPosition.z);
        world.update(position, delta);
        visibility.update(playerPosition, camera.position, delta);
    });
    return <><primitive object={scene} dispose={null} /><AresLanding /></>;
}
