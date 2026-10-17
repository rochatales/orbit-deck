import { Box3, Ray, Vector3, Mesh, type Material, type Object3D } from 'three';

export interface ColonyPart {
    name: string;
    bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
    apoiado_em: string[];
    apoiado_em_todos: string[];
}

/** Triângulos estáticos em coordenadas mundiais e materiais privados, preparados na montagem. */
export class ColonyVisibility {
    private readonly ray = new Ray();
    private readonly origin = new Vector3();
    private readonly direction = new Vector3();
    private readonly hit = new Vector3();
    private readonly a = new Vector3();
    private readonly b = new Vector3();
    private readonly c = new Vector3();
    private readonly entries;

    constructor(scene: Object3D, parts: ColonyPart[]) {
        scene.updateMatrixWorld(true);
        const nodes = new Map<string, Object3D>();
        scene.traverse(node => nodes.set(node.userData.colony_name ?? node.name, node));
        this.entries = parts.flatMap(part => {
            const node = nodes.get(part.name);
            if (!node || !node.visible) return [];
            const cuttable = ((part.name.startsWith('ARQ_') || part.name.startsWith('TET_'))
                && !part.name.includes('Piso') && !part.name.includes('Patio')
                && !part.name.startsWith('ARQ_Deck') && !part.name.includes('Folhas'))
                || part.name === 'PLAT_B3_Foguete' || part.name === 'PLAT_B3_Base_Lancamento';
            if (!cuttable) return [];
            const triangles: number[] = [];
            const materials: { material: Material; opacity: number; depthWrite: boolean }[] = [];
            node.traverse(object => {
                const child = object as Mesh;
                if (!child.isMesh) return;
                // Sem sombra binária mudando com o fade. Recursos do cache GLTF não são alterados.
                child.castShadow = false;
                const clone = (material: Material) => {
                    const copy = material.clone();
                    materials.push({ material: copy, opacity: copy.opacity, depthWrite: copy.depthWrite });
                    copy.transparent = true;
                    return copy;
                };
                child.material = Array.isArray(child.material) ? child.material.map(clone) : clone(child.material);
                const position = child.geometry.attributes.position;
                const index = child.geometry.index;
                const count = index ? index.count : position.count;
                for (let i = 0; i < count; i++) {
                    this.a.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(child.matrixWorld);
                    triangles.push(this.a.x, this.a.y, this.a.z);
                }
            });
            return [{ node, triangles: new Float32Array(triangles), materials,
                box: new Box3().setFromObject(node), hidden: false, clearFor: 0, opacity: 1 }];
        });
    }

    update(player: { x: number; z: number }, camera: Vector3, delta: number) {
        for (const entry of this.entries) {
            let blocked = false;
            // AABB só rejeita candidatos: vãos e caixas vazias nunca acionam o corte.
            for (let sample = 0; sample < 3 && !blocked; sample++) {
                this.origin.set(player.x, 0.3 + sample * 0.5, player.z);
                this.direction.subVectors(camera, this.origin);
                const distance = this.direction.length();
                this.direction.normalize();
                this.ray.set(this.origin, this.direction);
                if (!this.ray.intersectBox(entry.box, this.hit)) continue;
                const t = entry.triangles;
                for (let i = 0; i < t.length; i += 9) {
                    this.a.fromArray(t, i); this.b.fromArray(t, i + 3); this.c.fromArray(t, i + 6);
                    if (this.ray.intersectTriangle(this.a, this.b, this.c, false, this.hit)
                        && this.hit.distanceToSquared(this.origin) < distance * distance) {
                        blocked = true;
                        break;
                    }
                }
            }
            entry.clearFor = blocked ? 0 : entry.clearFor + delta;
            if (blocked) entry.hidden = true;
            else if (entry.clearFor >= 1.2) entry.hidden = false;
            // Mantém um contorno: nenhum toggle de visible e nenhuma cascata nos objetos apoiados.
            const target = entry.hidden ? 0.08 : 1;
            entry.opacity += (target - entry.opacity) * (1 - Math.exp(-8 * Math.min(delta, 0.05)));
            for (const item of entry.materials) {
                item.material.opacity = item.opacity * entry.opacity;
                item.material.depthWrite = entry.opacity > 0.995 && item.depthWrite;
            }
        }
    }

    dispose() {
        for (const entry of this.entries) for (const item of entry.materials) item.material.dispose();
    }
}
