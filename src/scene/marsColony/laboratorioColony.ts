import { Mesh, Vector3, type BufferGeometry, type Object3D } from 'three';
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
    const point = new Vector3();
    for (const id of ['PISO_v007_Externo', 'PISO_v007_Interno']) {
        const floor = scene.getObjectByName(id);
        if (!floor) throw new Error(`Piso v007 ausente: ${id}`);
        floor.updateWorldMatrix(true, true);
        floor.traverse(node => {
            const mesh = node as Mesh;
            if (!mesh.isMesh) return;
            const source = mesh.geometry, position = source.getAttribute('position'), index = source.getIndex();
            const total = index ? index.count : position.count;
            const groups = source.groups.length ? source.groups : [{ start: 0, count: total, materialIndex: 0 }];
            const kept: number[] = [], ranges: { start: number; count: number; materialIndex: number }[] = [];
            for (const group of groups) {
                const start = kept.length;
                for (let at = group.start; at < group.start + group.count; at += 3) {
                    const a = index ? index.getX(at) : at, b = index ? index.getX(at + 1) : at + 1, c = index ? index.getX(at + 2) : at + 2;
                    point.set((position.getX(a) + position.getX(b) + position.getX(c)) / 3,
                        (position.getY(a) + position.getY(b) + position.getY(c)) / 3,
                        (position.getZ(a) + position.getZ(b) + position.getZ(c)) / 3).applyMatrix4(mesh.matrixWorld);
                    if (!LABORATORIO.floorCutAreas.some(area => point.x > area.minX && point.x < area.maxX && point.z > area.minZ && point.z < area.maxZ)) kept.push(a, b, c);
                }
                ranges.push({ start, count: kept.length - start, materialIndex: group.materialIndex ?? 0 });
            }
            const copy = source.clone(); copy.setIndex(kept); copy.clearGroups();
            for (const group of ranges) copy.addGroup(group.start, group.count, group.materialIndex);
            mesh.geometry = copy; ownedGeometry.push(copy);
        });
    }
    return { ...manifest, parts: manifest.parts.filter(part => !removed.has(part.id)), doors: manifest.doors.filter(door => !rooms.has(door.owner)), walkableAreas: manifest.walkableAreas.filter(a => !LABORATORIO.removedAreas.includes(a.id)) };
}
