import type { Mesh, Object3D } from 'three';
/** Tile original do v007, gerado no Blender na mesma grade mundial e sem faces repetidas. */
export function createLaboratorioWalkways(scene: Object3D) {
    const paving = scene.getObjectByName('LaboratorioPavimento') as Mesh;
    if (!paving?.isMesh) throw new Error('Pavimento do laboratório v002 ausente');
    paving.removeFromParent();
    return paving;
}
