import data from '../../assets/shanghai-fase01/layout.json';
import type { OfficeWorld } from '../../world/createOfficeMap';
import type { RectBounds } from '../../utils/math';
import { Group } from 'three';
import { addRocketCollisions } from '../worldUtils';
/** Dados separados do GLB: nenhum triângulo visual entra na física. */
export const SHANGHAI_PHASE01 = data;
export function createPhase01Terrain(): OfficeWorld {
    const world: OfficeWorld = {
        group: new Group(), bounds: { ...data.bounds },
        obstacles: data.obstacles.map(o => ({ minX: o.minX, maxX: o.maxX, minZ: o.minZ, maxZ: o.maxZ })),
        walkableAreas: data.walkableAreas.map(a => ({ ...a })), update: () => { }
    };
    addRocketCollisions(world, data.ship.x, data.ship.z);
    return world;
}
export function isLandingReserved(x: number, z: number, radius = 0): boolean {
    const b: RectBounds = data.landingReservation;
    return x >= b.minX - radius && x <= b.maxX + radius && z >= b.minZ - radius && z <= b.maxZ + radius;
}
/** Contrato para o consumidor da S2.4 após integração. Não altera a simulação atual. */
export const SHANGHAI_HORDE_SPAWNS = data.spawns;
export const SHANGHAI_PATROL_ROUTES = data.patrolRoutes;
