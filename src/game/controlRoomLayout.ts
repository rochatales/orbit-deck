import manifest from '../assets/control-room/control-room-v002.manifest.json';
import type { OfficeWorld } from '../world/createOfficeMap';
import type { RectBounds } from '../utils/math';

const REMOVED_BRAND_BRAIN_COLLIDERS = new Set([
    'interior-15',
    'interior-16',
    'interior-78',
    'interior-89',
    'interior-90',
    'interior-112',
    'interior-113'
]);

export const CONTROL_ROOM = {
    version: manifest.version,
    position: manifest.position,
    hologramAnchor: manifest.hologramAnchor,
    roofArea: { minX: -3.5, maxX: 3.5, minZ: -13.75, maxZ: -7.25 },
    floorCutAreas: [{ minX: -3.5, maxX: 3.5, minZ: -13.75, maxZ: -7.25 }],
    doors: [
        { side: 'south' as const, x: 0, z: -7.25, axis: 'x' as const, leafA: 'D_Control_S_A', leafB: 'D_Control_S_B', slide: 0.96 },
        { side: 'east' as const, x: 3.5, z: -10.5, axis: 'z' as const, leafA: 'D_Control_L_A', leafB: 'D_Control_L_B', slide: 0.96 }
    ],
    obstacles: [
        // Pedestal central octogonal do Holograma EDEN
        { minX: -0.82, maxX: 0.82, minZ: -11.32, maxZ: -9.68 },
        // Rack de servidores NW
        { minX: -2.94, maxX: -2.14, minZ: -13.56, maxZ: -12.58 },
        // Bancada de consoles NE
        { minX: 0.0, maxX: 2.4, minZ: -13.55, maxZ: -12.55 }
    ]
};

export const retainControlRoomCollider = (c: RectBounds & { id: string }) => !REMOVED_BRAND_BRAIN_COLLIDERS.has(c.id);

export function addControlRoomTerrain(world: OfficeWorld) {
    for (const obs of CONTROL_ROOM.obstacles) {
        world.obstacles.push({ ...obs });
    }
}
