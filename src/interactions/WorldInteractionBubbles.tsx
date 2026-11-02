import { EDEN, MAPS } from '../game/config';
import type { MapId } from '../game/session';
import type { OfficeWorld } from '../world/createOfficeMap';
import { SHIP_INTERACTION_RADIUS, playerPosition } from '../state/playerTransient';
import { useExpeditionStore } from '../state/useExpeditionStore';
import { combatRuntime } from '../state/useCombatStore';
import { SHANGHAI_SUPPLY_CRATES, SUPPLY_CRATE } from '../game/props/supplyCrate';
import { interactWithSupplyCrate } from '../game/props/crateInteraction';
import { InteractionBubble, NpcInteractionBubble } from './InteractionBubble';
const board = () => useExpeditionStore.getState().send('board');
const talkToEden = () => useExpeditionStore.getState().openEden();
export function WorldInteractionBubbles({ map, world }: { map: MapId; world: OfficeWorld }) {
    const exit = MAPS[map].exit;
    const height = (x: number, z: number) => world.surfaceHeight?.(x, z) ?? world.supportHeight?.(x, z) ?? 0;
    return <>
        <InteractionBubble id={`ship:${map}`} label="Entrar na aeronave" point={exit} radius={SHIP_INTERACTION_RADIUS} priority={10}
            position={[exit.x, height(exit.x, exit.z) + 1.8, exit.z]} onInteract={board}/>
        {map === 'mars' && <NpcInteractionBubble npc={EDEN} onInteract={talkToEden}/>}
        {map === 'shanghai' && SHANGHAI_SUPPLY_CRATES.map(crate => <InteractionBubble key={crate.id} id={`crate:${crate.id}`}
            label={`Abrir caixa · +${SUPPLY_CRATE.ammo} munições`} point={{ x: crate.x, z: crate.z + 1.1 }} radius={SUPPLY_CRATE.radius} priority={20}
            position={[crate.x, height(crate.x, crate.z) + SUPPLY_CRATE.maxY + .45, crate.z]}
            available={() => combatRuntime.simulation?.nearbySupplyCrate(playerPosition)?.id === crate.id} onInteract={interactWithSupplyCrate}/>) }
    </>;
}
