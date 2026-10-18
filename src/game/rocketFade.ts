import { Box3, Mesh, Ray, Vector3, type Camera, type Material, type Object3D } from 'three';

/**
 * Esmaecimento do foguete estacionado (9,2 m) quando ele encobre o jogador.
 * Mesmas regras do corte aprovado em Marte (S6.12, `visibility.ts`): opacidade
 * 0,08, volta 1,2 s depois de liberar a visão, passo exponencial 8/s, sem
 * `visible` binário e sem escrever profundidade enquanto translúcido. O teste
 * de encobrimento usa a caixa do foguete (sem triângulos): ele é um volume
 * fechado e compacto. Materiais próprios, preparados na montagem; nada aloca
 * no quadro.
 */
export const ROCKET_FADED = 0.08;
export const ROCKET_RETURN_AFTER = 1.2;
const SPEED = 8;
const BODY_HEIGHTS = [0.3, 0.9, 1.25];

export class RocketFade {
    readonly box = new Box3();
    opacity = 1;
    private clearFor = ROCKET_RETURN_AFTER;
    private readonly ray = new Ray();
    private readonly hit = new Vector3();
    private readonly materials: { material: Material; opacity: number; depthWrite: boolean }[] = [];

    constructor(root: Object3D) {
        root.updateMatrixWorld(true);
        this.box.setFromObject(root);
        root.traverse(object => {
            const mesh = object as Mesh;
            if (!mesh.isMesh) return;
            const own = (material: Material) => {
                const copy = material.clone();
                this.materials.push({ material: copy, opacity: copy.opacity, depthWrite: copy.depthWrite });
                copy.transparent = true;   // fixo desde a montagem: sem recompilar shader no quadro
                return copy;
            };
            mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
        });
    }

    /** O raio do corpo até a câmera (ortográfica: direção oposta ao olhar) cruza o foguete? */
    blocked(x: number, z: number, camera: Camera): boolean {
        camera.getWorldDirection(this.ray.direction).negate();
        for (let i = 0; i < BODY_HEIGHTS.length; i++) {
            this.ray.origin.set(x, BODY_HEIGHTS[i], z);
            // Embarcado, o corpo fica no ponto da nave, dentro do foguete: ele continua opaco.
            if (this.box.containsPoint(this.ray.origin)) return false;
            if (this.ray.intersectBox(this.box, this.hit)) return true;
        }
        return false;
    }

    update(x: number, z: number, camera: Camera, dt: number) {
        this.clearFor = this.blocked(x, z, camera) ? 0 : this.clearFor + dt;
        const target = this.clearFor < ROCKET_RETURN_AFTER ? ROCKET_FADED : 1;
        this.opacity += (target - this.opacity) * (1 - Math.exp(-SPEED * dt));
        if (Math.abs(target - this.opacity) < 1e-4) this.opacity = target;
        for (const item of this.materials) {
            item.material.opacity = item.opacity * this.opacity;
            item.material.depthWrite = item.depthWrite && this.opacity > 0.995;
        }
    }

    dispose() {
        for (const item of this.materials) item.material.dispose();
    }
}
