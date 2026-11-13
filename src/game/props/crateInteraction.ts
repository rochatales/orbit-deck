import { isExpedition } from '../config';
import { combatRuntime, useCombatStore } from '../../state/useCombatStore';
import { useExpeditionStore } from '../../state/useExpeditionStore';
import { playerPosition } from '../../state/playerTransient';
import { simulationBlocked } from '../simulationGate';

/** Tecla e botão usam a mesma validação atual, nunca a proximidade atrasada da UI. */
export function interactWithSupplyCrate(): boolean {
    if (simulationBlocked() || !isExpedition(useExpeditionStore.getState().session.map)) return false;
    if (!combatRuntime.simulation?.openSupplyCrate(playerPosition)) return false;
    useCombatStore.getState().setNearCrate(false);
    useExpeditionStore.getState().setRadio('Cabine de suprimentos aberta. O brilho azul libera 48 munições de reserva. Use R para recarregar.');
    return true;
}
