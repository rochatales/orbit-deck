import data from '../../assets/shanghai-fase01/surfaces.json';

// Coeficientes calculados só ao carregar o layout; amostragem chamada apenas no nascimento do drop.
const surfaces = data.parts.map(part => ({ ...part, cos: Math.cos(part.angle), sin: Math.sin(part.angle) }));
function contains(x: number, z: number, halfW: number, halfD: number, radius: number) {
    const dx = Math.max(0, Math.abs(x) - (halfW - radius)), dz = Math.max(0, Math.abs(z) - (halfD - radius));
    return Math.abs(x) <= halfW && Math.abs(z) <= halfD && dx * dx + dz * dz <= radius * radius;
}
/** Dados do export, sem raycast/GLB: rua, calçada arredondada, canteiro, grama e pintura. */
export function phase01SurfaceHeight(x: number, z: number) {
    let height = 0;
    for (const p of surfaces) {
        if (p.top <= height) continue;
        const dx = x - p.x, dz = z - p.z;
        // Inversa da mesma rotação Y usada pelo exportador da fase 01.
        const localX = dx * p.cos - dz * p.sin, localZ = dx * p.sin + dz * p.cos;
        const radius = 'radius' in p ? p.radius ?? 0 : 0;
        if (!contains(localX, localZ, p.w / 2, p.d / 2, radius)) continue;
        // Borda pintada é vazada: o centro não é um piso elevado.
        if ('ring' in p && p.ring && contains(localX / .994, localZ / .994, p.w / 2, p.d / 2, radius)) continue;
        height = p.top;
    }
    return height;
}
