import { SHANGHAI_CARS, carObstacle, retainPhase01Obstacle } from './propPlacements';
import data from '../../assets/shanghai-fase01/layout.json';
import { phase01SurfaceGrid, SURFACE_TRANSITION } from './surfaceGrid';
import type { OfficeWorld } from '../../world/createOfficeMap';
import type { RectBounds } from '../../utils/math';
import { Group } from 'three';
import { addAresCollisions } from './aresLanding';
import { SHANGHAI_SUPPLY_CRATES, crateObstacle } from '../props/supplyCrate';
/** Dados separados do GLB: nenhum triângulo visual entra na física. */
export const SHANGHAI_PHASE01 = data;
export function createPhase01Terrain(): OfficeWorld {
    const height = phase01SurfaceGrid();
    const world: OfficeWorld = {
        surfaceHeight: height, supportHeight: height, supportTransition: SURFACE_TRANSITION,
        group: new Group(), bounds: { ...data.bounds },
        obstacles: data.obstacles.filter(retainPhase01Obstacle).map(o => ({ minX: o.minX, maxX: o.maxX, minZ: o.minZ, maxZ: o.maxZ, minY: o.minY, maxY: o.maxY })),
        walkableAreas: data.walkableAreas.map(a => ({ ...a })), update: () => { }
    };
    world.obstacles.push(...SHANGHAI_CARS.map(car => carObstacle(car, height(car.x, car.z))));
    world.obstacles.push(...SHANGHAI_SUPPLY_CRATES.map(crateObstacle));
    addAresCollisions(world);
    return world;
}
export function isLandingReserved(x: number, z: number, radius = 0): boolean {
    const b: RectBounds = data.landingReservation;
    return x >= b.minX - radius && x <= b.maxX + radius && z >= b.minZ - radius && z <= b.maxZ + radius;
}
/** Contrato para o consumidor da S2.4 após integração. Não altera a simulação atual. */
export const SHANGHAI_HORDE_SPAWNS = data.spawns;
export const SHANGHAI_PATROL_ROUTES = data.patrolRoutes;
