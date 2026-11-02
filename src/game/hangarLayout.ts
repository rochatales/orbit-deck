import manifest from '../assets/hangar/hangar-v002.manifest.json';
import type { OfficeWorld } from '../world/createOfficeMap';
import type { RectBounds } from '../utils/math';
export const HANGAR = manifest;
const removedColliders = new Set<string>(manifest.removedColliders);
const removedAreas = new Set([...manifest.removedRooms, 'meeting-east-connector']);
export function retainColonyCollider(collider: RectBounds & { id: string }) { return !removedColliders.has(collider.id); }
export function retainColonyFloor(area: RectBounds & { id: string }) { return !removedAreas.has(area.id); }
/** Apoio cinemático do piso elevado; não consulta malha, não muda Shanghai. */
export function hangarSupportHeight(x: number, z: number) {
    const interior = manifest.walkableAreas[0], r = manifest.ramp, b = manifest.bridge;
    if (x >= interior.minX && x <= interior.maxX && z >= interior.minZ && z <= interior.maxZ) return r.top;
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) return b.top * (b.maxX - x) / (b.maxX - b.minX);
    if (Math.abs(x) <= r.halfWidth && z >= r.thresholdZ && z <= r.endZ) return r.top + (r.tip - r.top) * (z - r.thresholdZ) / (r.endZ - r.thresholdZ);
    return 0;
}
export function addHangarTerrain(world: OfficeWorld) {
    world.obstacles.push(...manifest.colliders.map(({ minX, maxX, minZ, maxZ }) => ({ minX, maxX, minZ, maxZ })));
    world.walkableAreas.push(...manifest.walkableAreas.map(({ minX, maxX, minZ, maxZ }) => ({ minX, maxX, minZ, maxZ })));
    world.supportHeight = hangarSupportHeight;
}
