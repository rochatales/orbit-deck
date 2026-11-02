/** Estado visual compartilhado pelo jogo e pela prévia isolada. */
export type CrateState = { phase: 'closed' | 'opening' | 'open'; elapsed: number };
export const SUPPLY_CRATE = { minY: 0, maxY: 1.195, radius: 1.8, duration: 2.4, rewardAt: .733, ammo: 48, neon: '#39e9ff' } as const;
export interface CratePlacement { id: string; x: number; z: number }
/** Frente +Z; espaço traseiro livre para a tampa. Não ocupa os marcadores de recursos da S4.3. */
export const SHANGHAI_SUPPLY_CRATES: readonly CratePlacement[] = [
    { id: 'ammo-west', x: -10, z: 12 },
    { id: 'ammo-northeast', x: 36, z: -22 }
];
export function crateObstacle(p: CratePlacement) {
    return { minX: p.x - .81, maxX: p.x + .81, minZ: p.z - .7, maxZ: p.z + .7, minY: SUPPLY_CRATE.minY, maxY: SUPPLY_CRATE.maxY };
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
