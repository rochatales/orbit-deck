import { Mesh, Vector3, type Object3D } from 'three';
import type { ColonyPart } from './visibility';

/** Trilho visual fora da face do portal B3; âncoras de interação/colisão não se movem. */
export function alignColonyDoors(scene: Object3D, parts: ColonyPart[], world: Object3D) {
    scene.updateMatrixWorld(true);
    world.updateMatrixWorld(true);
    const portals = parts.filter(part => /_Port[ao]/.test(part.name)
        && !part.name.includes('Verga') && !part.name.includes('Folhas'));
    const nodes = new Map<string, Object3D>();
    scene.traverse(node => nodes.set(node.userData.colony_name ?? node.name, node));
    const point = new Vector3(), center = new Vector3();
    const doors: Object3D[] = [];
    world.traverse(door => {
        if (door.name !== 'PortaAutomatica') return;
        door.getWorldPosition(center);
        const portal = portals.find(part => Math.hypot(
            (part.bounds.minX + part.bounds.maxX) / 2 - center.x,
            (part.bounds.minZ + part.bounds.maxZ) / 2 - center.z) < 0.3);
        const node = portal && nodes.get(portal.name);
        if (!node) throw new Error(`Portal B3 ausente para porta em ${center.x}, ${center.z}`);
        let front = 0;
        node.traverse(object => {
            const mesh = object as Mesh;
            if (!mesh.isMesh) return;
            const position = mesh.geometry.attributes.position;
            for (let i = 0; i < position.count; i++) {
                point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
                door.worldToLocal(point);
                // Soleiras avançadas não definem a profundidade do trilho.
                if (point.y > 0.05) front = Math.max(front, point.z);
            }
        });
        for (const child of door.children) {
            if (!(child instanceof Mesh)) continue;
            child.position.z = front + 0.1; // 5 cm livres além da faixa mais espessa (10 cm).
            child.castShadow = false;
        }
        for (const leaf of door.children.slice(0, 2)) {
            // Folga da soleira (1,2 cm) e da verga (2,18 m), sem mudar slide/largura.
            leaf.scale.y = 2.12 / 2.18;
            leaf.position.y = 1.09;
        }
        door.children[2].position.y = 2.22;
        door.userData.colonyPortal = portal!.name;
        doors.push(door);
    });
    return doors;
}
