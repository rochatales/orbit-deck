import { Group } from 'three';
import type { OfficeWorld } from '../world/createOfficeMap';
import { MAPS } from './config';
import { box, addShipCollisions } from './worldUtils';
/** Fixed blockout with wide streets and reachable placeholders for future resource nodes. */
export function createWorld(): OfficeWorld {
    const group = new Group();
    const bounds = { ...MAPS.shanghai.bounds };
    const obstacles: OfficeWorld['obstacles'] = [];
    box(group, 0, -0.13, 0, 34, 0.25, 36, '#6c6e69');
    box(group, 0, 0.005, -1, 7, 0.02, 31, '#41494b');
    for (const [x, z, w, d, h] of [[-10, -10, 6, 7, 4], [10, -10, 6, 7, 5], [-10, 1, 5, 6, 3], [10, 1, 5, 6, 4], [-10, 11, 4, 4, 2], [10, 11, 4, 4, 2]]) {
        box(group, x, h / 2, z, w, h, d, '#92938a');
        obstacles.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
        box(group, x, h + 0.2, z, w * 0.6, 0.4, d * 0.7, '#5a615e');
    }
    box(group, 0, -0.02, 13, 9, 0.1, 8, '#536671');
    // Only markers in Sprint 1: no resources or rewards are granted.
    for (const [x, z] of [[-5, -5], [5, -13], [-5, 5], [5, 5], [-14, -16], [14, -16]])
        box(group, x, 0.22, z, 0.7, 0.44, 0.7, '#c0c4c1');
    for (const x of [-5, 5])
        box(group, x, 0.4, -1, 1.2, 0.8, 1, '#ae8c58');
    const world: OfficeWorld = { group, bounds, obstacles, walkableAreas: [bounds], update: () => { } };
    addShipCollisions(world, MAPS.shanghai.ship.x, MAPS.shanghai.ship.z);
    return world;
}
