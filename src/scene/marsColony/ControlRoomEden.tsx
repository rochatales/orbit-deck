import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import { AdditiveBlending, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import { activationClock, useActivationSequence } from './activationSequence';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CONTROL_ROOM } from '../../game/controlRoomLayout';
import { simulationBlocked } from '../../game/simulationGate';
import { playerPosition } from '../../state/playerTransient';
import { useExpeditionStore } from '../../state/useExpeditionStore';
import { useGameStore } from '../../state/useGameStore';
import { useCampaignStore } from '../../state/useCampaignStore';
import url from '../../assets/characters/npcs/eden-v002.glb';
import { EDEN_FIGURE_SCALE, EdenRuntime } from './edenRuntime';

const { x, y, z } = CONTROL_ROOM.hologramAnchor;

/** EDEN sobre o emissor do pedestal, dentro dos anéis da projeção. */
export function ControlRoomEden() {
    const active = useCampaignStore(s => s.mode !== 'campaign' || !!s.saved?.campaign.edenActive);
    const gltf = useGLTF(url), visual = useRef<Group>(null), runtime = useRef<EdenRuntime>();
    const pulse = useRef<Mesh>(null), scan = useRef<Mesh>(null);
    useLayoutEffect(() => {
        const scene = clone(gltf.scene); scene.name = 'EdenFigura';
        const instance = new EdenRuntime(scene, gltf.animations);
        runtime.current = instance; visual.current!.add(scene);
        return () => { scene.removeFromParent(); instance.dispose(); runtime.current = undefined; };
    }, [gltf.scene, gltf.animations]);
    useFrame((_, delta) => {
        const instance = runtime.current;
        if (!instance || !visual.current || !pulse.current || !scan.current) return;
        const starting = useActivationSequence.getState().kind === 'edenActive';
        const t = activationClock.elapsed;
        const reveal = starting ? Math.max(0, Math.min(1, (t - .35) / 1.3)) : 1;
        visual.current.visible = active && reveal > 0;
        visual.current.scale.set(EDEN_FIGURE_SCALE, EDEN_FIGURE_SCALE * reveal, EDEN_FIGURE_SCALE);
        visual.current.position.y = y - (1 - reveal) * .37;
        pulse.current.visible = starting && t < 2.25;
        pulse.current.scale.setScalar(1 + .15 * Math.sin(t * 12));
        (pulse.current.material as MeshBasicMaterial).opacity = Math.min(1, t * 9) * Math.max(0, 1 - t / 2.25);
        scan.current.visible = starting && reveal > 0 && reveal < 1;
        scan.current.position.y = y - .29 + reveal * 1.65;
        (scan.current.material as MeshBasicMaterial).opacity = Math.sin(Math.PI * reveal) * .85;
        if (!active) return;
        // O painel da conversa bloqueia a simulação, mas ela continua gesticulando; só a pausa a congela.
        const talking = useExpeditionStore.getState().panel === 'eden';
        const running = talking ? !useGameStore.getState().isPaused : !simulationBlocked(starting);
        instance.update(playerPosition, running ? delta : 0, talking);
    });
    return <>
        <group ref={visual} name="ControlRoomEden" position={[x, y, z]} scale={EDEN_FIGURE_SCALE} visible={active} dispose={null}/>
        <mesh ref={pulse} visible={false} position={[x, y - .42, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[.51, .027, 8, 40]}/>
            <meshBasicMaterial color="#5ff8ff" transparent depthWrite={false} blending={AdditiveBlending}/>
        </mesh>
        <mesh ref={scan} visible={false} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[.47, .019, 8, 40]}/>
            <meshBasicMaterial color="#9ffbff" transparent depthWrite={false} blending={AdditiveBlending}/>
        </mesh>
    </>;
}
