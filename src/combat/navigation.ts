import type { RectBounds } from '../utils/math';
export interface Position {
    x: number;
    z: number;
}
export interface Terrain {
    bounds: RectBounds;
    obstacles: RectBounds[];
    walkableAreas: RectBounds[];
}
export function segmentBox(a: Position, b: Position, box: RectBounds, radius = 0): number | null {
    let lo = 0, hi = 1;
    for (const [start, delta, min, max] of [[a.x, b.x - a.x, box.minX - radius, box.maxX + radius], [a.z, b.z - a.z, box.minZ - radius, box.maxZ + radius]]) {
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
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.2));
    for (let i = 0; i <= steps; i++)
        if (!traversable({ x: a.x + (b.x - a.x) * i / steps, z: a.z + (b.z - a.z) * i / steps }, terrain, radius))
            return false;
    return true;
}
/** Four-connected grid, inflated obstacles and swept edges: no corner cutting. */
export class Navigation {
    points: Position[] = [];
    edges: number[][] = [];
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
        this.edges = this.points.map(p => [[cell, 0], [-cell, 0], [0, cell], [0, -cell]].flatMap(([dx, dz]) => {
            const n = ids.get(`${p.x + dx},${p.z + dz}`);
            return n !== undefined && clearSegment(p, this.points[n], terrain, radius) ? [n] : [];
        }));
    }
    nearest(p: Position, endpointRadius = this.radius) {
        let best = -1, distance = Infinity;
        this.points.forEach((q, i) => { const d = (p.x - q.x) ** 2 + (p.z - q.z) ** 2; if (d < distance && clearSegment(p, q, this.terrain, endpointRadius)) {
            best = i;
            distance = d;
        } });
        return best;
    }
    path(a: Position, b: Position): Position[] {
        if (clearSegment(a, b, this.terrain, this.radius))
            return [{ ...b }];
        const targetFits = traversable(b, this.terrain, this.radius);
        const start = this.nearest(a), goal = this.nearest(b, targetFits ? this.radius : 0);
        if (start < 0 || goal < 0)
            return [];
        const parent = new Int32Array(this.points.length).fill(-1), queue = [start];
        parent[start] = start;
        for (let head = 0; head < queue.length && parent[goal] === -1; head++)
            for (const n of this.edges[queue[head]])
                if (parent[n] === -1) {
                    parent[n] = queue[head];
                    queue.push(n);
                }
        if (parent[goal] === -1)
            return [];
        const result: Position[] = targetFits ? [{ ...b }] : [];
        for (let i = goal; i !== start; i = parent[i])
            result.push(this.points[i]);
        result.push(this.points[start]);
        return result.reverse();
    }
}
