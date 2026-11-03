import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import type { Group } from 'three';
import { playerPosition } from '../../state/playerTransient';
import { simulationBlocked } from '../../game/simulationGate';
import url from '../../assets/control-room/control-room-v002.glb';
import { ControlRoomRuntime } from './controlRoomRuntime';

export function ControlRoom() {
    const gltf = useGLTF(url);
    const visual = useRef<Group>(null);
    const runtime = useRef<ControlRoomRuntime>();

    useLayoutEffect(() => {
        const scene = gltf.scene.clone(true);
        scene.name = 'ControlRoomVisual';
        const next = new ControlRoomRuntime(scene);
        runtime.current = next;
        visual.current!.add(scene);
        return () => {
            scene.removeFromParent();
            next.dispose();
            runtime.current = undefined;
        };
    }, [gltf.scene]);

    useFrame((_, delta) => runtime.current?.update(playerPosition, simulationBlocked() ? 0 : delta));

    return (
        <group name="ControlRoom">
            <group ref={visual} dispose={null} />
        </group>
    );
}
