import { DoubleSide, MeshStandardMaterial, type Mesh } from 'three';

/** Faces criadas pelos booleanos herdaram UVs do atlas, inclusive tiles emissivos.
 * Troca só o acabamento dos quatro lados de cada vão; nunca altera o GLB/cache.
 */
export function blackenHangarDoorReveals(mesh: Mesh) {
    if (Array.isArray(mesh.material)) throw new Error('Casco do Hangar com materiais inesperados');
    const source = mesh.geometry, position = source.getAttribute('position'), index = source.getIndex();
    if (!index || source.groups.length) throw new Error('Geometria do casco do Hangar inesperada');
    const plain: number[] = [], black: number[] = [];
    const near = (a: number, b: number) => Math.abs(a - b) < .0001;
    const within = (v: number, a: number, b: number) => v >= a - .0001 && v <= b + .0001;
    // Coordenadas locais da v002 aprovada; soleira 0,16 e verga 2,56 m.
    const portals = [
        { axis: 0, low: -1.1, high: 1.1, depth: 2, front: -3.75, back: -2.65 },
        { axis: 2, low: -.675, high: 1.525, depth: 0, front: 3.45, back: 5.05 },
    ];
    const vertex = (i: number, axis: number) => position.getComponent(i, axis);
    for (let at = 0; at < index.count; at += 3) {
        const triangle = [index.getX(at), index.getX(at + 1), index.getX(at + 2)];
        const reveal = portals.some(p => {
            if (!triangle.every(i => within(vertex(i, p.depth), p.front, p.back)
                && within(vertex(i, p.axis), p.low, p.high) && within(vertex(i, 1), .16, 2.56))) return false;
            return triangle.every(i => near(vertex(i, p.axis), p.low))
                || triangle.every(i => near(vertex(i, p.axis), p.high))
                || triangle.every(i => near(vertex(i, 1), .16))
                || triangle.every(i => near(vertex(i, 1), 2.56));
        });
        (reveal ? black : plain).push(...triangle);
    }
    if (!black.length) throw new Error('Faces internas das portas do Hangar ausentes');
    const geometry = source.clone();
    geometry.setIndex([...plain, ...black]);
    geometry.addGroup(0, plain.length, 0); geometry.addGroup(plain.length, black.length, 1);
    const material = new MeshStandardMaterial({ color: 0x050505, roughness: .9, metalness: .05, side: DoubleSide,
        // Soleira e chapas de recorte coincidentes não disputam a profundidade com o piso.
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    material.name = 'HangarDoorRevealBlack';
    mesh.geometry = geometry; mesh.material = [mesh.material, material];
    return { geometry, material };
}
