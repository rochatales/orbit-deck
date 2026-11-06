// Geometria real posada em Idle, no espaço do Head; somente QA.
import { Box3, CatmullRomCurve3, Ray, Triangle, Vector3 } from 'three';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';

export async function engineerHelmetSurface() {
    const g = await loadGlb('src/assets/characters/npcs/engenheiro-v001.glb');
    const { EngineerRig } = loadSource('src/npcs/engineerRig.ts');
    const rig = new EngineerRig(g.scene, g.animations);
    rig.mixer.update(0); g.scene.updateMatrixWorld(true);
    const head = rig.visor.head, inverse = head.matrixWorld.clone().invert();
    const scale = head.getWorldScale(new Vector3()).x, triangles = [];
    g.scene.traverse(mesh => {
        if (!mesh.isSkinnedMesh) return;
        mesh.skeleton.update();
        const vertices = [], index = mesh.geometry.index;
        for (let i = 0; i < mesh.geometry.attributes.position.count; i++)
            vertices.push(mesh.getVertexPosition(i, new Vector3()).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse));
        for (let i = 0; i < index.count; i += 3) {
            const t = new Triangle(vertices[index.getX(i)], vertices[index.getX(i + 1)], vertices[index.getX(i + 2)]);
            triangles.push({ t, box: new Box3().setFromPoints([t.a, t.b, t.c]) });
        }
    });
    rig.dispose();
    const hit = new Vector3(), closest = new Vector3();
    const ray = new Ray(new Vector3(), new Vector3(0, 0, -1));
    return {
        scale,
        frontZ(x, y) {
            ray.origin.set(x, y, 1); let z = -Infinity;
            for (const { t, box } of triangles) {
                if (x < box.min.x || x > box.max.x || y < box.min.y || y > box.max.y) continue;
                if (ray.intersectTriangle(t.a, t.b, t.c, false, hit)) z = Math.max(z, hit.z);
            }
            if (!Number.isFinite(z)) throw Error(`Raio sem capacete em ${x}, ${y}.`);
            return z;
        },
        distance(p) {
            let squared = Infinity;
            for (const { t, box } of triangles) {
                const dx = Math.max(box.min.x - p.x, 0, p.x - box.max.x);
                const dy = Math.max(box.min.y - p.y, 0, p.y - box.max.y);
                const dz = Math.max(box.min.z - p.z, 0, p.z - box.max.z);
                if (dx * dx + dy * dy + dz * dz >= squared) continue;
                t.closestPointToPoint(p, closest); squared = Math.min(squared, p.distanceToSquared(closest));
            }
            return Math.sqrt(squared);
        }
    };
}

/** Cada trecho Catmull-Rom é cúbico e convertido exatamente em Bézier.
 * A curva fica no fecho convexo dos quatro controles. As subdivisões
 * cobrem toda a curva, e não apenas alguns pontos amostrados. */
export function certifyVisorCurve(points, surface, haloRadius) {
    const curve = new CatmullRomCurve3(points.map(p => new Vector3(...p)));
    let minClearance = Infinity, maxDistance = 0, maxFrontGap = 0, leaves = 0;
    const visit = (b, depth = 0) => {
        const radius = Math.max(...b.map(p => p.distanceTo(b[0])));
        if (radius > .0001) {
            if (depth > 20) throw Error('Subdivisão sem convergência.');
            const a = b[0].clone().lerp(b[1], .5), c = b[1].clone().lerp(b[2], .5), d = b[2].clone().lerp(b[3], .5);
            const e = a.clone().lerp(c, .5), f = c.clone().lerp(d, .5), m = e.clone().lerp(f, .5);
            visit([b[0], a, e, m], depth + 1); visit([m, f, d, b[3]], depth + 1); return;
        }
        const p = b[0], frontGap = p.z - surface.frontZ(p.x, p.y), distance = surface.distance(p);
        if (frontGap <= 0) throw Error('Curva dentro do capacete.');
        // Distância à malha é 1-Lipschitz: cobre qualquer ponto desta folha,
        // incluindo o volume do halo, maior que o filete.
        minClearance = Math.min(minClearance, distance - radius - haloRadius);
        maxDistance = Math.max(maxDistance, distance + radius);
        maxFrontGap = Math.max(maxFrontGap, frontGap + radius); leaves++;
    };
    for (let i = 0; i < points.length - 1; i++) {
        const n = points.length - 1, b0 = curve.getPoint(i / n), b3 = curve.getPoint((i + 1) / n);
        const a = curve.getPoint((i + 1 / 3) / n).multiplyScalar(27).addScaledVector(b0, -8).sub(b3);
        const b = curve.getPoint((i + 2 / 3) / n).multiplyScalar(27).sub(b0).addScaledVector(b3, -8);
        const b1 = a.clone().multiplyScalar(2).sub(b).divideScalar(18), b2 = b.clone().multiplyScalar(2).sub(a).divideScalar(18);
        visit([b0, b1, b2, b3]);
    }
    return { minClearance: minClearance * surface.scale, maxDistance: maxDistance * surface.scale,
        maxFrontGap: maxFrontGap * surface.scale, leaves };
}
