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
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { OfficeMap } from '../world/OfficeMap';
import type { OfficeWorld } from '../world/createOfficeMap';
import type { MapId } from '../game/session';
export function OfficeScene({ world, map }: {
    world: OfficeWorld;
    map: MapId;
}) {
    const spawn = useExpeditionStore(s => s.spawn), revision = useExpeditionStore(s => s.session.revision);
    const a = EDEN_CHARACTER_ASSET;
    return <>
    <color attach="background" args={[map === 'mars' ? '#b4927a' : '#788382']}/>
    <fog attach="fog" args={[map === 'mars' ? '#b4927a' : '#788382', 45, 100]}/>
    <Lighting />
    <CameraRig key={revision} bounds={world.bounds} spawn={spawn}/>
    <PlayerAim key={revision}/>
    <PhysicsWorld officeWorld={world}>
      <OfficeMap officeWorld={world}/>
      <Player key={revision} officeWorld={world} spawn={spawn}/>
    </PhysicsWorld>
    {map === 'shanghai' && <CombatScene world={world}/>}
    <Spacecraft map={map}/>
    {map === 'mars' && <group position={[EDEN.position.x, 0, EDEN.position.z]}>
      <GLBCharacter {...a} animationState="idle"/>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><ringGeometry args={[1, 1.1, 32]}/><meshBasicMaterial color="#f2c94c"/></mesh>
    </group>}
  </>;
}
