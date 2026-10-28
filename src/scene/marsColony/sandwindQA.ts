import { QUARTEL } from '../../game/quartelLayout';
import { useExpeditionStore } from '../../state/useExpeditionStore';
import { useGameStore } from '../../state/useGameStore';
import { placePlayer, isNearEden, isNearShip } from '../../state/playerTransient';

/** Somente fixture de QA explícita: não salva nem integra viagem/progressão. */
export function sandwindQAEnabled(search: string) {
    const params = new URLSearchParams(search);
    return params.has('sandwindPreview') && params.has('perf') && params.has('sandwindQA');
}
export function sandwindQAPose(search: string, pose: 'plaza' | 'deck' | 'quartel' | 'quartel-west' | 'quartel-north' | 'bathroom-front' | 'bathroom-inside' | 'laboratorio' | 'lab-console' | 'lab-west' | 'lab-south') {
    if (!sandwindQAEnabled(search)) return false;
    const state = useExpeditionStore.getState();
    if (!state.ready || state.session.map !== 'mars' || state.session.phase !== 'walking') return false;
    const bathroom = QUARTEL.doors.find(door => door.side === 'bathroom')!;
    const poses = { laboratorio: {x:13.5,y:0,z:-9.8}, 'lab-console': {x:18.4,y:0,z:-12.7}, 'lab-west': {x:5.7,y:0,z:-12.7}, 'lab-south': {x:15.5,y:0,z:-6.7}, plaza: {x:0,y:0,z:.8}, deck: {x:0,y:0,z:29.5}, quartel: {x:QUARTEL.placement.x,y:QUARTEL.plinth.top,z:QUARTEL.placement.z}, 'quartel-west': {x:5.7,y:.0984375,z:0}, 'quartel-north': {x:10.5,y:.13125,z:-5.4}, 'bathroom-front': {x:bathroom.x-1.1,y:QUARTEL.plinth.top,z:bathroom.z}, 'bathroom-inside': {x:bathroom.x+2.1,y:QUARTEL.plinth.top,z:bathroom.z} };
    const spawn = poses[pose];
    placePlayer(spawn);
    useExpeditionStore.setState({ spawn, panel: null, session: { ...state.session, revision: state.session.revision + 1 } });
    useGameStore.setState({ isPaused: false, nearEden: isNearEden('mars'), nearShip: isNearShip('mars') });
    return true;
}
