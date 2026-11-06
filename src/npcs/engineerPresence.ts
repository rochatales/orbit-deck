import { clearSegment, type Terrain, type Position } from '../combat/navigation';
import { ENGINEER, engineerDoorClear } from './engineerRoutine';
import type { SimpleCuboid } from '../world/createOfficeMap';
/** Posição frequente compartilhada com portas/interações; não publica React por passo. */
export const engineerPresence: Position & { y: number; active: boolean; world: (Terrain & { movingCuboids?: SimpleCuboid[] }) | null } = {
    ...ENGINEER.start, y: 0, active: false, world: null
};
const box = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
const emptyDoors: readonly SimpleCuboid[] = [];
export function canTalkToEngineer(player: Position) {
    return engineerPresence.active && !!engineerPresence.world
        && Math.hypot(player.x - engineerPresence.x, player.z - engineerPresence.z) <= ENGINEER.interactionRadius
        && clearSegment(player, engineerPresence, engineerPresence.world, .02)
        && engineerDoorClear(player, engineerPresence, engineerPresence.world.movingCuboids ?? emptyDoors, box, .02);
}
