import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Material, Texture } from 'three';
import type { OfficeWorld } from '../world/createOfficeMap';
export function box(group: Group, x: number, y: number, z: number, w: number, h: number, d: number, color: string) {
    const mesh = new Mesh(new BoxGeometry(w, h, d), new MeshStandardMaterial({ color, roughness: 0.8 }));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
}
/** Worlds own these procedural resources; cached GLB models are not children of this group. */
export function disposeWorld(world: OfficeWorld) {
    world.group.userData.releasePending?.();
    const geometries = new Set<{
        dispose: () => void;
    }>(), materials = new Set<Material>(), textures = new Set<Texture>();
    world.group.traverse(object => { if (object instanceof Mesh) {
        geometries.add(object.geometry);
        for (const m of Array.isArray(object.material) ? object.material : [object.material]) {
            materials.add(m);
            for (const v of Object.values(m))
                if (v instanceof Texture)
                    textures.add(v);
        }
    } });
    const images = new Set<{ close?: () => void }>();
    textures.forEach(x => { if (x.image) images.add(x.image); x.dispose(); });
    images.forEach(image => image.close?.());
    materials.forEach(x => x.dispose());
    geometries.forEach(x => x.dispose());
}
export function addShipCollisions(world: OfficeWorld, x: number, z: number) {
    for (const side of [-1.8, 1.8])
        world.obstacles.push({ minX: x + side - 0.225, maxX: x + side + 0.225, minZ: z - 2.25, maxZ: z + 2.25 });
    world.obstacles.push({ minX: x - 1.7, maxX: x + 1.7, minZ: z + 1.75, maxZ: z + 2.25 });
}
