import data from '../../assets/shanghai-fase01/surfaces.json';

// Coeficientes do layout: função de referência usada para construir a grade uma vez.
export const phase01Surfaces = data.parts.map(part => ({ ...part, cos: Math.cos(part.angle), sin: Math.sin(part.angle) }));
function contains(x: number, z: number, halfW: number, halfD: number, radius: number) {
    const dx = Math.max(0, Math.abs(x) - (halfW - radius)), dz = Math.max(0, Math.abs(z) - (halfD - radius));
    return Math.abs(x) <= halfW && Math.abs(z) <= halfD && dx * dx + dz * dz <= radius * radius;
}
export function surfaceContains(p: typeof phase01Surfaces[number], x: number, z: number) {
    const dx = x - p.x, dz = z - p.z;
    const localX = dx * p.cos - dz * p.sin, localZ = dx * p.sin + dz * p.cos;
    const radius = 'radius' in p ? p.radius ?? 0 : 0;
    if (!contains(localX, localZ, p.w / 2, p.d / 2, radius)) return false;
    return !('ring' in p && p.ring && contains(localX / .994, localZ / .994, p.w / 2, p.d / 2, radius));
}
/** Referência contínua dos dados do export; nunca usada no quadro de render. */
export function phase01SurfaceHeight(x: number, z: number) {
    let height = 0;
    for (const p of phase01Surfaces) if (p.top > height && surfaceContains(p, x, z)) height = p.top;
    return height;
}
