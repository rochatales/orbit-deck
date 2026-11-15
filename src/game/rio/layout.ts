import { Group } from 'three';
import data from '../../assets/rio-fase01/layout.json';
import type { OfficeWorld } from '../../world/createOfficeMap';
import { addAresCollisions } from '../aresCollisions';
import { crateObstacle } from '../props/supplyCrate';
import {
    RIO_WATER_CONFIG,
    isOnRioPierDeck,
    isRioShallowWalkable,
    rioCoastlineOffset,
    rioSandWetness,
    rioSeabedHeight,
    rioWaterDepth,
    rioWaterSurfaceHeight,
    rioWaveSwashFrontX,
    type RioWaterConfig,
} from './seabed';
import { RIO_SUPPLY_CRATES } from './supplies';

export const RIO_LAYOUT = data;
export const RIO_SURFACE_TRANSITION = 0.06;
export const RIO_ARES_POSITION = {
    x: data.exit.x + .72, y: .012, z: data.exit.z + 4.02
};

export {
    RIO_WATER_CONFIG,
    isOnRioPierDeck,
    isRioShallowWalkable,
    rioCoastlineOffset,
    rioSandWetness,
    rioSeabedHeight,
    rioWaterDepth,
    rioWaterSurfaceHeight,
    rioWaveSwashFrontX,
    type RioWaterConfig,
};

export function createRioTerrain(): OfficeWorld {
    const world: OfficeWorld = {
        group: new Group(),
        bounds: { ...data.bounds },
        walkableAreas: data.walkableAreas.map(area => ({ ...area })),
        obstacles: [...data.obstacles, ...data.limitColliders].map(obstacle => ({ ...obstacle })),
        surfaceHeight: rioSeabedHeight,
        supportHeight: rioSeabedHeight,
        supportTransition: RIO_SURFACE_TRANSITION,
        update: () => {}
    };
    addAresCollisions(world, RIO_ARES_POSITION);
    world.obstacles.push(...RIO_SUPPLY_CRATES.map(crate => crateObstacle(crate, 0)));
    return world;
}
