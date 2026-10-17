import { createOfficeMap } from '../world/createOfficeMap';
import { EDEN, MAPS } from './config';
import { addShipCollisions } from './worldUtils';
export function createWorld() {
    const world = createOfficeMap([EDEN], true);
    world.bounds = { ...MAPS.mars.bounds };
    world.walkableAreas.push({ minX: -2, maxX: 2, minZ: 25, maxZ: 31 }, { minX: -7, maxX: 7, minZ: 29, maxZ: 38 });
    addShipCollisions(world, MAPS.mars.ship.x, MAPS.mars.ship.z);
    // GLB fornece arquitetura; folhas e luzes mantêm o comportamento do piloto.
    return world;
}
