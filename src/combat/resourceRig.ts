import { AnimationMixer, LoopOnce, type AnimationClip, type AnimationAction, type Object3D, type SkinnedMesh } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

/** Visual do recurso; quantidade/coleta continuam exclusivamente na simulação. */
export class ResourceRig {
    readonly root: Object3D;
    private readonly mixer: AnimationMixer;
    private readonly idle: AnimationAction;
    private readonly spawn: AnimationAction;
    private readonly collect: AnimationAction;
    private previousActive = false;
    private previousSpawned = false;
    private collecting = false;
    private spawning = false;
    private age = 0;

    constructor(source: Object3D, clips: AnimationClip[], floorOffset = .03) {
        this.root = clone(source);
        this.root.position.y = floorOffset;
        this.root.visible = false;
        this.mixer = new AnimationMixer(this.root);
        const action = (name: string) => {
            const clip = clips.find(c => c.name === name);
            if (!clip) throw new Error(`Recurso sem clipe ${name}`);
            return this.mixer.clipAction(clip);
        };
        this.idle = action('Idle'); this.spawn = action('SpawnDrop'); this.collect = action('CollectPickup');
        for (const oneShot of [this.spawn, this.collect]) { oneShot.setLoop(LoopOnce, 1); oneShot.clampWhenFinished = true; }
        this.root.traverse(o => { if ('isMesh' in o) { o.castShadow = true; o.receiveShadow = true; } });
    }

    update(active: boolean, dt: number, spawned = active) {
        if (dt <= 0) return;
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
        this.mixer.update(dt);
        if (this.collecting && this.age >= this.collect.getClip().duration) this.root.visible = false;
    }

    dispose() { this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.root); this.root.traverse(o => { const mesh = o as SkinnedMesh; if (mesh.isSkinnedMesh) mesh.skeleton.dispose(); }); }
}
