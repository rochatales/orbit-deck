import { EDEN, MAPS, isExpedition } from '../game/config';
import type { MapId } from '../game/session';
import type { OfficeWorld } from '../world/createOfficeMap';
import { SHIP_INTERACTION_RADIUS, playerPosition } from '../state/playerTransient';
import { canOpenMissionDeposit, useExpeditionStore } from '../state/useExpeditionStore';
import { useCampaignStore } from '../state/useCampaignStore';
import { missionDepositRemaining } from '../game/campaignPolicy';
import { combatRuntime, useCombatStore } from '../state/useCombatStore';
import { expeditionCrates } from '../game/props/expeditionCrates';
import { SUPPLY_CRATE, crateMarker } from '../game/props/supplyCrate';
import { interactWithSupplyCrate } from '../game/props/crateInteraction';
import { InteractionBubble, NpcInteractionBubble } from './InteractionBubble';
import { MISSION_DEPOSIT_POINT, MISSION_DEPOSIT_RADIUS, requestShipCargo } from '../game/shipCargo';
const board = () => useExpeditionStore.getState().send('board');
const talkToEden = () => useExpeditionStore.getState().openEden();
const activateEden = () => useExpeditionStore.getState().activateEden();
const deposit = () => useExpeditionStore.getState().openDeposit();
export function WorldInteractionBubbles({ map, world }: { map: MapId; world: OfficeWorld }) {
    const circuitMission = useCampaignStore(s => missionDepositRemaining(map, s) !== null);
    const showEdenMarker = useCampaignStore(s => s.mode === 'campaign' && s.saved?.campaign.stage === 'eden-activation');
    const campaign = useCampaignStore(s => s.mode === 'campaign');
    const cleared = useCombatStore(s => s.cleared);
    const clearMarker = useCombatStore(s => s.clearMarker);
    const extraction = map === 'shanghai' && campaign && cleared;
    const exit = MAPS[map].exit;
    const rear = MISSION_DEPOSIT_POINT;
    const height = (x: number, z: number) => world.surfaceHeight?.(x, z) ?? world.supportHeight?.(x, z) ?? 0;
    return <>
        <InteractionBubble id={`ship:${map}`} label={extraction ? "Embarcar para Marte" : "Entrar na aeronave"} point={exit} radius={SHIP_INTERACTION_RADIUS} priority={10}
            position={[exit.x, height(exit.x, exit.z) + 1.8, exit.z]} alwaysVisible={extraction && clearMarker} onInteract={board}>
            {isExpedition(map) && !circuitMission && <button type="button" className="secondary" onClick={event => { event.stopPropagation(); requestShipCargo(); }}>F · Carga da aeronave</button>}
        </InteractionBubble>
        {circuitMission && <InteractionBubble id="ship:deposit" label="Depositar no porão" point={rear} radius={MISSION_DEPOSIT_RADIUS}
            position={[rear.x, height(rear.x, rear.z) + 1.8, rear.z]} priority={20} available={canOpenMissionDeposit} onInteract={deposit}/>}
        {/* Acima do halo: a EDEN flutua sobre o pedestal e vai até 2,51 m. */}
        {map === 'mars' && <>
            <InteractionBubble id="activate-eden" label="Ligar EDEN" point={EDEN.position} radius={EDEN.interactionRadius}
                position={[EDEN.position.x, 1.8, EDEN.position.z]} priority={30} alwaysVisible={showEdenMarker} onInteract={activateEden}/>
            <NpcInteractionBubble npc={EDEN} height={3} onInteract={talkToEden}/>
        </>}
        {expeditionCrates(map, true).map(crate => <InteractionBubble key={crate.id} id={`crate:${crate.id}`}
            label={`Abrir cabine · +${SUPPLY_CRATE.ammo} munições`} point={crateMarker(crate)} radius={SUPPLY_CRATE.radius} priority={20}
            position={[crate.x, height(crate.x, crate.z) + SUPPLY_CRATE.maxY + .45, crate.z]}
            available={() => combatRuntime.simulation?.nearbySupplyCrate(playerPosition)?.id === crate.id} onInteract={interactWithSupplyCrate}/>) }
    </>;
}
