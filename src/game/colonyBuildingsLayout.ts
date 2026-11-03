import manifest from '../assets/buildings/colony-buildings-v001.json';
import original from '../assets/colony-v007.manifest.json';
import masterplan from '../world/marsMasterplan.json';
import type { OfficeWorld } from '../world/createOfficeMap';
import type { RectBounds } from '../utils/math';

export const COLONY_BUILDINGS = manifest;
export const REPLACED_BUILDING_ROOMS = new Set(manifest.flatMap(b => b.replaces));
// Os volumes interiores antigos não têm owner. Resolve uma vez pela planta original,
// e remove paredes por ID do ambiente, sem apagar sólidos dos vizinhos.
const oldAreas = masterplan.rooms.filter(r => REPLACED_BUILDING_ROOMS.has(r.id)).map(r => ({
    minX: r.position.x - r.size.width / 2 - .15, maxX: r.position.x + r.size.width / 2 + .15,
    minZ: r.position.z - r.size.depth / 2 - .15, maxZ: r.position.z + r.size.depth / 2 + .15
}));
export const REMOVED_BUILDING_COLLIDERS = new Set(original.colliders.filter(c =>
    c.id.startsWith('wall-') ? [...REPLACED_BUILDING_ROOMS].some(id => c.id.startsWith(`wall-${id}-`)) :
        oldAreas.some(a => (c.minX + c.maxX) / 2 >= a.minX && (c.minX + c.maxX) / 2 <= a.maxX &&
            (c.minZ + c.maxZ) / 2 >= a.minZ && (c.minZ + c.maxZ) / 2 <= a.maxZ)
).map(c => c.id));
export const retainBuildingCollider = (c: RectBounds & { id: string }) => !REMOVED_BUILDING_COLLIDERS.has(c.id);
export const retainBuildingFloor = (a: RectBounds & { id: string }) => !REPLACED_BUILDING_ROOMS.has(a.id);
export const BUILDING_FLOOR_CUTS = manifest.map(b => b.pad);
export function addColonyBuildingsTerrain(world: OfficeWorld) {
    world.simpleCuboids = [...(world.simpleCuboids ?? []), ...manifest.flatMap(b => b.staticCuboids)];
    world.movingCuboids = [...(world.movingCuboids ?? []), ...manifest.flatMap(b => b.dynamicCuboids.map(c => ({ ...c, position: { ...c.position }, rotation: { ...c.rotation } })))];
    world.walkableAreas.push(...manifest.map(b => b.pad),
        // As franjas dos pisos das salas retiradas passam a pátio aberto.
        ...original.walkableAreas.filter(a => REPLACED_BUILDING_ROOMS.has(a.id)),
        // Pátio entre os dois módulos substituídos, Cafeteria e circulação da estufa.
        { minX: 4, maxX: 15.8, minZ: 15.1, maxZ: 17.8 });
    for (const b of manifest) for (const c of b.staticCuboids) world.obstacles.push({ ...c.bounds, physics: false });
    const previous = world.supportHeight;
    world.supportHeight = (x, z) => {
        for (const b of manifest) if (x >= b.pad.minX && x <= b.pad.maxX && z >= b.pad.minZ && z <= b.pad.maxZ) return 0;
        return previous?.(x, z) ?? 0;
    };
}
