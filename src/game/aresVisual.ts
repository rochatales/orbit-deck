import { PointLight, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';

/** Configura recursos próprios do carregamento; não altera caches nem calcula física. */
export function prepareAresVisual(scene: Object3D, options: { position: { x: number; y: number; z: number }; name: string; impact: boolean }) {
    const ids = new Set<string>();
    scene.name = options.name;
    scene.traverse(node => {
        const object = node as Mesh;
        if (!object.isMesh) return;
        const id = object.userData.id_estavel;
        if (typeof id !== 'string' || ids.has(id)) throw new Error(`ID ARES ausente/duplicado: ${id}`);
        ids.add(id);
        if (object.userData.conjunto === 'impacto') object.visible = options.impact;
        object.castShadow = object.userData.conjunto === 'nave' && !object.userData.emissivo;
        object.receiveShadow = !object.userData.emissivo;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const entry of materials) {
            const material = entry as MeshStandardMaterial;
            if (!material.isMeshStandardMaterial) continue;
            // Luz do destino: preservar a cor cerâmica e o vidro azul do estudo.
            material.flatShading = false;
            if (material.emissiveIntensity > 0) material.toneMapped = false;
            if (object.userData.material_fonte === 'SH_Carbone_Diffus') {
                material.depthWrite = false;
                object.renderOrder = 1;
            }
        }
    });
    if (ids.size !== 18) throw new Error(`Lotes ARES incompatíveis: ${ids.size}/18`);
    // Luzes locais recriadas, sem importar intensidades do Blender e sem shadow maps extras.
    const door = new PointLight('#ffcc8a', 4, 4, 2);
    door.position.set(-0.72, 1.6, -1.65);
    scene.add(door);
    for (const z of [-2.12, 2.12]) {
        const intake = new PointLight('#00f5ff', 2, 2.5, 2);
        intake.position.set(-0.12, 1.65, z);
        scene.add(intake);
    }
    const p = options.position;
    scene.position.set(p.x, p.y, p.z);
    scene.updateMatrixWorld(true);
}
