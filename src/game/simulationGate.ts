import { useGameStore } from '../state/useGameStore';
import { useExpeditionStore } from '../state/useExpeditionStore';
import { useCombatStore } from '../state/useCombatStore';
export function simulationBlocked() {
    const s = useExpeditionStore.getState();
    return useGameStore.getState().isPaused || !s.ready || s.panel !== null || s.session.phase !== 'walking'
        || (s.session.map === 'shanghai' && useCombatStore.getState().dead);
}
export function releaseMovementKeys() {
    for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'])
        window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
}
export function useSimulationBlocked() {
    const paused = useGameStore(s => s.isPaused);
    const blocked = useExpeditionStore(s => !s.ready || s.panel !== null || s.session.phase !== 'walking');
    const combat = useExpeditionStore(s => s.session.map === 'shanghai');
    const dead = useCombatStore(s => s.dead);
    return paused || blocked || (combat && dead);
}
