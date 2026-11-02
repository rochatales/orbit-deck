import { Group, type Object3D } from 'three';
import { applyColonyLayout } from './layout';

export const DECK_PROP_NAMES = ['PLAT_Console_Oeste', 'PLAT_Console_Leste', 'PLAT_Rack_Cilindros', 'PROP_Tanques', 'PLAT_Carro_1', 'PLAT_Carro_2'] as const;

/** Reutiliza exatamente os objetos v006; só a cópia recebe as posições aprovadas em 3e04ac8. */
export function createDeckProps(source: Object3D) {
    const copy = source.clone(true), props = new Group();
    props.name = 'MarsDeckPropsV006';
    applyColonyLayout(copy);
    for (const name of DECK_PROP_NAMES) {
        const node = copy.getObjectByName(name);
        if (!node) throw new Error(`Prop do deck ausente no v006: ${name}`);
        // attach preserva o transform em mundo, inclusive se o export tiver pais transformados.
        props.attach(node);
        node.traverse(o => { if ('isMesh' in o) { o.castShadow = true; o.receiveShadow = true; } });
    }
    props.updateMatrixWorld(true);
    return props;
}
