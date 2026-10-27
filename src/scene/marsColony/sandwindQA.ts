import { useExpeditionStore } from '../../state/useExpeditionStore';
import { useGameStore } from '../../state/useGameStore';
import { placePlayer, isNearEden, isNearShip } from '../../state/playerTransient';

/** Somente fixture de QA explícita: não salva nem integra viagem/progressão. */
export function sandwindQAEnabled(search: string) {
    const params = new URLSearchParams(search);
    return params.has('sandwindPreview') && params.has('perf') && params.has('sandwindQA');
}
export function sandwindQAPose(search: string, pose: 'plaza' | 'deck' | 'quartel' | 'quartel-west' | 'quartel-north') {
    if (!sandwindQAEnabled(search)) return false;
    const state = useExpeditionStore.getState();
    if (!state.ready || state.session.map !== 'mars' || state.session.phase !== 'walking') return false;
    const poses = { plaza: {x:0,y:0,z:.8}, deck: {x:0,y:0,z:29.5}, quartel: {x:10.5,y:.2625,z:0}, 'quartel-west': {x:5.7,y:.0984375,z:0}, 'quartel-north': {x:10.5,y:.13125,z:-5.4} };
    const spawn = poses[pose];
    placePlayer(spawn);
    useExpeditionStore.setState({ spawn, panel: null, session: { ...state.session, revision: state.session.revision + 1 } });
    useGameStore.setState({ isPaused: false, nearEden: isNearEden('mars'), nearShip: isNearShip('mars') });
    return true;
}
