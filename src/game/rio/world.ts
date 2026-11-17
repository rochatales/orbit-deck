import type { OfficeWorld } from '../../world/createOfficeMap';
import { simulationBlocked } from '../simulationGate';
import { createRioLandingDust } from './landingDust';
import { createRioTerrain } from './layout';
import { buildRioVisual } from './visual';
import type { RioCoastalWaterRuntime } from './waterVisual';

export function attachRioWater(world: OfficeWorld, coastalWater: RioCoastalWaterRuntime) {
    const landingDust = createRioLandingDust(world.group);
    world.update = (playerPosition, delta) => {
        const dt = simulationBlocked() ? 0 : delta;
        coastalWater.update(playerPosition, dt);
        landingDust(dt);
    };
    return world;
}

export function createWorld() {
    const world = createRioTerrain();
    return attachRioWater(world, buildRioVisual(world.group));
}
