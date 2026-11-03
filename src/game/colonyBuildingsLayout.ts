import sharedFloor from '../assets/buildings/colony-shared-floor-v001.json';
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
export const BUILDING_SHARED_FLOOR = sharedFloor;
// Substituição exata de regiões do pavimento comum, nunca a pegada de um pad do GLB.
export const BUILDING_FLOOR_CUTS = sharedFloor.areas;
export function addColonyBuildingsTerrain(world: OfficeWorld) {
    world.simpleCuboids = [...(world.simpleCuboids ?? []), ...manifest.flatMap(b => b.staticCuboids)];
    world.movingCuboids = [...(world.movingCuboids ?? []), ...manifest.flatMap(b => b.dynamicCuboids.map(c => ({ ...c, position: { ...c.position }, rotation: { ...c.rotation } })))];
    world.walkableAreas.push(...sharedFloor.areas);
    for (const b of manifest) for (const c of b.staticCuboids) world.obstacles.push({ ...c.bounds, physics: false });
    // O pavimento é plano na cota zero. Mantém os apoios de Hangar/Quartel/Lab.
}
