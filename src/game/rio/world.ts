import { createRioTerrain } from './layout';
import { buildRioVisual } from './visual';

export function createWorld() {
    const world = createRioTerrain();
    buildRioVisual(world.group);
    return world;
}
