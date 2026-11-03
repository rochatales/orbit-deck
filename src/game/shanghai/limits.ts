import limitsData from '../../assets/shanghai-limites/limites.json';
import type { OfficeWorld } from '../../world/createOfficeMap';
import { Box3, Mesh, Ray, Vector3, type Camera, type Material, type Object3D } from 'three';

export interface ShanghaiLimitCollider {
    id: string;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minY?: number;
    maxY?: number;
}

export interface ShanghaiLimitRuin {
    id: string;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    height: number;
}

export interface ShanghaiLimitsManifest {
    version: string;
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
    colliders: ShanghaiLimitCollider[];
    ruins: ShanghaiLimitRuin[];
}

export const SHANGHAI_LIMITS = limitsData as ShanghaiLimitsManifest;

/** Adiciona colisores das bermas e limites externos ao mundo sem alterar rotas internas. */
export function addLimitsCollisions(world: OfficeWorld): void {
    for (const c of SHANGHAI_LIMITS.colliders) {
        world.obstacles.push({
            minX: c.minX,
            maxX: c.maxX,
            minZ: c.minZ,
            maxZ: c.maxZ,
            minY: c.minY ?? 0.0,
            maxY: c.maxY ?? 4.0
        });
    }
}

/**
 * Esmaecimento das ruínas altas da borda quando ficam entre a câmera e o jogador.
 * Mesma mecânica do RocketFade aprovado: raio ortográfico em 3 alturas do corpo,
 * opacidade suave, sem recompilação de shaders ou alocações no useFrame.
 */
export const RUIN_FADED = 0.12;
export const RUIN_RETURN_AFTER = 0.8;
const SPEED = 8;
const BODY_HEIGHTS = [0.3, 0.9, 1.25];

export class LimitsRuinFade {
    readonly boxes: { id: string; box: Box3 }[] = [];
    opacity = 1;
    private clearFor = RUIN_RETURN_AFTER;
    private readonly ray = new Ray();
    private readonly hit = new Vector3();
    private readonly materials: { material: Material; opacity: number; depthWrite: boolean }[] = [];

    constructor(root: Object3D) {
        root.updateMatrixWorld(true);
        for (const r of SHANGHAI_LIMITS.ruins) {
            const box = new Box3(
                new Vector3(r.minX, 0, r.minZ),
                new Vector3(r.maxX, r.height, r.maxZ)
            );
            this.boxes.push({ id: r.id, box });
        }

        root.traverse(object => {
            const mesh = object as Mesh;
            if (!mesh.isMesh) return;
            const isRuinMesh = mesh.name.startsWith('Ruina_') || (mesh.parent && mesh.parent.name.startsWith('Ruina_'));
            if (!isRuinMesh) return;

            const own = (material: Material) => {
                const copy = material.clone();
                this.materials.push({ material: copy, opacity: copy.opacity, depthWrite: copy.depthWrite });
                copy.transparent = true;
                return copy;
            };
            mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
        });
    }

    blocked(x: number, z: number, camera: Camera): boolean {
        camera.getWorldDirection(this.ray.direction).negate();
        for (let i = 0; i < BODY_HEIGHTS.length; i++) {
            this.ray.origin.set(x, BODY_HEIGHTS[i], z);
            for (const { box } of this.boxes) {
                if (box.containsPoint(this.ray.origin)) return false;
                if (this.ray.intersectBox(box, this.hit)) return true;
            }
        }
        return false;
    }

    update(x: number, z: number, camera: Camera, dt: number): void {
        this.clearFor = this.blocked(x, z, camera) ? 0 : this.clearFor + dt;
        const target = this.clearFor < RUIN_RETURN_AFTER ? RUIN_FADED : 1.0;
        this.opacity += (target - this.opacity) * (1 - Math.exp(-SPEED * dt));
        if (Math.abs(target - this.opacity) < 1e-4) this.opacity = target;
        for (const item of this.materials) {
            item.material.opacity = item.opacity * this.opacity;
            item.material.depthWrite = item.depthWrite && this.opacity > 0.995;
        }
    }

    dispose(): void {
        for (const item of this.materials) item.material.dispose();
    }
}
