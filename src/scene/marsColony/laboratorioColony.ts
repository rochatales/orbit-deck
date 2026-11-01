import { subtractFloorAreas } from './floorCut';
import { Mesh, type BufferGeometry, type Object3D } from 'three';
import { LABORATORIO } from '../../game/laboratorioLayout';
import type { MasterplanManifest } from './masterplanRuntime';
const removed = new Set<string>(LABORATORIO.removedParts);
const rooms = new Set<string>(['smart-lab']);
/** Só a cópia de montagem perde a sala smart-lab; o GLB e manifesto v007 permanecem intactos. */
export function removeRoomForLaboratorio(scene: Object3D, manifest: MasterplanManifest, ownedGeometry: BufferGeometry[]): MasterplanManifest {
    const nodes: Object3D[] = [];
    scene.traverse(node => { if (removed.has(node.userData.id_estavel) || rooms.has(node.userData.ambiente)) nodes.push(node); });
    for (const node of nodes) node.removeFromParent();
    // O v007 compartilha os pisos entre ambientes. Corte apenas as células substituídas.
    for (const id of ['PISO_v007_Externo', 'PISO_v007_Interno']) {
        const floor = scene.getObjectByName(id);
        if (!floor) throw new Error(`Piso v007 ausente: ${id}`);
        floor.updateWorldMatrix(true, true);
        floor.traverse(node => {
            const mesh = node as Mesh;
            if (!mesh.isMesh) return;
            const copy = subtractFloorAreas(mesh.geometry, mesh.matrixWorld, LABORATORIO.floorCutAreas);
            mesh.geometry = copy; ownedGeometry.push(copy);
        });
    }
    return { ...manifest, parts: manifest.parts.filter(part => !removed.has(part.id)), doors: manifest.doors.filter(door => !rooms.has(door.owner)), walkableAreas: manifest.walkableAreas.filter(a => !LABORATORIO.removedAreas.includes(a.id)) };
}
