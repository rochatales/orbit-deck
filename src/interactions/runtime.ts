import { playerPosition } from '../state/playerTransient';
import { simulationBlocked } from '../game/simulationGate';
import { campaignInteractionAllowed } from '../game/campaignPolicy';
import { InteractionRegistry } from './interactionRegistry';
export const interactionTargets = new InteractionRegistry(campaignInteractionAllowed);
/** Tecla e clique usam a mesma validação, inclusive depois de pausa/viagem ou afastamento. */
export function activateWorldInteraction(expectedId?: string) {
    return !simulationBlocked() && interactionTargets.activate(playerPosition, expectedId);
}
