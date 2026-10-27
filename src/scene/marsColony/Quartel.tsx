import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import type { Group } from 'three';
import { playerPosition } from '../../state/playerTransient';
import { simulationBlocked } from '../../game/simulationGate';
import { QUARTEL } from '../../game/quartelLayout';
import type { OfficeWorld } from '../../world/createOfficeMap';
import url from '../../assets/quartel/barracks-v004.glb';
import { QuartelRuntime } from './quartelRuntime';

export function Quartel({ world }: { world: OfficeWorld }) {
    const gltf = useGLTF(url), visual = useRef<Group>(null), runtime = useRef<QuartelRuntime>();
    useLayoutEffect(() => {
        const scene = gltf.scene.clone(true); scene.name = 'QuartelVisual';
        const next = new QuartelRuntime(scene, gltf.animations, world.movingCuboids);
        runtime.current = next; visual.current!.add(scene);
        return () => { scene.removeFromParent(); next.dispose(); runtime.current = undefined; };
    }, [gltf.scene, gltf.animations, world]);
    useFrame((_, delta) => runtime.current?.update(playerPosition, simulationBlocked() ? 0 : delta));
    return <group name="Quartel"><group ref={visual} position={[QUARTEL.placement.x, QUARTEL.placement.y, QUARTEL.placement.z]}
        rotation={[0, QUARTEL.placement.rotationY, 0]} dispose={null}/></group>;
}
