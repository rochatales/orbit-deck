import { LinearFilter, type Mesh, type MeshStandardMaterial, type Object3D, type Texture } from 'three';

/** Atlas em tiles emissivos: mipmaps globais misturam ciano/âmbar nas arestas finas.
 * Cópias privadas só de textura (imagem compartilhada), preparadas uma vez por montagem. */
export class BuildingAtlasSampling {
    private readonly textures = new Map<Texture, Texture>();
    private readonly owned = new Set<Texture>();
    constructor(scene: Object3D) {
        scene.traverse(node => {
            const mesh = node as Mesh;
            if (!mesh.isMesh) return;
            for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
                if (!['MAT_Control_Atlas_2K', 'MAT_Control_Vidro', 'MAT_Hangar_Atlas_2K'].includes(material.name)) continue;
                const atlas = material as MeshStandardMaterial;
                for (const key of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'] as const) {
                    const source = atlas[key];
                    if (!source) continue;
                    let texture = this.textures.get(source);
                    if (!texture) {
                        // O mesmo material pode ser visitado por vários nós; uma cópia continua uma cópia.
                        if (this.owned.has(source)) continue;
                        texture = source.clone(); texture.minFilter = LinearFilter;
                        texture.generateMipmaps = false; texture.needsUpdate = true;
                        this.textures.set(source, texture); this.owned.add(texture);
                    }
                    atlas[key] = texture;
                }
            }
        });
    }
    dispose() { for (const texture of this.owned) texture.dispose(); this.owned.clear(); this.textures.clear(); }
}
