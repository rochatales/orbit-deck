import { Vector3, type BufferGeometry, type Mesh, type Object3D } from 'three';

/** Contorno de piso do Laboratório, onde a areia original fica acima da cota do pavimento. */
export const LAB_RING = { minX: 6.2, maxX: 23.6, minZ: -19.3, maxZ: -5.8 };
const MARGIN = 2, SAND_FLOOR = -.3;

/** Abaixa a areia só na cópia montada; o GLB em cache continua intacto. Devolve a geometria nova. */
export function flattenSandForLabRing(scene: Object3D): BufferGeometry | null {
    const ground = scene.getObjectByName('TER_Solo') as Mesh | undefined;
    if (!ground?.isMesh) return null;
    ground.updateWorldMatrix(true, false);
    const geometry = ground.geometry.clone(), position = geometry.attributes.position, world = new Vector3();
    for (let i = 0; i < position.count; i++) {
        world.fromBufferAttribute(position, i).applyMatrix4(ground.matrixWorld);
        if (world.x < LAB_RING.minX - MARGIN || world.x > LAB_RING.maxX + MARGIN || world.z < LAB_RING.minZ - MARGIN || world.z > LAB_RING.maxZ + MARGIN) continue;
        if (world.y > SAND_FLOOR) { world.y = SAND_FLOOR; position.setY(i, world.applyMatrix4(ground.matrixWorld.clone().invert()).y); }
    }
    position.needsUpdate = true;
    ground.geometry = geometry;
    return geometry;
}
