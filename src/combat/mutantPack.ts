import { MUTANT_PACK as P, SMALL_MUTANT as M } from './config';
import { traversable, type Position, type Terrain } from './navigation';
import type { Robot } from './simulation';

/** Alvo temporário reutilizado: abre em arco para o setor próprio e depois fecha para contato. */
export function writeMutantPackTarget(out: Position, animal: Robot, player: Position, distance: number, terrain: Terrain) {
    if (distance > P.resetDistance) animal.packReady = false;
    if (!animal.alerted || animal.packReady || distance > P.distance) return false;
    const goalX = player.x + Math.sin(animal.packAngle) * P.radius, goalZ = player.z + Math.cos(animal.packAngle) * P.radius;
    if (distance <= M.contactRange + .05 || animal.stuck > M.stuckAdvance
        || Math.hypot(animal.x - goalX, animal.z - goalZ) <= P.reach) {
        animal.packReady = true;
        return false;
    }
    const angle = Math.atan2(animal.x - player.x, animal.z - player.z);
    const delta = Math.atan2(Math.sin(animal.packAngle - angle), Math.cos(animal.packAngle - angle));
    const nextAngle = angle + Math.max(-P.arcStep, Math.min(P.arcStep, delta));
    const radius = Math.max(P.radius, distance * P.approach);
    out.x = player.x + Math.sin(nextAngle) * radius;
    out.z = player.z + Math.cos(nextAngle) * radius;
    if (!traversable(out, terrain, M.radius)) { animal.packReady = true; return false; }
    return true;
}
