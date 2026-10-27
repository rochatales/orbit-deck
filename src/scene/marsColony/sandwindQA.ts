import { useExpeditionStore } from '../../state/useExpeditionStore';
import { useGameStore } from '../../state/useGameStore';
import { placePlayer, isNearEden, isNearShip } from '../../state/playerTransient';

/** Somente fixture de QA explícita: não salva nem integra viagem/progressão. */
export function sandwindQAEnabled(search: string) {
    const params = new URLSearchParams(search);
    return params.has('sandwindPreview') && params.has('perf') && params.has('sandwindQA');
}
export function sandwindQAPose(search: string, pose: 'plaza' | 'deck') {
    if (!sandwindQAEnabled(search)) return false;
    const state = useExpeditionStore.getState();
    if (!state.ready || state.session.map !== 'mars' || state.session.phase !== 'walking') return false;
    const spawn = { x: 0, y: 0, z: pose === 'deck' ? 29.5 : .8 };
    placePlayer(spawn);
    useExpeditionStore.setState({ spawn, panel: null, session: { ...state.session, revision: state.session.revision + 1 } });
    useGameStore.setState({ isPaused: false, nearEden: isNearEden('mars'), nearShip: isNearShip('mars') });
    return true;
}
