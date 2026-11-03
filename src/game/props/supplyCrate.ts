import { phase01SurfaceGrid } from '../shanghai/surfaceGrid';
/** Estado visual compartilhado pelo jogo e pela prévia isolada. */
export type CrateState = { phase: 'closed' | 'opening' | 'open'; elapsed: number };
export const SUPPLY_CRATE = { minY: 0, maxY: 2.09, radius: 1.8, duration: 2.4, rewardAt: .733, ammo: 48, neon: '#39e9ff' } as const;
export interface CratePlacement { id: string; x: number; z: number; angle?: number }
/** Cabines amarelas: frente orientada para a rua, sem deslocar os waypoints. */
export const SHANGHAI_SUPPLY_CRATES: readonly CratePlacement[] = [
    { id: 'ammo-northwest', x: -44, z: -27, angle: 0 },
    { id: 'ammo-north', x: -8.5, z: -27, angle: 0 },
    { id: 'ammo-northeast', x: 44, z: -27.6, angle: Math.PI / 2 },
    { id: 'ammo-west', x: -34.3, z: 10.5, angle: 0 },
    { id: 'ammo-east', x: 24.5, z: -10.8, angle: -Math.PI / 2 },
    { id: 'ammo-southwest', x: -45, z: 27.5, angle: -Math.PI / 2 },
    { id: 'ammo-southeast', x: 41.5, z: 26.5, angle: Math.PI }
];
export function crateMarker(p: CratePlacement) {
    return { x: p.x + Math.sin(p.angle ?? 0) * 1.6, z: p.z + Math.cos(p.angle ?? 0) * 1.6 };
}
export function crateObstacle(p: CratePlacement) {
    const c = Math.abs(Math.cos(p.angle ?? 0)), s = Math.abs(Math.sin(p.angle ?? 0)), floor = phase01SurfaceGrid()(p.x, p.z);
    const halfX = c * .9 + s, halfZ = s * .9 + c;
    return { minX: p.x - halfX, maxX: p.x + halfX, minZ: p.z - halfZ, maxZ: p.z + halfZ, minY: floor + SUPPLY_CRATE.minY, maxY: floor + SUPPLY_CRATE.maxY };
}
export function openCrate(state: CrateState, playerX: number, playerZ: number, markerX: number, markerZ: number): boolean {
    if (state.phase !== 'closed' || !Number.isFinite(playerX + playerZ + markerX + markerZ)
        || Math.hypot(playerX - markerX, playerZ - markerZ) > SUPPLY_CRATE.radius) return false;
    state.phase = 'opening'; state.elapsed = 0;
    return true;
}
export function advanceCrate(state: CrateState, delta: number): void {
    if (state.phase !== 'opening' || !Number.isFinite(delta) || delta <= 0) return;
    state.elapsed = Math.min(SUPPLY_CRATE.duration, state.elapsed + delta);
    if (state.elapsed >= SUPPLY_CRATE.duration) state.phase = 'open';
}
/** Intensidade da luz na prévia three.js, calibrada separadamente dos watts do Blender. */
const REVEAL = [[0, 0], [.433, 0], [.733, 12], [1.033, 32], [1.433, 24], [1.966, 6], [2.4, 2]] as const;
export function revealIntensity(state: CrateState): number {
    if (state.phase === 'closed') return 0;
    const t = state.elapsed;
    for (let i = 1; i < REVEAL.length; i++) {
        const [end, to] = REVEAL[i], [start, from] = REVEAL[i - 1];
        if (t <= end) return from + (to - from) * Math.max(0, (t - start) / (end - start));
    }
    return 2;
}
