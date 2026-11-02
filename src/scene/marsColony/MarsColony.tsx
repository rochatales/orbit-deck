import { ControlRoom } from './ControlRoom';
import { removeRoomForControlRoom } from './controlRoomColony';
import { PerimeterSoftLights } from './PerimeterSoftLights';
import { QuartelCirculation } from './QuartelCirculation';
import { Laboratorio } from './Laboratorio';
import { removeRoomForLaboratorio } from './laboratorioColony';
import { Quartel } from './Quartel';
import { removeRoomForQuartel } from './quartelColony';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { lazy, Suspense, useLayoutEffect, useRef } from 'react';
import { type Group, type BufferGeometry } from 'three';
import { Hangar } from './Hangar';
import { removeDockForHangar } from './hangarColony';
import type { OfficeWorld } from '../../world/createOfficeMap';
import { playerPosition } from '../../state/playerTransient';
import colonyUrl from '../../assets/colony-v007.glb';
import manifest from '../../assets/colony-v007.manifest.json';
import { MasterplanRuntime } from './masterplanRuntime';
import { DeckProps } from './DeckProps';
import { AresLanding } from './AresLanding';
import { Greenhouse } from './Greenhouse';
import { removeProvisionalGreenhouse } from './greenhouseRuntime';
import { sandwindPreviewEnabled } from './sandwindPolicy';
const ColonySandwind = lazy(() => import('./ColonySandwind').then(m => ({ default: m.ColonySandwind })));

/** GLB estritamente visual. Física vem de OfficeWorld via CuboidCollider. */
export function MarsColony({ world }: { world: OfficeWorld }) {
    const gltf = useGLTF(colonyUrl);
    const preview = sandwindPreviewEnabled(window.location.search), scope = useRef<Group>(null);
    const visual = useRef<Group>(null), runtime = useRef<MasterplanRuntime>();
    useLayoutEffect(() => {
        const scene = gltf.scene.clone(true), geometry: BufferGeometry[] = [];
        const filteredQuartel = removeRoomForQuartel(scene, removeDockForHangar(scene, removeProvisionalGreenhouse(scene, manifest), geometry), geometry);
        const filteredLab = removeRoomForLaboratorio(scene, filteredQuartel, geometry);
        const filtered = removeRoomForControlRoom(scene, filteredLab, geometry);
        const instance = new MasterplanRuntime(scene, filtered);
        runtime.current = instance; visual.current!.add(scene);
        return () => { scene.removeFromParent(); instance.dispose(); geometry.forEach(g => g.dispose()); runtime.current = undefined; };
    }, [gltf.scene]);
    useFrame((_, delta) => runtime.current?.update(playerPosition, delta));
    const visuals = <><group ref={visual} dispose={null}/><AresLanding/><DeckProps/><Greenhouse/><Hangar/><Quartel world={world}/><QuartelCirculation/><Laboratorio world={world}/><ControlRoom/><PerimeterSoftLights/></>;
    // Atmosfera fixa por padrão; ?sandwindPreview=0 conserva a comparação sem descarte.
    return preview ? <group ref={scope} name="SandwindColonyV007">{visuals}
        <Suspense fallback={null}><ColonySandwind scope={scope} masterplan={visual}/></Suspense>
    </group> : visuals;
}
