import type { RectBounds } from '../utils/math';
export interface Position {
    x: number;
    z: number;
}
export interface Terrain {
    /** Altura visual de apoio, consultada só ao nascer um drop. Movimento/visão continuam 2D. */
    surfaceHeight?: (x: number, z: number) => number;
    bounds: RectBounds;
    obstacles: RectBounds[];
    walkableAreas: RectBounds[];
}
export function segmentBox(a: Position, b: Position, box: RectBounds, radius = 0): number | null {
    let lo = 0, hi = 1;
    for (let axis = 0; axis < 2; axis++) {
        const start = axis === 0 ? a.x : a.z, delta = (axis === 0 ? b.x : b.z) - start;
        const min = (axis === 0 ? box.minX : box.minZ) - radius, max = (axis === 0 ? box.maxX : box.maxZ) + radius;
        if (Math.abs(delta) < 1e-9) {
            if (start < min || start > max)
                return null;
        }
        else {
            const t1 = (min - start) / delta, t2 = (max - start) / delta;
            lo = Math.max(lo, Math.min(t1, t2));
            hi = Math.min(hi, Math.max(t1, t2));
            if (lo > hi)
                return null;
        }
    }
    return lo;
}
export function traversable(p: Position, terrain: Terrain, radius: number) {
    const b = terrain.bounds;
    return p.x >= b.minX + radius && p.x <= b.maxX - radius && p.z >= b.minZ + radius && p.z <= b.maxZ - radius
        && terrain.walkableAreas.some(a => p.x >= a.minX && p.x <= a.maxX && p.z >= a.minZ && p.z <= a.maxZ)
        && !terrain.obstacles.some(o => segmentBox(p, p, o, radius) !== null);
}
export function clearSegment(a: Position, b: Position, terrain: Terrain, radius: number) {
    if (terrain.obstacles.some(o => segmentBox(a, b, o, radius) !== null))
        return false;
    const bounds = terrain.bounds;
    const inside = (p: Position, area: RectBounds) => p.x >= area.minX && p.x <= area.maxX && p.z >= area.minZ && p.z <= area.maxZ;
    if (a.x < bounds.minX + radius || a.x > bounds.maxX - radius || a.z < bounds.minZ + radius || a.z > bounds.maxZ - radius
        || b.x < bounds.minX + radius || b.x > bounds.maxX - radius || b.z < bounds.minZ + radius || b.z > bounds.maxZ - radius) return false;
    // A rectangle is convex; both endpoints inside one walkable area prove
    // coverage for the complete segment. Swept obstacle checks were done above.
    if (terrain.walkableAreas.some(area => inside(a, area) && inside(b, area))) return true;
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.2));
    for (let i = 0; i <= steps; i++) {
        const x = a.x + (b.x - a.x) * i / steps, z = a.z + (b.z - a.z) * i / steps;
        if (!terrain.walkableAreas.some(area => x >= area.minX && x <= area.maxX && z >= area.minZ && z <= area.maxZ)) return false;
    }
    return true;
}
/**
 * Corta a escada da grade de quatro direções (no lugar, sem alocar): mantém só os
 * nós onde a linha livre a partir do último nó mantido deixa de existir. Sem isso,
 * todos os robôs chegam ao jogador pelas mesmas quatro linhas retas da grade.
 * Pontos de grade são compartilhados pela Navigation: só as referências mudam.
 */
export function smoothPath(from: Position, path: Position[], terrain: Terrain, radius: number) {
    if (path.length < 2) return path;
    let anchor = from, write = 0;
    for (let i = 1; i < path.length; i++)
        if (!clearSegment(anchor, path[i], terrain, radius)) { anchor = path[i - 1]; path[write++] = anchor; }
    path[write++] = path[path.length - 1];
    path.length = write;
    return path;
}
/** Four-connected grid, inflated obstacles and swept edges: no corner cutting. */
export class Navigation {
    points: Position[] = [];
    edges: number[][] = [];
    private buckets: number[][] = [];
    private bucketWidth = 0;
    private bucketDepth = 0;
    private readonly bucketSize = 4;
    private distances = new Int32Array(0);
    private reverseEdges: number[][] = [];
    private cachedGoal = -1;
    private queue = new Int32Array(0);
    constructor(public terrain: Terrain, public radius: number, cell: number) {
        const ids = new Map<string, number>();
        const b = terrain.bounds;
        for (let x = b.minX + cell; x < b.maxX; x += cell)
            for (let z = b.minZ + cell; z < b.maxZ; z += cell) {
                const p = { x, z };
                if (traversable(p, terrain, radius)) {
                    ids.set(`${x},${z}`, this.points.length);
                    this.points.push(p);
                }
            }
        this.bucketWidth = Math.ceil((b.maxX - b.minX) / this.bucketSize);
        this.bucketDepth = Math.ceil((b.maxZ - b.minZ) / this.bucketSize);
        this.buckets = Array.from({ length: this.bucketWidth * this.bucketDepth }, () => []);
        this.points.forEach((p, i) => {
            const x = Math.floor((p.x - b.minX) / this.bucketSize), z = Math.floor((p.z - b.minZ) / this.bucketSize);
            this.buckets[z * this.bucketWidth + x].push(i);
        });
        this.distances = new Int32Array(this.points.length);
        this.queue = new Int32Array(this.points.length);
        this.edges = this.points.map(p => [[cell, 0], [-cell, 0], [0, cell], [0, -cell]].flatMap(([dx, dz]) => {
            const n = ids.get(`${p.x + dx},${p.z + dz}`);
            return n !== undefined && clearSegment(p, this.points[n], terrain, radius) ? [n] : [];
        }));
        this.reverseEdges = this.points.map(() => []);
        this.edges.forEach((edges, i) => edges.forEach(n => this.reverseEdges[n].push(i)));
    }
    nearest(p: Position, endpointRadius = this.radius) {
        if (!traversable(p, this.terrain, endpointRadius)) return -1;
        const bounds = this.terrain.bounds, size = this.bucketSize;
        const cx = Math.floor((p.x - bounds.minX) / size), cz = Math.floor((p.z - bounds.minZ) / size);
        let best = -1, distance = Infinity;
        const limit = Math.max(this.bucketWidth, this.bucketDepth);
        // Visit square rings. Once their outer boundary is farther than the best
        // candidate, no unvisited bucket can improve it. Ties retain original ID order.
        for (let ring = 0; ring <= limit; ring++) {
            for (let z = Math.max(0, cz - ring); z <= Math.min(this.bucketDepth - 1, cz + ring); z++) {
                for (let x = Math.max(0, cx - ring); x <= Math.min(this.bucketWidth - 1, cx + ring); x++) {
                    if (ring && Math.max(Math.abs(x - cx), Math.abs(z - cz)) !== ring) continue;
                    for (const i of this.buckets[z * this.bucketWidth + x]) {
                        const q = this.points[i], d = (p.x - q.x) ** 2 + (p.z - q.z) ** 2;
                        if ((d < distance || d === distance && i < best) && clearSegment(p, q, this.terrain, endpointRadius)) {
                            best = i; distance = d;
                        }
                    }
                }
            }
            const edge = Math.min(p.x - (bounds.minX + (cx - ring) * size), bounds.minX + (cx + ring + 1) * size - p.x,
                p.z - (bounds.minZ + (cz - ring) * size), bounds.minZ + (cz + ring + 1) * size - p.z);
            if (best !== -1 && edge * edge > distance) break;
        }
        return best;
    }
    path(a: Position, b: Position): Position[] {
        if (clearSegment(a, b, this.terrain, this.radius))
            return [{ ...b }];
        const targetFits = traversable(b, this.terrain, this.radius);
        const start = this.nearest(a), goal = this.nearest(b, targetFits ? this.radius : 0);
        if (start < 0 || goal < 0)
            return [];
        // One reverse distance field per goal. The 32 agents share it while the
        // player remains in the same cell; choosing the first decreasing edge
        // preserves the original BFS tie order, not merely the path length.
        const distance = this.distances, queue = this.queue;
        if (this.cachedGoal !== goal) {
            distance.fill(-1); distance[goal] = 0; queue[0] = goal;
            let tail = 1;
            for (let head = 0; head < tail; head++) {
                const current = queue[head];
                for (const n of this.reverseEdges[current]) if (distance[n] === -1) {
                    distance[n] = distance[current] + 1; queue[tail++] = n;
                }
            }
            this.cachedGoal = goal;
        }
        if (distance[start] < 0) return [];
        const result: Position[] = [this.points[start]];
        let current = start;
        while (current !== goal) {
            const next = this.edges[current].find(n => distance[n] === distance[current] - 1);
            if (next === undefined) return [];
            current = next; result.push(this.points[current]);
        }
        if (targetFits) result.push({ ...b });
        return result;
    }
}
