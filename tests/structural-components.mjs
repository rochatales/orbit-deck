/** Componentes conexos da geometria real, soldando só para análise as costuras glTF (UV/normal). */
import { Vector3 } from 'three';
export function components(mesh) {
    const p = mesh.geometry.attributes.position, index = mesh.geometry.index;
    const parents = Array.from({ length: p.count }, (_, i) => i), coords = new Map();
    const find = i => parents[i] === i ? i : parents[i] = find(parents[i]);
    const join = (a, b) => { parents[find(a)] = find(b); };
    for (let i = 0; i < p.count; i++) {
        const key = [p.getX(i), p.getY(i), p.getZ(i)].map(x => x.toFixed(5)).join('/');
        if (coords.has(key)) join(i, coords.get(key)); else coords.set(key, i);
    }
    for (let i = 0; i < (index?.count ?? p.count); i += 3) {
        const a = index ? index.getX(i) : i;
        join(a, index ? index.getX(i + 1) : i + 1); join(a, index ? index.getX(i + 2) : i + 2);
    }
    const groups = new Map();
    for (let i = 0; i < p.count; i++) {
        const id = find(i); if (!groups.has(id)) groups.set(id, []); groups.get(id).push(i);
    }
    return Array.from(groups.values(), vertices => {
        const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity], point = new Vector3();
        for (const i of vertices) {
            mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
            [point.x, point.y, point.z].forEach((v, j) => { min[j] = Math.min(min[j], v); max[j] = Math.max(max[j], v); });
        }
        return { mesh: mesh.name, vertices, min, max };
    });
}
export function visibleComponents(root) {
    root.updateMatrixWorld(true);
    const result = [];
    root.traverseVisible(n => { if (n.isMesh) result.push(...components(n)); });
    return result;
}
