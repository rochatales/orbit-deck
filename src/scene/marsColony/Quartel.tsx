import { bindBuildingPower } from './colonyPower';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import type { Group } from 'three';
import { playerPosition } from '../../state/playerTransient';
import { simulationBlocked } from '../../game/simulationGate';
import { QUARTEL } from '../../game/quartelLayout';
import type { OfficeWorld } from '../../world/createOfficeMap';
import url from '../../assets/quartel/barracks-v006.glb';
import shellUrl from '../../assets/quartel/quartel-casca-v001.glb';
import { applyColonyShell } from './colonyShell';
import { QuartelRuntime } from './quartelRuntime';
export const QUARTEL_SHELL_URL = shellUrl;

export function Quartel({ world }: { world: OfficeWorld }) {
    const gltf = useGLTF(url), shell = useGLTF(shellUrl), visual = useRef<Group>(null), runtime = useRef<QuartelRuntime>();
    const updatePower = useRef<() => number>(() => 0);
    useLayoutEffect(() => {
        const scene = gltf.scene.clone(true); scene.name = 'QuartelVisual';
        applyColonyShell(scene, shell.scene, ['Building_Roof', 'Wall_Corners']);
        const next = new QuartelRuntime(scene, gltf.animations, world.movingCuboids);
        updatePower.current = bindBuildingPower(scene, 'barracks');
        updatePower.current();
        runtime.current = next; visual.current!.add(scene);
        return () => { scene.removeFromParent(); next.dispose(); runtime.current = undefined; };
    }, [gltf.scene, shell.scene, gltf.animations, world]);
    useFrame((_, delta) => { updatePower.current(); runtime.current?.update(playerPosition, simulationBlocked() ? 0 : delta); });
    return <group name="Quartel"><group ref={visual} position={[QUARTEL.placement.x, QUARTEL.placement.y, QUARTEL.placement.z]}
        rotation={[0, QUARTEL.placement.rotationY, 0]} dispose={null}/></group>;
}
