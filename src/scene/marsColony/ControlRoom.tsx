import { bindBuildingPower } from './colonyPower';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import type { Group } from 'three';
import { playerPosition } from '../../state/playerTransient';
import { simulationBlocked } from '../../game/simulationGate';
import url from '../../assets/control-room/control-room-v002.glb';
import { bindControlRoomScreens } from './controlRoomScreens';
import { ControlRoomRuntime } from './controlRoomRuntime';

export function ControlRoom() {
    const gltf = useGLTF(url);
    const visual = useRef<Group>(null);
    const runtime = useRef<ControlRoomRuntime>();

    const updatePower = useRef<() => void>(() => {});
    useLayoutEffect(() => {
        const scene = gltf.scene.clone(true);
        scene.name = 'ControlRoomVisual';
        const next = new ControlRoomRuntime(scene);
        const power = bindBuildingPower(scene, 'control-room', level => next.setPowered(level > .08));
        const screens = bindControlRoomScreens(scene);
        updatePower.current = () => screens.update(power());
        updatePower.current();
        runtime.current = next;
        visual.current!.add(scene);
        return () => {
            scene.removeFromParent();
            screens.dispose();
            next.dispose();
            runtime.current = undefined;
        };
    }, [gltf.scene]);

    useFrame((_, delta) => { updatePower.current(); runtime.current?.update(playerPosition, simulationBlocked() ? 0 : delta); });

    return (
        <group name="ControlRoom">
            <group ref={visual} dispose={null} />
        </group>
    );
}
