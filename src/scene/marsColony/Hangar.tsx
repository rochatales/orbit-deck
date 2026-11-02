import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import { type Group } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { playerPosition } from '../../state/playerTransient';
import { useExpeditionStore } from '../../state/useExpeditionStore';
import { useGameStore } from '../../state/useGameStore';
import { HANGAR } from '../../game/hangarLayout';
import url from '../../assets/hangar/hangar-v002.glb';
import { HangarRuntime } from './hangarRuntime';

export function Hangar() {
    const gltf = useGLTF(url), visual = useRef<Group>(null), runtime = useRef<HangarRuntime>();
    useLayoutEffect(() => {
        const scene = clone(gltf.scene); scene.name = 'Hangar';
        const instance = new HangarRuntime(scene, gltf.animations);
        const state = useExpeditionStore.getState();
        if (state.session.phase === 'aboard') instance.startLanding();
        instance.setDeparture(state.session.map === 'mars' && state.session.phase === 'travelling');
        const off = useExpeditionStore.subscribe(state => {
            instance.setDeparture(state.session.map === 'mars' && state.session.phase === 'travelling');
            instance.update(playerPosition, 0); // evento de partida não depende de haver outro RAF antes da viagem
        });
        runtime.current = instance; visual.current!.add(scene);
        return () => { off(); scene.removeFromParent(); instance.dispose(); runtime.current = undefined; };
    }, [gltf.scene, gltf.animations]);
    useFrame((_, dt) => {
        const instance = runtime.current;
        if (!instance) return;
        const session = useExpeditionStore.getState().session;
        instance.setDeparture(session.map === 'mars' && session.phase === 'travelling');
        instance.update(playerPosition, useGameStore.getState().isPaused || document.hidden ? 0 : dt);
    });
    return <group ref={visual} position={[HANGAR.placement.x, HANGAR.placement.y, HANGAR.placement.z]} dispose={null}/>;
}
