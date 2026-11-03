import { BuildingAtlasSampling } from './buildingAtlasSampling';
import { AnimationMixer, LoopOnce, Quaternion, Vector3, type AnimationClip, type Material, type Mesh, type Object3D } from 'three';
import { COLONY_BUILDINGS } from '../../game/colonyBuildingsLayout';
import type { SimpleCuboid } from '../../world/createOfficeMap';
import { DoorSoundClock } from '../../audio/events';

/** Instâncias e materiais privados na montagem; atualização sem objetos temporários. */
export class ColonyBuildingRuntime {
    readonly status = { roofOpacity: 1 };
    private readonly mixer: AnimationMixer;
    private readonly materials: Material[] = [];
    private readonly roofMaterials: { own: Material; opacity: number; transparent: boolean; depthWrite: boolean }[] = [];
    private readonly roof: Object3D;
    private readonly doors;
    private readonly motions;
    private readonly position = new Vector3();
    private readonly scale = new Vector3();
    private readonly rotation = new Quaternion();
    private disposed = false;
    private readonly atlasSampling: BuildingAtlasSampling;
    constructor(private scene: Object3D, clips: AnimationClip[], private spec: typeof COLONY_BUILDINGS[number], moving: SimpleCuboid[]) {
        scene.position.set(spec.placement.x, 0, spec.placement.z);
        scene.rotation.y = spec.placement.rotationY;
        this.roof = scene.getObjectByName('Building_Roof')!;
        if (!this.roof) throw Error(`Teto ausente: ${spec.id}`);
        const copies = new Map<Material, Material>();
        scene.traverse(node => {
            const mesh = node as Mesh;
            if (!mesh.isMesh) return;
            mesh.castShadow = true; mesh.receiveShadow = true;
            const copy = (source: Material) => {
                let own = copies.get(source);
                if (!own) { own = source.clone(); copies.set(source, own); this.materials.push(own); }
                return own;
            };
            mesh.material = Array.isArray(mesh.material) ? mesh.material.map(copy) : copy(mesh.material);
        });
        this.roof.traverse(node => {
            const mesh = node as Mesh;
            if (!mesh.isMesh) return;
            const copy = (source: Material) => {
                const own = source.clone(); this.materials.push(own);
                this.roofMaterials.push({ own, opacity: own.opacity, transparent: own.transparent, depthWrite: own.depthWrite }); return own;
            };
            mesh.material = Array.isArray(mesh.material) ? mesh.material.map(copy) : copy(mesh.material);
        });
        this.atlasSampling = new BuildingAtlasSampling(scene);
        // Pad e piso vieram coplanares da fonte; separa a base por 6 mm sem editar GLB.
        const pad = scene.getObjectByName('Building_Pad'); if (pad) pad.position.y -= .006;
        this.mixer = new AnimationMixer(scene);
        this.doors = spec.doors.map(d => {
            const clip = clips.find(c => c.name === d.clip);
            if (!clip) throw Error(`Porta sem animação: ${d.clip}`);
            const action = this.mixer.clipAction(clip); action.setLoop(LoopOnce, 1); action.clampWhenFinished = true; action.play(); action.paused = true;
            return { ...d, amount: 0, action, sound: new DoorSoundClock() };
        });
        this.motions = spec.dynamicCuboids.map(c => {
            const target = moving.find(m => m.id === c.id), node = scene.getObjectByName(c.node);
            if (!target || !node) throw Error(`Colisor dinâmico ausente: ${c.id}`);
            return { node, target };
        });
        this.mixer.update(0); this.syncColliders();
    }
    private syncColliders() {
        this.scene.updateWorldMatrix(true, true);
        for (const m of this.motions) {
            m.node.matrixWorld.decompose(this.position, this.rotation, this.scale);
            const p = m.target.position, q = m.target.rotation;
            p.x = this.position.x; p.y = this.position.y; p.z = this.position.z;
            q.x = this.rotation.x; q.y = this.rotation.y; q.z = this.rotation.z; q.w = this.rotation.w;
        }
    }
    update(player: { x: number; z: number }, delta: number) {
        if (this.disposed || delta <= 0) return;
        const dt = Math.min(.05, delta), step = 1 - Math.exp(-12 * dt), b = this.spec.roofArea;
        const inside = player.x > b.minX && player.x < b.maxX && player.z > b.minZ && player.z < b.maxZ;
        this.status.roofOpacity += ((inside ? 0 : 1) - this.status.roofOpacity) * step;
        this.roof.visible = this.status.roofOpacity > .01;
        for (const m of this.roofMaterials) {
            const transparent = m.transparent || this.status.roofOpacity < .995;
            m.own.opacity = m.opacity * this.status.roofOpacity;
            if (m.own.transparent !== transparent) { m.own.transparent = transparent; m.own.needsUpdate = true; }
            m.own.depthWrite = m.depthWrite && this.status.roofOpacity > .995;
        }
        for (const d of this.doors) {
            const dx = player.x - d.x, dz = player.z - d.z, open = dx * dx + dz * dz < 2.7 * 2.7;
            d.sound.update(open, d.amount, d.x, d.z);
            d.amount += ((open ? 1 : 0) - d.amount) * step;
            d.action.time = d.amount * d.duration;
        }
        this.mixer.update(0); this.syncColliders();
    }
    dispose() {
        if (this.disposed) return; this.disposed = true;
        this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.scene);
        for (const material of this.materials) material.dispose();
        this.atlasSampling.dispose();
    }
}
