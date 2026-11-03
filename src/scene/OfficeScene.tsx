import { Suspense } from 'react';
import { Html } from '@react-three/drei';
import { ShanghaiLighting } from './ShanghaiLighting';
import { ShanghaiAssetGate } from './ShanghaiAssetGate';
import { PlayerAim } from '../characters/player/PlayerAim';
import { CombatScene } from '../combat/CombatScene';
import { GLBCharacter } from '../characters/GLBCharacter';
import { EDEN_CHARACTER_ASSET } from '../characters/characterAssetConfig';
import { Player } from '../characters/player/Player';
import { EDEN } from '../game/config';
import { Spacecraft } from '../game/Spacecraft';
import { useExpeditionStore } from '../state/useExpeditionStore';
import { CameraRig } from './CameraRig';
import { Lighting } from './Lighting';
import { SHANGHAI_FRAMING } from './cameraFraming';
import { isShanghaiPhase01 } from '../game/shanghai/previewMode';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { OfficeMap } from '../world/OfficeMap';
import type { OfficeWorld } from '../world/createOfficeMap';
import type { MapId } from '../game/session';
import { MarsColony } from './marsColony/MarsColony';
import { ShanghaiClouds } from './ShanghaiClouds';
import { useFrame } from '@react-three/fiber';
import { playerPosition } from '../state/playerTransient';

function ShanghaiAtmosphere({ world }: { world: OfficeWorld }) {
    useFrame(({ camera }, dt) => {
        const fade = world.group.userData.limitsRuinFade;
        if (fade) {
            fade.update(playerPosition.x, playerPosition.z, camera, Math.min(dt, 0.1));
        }
    });
    return <ShanghaiClouds />;
}

export function OfficeScene({ world, map }: {
    world: OfficeWorld;
    map: MapId;
}) {
    const spawn = useExpeditionStore(s => s.spawn), revision = useExpeditionStore(s => s.session.revision);
    const a = EDEN_CHARACTER_ASSET;
    const phase01 = map === 'shanghai' && isShanghaiPhase01();
    const sky = map === 'mars' ? '#b4927a' : phase01 ? '#88877d' : '#788382';
    return <Suspense fallback={<Html center><p role="status">Carregando Shanghai fase 01…</p></Html>}><ShanghaiAssetGate world={world}><>
    <color attach="background" args={[sky]}/>
    <fog attach="fog" args={map === 'mars' ? [sky, 130, 270] : phase01 ? [sky, 100, 220] : [sky, 45, 100]}/>
    {phase01 ? <ShanghaiLighting/> : <Lighting/>}
    {/* Recuo ×3 no mesmo eixo ortográfico: torres de Marte (S6.12) e prédios da fase 01 (S6.3). */}
    <CameraRig key={`camera-${revision}`} bounds={world.bounds} spawn={spawn} framing={map === 'shanghai' ? SHANGHAI_FRAMING : undefined} distanceScale={map === 'mars' || phase01 ? 3 : 1}/>
    <PlayerAim key={`aim-${revision}`}/>
    <PhysicsWorld officeWorld={world}>
      <OfficeMap officeWorld={world} animate={map !== 'mars'}/>
      <Player key={revision} officeWorld={world} spawn={spawn}/>
    </PhysicsWorld>
    {map === 'shanghai' && <CombatScene world={world}/>}
    {phase01 && <ShanghaiAtmosphere world={world}/>}
    {map === 'mars' ? <MarsColony world={world}/> : <Spacecraft map={map}/>}
    {map === 'mars' && <group position={[EDEN.position.x, 0, EDEN.position.z]}>
      <GLBCharacter {...a} animationState="idle"/>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><ringGeometry args={[1, 1.1, 32]}/><meshBasicMaterial color="#f2c94c"/></mesh>
    </group>}
  </></ShanghaiAssetGate></Suspense>;
}
