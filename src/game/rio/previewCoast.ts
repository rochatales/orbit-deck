import { Group, Mesh, type Object3D } from 'three';
import type { OfficeWorld } from '../../world/createOfficeMap';
import { disposeWorld } from '../worldUtils';

// O GLB v005 guarda a faixa inteira da praia neste lote. Os outros lotes de
// areia incluem dunas, canteiros e depósitos que devem continuar visíveis.
const BEACH_BATCH = 'RIO_mapa_21_areia';
const STATIC_COAST_MATERIALS = new Set(['costa_praia', 'areia_molhada', 'mar']);

export function removeRioStaticCoast(world: OfficeWorld, land: Object3D, border: Object3D) {
    const excluded = new Group();
    for (const scene of [land, border]) {
        const meshes: Mesh[] = [];
        scene.traverse(object => { if (object instanceof Mesh) meshes.push(object); });
        for (const mesh of meshes) {
            if (scene === land && mesh.name === BEACH_BATCH) {
                mesh.removeFromParent();
                // O material de areia permanece em uso nos lotes de decoração.
                mesh.geometry.dispose();
            } else if (!Array.isArray(mesh.material) && STATIC_COAST_MATERIALS.has(mesh.material.name)) {
                excluded.add(mesh);
            }
        }
    }
    disposeWorld({ ...world, group: excluded });
}
