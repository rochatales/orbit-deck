import { DoorSoundClock } from '../../audio/events';
import { AnimationMixer, LoopOnce, Vector3, type AnimationAction, type AnimationClip, type Material, type Mesh, type Object3D } from 'three';
import { QUARTEL, createQuartelDoorColliders } from '../../game/quartelLayout';
import type { SimpleCuboid } from '../../world/createOfficeMap';

/** O runtime controla filhos/teto; somente o pai exclusivo Sandwind controla distância. */
export class QuartelRuntime {
    readonly status = { roofOpacity: 1, north: 0, west: 0, bathroom: 0 };
    private doorSounds = QUARTEL.doors.map(() => new DoorSoundClock('quartelDoorOpen'));
    private mixer: AnimationMixer;
    private actions: AnimationAction[];
    private doorColliders: Object3D[];
    private colliderPoint = new Vector3();
    private roof: Object3D;
    private roofMaterials: { own: Material; opacity: number; transparent: boolean; depthWrite: boolean }[] = [];
    private disposed = false;

    constructor(private scene: Object3D, clips: AnimationClip[], private motions: SimpleCuboid[] = createQuartelDoorColliders()) {
        this.motions = QUARTEL.dynamicCuboids.map(source => {
            const collider = motions.find(c => c.id === source.id);
            if (!collider) throw new Error(`Colisor do quartel ausente: ${source.id}`);
            return collider;
        });
        this.roof = scene.getObjectByName('Building_Roof')!;
        if (!this.roof || !scene.getObjectByName('Building_Interior')) throw new Error('Quartel v006 incompleto');
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
        this.doorColliders = QUARTEL.dynamicCuboids.map(collider => {
            const node = scene.getObjectByName(collider.id);
            if (!node) throw new Error(`COL móvel ausente: ${collider.id}`);
            return node;
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
            const door = QUARTEL.doors[i], side = door.side as 'north' | 'west' | 'bathroom';
            const dx = player.x - door.x, dz = player.z - door.z;
            const open = dx * dx + dz * dz < 2.35 * 2.35;
            this.doorSounds[i].update(open, this.status[side], door.x, door.z);
            this.status[side] += ((open ? 1 : 0) - this.status[side]) * step;
            this.actions[i].time = this.actions[i].getClip().duration * this.status[side];
        }
        this.mixer.update(0);
        // Usa a curva real do clipe, que não é linear. A consulta atualiza a matriz
        // mesmo com o pai Sandwind oculto; vetor e referências são reutilizados.
        for (let i = 0; i < this.doorColliders.length; i++) {
            this.doorColliders[i].getWorldPosition(this.colliderPoint);
            const output = this.motions[i].position;
            output.x = this.colliderPoint.x; output.y = this.colliderPoint.y; output.z = this.colliderPoint.z;
        }
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.scene);
        for (const material of this.roofMaterials) material.own.dispose();
    }
}
