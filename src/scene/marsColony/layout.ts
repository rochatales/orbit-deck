import type { Object3D } from 'three';

/** Decisão do autor de 17/10: só foguete/base no deck. Fonte e cache permanecem intactos. */
export const REMOVED_COLONY_PARTS = new Set([
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
    scene.traverse(node => {
        const name = node.userData.colony_name ?? node.name;
        if (REMOVED_COLONY_PARTS.has(name)) node.visible = false;
        if (name === 'PLAT_B3_Foguete' || name === 'PLAT_B3_Base_Lancamento') {
            node.position.x += 10;
            node.position.z -= 8.5;
        }
    });
    scene.updateMatrixWorld(true);
}
