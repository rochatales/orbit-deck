import type { Object3D } from 'three';

/** Monta a casca externa na cópia do prédio, antes do runtime; o GLB original fica intacto. */
export function applyColonyShell(scene: Object3D, shell: Object3D, replaced: string[]) {
    for (const name of replaced) {
        const node = scene.getObjectByName(name);
        if (!node) throw new Error(`Peça ausente para a casca: ${name}`);
        node.removeFromParent();
    }
    for (const part of shell.getObjectByName('Casca')?.children ?? shell.children) {
        const copy = part.clone(true), walls = copy.name === 'Casca_Parede' ? scene.getObjectByName('Building_Walls') : undefined;
        (walls ?? scene).add(copy);
    }
}
