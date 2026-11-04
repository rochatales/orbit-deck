import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import { type Group } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CONTROL_ROOM } from '../../game/controlRoomLayout';
import { simulationBlocked } from '../../game/simulationGate';
import { playerPosition } from '../../state/playerTransient';
import { useExpeditionStore } from '../../state/useExpeditionStore';
import { useGameStore } from '../../state/useGameStore';
import url from '../../assets/characters/npcs/eden-v002.glb';
import { EDEN_FIGURE_SCALE, EdenRuntime } from './edenRuntime';

const { x, y, z } = CONTROL_ROOM.hologramAnchor;

/** EDEN sobre o emissor do pedestal, dentro dos anéis da projeção. */
export function ControlRoomEden() {
    const gltf = useGLTF(url), visual = useRef<Group>(null), runtime = useRef<EdenRuntime>();
    useLayoutEffect(() => {
        const scene = clone(gltf.scene); scene.name = 'EdenFigura';
        const instance = new EdenRuntime(scene, gltf.animations);
        runtime.current = instance; visual.current!.add(scene);
        return () => { scene.removeFromParent(); instance.dispose(); runtime.current = undefined; };
    }, [gltf.scene, gltf.animations]);
    useFrame((_, delta) => {
        const instance = runtime.current;
        if (!instance) return;
        // O painel da conversa bloqueia a simulação, mas ela continua gesticulando; só a pausa a congela.
        const talking = useExpeditionStore.getState().panel === 'eden';
        const running = talking ? !useGameStore.getState().isPaused : !simulationBlocked();
        instance.update(playerPosition, running ? delta : 0, talking);
    });
    return <group ref={visual} name="ControlRoomEden" position={[x, y, z]} scale={EDEN_FIGURE_SCALE} dispose={null}/>;
}
