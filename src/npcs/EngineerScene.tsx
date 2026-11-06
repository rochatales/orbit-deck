import { useMemo, useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { CapsuleCollider, CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Group } from 'three';
import type { OfficeWorld } from '../world/createOfficeMap';
import { EngineerRoutine, ENGINEER, engineerIsCalm, engineerPreviewMood } from './engineerRoutine';
import { EngineerRig } from './engineerRig';
import { engineerPresence, canTalkToEngineer } from './engineerPresence';
import { playerPosition } from '../state/playerTransient';
import { useExpeditionStore } from '../state/useExpeditionStore';
import { useCampaignStore } from '../state/useCampaignStore';
import { useGameStore } from '../state/useGameStore';
import { InteractionBubble } from '../interactions/InteractionBubble';
import url from '../assets/characters/npcs/engenheiro-v001.glb';

const talk = () => useExpeditionStore.getState().openEngineer();
const available = () => canTalkToEngineer(playerPosition);
export function EngineerScene({ world }: { world: OfficeWorld }) {
    const gltf = useGLTF(url), body = useRef<RapierRigidBody>(null), visual = useRef<Group>(null);
    const routine = useMemo(() => new EngineerRoutine(world), [world]);
    const rig = useRef<EngineerRig>(), clock = useRef(0);
    const previewMood = useMemo(() => engineerPreviewMood(window.location.search), []);
    useLayoutEffect(() => {
        const root = clone(gltf.scene), instance = new EngineerRig(root, gltf.animations);
        visual.current!.add(root); rig.current = instance;
        engineerPresence.x = routine.state.x; engineerPresence.y = routine.state.y; engineerPresence.z = routine.state.z;
        engineerPresence.world = world; engineerPresence.active = true;
        return () => {
            root.removeFromParent(); instance.dispose(); rig.current = undefined;
            if (engineerPresence.world === world) { engineerPresence.active = false; engineerPresence.world = null; }
        };
    }, [gltf.scene, gltf.animations, routine, world]);
    useFrame((_, delta) => {
        const expedition = useExpeditionStore.getState(), campaign = useCampaignStore.getState();
        const talking = expedition.panel === 'engineer';
        const paused = useGameStore.getState().isPaused || !expedition.ready || expedition.session.phase !== 'walking'
            || (expedition.panel !== null && !talking);
        const dt = paused ? 0 : Math.min(.05, delta);
        const calm = engineerIsCalm(campaign.mode, campaign.saved?.campaign.edenActive ?? false, previewMood);
        clock.current += dt;
        while (clock.current >= 1 / 60) {
            routine.update(1 / 60, playerPosition, talking, calm);
            clock.current -= 1 / 60;
        }
        const s = routine.state;
        engineerPresence.x = s.x; engineerPresence.y = s.y; engineerPresence.z = s.z;
        body.current?.setNextKinematicTranslation(s);
        rig.current?.update(s, dt);
    });
    return <>
        <RigidBody ref={body} name="Engenheiro" type="kinematicPosition" colliders={false} canSleep={false} friction={0} position={[ENGINEER.start.x, 0, ENGINEER.start.z]}>
            <CapsuleCollider args={[ENGINEER.height / 2 - ENGINEER.radius, ENGINEER.radius]} position={[0, ENGINEER.height / 2, 0]} friction={0}/>
            <group ref={visual} name="EngenheiroVisual" dispose={null}/>
            <InteractionBubble id="npc:engineer" label="Conversar com o Engenheiro" point={engineerPresence} radius={ENGINEER.interactionRadius} priority={30}
                position={[0, ENGINEER.height + .4, 0]} available={available} onInteract={talk}/>
        </RigidBody>
        {/* Assento provisório: pés e quadril do Sitting fornecido apoiam nesta cota. */}
        <RigidBody type="fixed" colliders={false} position={[-10.3, 0, 13]} name="BancoDoEngenheiro">
            <CuboidCollider args={[.27, .225, .27]} position={[0, .225, 0]}/>
            <mesh position={[0, .42, 0]} castShadow><cylinderGeometry args={[.28, .28, .07, 12]}/><meshStandardMaterial color="#879395" roughness={.85}/></mesh>
            <mesh position={[0, .2, 0]} castShadow><cylinderGeometry args={[.065, .065, .4, 8]}/><meshStandardMaterial color="#454f50" roughness={.8}/></mesh>
            <mesh position={[0, .025, 0]} castShadow><cylinderGeometry args={[.24, .24, .05, 12]}/><meshStandardMaterial color="#454f50" roughness={.8}/></mesh>
        </RigidBody>
    </>;
}
