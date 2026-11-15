import { simulationBlocked } from '../simulationGate';
import { createRioTerrain } from './layout';
import { buildRioVisual } from './visual';

export function createWorld() {
    const world = createRioTerrain();
    const coastalWater = buildRioVisual(world.group);
    world.update = (playerPosition, delta) => {
        const dt = simulationBlocked() ? 0 : delta;
        coastalWater.update(playerPosition, dt);
    };
    return world;
}
