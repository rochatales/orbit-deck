import { SANDWIND_APPEARANCE } from './marsColony/sandwindPolicy';
import { EngineerScene } from '../npcs/EngineerScene';
import { WorldInteractionBubbles } from '../interactions/WorldInteractionBubbles';
import { PlayerStepDust } from '../characters/player/PlayerStepDust';
import { DawnBackground } from './DawnBackground';
import { PlayerVisorLight } from './PlayerVisorLight';
import { SHANGHAI_DAWN } from './lightingConfig';
import { Suspense } from 'react';
import { Html } from '@react-three/drei';
import { isExpedition } from '../game/config';
import { RioAresLanding } from './RioAresLanding';
import { RIO_SKY, RioLighting } from './RioLighting';
import { ShanghaiLighting } from './ShanghaiLighting';
import { SceneReady } from './SceneReady';
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
import { ShanghaiClouds } from './ShanghaiClouds';
import { ShanghaiDecay } from './ShanghaiDecay';
import { useFrame } from '@react-three/fiber';
import { playerPosition } from '../state/playerTransient';

function ExpeditionAtmosphere({ world, phase01 }: { world: OfficeWorld; phase01: boolean }) {
    useFrame(({ camera }, dt) => {
        const step = Math.min(dt, 0.1), { limitsRuinFade, buildingFade } = world.group.userData;
        limitsRuinFade?.update(playerPosition.x, playerPosition.z, camera, step);
        buildingFade?.update(playerPosition.x, playerPosition.z, camera, step);
    });
    return phase01 ? <><ShanghaiClouds /><ShanghaiDecay world={world}/></> : null;
}

export function OfficeScene({ world, map }: {
    world: OfficeWorld;
    map: MapId;
}) {
    const spawn = useExpeditionStore(s => s.spawn), revision = useExpeditionStore(s => s.session.revision);
    const phase01 = map === 'shanghai' && isShanghaiPhase01();
    const combat = isExpedition(map), rio = map === 'rio';
    const sky = rio ? RIO_SKY : combat ? SHANGHAI_DAWN.horizon : SANDWIND_APPEARANCE.color;
    return <Suspense fallback={<Html center><p role="status">{map === 'mars' ? 'Carregando colônia de Marte…' : rio ? 'Carregando Rio de Janeiro…' : 'Carregando Shanghai fase 01…'}</p></Html>}><ShanghaiAssetGate world={world}><>
    {map !== 'shanghai' ? <color attach="background" args={[sky]}/> : <DawnBackground/>}
    <fog attach="fog" args={map === 'mars' ? [sky, 130, 270] : rio ? [sky, 85, 180] : [sky, SHANGHAI_DAWN.fogNear, SHANGHAI_DAWN.fogFar]}/>
    {rio ? <RioLighting/> : combat ? <ShanghaiLighting/> : <Lighting/>}
    {/* Recuo ×3 no mesmo eixo ortográfico: torres de Marte (S6.12) e prédios da fase 01 (S6.3). */}
    <CameraRig key={`camera-${revision}`} bounds={world.bounds} spawn={spawn} map={map} framing={map === 'shanghai' ? SHANGHAI_FRAMING : undefined} distanceScale={map === 'mars' || phase01 || rio ? 3 : 1}/>
    <PlayerAim key={`aim-${revision}`}/>
    <PhysicsWorld officeWorld={world}>
      <OfficeMap officeWorld={world} animate={combat}/>
      <Player key={revision} officeWorld={world} spawn={spawn}/>
      {map === 'mars' && <EngineerScene world={world}/>}
    </PhysicsWorld>
    <PlayerStepDust key={`dust-${map}-${revision}`} world={world} map={map}/>
    {combat && <><CombatScene world={world} map={map}/>{!rio && <PlayerVisorLight/>}</>}
    {(phase01 || rio) && <ExpeditionAtmosphere world={world} phase01={phase01}/>}
    {map === 'mars' ? <MarsColony world={world}/> : rio ? <RioAresLanding/> : <Spacecraft map={map}/>}
    <WorldInteractionBubbles key={`interactions-${map}-${revision}`} map={map} world={world}/>
    <PlayerReticle key={`reticle-${revision}`} world={world} combat={combat}/>
    <SceneReady world={world}/>
  </></ShanghaiAssetGate></Suspense>;
}
