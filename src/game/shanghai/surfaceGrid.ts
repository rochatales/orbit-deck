import layout from '../../assets/shanghai-fase01/layout.json';
import { phase01Surfaces, phase01SurfaceHeight, surfaceContains } from './surfaces';
export const SURFACE_CELL = .25;
export const SURFACE_TRANSITION = .1;
type Height = (x: number, z: number) => number;
const zero: Height = () => 0;
let cached: Height | undefined;
/** Grade de 25 cm, construída uma vez. Cada célula guarda uma consulta já compilada.
 * Bordas arredondadas/faixas finas conservam a função contínua original: arredondar
 * para o centro perderia grama/pintura. Não há busca ou varredura de peças no quadro.
 */
export function phase01SurfaceGrid(): Height {
    if (cached) return cached;
    const { minX, maxX, minZ, maxZ } = layout.bounds;
    const width = Math.ceil((maxX - minX) / SURFACE_CELL) + 1;
    const depth = Math.ceil((maxZ - minZ) / SURFACE_CELL) + 1;
    const cells: number[][] = Array.from({ length: width * depth }, () => []);
    phase01Surfaces.forEach((p, index) => {
        if (p.top <= 0) return;
        const halfX = Math.abs(p.cos) * p.w / 2 + Math.abs(p.sin) * p.d / 2;
        const halfZ = Math.abs(p.sin) * p.w / 2 + Math.abs(p.cos) * p.d / 2;
        const x0 = Math.max(0, Math.floor((p.x - halfX - minX) / SURFACE_CELL));
        const x1 = Math.min(width - 1, Math.floor((p.x + halfX - minX) / SURFACE_CELL));
        const z0 = Math.max(0, Math.floor((p.z - halfZ - minZ) / SURFACE_CELL));
        const z1 = Math.min(depth - 1, Math.floor((p.z + halfZ - minZ) / SURFACE_CELL));
        for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) cells[z * width + x].push(index);
    });
    const compiled = new Map<string, Height>();
    const heights = new Float64Array(cells.length);
    const grid = cells.map((indices, cell) => {
        const x = minX + (cell % width) * SURFACE_CELL, z = minZ + Math.floor(cell / width) * SURFACE_CELL;
        heights[cell] = phase01SurfaceHeight(x + SURFACE_CELL / 2, z + SURFACE_CELL / 2);
        if (!indices.length) return null;
        indices.sort((a, b) => phase01Surfaces[a].top - phase01Surfaces[b].top);
        const top = phase01Surfaces[indices[indices.length - 1]];
        // Uma superfície convexa contendo os quatro cantos cobre toda a célula.
        // Pinturas vazadas nunca usam esse atalho. Bordas conservam consulta exata.
        if (!('ring' in top && top.ring) && surfaceContains(top, x, z)
            && surfaceContains(top, x + SURFACE_CELL, z) && surfaceContains(top, x, z + SURFACE_CELL)
            && surfaceContains(top, x + SURFACE_CELL, z + SURFACE_CELL)) return null;
        const key = indices.join(',');
        const existing = compiled.get(key); if (existing) return existing;
        let sample = zero;
        for (const index of indices) {
            const p = phase01Surfaces[index], below = sample;
            sample = (x, z) => surfaceContains(p, x, z) ? p.top : below(x, z);
        }
        compiled.set(key, sample); return sample;
    });
    cached = (x, z) => {
        if (!Number.isFinite(x) || !Number.isFinite(z) || x < minX || x > maxX || z < minZ || z > maxZ) return 0;
        const cell = Math.floor((z - minZ) / SURFACE_CELL) * width + Math.floor((x - minX) / SURFACE_CELL);
        return grid[cell]?.(x, z) ?? heights[cell];
    };
    return cached;
}
