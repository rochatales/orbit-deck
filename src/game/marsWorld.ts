import { createOfficeMap } from '../world/createOfficeMap';
import { EDEN, MAPS } from './config';
import { box, addShipCollisions } from './worldUtils';
export function createWorld() {
    const world = createOfficeMap([EDEN]);
    world.bounds = { ...MAPS.mars.bounds };
    world.walkableAreas.push({ minX: -2, maxX: 2, minZ: 25, maxZ: 31 }, { minX: -7, maxX: 7, minZ: 29, maxZ: 38 });
    box(world.group, 0, -0.08, 28, 4, 0.16, 6, '#939ca0');
    box(world.group, 0, -0.08, 33.5, 14, 0.16, 9, '#435b65');
    for (const x of [-6.7, 6.7])
        box(world.group, x, 0.03, 33.5, 0.13, 0.08, 8.8, '#66e6ff');
    addShipCollisions(world, MAPS.mars.ship.x, MAPS.mars.ship.z);
    return world;
}
