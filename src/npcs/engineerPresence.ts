import { segmentBox, type Terrain, type Position } from '../combat/navigation';
import { ENGINEER, engineerDoorClear, engineerHasStandingRoom } from './engineerRoutine';
import { COLONY_BUILDINGS } from '../game/colonyBuildingsLayout';
import type { SimpleCuboid } from '../world/createOfficeMap';
/** Posição frequente compartilhada com portas/interações; não publica React por passo. */
export const engineerPresence: Position & { y: number; active: boolean; seated: boolean; approach: Position; world: (Terrain & { movingCuboids?: SimpleCuboid[] }) | null } = {
    ...ENGINEER.start, y: 0, active: false, seated: false, approach: { ...ENGINEER.start }, world: null
};
const box = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
const emptyDoors: readonly SimpleCuboid[] = [];
/** Visão usa paredes/volumes, sem closures ou objetos temporários no balão. */
function staticLineClear(player: Position, world: Terrain) {
    for (const obstacle of world.obstacles)
        if (segmentBox(player, engineerPresence, obstacle, .02) !== null) return false;
    return true;
}
export function canTalkToEngineer(player: Position) {
    return engineerPresence.active && !!engineerPresence.world
        && (!engineerPresence.seated || engineerHasStandingRoom(engineerPresence.approach, player))
        && Math.hypot(player.x - engineerPresence.x, player.z - engineerPresence.z) <= ENGINEER.interactionRadius
        && staticLineClear(player, engineerPresence.world)
        && engineerDoorClear(player, engineerPresence, engineerPresence.world.movingCuboids ?? emptyDoors, box, .02);
}

const workshop = COLONY_BUILDINGS.find(building => building.id === 'workshop')!.roofArea;
export function canReceiveSword(player: Position) {
    const inside = (p: Position) => p.x > workshop.minX && p.x < workshop.maxX && p.z > workshop.minZ && p.z < workshop.maxZ;
    return inside(player) && inside(engineerPresence) && canTalkToEngineer(player);
}
