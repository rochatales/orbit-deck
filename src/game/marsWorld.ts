import { createOfficeMap } from '../world/createOfficeMap';
import { EDEN, MAPS } from './config';
import { addShipCollisions } from './worldUtils';
export function createWorld() {
    const world = createOfficeMap([EDEN], true);
    world.bounds = { ...MAPS.mars.bounds };
    world.walkableAreas.push({ minX: -2, maxX: 2, minZ: 25, maxZ: 31 }, { minX: -7, maxX: 7, minZ: 29, maxZ: 38 });
    addShipCollisions(world, MAPS.mars.ship.x, MAPS.mars.ship.z);
    // Caixa simples da base B3 já centralizada pelo layout (+10; −8,5).
    // Envolve também o foguete; embarque/saída continuam na borda sul (Z=29,5).
    // Os 129 retângulos do piloto são preservados; este é o 130º.
    world.obstacles.push({ minX: -1.68, maxX: 1.68, minZ: 30.7, maxZ: 35.3 });
    // GLB fornece arquitetura; folhas e luzes mantêm o comportamento do piloto.
    return world;
}
