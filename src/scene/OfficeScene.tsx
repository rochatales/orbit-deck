import { WorldInteractionBubbles } from '../interactions/WorldInteractionBubbles';
import { PlayerStepDust } from '../characters/player/PlayerStepDust';
import { DawnBackground } from './DawnBackground';
import { PlayerVisorLight } from './PlayerVisorLight';
import { SHANGHAI_DAWN } from './lightingConfig';
import { Suspense } from 'react';
import { Html } from '@react-three/drei';
import { ShanghaiLighting } from './ShanghaiLighting';
import { ShanghaiAssetGate } from './ShanghaiAssetGate';
import { PlayerReticle } from '../characters/player/PlayerReticle';
import { PlayerAim } from '../characters/player/PlayerAim';
import { CombatScene } from '../combat/CombatScene';
import { Player } from '../characters/player/Player';
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
export function OfficeScene({ world, map }: {
    world: OfficeWorld;
    map: MapId;
}) {
    const spawn = useExpeditionStore(s => s.spawn), revision = useExpeditionStore(s => s.session.revision);
    const phase01 = map === 'shanghai' && isShanghaiPhase01();
    const sky = map === 'mars' ? '#b4927a' : SHANGHAI_DAWN.horizon;
    return <Suspense fallback={<Html center><p role="status">Carregando Shanghai fase 01…</p></Html>}><ShanghaiAssetGate world={world}><>
    {map === 'mars' ? <color attach="background" args={[sky]}/> : <DawnBackground/>}
    <fog attach="fog" args={map === 'mars' ? [sky, 130, 270] : [sky, SHANGHAI_DAWN.fogNear, SHANGHAI_DAWN.fogFar]}/>
    {map === 'shanghai' ? <ShanghaiLighting/> : <Lighting/>}
    {/* Recuo ×3 no mesmo eixo ortográfico: torres de Marte (S6.12) e prédios da fase 01 (S6.3). */}
    <CameraRig key={`camera-${revision}`} bounds={world.bounds} spawn={spawn} framing={map === 'shanghai' ? SHANGHAI_FRAMING : undefined} distanceScale={map === 'mars' || phase01 ? 3 : 1}/>
    <PlayerAim key={`aim-${revision}`}/>
    <PhysicsWorld officeWorld={world}>
      <OfficeMap officeWorld={world} animate={map !== 'mars'}/>
      <Player key={revision} officeWorld={world} spawn={spawn}/>
    </PhysicsWorld>
    <PlayerStepDust key={`dust-${map}-${revision}`} world={world} map={map}/>
    {map === 'shanghai' && <><CombatScene world={world}/><PlayerVisorLight/></>}
    {map === 'mars' ? <MarsColony world={world}/> : <Spacecraft map={map}/>}
    <WorldInteractionBubbles key={`interactions-${map}-${revision}`} map={map} world={world}/>
    <PlayerReticle key={`reticle-${revision}`} world={world} combat={map === 'shanghai'}/>
  </></ShanghaiAssetGate></Suspense>;
}
