import { AnimationMixer, Group, LoopOnce, type AnimationClip, type AnimationAction, type Object3D, type SkinnedMesh } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { collectClipTime, collectDuration, resourceHeight } from './resourceVisual';

const clipCache = new WeakMap<AnimationClip[], AnimationClip[]>();
/** Mantém os GLBs/cache intactos. Idle/PulseGlow sem giro/bob autorado: movimento uniforme em código. */
export function resourceClips(clips: AnimationClip[]) {
    let filtered = clipCache.get(clips);
    if (!filtered) {
        filtered = clips.map(clip => {
            const result = clip.clone(), idle = clip.name === 'Idle' || clip.name === 'PulseGlow';
            result.tracks = result.tracks.filter(track => {
                const split = track.name.lastIndexOf('.'), node = track.name.slice(0, split), property = track.name.slice(split + 1);
                return !(/^HoloRing/.test(node) || (idle && (property === 'quaternion' || property === 'position'))
                    || (node === 'Root' && property === 'quaternion'));
            });
            return result;
        });
        clipCache.set(clips, filtered);
    }
    return filtered;
}

/** Wrapper controla flutuação; skeleton/mixer próprios, sem colisor de malha. */
export class ResourceRig {
    readonly root = new Group();
    readonly model: Object3D;
    private readonly mixer: AnimationMixer;
    private readonly idle: AnimationAction;
    private readonly spawn: AnimationAction;
    private readonly collect: AnimationAction;
    private readonly holograms: Object3D[] = [];
    private previousActive = false;
    private previousSpawned = false;
    private collecting = false;
    private spawning = false;
    private age = 0;
    private clock = 0;

    constructor(source: Object3D, clips: AnimationClip[], private readonly phase = 0) {
        this.model = clone(source);
        this.root.name = 'ResourceVisual';
        this.root.add(this.model);
        this.root.position.y = resourceHeight(0, phase);
        this.root.visible = false;
        this.mixer = new AnimationMixer(this.model);
        const action = (name: string) => {
            const clip = resourceClips(clips).find(c => c.name === name);
            if (!clip) throw new Error(`Recurso sem clipe ${name}`);
            return this.mixer.clipAction(clip);
        };
        this.idle = action('Idle'); this.spawn = action('SpawnDrop'); this.collect = action('CollectPickup');
        for (const oneShot of [this.spawn, this.collect]) { oneShot.setLoop(LoopOnce, 1); oneShot.clampWhenFinished = true; }
        this.model.traverse(o => {
            if ('isMesh' in o) { o.castShadow = true; o.receiveShadow = true; }
            // Ferro e titânio: anel skinado oculto, substituído por um único anel no solo.
            if (/^HoloRing/.test(o.name)) { this.holograms.push(o); o.scale.setScalar(0); }
        });
    }

    update(active: boolean, dt: number, spawned = active) {
        if (dt <= 0) return;
        this.clock += dt;
        this.root.position.y = resourceHeight(this.clock, this.phase);
        const newborn = spawned && !this.previousSpawned;
        if (active && (!this.previousActive || newborn)) {
            this.mixer.stopAllAction(); this.spawn.reset().play(); this.spawning = true;
            this.collecting = false; this.age = 0; this.root.visible = true;
        } else if (!active && (this.previousActive || newborn)) {
            this.mixer.stopAllAction(); this.collect.reset().play();
            this.collecting = true; this.spawning = false; this.age = 0; this.root.visible = true;
        }
        this.previousActive = active; this.previousSpawned = spawned;
        if (!this.root.visible) return;
        this.age += dt;
        if (active && this.spawning && this.age >= this.spawn.getClip().duration - .15) {
            this.spawning = false; this.idle.reset().play(); this.spawn.crossFadeTo(this.idle, .15, false);
        }
        if (this.collecting) {
            // Amostragem analítica da rampa: independente do framerate, sem objetos por quadro.
            this.collect.time = collectClipTime(this.age, this.collect.getClip().duration);
            this.mixer.update(0);
            if (this.age >= collectDuration(this.collect.getClip().duration)) this.root.visible = false;
        } else this.mixer.update(dt);
        for (const ring of this.holograms) ring.scale.setScalar(0);
    }

    dispose() { this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.model); this.model.traverse(o => { const mesh = o as SkinnedMesh; if (mesh.isSkinnedMesh) mesh.skeleton.dispose(); }); }
}
