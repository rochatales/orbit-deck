import masterplan from '../world/marsMasterplan.json';
import type { MapId } from './session';
import { isShanghaiPhase01 } from './shanghai/previewMode';
export interface Point {
    x: number;
    y: number;
    z: number;
}
export interface NpcConfig {
    id: string;
    name: string;
    color: string;
    position: Point;
    interactionRadius: number;
}
const edenRoom = masterplan.rooms.find(room => room.id === 'brand-brain')!;
export const EDEN: NpcConfig = { id: 'eden', name: 'EDEN', color: '#f2c94c', position: { x: edenRoom.position.x, y: 0, z: edenRoom.position.z }, interactionRadius: 2.7 };
export const MAPS: Record<MapId, {
    title: string;
    ship: Point;
    exit: Point;
    bounds: {
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
    };
}> = {
    mars: { title: 'Marte · Colônia humana', ship: { x: 0, y: 0, z: 33 }, exit: { x: 0, y: 0, z: 29.5 }, bounds: { minX: -22, maxX: 22, minZ: -15, maxZ: 39 } },
    shanghai: { title: 'Terra · Shanghai', ship: { x: 0, y: 0, z: 13 }, exit: { x: 0, y: 0, z: 9.5 }, bounds: isShanghaiPhase01() ? { minX: -51, maxX: 51, minZ: -54, maxZ: 54 } : { minX: -17, maxX: 17, minZ: -18, maxZ: 18 } }
};
export const INITIAL_POSITION: Point = { x: 0, y: 0, z: 0.8 };
export function near(a: Point, b: Point, distance: number) { return Math.hypot(a.x - b.x, a.z - b.z) <= distance; }
