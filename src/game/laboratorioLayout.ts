import { QUARTEL } from './quartelLayout';
import manifest from '../assets/laboratorio/laboratorio-v001.manifest.json';
import type { OfficeWorld, SimpleCuboid } from '../world/createOfficeMap';
import type { RectBounds } from '../utils/math';
export const LABORATORIO = manifest;
const removed = new Set(manifest.removedColliders), areas = new Set(manifest.removedAreas);
export const retainLaboratorioCollider = (c: RectBounds & { id: string }) => !removed.has(c.id);
export const retainLaboratorioFloor = (a: RectBounds & { id: string }) => !areas.has(a.id);
export function createLaboratorioDoorColliders(): SimpleCuboid[] {
    return manifest.dynamicCuboids.map(c => ({ ...c, position: { ...c.position } }));
}
/** Piso e patamares da fonte estão em y=0; não há degrau nem rampa artificial. */
export function addLaboratorioTerrain(world: OfficeWorld) {
    const oldConnector = QUARTEL.connectors.find(c => c.id === 'lab-quarters-connector')!;
    world.walkableAreas = world.walkableAreas.filter(a => !(['minX', 'maxX', 'minZ', 'maxZ'] as const).every(key => a[key] === oldConnector[key]));
    world.simpleCuboids = [...(world.simpleCuboids ?? []), ...manifest.staticCuboids];
    world.movingCuboids = [...(world.movingCuboids ?? []), ...createLaboratorioDoorColliders()];
    for (const c of manifest.staticCuboids) if (c.bounds.minY < 1.5) world.obstacles.push({ ...c.bounds, physics: false });
    world.walkableAreas.push(...manifest.areas, ...manifest.connectors);
}
