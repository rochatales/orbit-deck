import type { MapId } from './session';
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
export const EDEN: NpcConfig = { id: 'eden', name: 'EDEN', color: '#f2c94c', position: { x: 0, y: 0, z: -10 }, interactionRadius: 2.7 };
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
    shanghai: { title: 'Terra · Shanghai', ship: { x: 0, y: 0, z: 13 }, exit: { x: 0, y: 0, z: 9.5 }, bounds: { minX: -17, maxX: 17, minZ: -18, maxZ: 18 } }
};
export const INITIAL_POSITION: Point = { x: 0, y: 0, z: 0.8 };
export function near(a: Point, b: Point, distance: number) { return Math.hypot(a.x - b.x, a.z - b.z) <= distance; }
