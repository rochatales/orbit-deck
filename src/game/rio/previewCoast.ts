import { Group, Mesh, type Object3D } from 'three';
import type { OfficeWorld } from '../../world/createOfficeMap';
import { disposeWorld } from '../worldUtils';

// O GLB v005 guarda a faixa inteira da praia neste lote. Os outros lotes de
// areia incluem dunas, canteiros e depósitos que devem continuar visíveis.
const LEGACY_MAP_BATCHES = new Set([
    'RIO_mapa_21_areia', // faixa plana sobreposta à praia em tempo real
    'RIO_mapa_22_concreto', // placa de pouso
    'RIO_mapa_22_faixa', // quatro marcas da reserva pintadas sobre a placa
]);
const STATIC_COAST_MATERIALS = new Set(['costa_praia', 'areia_molhada', 'mar']);

export function removeRioStaticCoast(world: OfficeWorld, land: Object3D, border: Object3D) {
    const excluded = new Group();
    for (const scene of [land, border]) {
        const meshes: Mesh[] = [];
        scene.traverse(object => { if (object instanceof Mesh) meshes.push(object); });
        for (const mesh of meshes) {
            if (scene === land && LEGACY_MAP_BATCHES.has(mesh.name)) {
                mesh.removeFromParent();
                // Areia, concreto e pintura ainda são usados nos outros lotes.
                mesh.geometry.dispose();
            } else if (!Array.isArray(mesh.material) && STATIC_COAST_MATERIALS.has(mesh.material.name)) {
                excluded.add(mesh);
            }
        }
    }
    disposeWorld({ ...world, group: excluded });
}
