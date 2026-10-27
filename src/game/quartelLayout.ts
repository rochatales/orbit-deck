import manifest from '../assets/quartel/barracks-v004.manifest.json';
import type { OfficeWorld, SimpleCuboid } from '../world/createOfficeMap';
import type { RectBounds } from '../utils/math';
export const QUARTEL = manifest;
const removed = new Set(manifest.removedColliders), areas = new Set(manifest.removedAreas);
export const retainQuartelCollider = (c: RectBounds & { id: string }) => !removed.has(c.id);
export const retainQuartelFloor = (a: RectBounds & { id: string }) => !areas.has(a.id);
export function createQuartelDoorColliders(): SimpleCuboid[] {
    return manifest.dynamicCuboids.map(c => ({ ...c, position: { ...c.position } }));
}
/** Apoio analítico; o pedestal só é acessível pelos vãos da borda COL. */
export function quartelSupportHeight(x: number, z: number): number | null {
    const b = manifest.plinth, cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    const dx = Math.max(0, Math.abs(x - cx) - (b.maxX - b.minX) / 2 + b.radius);
    const dz = Math.max(0, Math.abs(z - cz) - (b.maxZ - b.minZ) / 2 + b.radius);
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && dx * dx + dz * dz <= b.radius * b.radius) return b.top;
    for (const r of manifest.ramps) if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) {
        const t = ((r.side === 'north' ? z : x) - r.start) / (r.end - r.start);
        return r.top * Math.max(0, Math.min(1, t));
    }
    return null;
}
export function addQuartelTerrain(world: OfficeWorld) {
    const previous = world.supportHeight;
    world.supportHeight = (x, z) => quartelSupportHeight(x, z) ?? previous?.(x, z) ?? 0;
    world.simpleCuboids = manifest.staticCuboids;
    world.movingCuboids = createQuartelDoorColliders();
    // Obstáculos para consulta/navegação; a física usa caixas 3D orientadas exatas.
    for (const c of manifest.staticCuboids) if (c.bounds.minY < 1.5) world.obstacles.push({ ...c.bounds, physics: false });
    world.walkableAreas.push(manifest.plinth, ...manifest.ramps, ...manifest.connectors);
}
