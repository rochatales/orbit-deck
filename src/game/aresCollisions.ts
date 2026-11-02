import type { OfficeWorld } from '../world/createOfficeMap';

/** Volumes simples, no espaço local do GLB. Escada usa E no pé, sem subida física. */
export const ARES_COLLIDERS = [
    { id: 'casco', minX: -3.64, maxX: 3.23, minZ: -1.3, maxZ: 1.3 },
    { id: 'pod-norte', minX: -0.08, maxX: 4.2, minZ: -2.75, maxZ: -1.3 },
    { id: 'pod-sul', minX: -0.08, maxX: 4.2, minZ: 1.3, maxZ: 2.75 },
    { id: 'trem-frente-norte', minX: -2.15, maxX: -1.49, minZ: -1.98, maxZ: -1.3 },
    { id: 'trem-frente-sul', minX: -2.15, maxX: -1.49, minZ: 1.3, maxZ: 1.98 },
    { id: 'escada', minX: -1.38, maxX: -0.06, minZ: -3.5, maxZ: -1.3 }
] as const;

export function addAresCollisions(world: OfficeWorld, position: { x: number; z: number }) {
    const { x, z } = position;
    for (const box of ARES_COLLIDERS) world.obstacles.push({
        minX: x + box.minX, maxX: x + box.maxX,
        minZ: z + box.minZ, maxZ: z + box.maxZ
    });
}
