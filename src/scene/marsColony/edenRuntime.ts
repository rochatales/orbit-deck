import { AnimationMixer, LoopOnce, type AnimationAction, type AnimationClip, type Material, type Mesh, type Object3D } from 'three';
import { EDEN } from '../../game/config';

/** Mesma altura do Explorador (1,50 × 1,49 m); em todos os clipes o halo fica abaixo do teto da sala (2,55 m). */
export const EDEN_FIGURE_SCALE = 0.8;
const CLIP_FADE = 0.35;
const TURN_RATE = 4;

export class EdenRuntime {
    readonly status = { clip: 'Idle_Float', near: false, yaw: 0 };
    private readonly mixer: AnimationMixer;
    private readonly idle: AnimationAction;
    private readonly greet: AnimationAction;
    private readonly talk: AnimationAction;
    private current: AnimationAction;
    private readonly ownedMaterials: Material[] = [];
    private disposed = false;

    constructor(private readonly scene: Object3D, clips: AnimationClip[]) {
        const copies = new Map<Material, Material>();
        const copy = (original: Material) => {
            let own = copies.get(original);
            if (!own) { own = original.clone(); copies.set(original, own); this.ownedMaterials.push(own); }
            return own;
        };
        scene.traverse(node => {
            const mesh = node as Mesh;
            if (!mesh.isMesh) return;
            mesh.castShadow = true;
            mesh.material = Array.isArray(mesh.material) ? mesh.material.map(copy) : copy(mesh.material);
        });

        this.mixer = new AnimationMixer(scene);
        const action = (name: string) => {
            const clip = clips.find(item => item.name === name);
            if (!clip) throw new Error(`EDEN sem o clipe ${name}`);
            return this.mixer.clipAction(clip);
        };
        this.idle = action('Idle_Float');
        this.greet = action('Heart_Surge');
        this.talk = action('Coordinate_Telemetry');
        this.greet.setLoop(LoopOnce, 1);
        this.greet.clampWhenFinished = true;
        this.current = this.idle;
        this.idle.play();
        this.mixer.update(0);
    }

    update(player: { x: number; z: number }, delta: number, talking: boolean) {
        const dt = Math.min(0.05, Math.max(0, delta));
        const dx = player.x - EDEN.position.x;
        const dz = player.z - EDEN.position.z;
        const near = dx * dx + dz * dz <= EDEN.interactionRadius * EDEN.interactionRadius;

        if (talking) this.play(this.talk);
        else if (this.current === this.talk) this.play(this.idle);
        else if (near && !this.status.near) this.play(this.greet);
        else if (this.current === this.greet && !this.greet.isRunning()) this.play(this.idle);
        this.status.near = near;

        // Vira para quem está na área de conversa; sem ninguém, volta para a porta sul (+Z).
        const target = near ? Math.atan2(dx, dz) : 0;
        const turn = Math.atan2(Math.sin(target - this.status.yaw), Math.cos(target - this.status.yaw));
        this.status.yaw += turn * (1 - Math.exp(-TURN_RATE * dt));
        this.scene.rotation.y = this.status.yaw;

        this.mixer.update(dt);
    }

    private play(next: AnimationAction) {
        if (next === this.current) return;
        next.reset().fadeIn(CLIP_FADE).play();
        this.current.fadeOut(CLIP_FADE);
        this.current = next;
        this.status.clip = next.getClip().name;
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.mixer.stopAllAction();
        this.mixer.uncacheRoot(this.scene);
        for (const material of this.ownedMaterials) material.dispose();
    }
}
