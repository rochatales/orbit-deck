import { DoorSoundClock } from '../../audio/events';
import { AnimationClip, AnimationMixer, LoopOnce, LoopRepeat, Vector3, type AnimationAction, type Bone, type Material, type Mesh, type Object3D } from 'three';
import { LABORATORIO, createLaboratorioDoorColliders } from '../../game/laboratorioLayout';
import type { SimpleCuboid } from '../../world/createOfficeMap';
export const LABORATORIO_MODES = ['Idle_Ready', 'Synthesizing', 'Drawer_Dispense', 'Standby_PowerDown'] as const;
export type LaboratorioMode = typeof LABORATORIO_MODES[number];

/** Casca completa e teto com corte por ocupação; portas independem da máquina. */
export class LaboratorioRuntime {
    mode: LaboratorioMode = 'Idle_Ready';
    readonly doors = [0, 0];
    readonly status = { roofOpacity: 1 };
    private doorSounds = LABORATORIO.doors.map(() => new DoorSoundClock());
    private roof: Object3D;
    private cutWalls: Object3D;
    private inside = false;
    private roofMaterials: { own: Material; opacity: number; transparent: boolean; depthWrite: boolean }[] = [];
    private mixer: AnimationMixer;
    private actions: AnimationAction[];
    private bones: Bone[];
    private closed: Vector3[];
    private motions: SimpleCuboid[];
    private disposed = false;

    constructor(private scene: Object3D, clips: AnimationClip[], motions = createLaboratorioDoorColliders()) {
        this.roof = scene.getObjectByName('Building_Roof')!;
        this.cutWalls = scene.getObjectByName('Building_Walls')!;
        if (!this.roof || !this.cutWalls) throw new Error('Casca do laboratório v002 incompleta');
        const copies = new Map<Material, Material>();
        for (const part of [this.roof, this.cutWalls]) part.traverse(node => {
            const mesh = node as Mesh; if (!mesh.isMesh) return;
            const copy = (material: Material) => {
                const previous = copies.get(material); if (previous) return previous;
                const own = material.clone(); copies.set(material, own);
                this.roofMaterials.push({ own, opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite });
                return own;
            };
            mesh.material = Array.isArray(mesh.material) ? mesh.material.map(copy) : copy(mesh.material);
        });
        this.motions = LABORATORIO.doors.map(door => {
            const collider = motions.find(c => c.id === door.collider);
            if (!collider) throw new Error(`Colisor do laboratório ausente: ${door.collider}`);
            return collider;
        });
        this.bones = LABORATORIO.doors.map(door => {
            const bone = scene.getObjectByName(door.bone) as Bone;
            if (!bone?.isBone) throw new Error(`Porta do laboratório ausente: ${door.bone}`);
            return bone;
        });
        this.closed = this.bones.map(bone => bone.position.clone());
        scene.traverse(node => { const mesh = node as Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; if (mesh.type === 'SkinnedMesh') mesh.frustumCulled = false; } });
        this.mixer = new AnimationMixer(scene);
        this.actions = LABORATORIO_MODES.map(name => {
            const clip = clips.find(c => c.name === name);
            if (!clip) throw new Error(`Clipe do laboratório ausente: ${name}`);
            const tracks = clip.tracks.filter(track => !LABORATORIO.doors.some(door => track.name.startsWith(`${door.bone}.`)));
            const action = this.mixer.clipAction(new AnimationClip(name, clip.duration, tracks));
            action.setLoop(name === 'Drawer_Dispense' || name === 'Standby_PowerDown' ? LoopOnce : LoopRepeat, Infinity);
            action.clampWhenFinished = true;
            return action;
        });
        this.actions[0].play();
    }

    setMode(mode: LaboratorioMode) {
        if (this.disposed || !LABORATORIO_MODES.includes(mode)) return;
        this.mixer.stopAllAction();
        this.mode = mode;
        this.actions[LABORATORIO_MODES.indexOf(mode)].reset().play();
    }

    update(player: { x: number; z: number }, delta: number) {
        if (this.disposed) return;
        const dt = Math.min(.05, Math.max(0, delta)), step = 1 - Math.exp(-12 * dt);
        const bounds = LABORATORIO.roofArea, margin = this.inside ? 0 : .05;
        this.inside = player.x > bounds.minX + margin && player.x < bounds.maxX - margin && player.z > bounds.minZ + margin && player.z < bounds.maxZ - margin;
        this.status.roofOpacity += ((this.inside ? 0 : 1) - this.status.roofOpacity) * step;
        this.roof.visible = this.status.roofOpacity > .01;
        this.cutWalls.visible = this.roof.visible;
        for (const material of this.roofMaterials) {
            const opacity = this.status.roofOpacity, transparent = material.transparent || opacity < .995;
            material.own.opacity = material.opacity * opacity;
            if (material.own.transparent !== transparent) { material.own.transparent = transparent; material.own.needsUpdate = true; }
            material.own.depthWrite = material.depthWrite && opacity > .995;
        }
        this.mixer.update(dt);
        for (let i = 0; i < LABORATORIO.doors.length; i++) {
            const door = LABORATORIO.doors[i], closed = this.closed[i], slide = door.slide;
            const dx = player.x - door.x, dz = player.z - door.z;
            const open = dx * dx + dz * dz < 2.7 * 2.7;
            this.doorSounds[i].update(open, this.doors[i], door.x, door.z);
            this.doors[i] += ((open ? 1 : 0) - this.doors[i]) * step;
            // Root tem eixos glTF de mundo, sem rotação/escala de implantação.
            this.bones[i].position.set(closed.x + slide[0] * this.doors[i], closed.y + slide[1] * this.doors[i], closed.z + slide[2] * this.doors[i]);
            const source = LABORATORIO.dynamicCuboids[i].position, output = this.motions[i].position;
            output.x = source.x + slide[0] * this.doors[i];
            output.y = source.y + slide[1] * this.doors[i];
            output.z = source.z + slide[2] * this.doors[i];
        }
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.scene);
        for (const material of this.roofMaterials) material.own.dispose();
        // Geometria, texturas e material pertencem ao cache useGLTF, sem clones por quadro.
    }
}
