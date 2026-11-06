import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import type { Group } from 'three';
import { COLONY_BUILDINGS } from '../../game/colonyBuildingsLayout';
import { simulationBlocked } from '../../game/simulationGate';
import { playerPosition } from '../../state/playerTransient';
import type { OfficeWorld } from '../../world/createOfficeMap';
import { ColonyBuildingRuntime } from './colonyBuildingRuntime';
import dataCenterUrl from '../../assets/buildings/data-center.glb';
import meetingRoomUrl from '../../assets/buildings/meeting-room.glb';
import cafeteriaUrl from '../../assets/buildings/cafeteria.glb';
import workshopUrl from '../../assets/buildings/workshop.glb';
import { engineerPresence } from '../../npcs/engineerPresence';
export const COLONY_BUILDING_URLS = [meetingRoomUrl, dataCenterUrl, cafeteriaUrl, workshopUrl];
export function ColonyBuildings({ world }: { world: OfficeWorld }) {
    return <>{COLONY_BUILDINGS.map((b, index) => <Building key={b.id} index={index} world={world}/>)}</>;
}
function Building({ index, world }: { index: number; world: OfficeWorld }) {
    const gltf = useGLTF(COLONY_BUILDING_URLS[index]), root = useRef<Group>(null), runtime = useRef<ColonyBuildingRuntime>();
    useLayoutEffect(() => {
        const scene = gltf.scene.clone(true), next = new ColonyBuildingRuntime(scene, gltf.animations, COLONY_BUILDINGS[index], world.movingCuboids ?? []);
        root.current!.add(scene); runtime.current = next;
        return () => { runtime.current = undefined; scene.removeFromParent(); next.dispose(); };
    }, [gltf.scene, gltf.animations, index, world]);
    useFrame((_, dt) => runtime.current?.update(playerPosition, simulationBlocked() ? 0 : dt,
        engineerPresence.active && (COLONY_BUILDINGS[index].id === 'data-center' || COLONY_BUILDINGS[index].id === 'workshop') ? engineerPresence : undefined));
    return <group ref={root} name={`ColonyBuilding-${COLONY_BUILDINGS[index].id}`} dispose={null}/>;
}
