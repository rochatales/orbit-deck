import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { OfficeWorld } from '../../world/createOfficeMap';
import { playerPosition } from '../../state/playerTransient';
import colonyUrl from '../../assets/colony-v007.glb';
import manifest from '../../assets/colony-v007.manifest.json';
import { MasterplanRuntime } from './masterplanRuntime';
import { DeckProps } from './DeckProps';
import { AresLanding } from './AresLanding';
import { Greenhouse } from './Greenhouse';
import { removeProvisionalGreenhouse } from './greenhouseRuntime';

/** GLB estritamente visual. Física vem de OfficeWorld via CuboidCollider. */
export function MarsColony({ world: _world }: { world: OfficeWorld }) {
    const gltf = useGLTF(colonyUrl);
    const { scene, runtime } = useMemo(() => {
        const scene = gltf.scene.clone(true);
        return { scene, runtime: new MasterplanRuntime(scene, removeProvisionalGreenhouse(scene, manifest)) };
    }, [gltf.scene]);
    useEffect(() => () => runtime.dispose(), [runtime]);
    useFrame((_, delta) => runtime.update(playerPosition, delta));
    return <><primitive object={scene} dispose={null} /><AresLanding /><DeckProps /><Greenhouse /></>;
}
