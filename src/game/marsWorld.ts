import { createOfficeMap } from '../world/createOfficeMap';
import { EDEN, MAPS } from './config';
import { addMarsLanding } from './marsLanding';
export function createWorld() {
    const world = createOfficeMap([EDEN], true);
    world.bounds = { ...MAPS.mars.bounds };
    addMarsLanding(world);
    // GLB fornece arquitetura; folhas e luzes mantêm o comportamento do piloto.
    return world;
}
