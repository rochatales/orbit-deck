import { isExpedition } from './config';
import { useActivationSequence } from '../scene/marsColony/activationSequence';
import { useGameStore } from '../state/useGameStore';
import { useExpeditionStore } from '../state/useExpeditionStore';
import { useCombatStore } from '../state/useCombatStore';
export function simulationBlocked(ignoreActivation = false) {
    const s = useExpeditionStore.getState();
    return (!ignoreActivation && useActivationSequence.getState().kind !== null) || useGameStore.getState().isPaused || !s.ready || s.panel !== null || s.session.phase !== 'walking'
        || (isExpedition(s.session.map) && useCombatStore.getState().dead);
}
export function releaseMovementKeys() {
    for (const code of ['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'])
        window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
}
export function useSimulationBlocked() {
    const paused = useGameStore(s => s.isPaused);
    const blocked = useExpeditionStore(s => !s.ready || s.panel !== null || s.session.phase !== 'walking');
    const combat = useExpeditionStore(s => isExpedition(s.session.map));
    const dead = useCombatStore(s => s.dead);
    const activating = useActivationSequence(s => s.kind !== null);
    return activating || paused || blocked || (combat && dead);
}
