import { type Mesh, type Object3D } from 'three';
import { ARES_LANDING } from './aresLanding';
import { prepareAresVisual as prepareShip } from '../aresVisual';

/** Remove só os 12 triângulos do antigo remendo Chegada, no GLB próprio da viagem. */
export function removeOldLandingPatch(scene: Object3D) {
    let removed = 0;
    scene.traverse(node => {
        const object = node as Mesh;
        if (!object.isMesh || object.userData.id_estavel !== 'SETOR_11_concreto') return;
        const geometry = object.geometry, positions = geometry.getAttribute('position'), index = geometry.index;
        if (!index) throw new Error('Piso de chegada sem índices');
        const keep: number[] = [];
        const inside = (i: number) => positions.getX(i) >= -5.0001 && positions.getX(i) <= 5.0001 &&
            positions.getZ(i) >= 7.9999 && positions.getZ(i) <= 18.0001 &&
            positions.getY(i) >= 0.0019 && positions.getY(i) <= 0.0141;
        for (let i = 0; i < index.count; i += 3) {
            const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
            if (inside(a) && inside(b) && inside(c)) removed++;
            else keep.push(a, b, c);
        }
        geometry.setIndex(keep);
    });
    if (removed !== 12) throw new Error(`Piso de chegada incompatível: ${removed}/12 triângulos`);
    return removed;
}

export function prepareAresVisual(scene: Object3D) {
    prepareShip(scene, { position: ARES_LANDING.position, name: 'ShanghaiARES', impact: true });
}
