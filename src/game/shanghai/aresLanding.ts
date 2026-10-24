import type { OfficeWorld } from '../../world/createOfficeMap';
import { addAresCollisions as addShip } from '../aresCollisions';
export { ARES_COLLIDERS } from '../aresCollisions';

/**
 * S6.3: nave no retângulo indicado pelo autor, junto ao quarteirão central.
 * A origem local do estudo tem [E] em (-0,72; -4,02) no plano X/Z.
 * O deslocamento alinha esse marcador ao desembarque existente (0; 9,5).
 * Os 12 mm verticais assentam o patamar inferior sem enterrá-lo no asfalto.
 */
export const ARES_LANDING = {
    position: { x: 0.72, y: 0.012, z: 13.52 },
    boarding: { x: 0, y: 0, z: 9.5 },
    sourceCommit: 'e31162a'
} as const;

export function addAresCollisions(world: OfficeWorld) { addShip(world, ARES_LANDING.position); }
