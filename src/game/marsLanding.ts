import type { OfficeWorld } from '../world/createOfficeMap';
import { addAresCollisions } from './aresCollisions';
import { MARS_CONSOLE_WEST_COLLIDER } from '../scene/marsColony/layout';

export const MARS_ARES = {
    position: { x: 0.72, y: 0.012, z: 33.52 },
    deck: { x: 0, y: 0, z: 33 },
    boarding: { x: 0, y: 0, z: 29.5 }
} as const;

/** Octógono de 12 m, subdividido em faixas conservadoras de 12,5 cm.
 * O controller do piloto aceita retângulos. A borda tem erro máximo de
 * 12,5 cm para dentro; nunca libera chão além da silhueta do deck.
 */
export function addMarsLanding(world: OfficeWorld) {
    world.walkableAreas.push({ minX: -2, maxX: 2, minZ: 25, maxZ: 27.4 });
    for (let z = -6; z < 6; z += 0.125) {
        const width = 6 - Math.max(0, Math.max(Math.abs(z), Math.abs(z + 0.125)) - 3.75);
        world.walkableAreas.push({ minX: -width, maxX: width, minZ: z + 33, maxZ: z + 33.125 });
    }
    addAresCollisions(world, MARS_ARES.position);
    world.obstacles.push({ ...MARS_CONSOLE_WEST_COLLIDER });
}
