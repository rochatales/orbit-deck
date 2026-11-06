import { AnimationMixer, LoopOnce, type AnimationAction, type AnimationClip, type Object3D, type Mesh, type SkinnedMesh, type Skeleton, type Material } from 'three';
import type { EngineerState, EngineerAnimation } from './engineerRoutine';
const ONE_SHOT = new Set<EngineerAnimation>(['CrouchDown', 'CrouchToStand', 'ShovedReaction', 'StartWalking']);
/** Geometria/texturas do cache preservadas; só materiais e mixer pertencem à instância. */
export class EngineerRig {
    readonly mixer: AnimationMixer;
    readonly actions = new Map<EngineerAnimation, AnimationAction>();
    private current: AnimationAction;
    private materials: Material[] = [];
    private skeletons = new Set<Skeleton>();
    private disposed = false;
    constructor(readonly root: Object3D, clips: AnimationClip[]) {
        const copies = new Map<Material, Material>();
        const copy = (material: Material) => {
            let own = copies.get(material);
            if (!own) { own = material.clone(); copies.set(material, own); this.materials.push(own); }
            return own;
        };
        root.traverse(node => {
            const mesh = node as Mesh;
            if (!mesh.isMesh) return;
            if ((mesh as SkinnedMesh).isSkinnedMesh) this.skeletons.add((mesh as SkinnedMesh).skeleton);
            mesh.castShadow = true; mesh.receiveShadow = true;
            mesh.material = Array.isArray(mesh.material) ? mesh.material.map(copy) : copy(mesh.material);
        });
        this.mixer = new AnimationMixer(root);
        for (const clip of clips) {
            const name = clip.name as EngineerAnimation, action = this.mixer.clipAction(clip);
            if (ONE_SHOT.has(name)) { action.setLoop(LoopOnce, 1); action.clampWhenFinished = true; }
            this.actions.set(name, action);
        }
        this.current = this.actions.get('Idle')!;
        if (!this.current) throw Error('Engenheiro sem Idle.');
        this.current.play(); this.mixer.update(0);
    }
    update(state: EngineerState, dt: number) {
        const next = this.actions.get(state.animation);
        if (!next) throw Error(`Engenheiro sem ${state.animation}.`);
        if (next !== this.current) {
            next.reset();
            if (state.clipTime != null) next.time = state.clipTime;
            next.fadeIn(.35).play(); this.current.fadeOut(.35); this.current = next;
        }
        this.root.rotation.y = state.angle;
        this.mixer.update(Math.max(0, Math.min(.05, dt)));
    }
    dispose() {
        if (this.disposed) return;
        this.disposed = true; this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.root);
        for (const material of this.materials) material.dispose();
        for (const skeleton of this.skeletons) skeleton.dispose();
    }
}
