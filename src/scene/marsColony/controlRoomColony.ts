import { subtractFloorAreas } from './floorCut';
import { Mesh, type BufferGeometry, type Object3D } from 'three';
import { CONTROL_ROOM } from '../../game/controlRoomLayout';
import type { MasterplanManifest } from './masterplanRuntime';

const CONTROL_ROOM_AMBIENTE = 'brand-brain';

/** Remove da cópia de montagem do masterplan v007 a antiga sala brand-brain e recorta o piso sob a Control Room. */
export function removeRoomForControlRoom(scene: Object3D, manifest: MasterplanManifest, ownedGeometry: BufferGeometry[]): MasterplanManifest {
    const nodes: Object3D[] = [];
    scene.traverse(node => {
        if (node.userData.ambiente === CONTROL_ROOM_AMBIENTE) {
            nodes.push(node);
        }
    });
    for (const node of nodes) {
        node.removeFromParent();
    }
    for (const id of ['PISO_v007_Externo', 'PISO_v007_Interno']) {
        const floor = scene.getObjectByName(id);
        if (!floor) throw new Error(`Piso v007 ausente: ${id}`);
        floor.updateWorldMatrix(true, true);
        floor.traverse(node => {
            const mesh = node as Mesh;
            if (!mesh.isMesh) return;
            const copy = subtractFloorAreas(mesh.geometry, mesh.matrixWorld, CONTROL_ROOM.floorCutAreas);
            mesh.geometry = copy;
            ownedGeometry.push(copy);
        });
    }
    return {
        ...manifest,
        parts: manifest.parts.filter(part => part.ambiente !== CONTROL_ROOM_AMBIENTE),
        doors: manifest.doors.filter(door => door.owner !== CONTROL_ROOM_AMBIENTE)
    };
}
