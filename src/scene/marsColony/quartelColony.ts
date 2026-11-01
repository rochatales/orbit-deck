import { subtractFloorAreas } from './floorCut';
import { Mesh, type BufferGeometry, type Object3D } from 'three';
import { QUARTEL } from '../../game/quartelLayout';
import type { MasterplanManifest } from './masterplanRuntime';
const removed = new Set<string>(QUARTEL.removedParts);
const rooms = new Set<string>(['design']);
/** Só a cópia de montagem perde a sala design; o GLB e manifesto v007 permanecem intactos. */
export function removeRoomForQuartel(scene: Object3D, manifest: MasterplanManifest, ownedGeometry: BufferGeometry[]): MasterplanManifest {
    const nodes: Object3D[] = [];
    scene.traverse(node => { if (removed.has(node.userData.id_estavel) || rooms.has(node.userData.ambiente)) nodes.push(node); });
    for (const node of nodes) node.removeFromParent();
    // Piso em y=0 permanece sob a base elevada, preenchendo os cantos arredondados.
    // Só as rampas chegam ao chão e exigem recorte, feito pelas bordas exatas.
    for (const id of ['PISO_v007_Externo', 'PISO_v007_Interno']) {
        const floor = scene.getObjectByName(id);
        if (!floor) throw new Error(`Piso v007 ausente: ${id}`);
        floor.updateWorldMatrix(true, true);
        floor.traverse(node => {
            const mesh = node as Mesh;
            if (!mesh.isMesh) return;
            const copy = subtractFloorAreas(mesh.geometry, mesh.matrixWorld, QUARTEL.ramps);
            mesh.geometry = copy; ownedGeometry.push(copy);
        });
    }
    return { ...manifest, parts: manifest.parts.filter(part => !removed.has(part.id)), doors: manifest.doors.filter(door => !rooms.has(door.owner)), walkableAreas: manifest.walkableAreas.filter(a => !QUARTEL.removedAreas.includes(a.id)) };
}
