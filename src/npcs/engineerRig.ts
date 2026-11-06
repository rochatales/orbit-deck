import { createColonyVisor } from '../characters/player/colonyVisorAttachment';
import { ENGINEER_VISOR_POINTS, ENGINEER_VISOR_RADIUS_SCALE } from './engineerVisor';
import { AnimationMixer, LoopOnce, type AnimationAction, type AnimationClip, type Object3D, type Mesh, type SkinnedMesh, type Skeleton, type Material } from 'three';
import { ENGINEER, type EngineerState, type EngineerAnimation } from './engineerRoutine';
import { prepareEngineerWalk } from './engineerWalk';
const ONE_SHOT = new Set<EngineerAnimation>(['CrouchDown', 'CrouchToStand', 'ShovedReaction', 'StartWalking']);
/** Geometria/texturas do cache preservadas; só materiais e mixer pertencem à instância. */
export class EngineerRig {
    readonly mixer: AnimationMixer;
    readonly actions = new Map<EngineerAnimation, AnimationAction>();
    private current: AnimationAction;
    private materials: Material[] = [];
    private skeletons = new Set<Skeleton>();
    private blends: { action: AnimationAction; weight: number; from: number }[] = [];
    private blendTime = .35;
    private disposed = false;
    readonly visor: ReturnType<typeof createColonyVisor>;
    constructor(readonly root: Object3D, clips: AnimationClip[], private readonly placement: Object3D = root) {
        root.scale.multiplyScalar(ENGINEER.visualScale);
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
        this.visor = createColonyVisor(root, false, ENGINEER_VISOR_POINTS, ENGINEER_VISOR_RADIUS_SCALE);
        this.visor?.head.add(this.visor.group);
        this.mixer = new AnimationMixer(root);
        for (const clip of clips) {
            const name = clip.name as EngineerAnimation;
            const action = this.mixer.clipAction(name === 'Walk' ? prepareEngineerWalk(clip, root) : clip);
            if (ONE_SHOT.has(name)) { action.setLoop(LoopOnce, 1); action.clampWhenFinished = true; }
            action.setEffectiveWeight(0);
            this.blends.push({ action, weight: 0, from: 0 });
            this.actions.set(name, action);
        }
        this.current = this.actions.get('Idle')!;
        if (!this.current) throw Error('Engenheiro sem Idle.');
        for (const blend of this.blends) if (blend.action === this.current) {
            blend.weight = blend.from = 1; this.current.setEffectiveWeight(1);
        }
        this.current.play(); this.mixer.update(0);
    }
    update(state: EngineerState, dt: number, position: { x: number; y: number; z: number } = state) {
        // O visual continua independente do step físico durante a conversa.
        this.placement.position.set(position.x, position.y, position.z);
        const next = this.actions.get(state.animation);
        if (!next) throw Error(`Engenheiro sem ${state.animation}.`);
        const delta = Math.max(0, Math.min(.05, dt));
        if (next !== this.current) {
            const previousTime = next.time;
            let previousWeight = 0;
            for (let i = 0; i < this.blends.length; i++) {
                const blend = this.blends[i]; blend.from = blend.weight;
                if (blend.action === next) previousWeight = blend.weight;
                else blend.action.paused = true; // Preserva a pose que está saindo.
            }
            next.reset();
            next.time = state.clipTime ?? (previousWeight > 0 && !ONE_SHOT.has(state.animation) ? previousTime : 0);
            next.play(); this.current = next; this.blendTime = 0;
        }
        this.blendTime = Math.min(.35, this.blendTime + delta);
        const alpha = this.blendTime / .35;
        // Uma transição interrompida parte dos pesos reais; nunca volta a 0/1.
        for (let i = 0; i < this.blends.length; i++) {
            const blend = this.blends[i], target = blend.action === this.current ? 1 : 0;
            blend.weight = blend.from + (target - blend.from) * alpha;
            blend.action.setEffectiveWeight(blend.weight);
        }
        this.root.rotation.y = state.angle;
        this.mixer.update(delta);
    }
    dispose() {
        if (this.disposed) return;
        this.disposed = true; this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.root);
        this.visor?.dispose();
        for (const material of this.materials) material.dispose();
        for (const skeleton of this.skeletons) skeleton.dispose();
    }
}
