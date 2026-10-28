import { AnimationClip, AnimationMixer, LoopOnce, LoopRepeat, Vector3, type AnimationAction, type Bone, type Mesh, type Object3D } from 'three';
import { LABORATORIO, createLaboratorioDoorColliders } from '../../game/laboratorioLayout';
import type { SimpleCuboid } from '../../world/createOfficeMap';
export const LABORATORIO_MODES = ['Idle_Ready', 'Synthesizing', 'Drawer_Dispense', 'Standby_PowerDown'] as const;
export type LaboratorioMode = typeof LABORATORIO_MODES[number];

/** A malha única preserva o corte 90°. Portas não participam dos clipes da máquina. */
export class LaboratorioRuntime {
    mode: LaboratorioMode = 'Idle_Ready';
    readonly doors = [0, 0];
    private mixer: AnimationMixer;
    private actions: AnimationAction[];
    private bones: Bone[];
    private closed: Vector3[];
    private motions: SimpleCuboid[];
    private disposed = false;

    constructor(private scene: Object3D, clips: AnimationClip[], motions = createLaboratorioDoorColliders()) {
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
        scene.traverse(node => { const mesh = node as Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; } });
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
        this.mixer.update(dt);
        for (let i = 0; i < LABORATORIO.doors.length; i++) {
            const door = LABORATORIO.doors[i], closed = this.closed[i], slide = door.slide;
            const dx = player.x - door.x, dz = player.z - door.z;
            this.doors[i] += ((dx * dx + dz * dz < 2.7 * 2.7 ? 1 : 0) - this.doors[i]) * step;
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
        // Geometria, texturas e material pertencem ao cache useGLTF, sem clones por quadro.
    }
}
