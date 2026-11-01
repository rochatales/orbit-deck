import type { Object3D } from 'three';
import type { MasterplanManifest, MasterplanPart } from './masterplanRuntime';
import type { SandwindTarget } from './SandwindController';
import { HANGAR } from '../../game/hangarLayout';

/** Unidades completas, nunca uma peça de teto/porta controlada pelo runtime. */
export function sandwindTargets(scope: Object3D, masterplan: Object3D, manifest: MasterplanManifest): SandwindTarget[] {
    const nodes = new Map<string, Object3D>(), parts = new Map(manifest.parts.map(part => [part.id, part]));
    masterplan.traverse(node => { if (node.userData.id_estavel) nodes.set(node.userData.id_estavel, node); });
    const owner = (part: MasterplanPart): string => {
        if (part.ambiente) return `room_${part.ambiente}`;
        const supports = [...part.apoiado_em, ...part.apoiado_em_todos].map(id => parts.get(id)).filter((p): p is MasterplanPart => !!p);
        const rooms = new Set(supports.map(p => owner(p)).filter(id => id.startsWith('room_')));
        return rooms.size === 1 ? [...rooms][0] : part.papel === 'solar' ? 'solar' : part.id;
    };
    const targets = new Map<string, SandwindTarget>();
    for (const part of manifest.parts) {
        const node = nodes.get(part.id);
        // Piso global e passarelas caminháveis nunca são descartados. Recebem o shader.
        if (!node || part.papel === 'floor' || part.id === 'TER_Solo') continue;
        const id = owner(part);
        let target = targets.get(id);
        if (!target) { target = { id, nodes: [] }; targets.set(id, target); }
        target.nodes.push(node);
    }
    for (const [id, name] of [['hangar', 'Hangar'], ['greenhouse', 'Greenhouse'], ['deck-props', 'MarsDeckPropsV006'], ['quartel', 'Quartel'], ['laboratorio', 'Laboratorio']] as const) {
        const root = scope.getObjectByName(name);
        if (root) targets.set(id, { id, nodes: [root] });
    }
    const hangar = targets.get('hangar');
    if (hangar) hangar.bounds = {
        minX: Math.min(...HANGAR.walkableAreas.map(b => b.minX), HANGAR.bridge.minX),
        maxX: Math.max(...HANGAR.walkableAreas.map(b => b.maxX), HANGAR.bridge.maxX),
        minZ: Math.min(...HANGAR.walkableAreas.map(b => b.minZ), HANGAR.bridge.minZ),
        maxZ: Math.max(...HANGAR.walkableAreas.map(b => b.maxZ), HANGAR.bridge.maxZ)
    };
    const ship = scope.getObjectByName('MarsARES'), deck = scope.getObjectByName('MarsARESDeck');
    if (ship && deck) targets.set('ares', { id: 'ares', nodes: [ship, deck] });
    return [...targets.values()];
}
