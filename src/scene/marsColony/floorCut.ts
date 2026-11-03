import { BufferGeometry, Float32BufferAttribute, Vector3, type Matrix4 } from 'three';
import type { RectBounds } from '../../utils/math';
interface Vertex { x: number; z: number; data: number[] }
/** Recorta triângulos pela borda real; interpola UV/cores, sem teste por centroide. Só na montagem. */
export function subtractFloorAreas(source: BufferGeometry, matrix: Matrix4, areas: RectBounds[]) {
    const specs = Object.entries(source.attributes), lengths = specs.map(([, a]) => a.itemSize), values = specs.map(() => [] as number[]);
    const index = source.getIndex(), count = index ? index.count : source.getAttribute('position').count;
    const groups = source.groups.length ? source.groups : [{ start: 0, count, materialIndex: 0 }];
    const result = new BufferGeometry(), point = new Vector3();
    const vertex = (at: number): Vertex => {
        const i = index ? index.getX(at) : at, data: number[] = [];
        for (const [, attr] of specs) for (let k = 0; k < attr.itemSize; k++) data.push(attr.getComponent(i, k));
        point.fromBufferAttribute(source.getAttribute('position'), i).applyMatrix4(matrix);
        return { x: point.x, z: point.z, data };
    };
    const half = (poly: Vertex[], axis: 'x' | 'z', edge: number, sign: number) => {
        const out: Vertex[] = [];
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i], b = poly[(i + 1) % poly.length], da = (a[axis] - edge) * sign, db = (b[axis] - edge) * sign;
            if (da >= 0) out.push(a);
            if ((da >= 0) !== (db >= 0)) {
                const t = da / (da - db);
                out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, data: a.data.map((v, k) => v + (b.data[k] - v) * t) });
            }
        }
        return out;
    };
    for (const group of groups) {
        const start = values[0].length / lengths[0];
        for (let at = group.start; at < group.start + group.count; at += 3) {
            let polygons = [[vertex(at), vertex(at + 1), vertex(at + 2)]];
            for (const b of areas) {
                const next: Vertex[][] = [];
                for (const poly of polygons) {
                    if (poly.every(v => v.x <= b.minX) || poly.every(v => v.x >= b.maxX) || poly.every(v => v.z <= b.minZ) || poly.every(v => v.z >= b.maxZ)) { next.push(poly); continue; }
                    let inside = poly;
                    for (const [axis, edge, sign] of [['x', b.minX, 1], ['x', b.maxX, -1], ['z', b.minZ, 1], ['z', b.maxZ, -1]] as const) {
                        const outside = half(inside, axis, edge, -sign);
                        if (outside.length >= 3) next.push(outside);
                        inside = half(inside, axis, edge, sign);
                        if (inside.length < 3) break;
                    }
                }
                polygons = next;
            }
            for (const poly of polygons) for (let i = 1; i < poly.length - 1; i++) {
                const a = poly[0], b = poly[i], c = poly[i + 1];
                if (Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)) < 1e-10) continue;
                for (const v of [a, b, c]) { let offset = 0; for (let k = 0; k < specs.length; k++) { for (let j = 0; j < lengths[k]; j++) values[k].push(v.data[offset++]); } }
            }
        }
        result.addGroup(start, values[0].length / lengths[0] - start, group.materialIndex);
    }
    specs.forEach(([name], i) => result.setAttribute(name, new Float32BufferAttribute(values[i], lengths[i])));
    result.computeBoundingBox(); result.computeBoundingSphere();
    return result;
}
