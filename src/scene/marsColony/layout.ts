import { Box3, Vector3, type Object3D } from 'three';

/** Ajuste do autor em 24/10: centros geométricos X/Z; tela Oeste olha para a colônia (−Z). */
export const COLONY_CONSOLE_LAYOUT = {
    PLAT_Console_Oeste: { x: -3, z: 25.9, rotationY: Math.PI },
    PLAT_Console_Leste: { x: 6.85, z: 31.8, rotationY: Math.PI / 2 }
} as const;

/** Tubo fundido à estrutura dos tanques grandes: rack recebe sua ponta original, sem mover o tubo. */
export const COLONY_RACK_LAYOUT = { x: -6.75, z: 31.6, rotationY: 0 } as const;

/** Pegada rotacionada do Oeste, com margem conservadora de até 0,1 mm. */
export const MARS_CONSOLE_WEST_COLLIDER = { minX: -3.4701, maxX: -2.5299, minZ: 25.5384, maxZ: 26.2616 } as const;

/** ARES-I de 22/10 substitui o foguete e o deck retangular. Fonte e cache permanecem intactos. */
export const REMOVED_COLONY_PARTS = new Set([
    'PLAT_B3_Foguete', 'PLAT_B3_Base_Lancamento', 'PLAT_B3_Sinal_Piso_Embarque',
    'ARQ_Piso_Deck', 'ARQ_Deck_Marcacoes',
    'PROP_Balizador.01', 'PROP_Balizador.03',
    ...Array.from({ length: 13 }, (_, i) => `PROP_Balizador.${i + 35}`),
    'PLAT_B3_Torre_Servico', 'PLAT_B3_Mastro_Servico',
    'PLAT_B3_Casa_Elevador_Base', 'PLAT_B3_Sinal_Casa_Elevador',
    'PLAT_B3_Passarela_Servico_3m', 'PLAT_B3_Umbilical_Mastro_1',
    'PLAT_B3_Umbilical_Mastro_2', 'PLAT_B3_Umbilical_Torre',
    'PLAT_B3_Braco_Tripulacao', 'PLAT_B3_Linhas_Tanques',
    'PLAT_Baia_Parapeitos', 'PLAT_B3_Elevador_Embarque',
    'PLAT_B3_Chevrons_Embarque', 'PLAT_B3_Totem_Embarque', 'PLAT_B3_Sinal_Totem',
    'ARQ_Laboratorio_Porta_Folhas', 'ARQ_Laboratorio_Porta_Folhas_Aberta'
]);

export function applyColonyLayout(scene: Object3D) {
    const bounds = new Box3(), center = new Vector3();
    scene.traverse(node => {
        const name: string = node.userData.colony_name ?? node.name;
        if (REMOVED_COLONY_PARTS.has(name)) node.visible = false;
        if (name === 'PLAT_Rack_Cilindros' || name === 'PLAT_Console_Oeste' || name === 'PLAT_Console_Leste') {
            const placement = name === 'PLAT_Rack_Cilindros' ? COLONY_RACK_LAYOUT : COLONY_CONSOLE_LAYOUT[name];
            node.rotation.y = placement.rotationY;
            node.updateWorldMatrix(true, true);
            bounds.setFromObject(node).getCenter(center);
            node.position.x += placement.x - center.x;
            node.position.z += placement.z - center.z;
        }
        if (name === 'PLAT_B3_Foguete' || name === 'PLAT_B3_Base_Lancamento') {
            node.position.x += 10;
            node.position.z -= 8.5;
        }
    });
    scene.updateMatrixWorld(true);
}
