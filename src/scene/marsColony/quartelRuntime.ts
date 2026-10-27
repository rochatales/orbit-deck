import { AnimationMixer, LoopOnce, type AnimationAction, type AnimationClip, type Material, type Mesh, type Object3D } from 'three';
import { QUARTEL, createQuartelDoorColliders } from '../../game/quartelLayout';
import type { SimpleCuboid } from '../../world/createOfficeMap';

/** O runtime controla filhos/teto; somente o pai exclusivo Sandwind controla distância. */
export class QuartelRuntime {
    readonly status = { roofOpacity: 1, north: 0, west: 0 };
    private mixer: AnimationMixer;
    private actions: AnimationAction[];
    private roof: Object3D;
    private roofMaterials: { own: Material; opacity: number; transparent: boolean; depthWrite: boolean }[] = [];
    private disposed = false;

    constructor(private scene: Object3D, clips: AnimationClip[], private motions: SimpleCuboid[] = createQuartelDoorColliders()) {
        this.roof = scene.getObjectByName('Building_Roof')!;
        if (!this.roof || !scene.getObjectByName('Building_Interior')) throw new Error('Quartel v005 incompleto');
        scene.traverse(node => {
            const mesh = node as Mesh;
            if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; }
        });
        this.roof.traverse(node => {
            const mesh = node as Mesh;
            if (!mesh.isMesh) return;
            const copy = (material: Material) => {
                const own = material.clone();
                this.roofMaterials.push({ own, opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite });
                return own;
            };
            mesh.material = Array.isArray(mesh.material) ? mesh.material.map(copy) : copy(mesh.material);
        });
        this.mixer = new AnimationMixer(scene);
        this.actions = QUARTEL.doors.map(door => {
            const clip = clips.find(candidate => candidate.name === door.clip);
            if (!clip) throw new Error(`Ação ausente: ${door.clip}`);
            const action = this.mixer.clipAction(clip);
            action.setLoop(LoopOnce, 1); action.clampWhenFinished = true; action.play(); action.paused = true;
            return action;
        });
    }

    update(player: { x: number; z: number }, delta: number) {
        const step = 1 - Math.exp(-12 * Math.min(.05, Math.max(0, delta))), bounds = QUARTEL.roofArea;
        const inside = player.x > bounds.minX && player.x < bounds.maxX && player.z > bounds.minZ && player.z < bounds.maxZ;
        this.status.roofOpacity += ((inside ? 0 : 1) - this.status.roofOpacity) * step;
        this.roof.visible = this.status.roofOpacity > .01;
        for (const material of this.roofMaterials) {
            const opacity = this.status.roofOpacity, transparent = material.transparent || opacity < .995;
            material.own.opacity = material.opacity * opacity;
            if (material.own.transparent !== transparent) {
                material.own.transparent = transparent; material.own.needsUpdate = true;
            }
            material.own.depthWrite = material.depthWrite && opacity > .995;
        }
        for (let i = 0; i < QUARTEL.doors.length; i++) {
            const door = QUARTEL.doors[i], side = door.side as 'north' | 'west';
            const dx = player.x - door.x, dz = player.z - door.z;
            this.status[side] += ((dx * dx + dz * dz < 2.35 * 2.35 ? 1 : 0) - this.status[side]) * step;
            this.actions[i].time = this.actions[i].getClip().duration * this.status[side];
        }
        this.mixer.update(0);
        // Mesma pose das folhas, mesmo sob gate visual oculto. Sem alocação por quadro.
        for (let i = 0; i < QUARTEL.dynamicCuboids.length; i++) {
            const collider = QUARTEL.dynamicCuboids[i], output = this.motions[i];
            const amount = this.status[collider.side as 'north' | 'west'];
            output.position.x = collider.position.x + collider.slide.x * amount;
            output.position.y = collider.position.y + collider.slide.y * amount;
            output.position.z = collider.position.z + collider.slide.z * amount;
        }
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.scene);
        for (const material of this.roofMaterials) material.own.dispose();
    }
}
