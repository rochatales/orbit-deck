import { COLONY_BUILDINGS, REPLACED_BUILDING_ROOMS } from '../game/colonyBuildingsLayout';
import manifest from '../assets/colony-v007.manifest.json';
import greenhouse from '../assets/greenhouse/greenhouse-v001.manifest.json';
import { HANGAR } from '../game/hangarLayout';
import { QUARTEL } from '../game/quartelLayout';
import { LABORATORIO } from '../game/laboratorioLayout';
import { CONTROL_ROOM } from '../game/controlRoomLayout';
import type { RectBounds } from '../utils/math';
const replaced = new Set(['brand-brain', 'smart-lab', 'design', ...HANGAR.removedRooms, ...REPLACED_BUILDING_ROOMS]);
const originalRooms = new Set(manifest.parts.filter(p => p.papel === 'roof' && !replaced.has(p.ambiente)).map(p => p.ambiente));
/** Mesmas plantas dos tetos ativos; sem ler malha, sem salas substituídas ou pisos de serviço externos. */
export const MARS_AUDIO_INTERIORS: readonly RectBounds[] = [
    ...manifest.walkableAreas.filter(a => originalRooms.has(a.id)),
    CONTROL_ROOM.roofArea, QUARTEL.roofArea, LABORATORIO.roofArea,
    { minX: HANGAR.roofArea.minX + HANGAR.placement.x, maxX: HANGAR.roofArea.maxX + HANGAR.placement.x,
        minZ: HANGAR.roofArea.minZ + HANGAR.placement.z, maxZ: HANGAR.roofArea.maxZ + HANGAR.placement.z },
    ...greenhouse.walkableAreas, ...COLONY_BUILDINGS.map(b => b.roofArea),
];
/** Histerese de 5 cm na entrada evita alternância na soleira. Sem objetos por consulta. */
export class MarsInteriorProbe {
    private area = -1;
    update(x: number, z: number) {
        if (this.area >= 0) {
            const b = MARS_AUDIO_INTERIORS[this.area];
            if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true;
        }
        this.area = -1;
        for (let i = 0; i < MARS_AUDIO_INTERIORS.length; i++) {
            const b = MARS_AUDIO_INTERIORS[i];
            if (x > b.minX + .05 && x < b.maxX - .05 && z > b.minZ + .05 && z < b.maxZ - .05) { this.area = i; return true; }
        }
        return false;
    }
}
