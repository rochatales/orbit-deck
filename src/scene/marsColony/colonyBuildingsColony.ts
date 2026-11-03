import { Mesh, type BufferGeometry, type Object3D } from 'three';
import { BUILDING_FLOOR_CUTS, REPLACED_BUILDING_ROOMS } from '../../game/colonyBuildingsLayout';
import { subtractFloorAreas } from './floorCut';
import type { MasterplanManifest } from './masterplanRuntime';

export function cutBuildingFloors(root: Object3D, owned: BufferGeometry[]) {
    root.updateWorldMatrix(true, true);
    root.traverse(node => {
        const mesh = node as Mesh;
        if (!mesh.isMesh) return;
        const copy = subtractFloorAreas(mesh.geometry, mesh.matrixWorld, BUILDING_FLOOR_CUTS);
        mesh.geometry = copy; owned.push(copy);
    });
}
/** Só a cópia runtime: conserva o masterplan/GLB fonte e os módulos adjacentes. */
export function removeRoomsForBuildings(scene: Object3D, manifest: MasterplanManifest, owned: BufferGeometry[]): MasterplanManifest {
    const removed: Object3D[] = [];
    scene.traverse(node => { if (REPLACED_BUILDING_ROOMS.has(node.userData.ambiente)) removed.push(node); });
    for (const node of removed) node.removeFromParent();
    for (const id of ['PISO_v007_Externo', 'PISO_v007_Interno']) {
        const node = scene.getObjectByName(id);
        if (node) cutBuildingFloors(node, owned);
    }
    return { ...manifest, parts: manifest.parts.filter(p => !REPLACED_BUILDING_ROOMS.has(p.ambiente)),
        doors: manifest.doors.filter(d => !REPLACED_BUILDING_ROOMS.has(d.owner)) };
}
