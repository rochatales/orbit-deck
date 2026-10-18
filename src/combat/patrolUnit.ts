import { AnimationMixer, Color, LoopOnce, LoopRepeat, MeshStandardMaterial, SkinnedMesh, type AnimationAction, type AnimationClip, type Object3D } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Patrol Unit // Shanghai Sector (S6.1, modelo do autor de 18/10/2026,
 * `art-source/patrol-unit/`, GLB copiado sem alteração).
 *
 * O visual só lê o estado que a simulação já publica; nada aqui muda regra de
 * combate. Escolha do clipe:
 * - morto (hp 0) → DamagedDeath uma vez, fica no chão e some depois de `deathVisible`;
 * - alertado e dentro do alcance de contato (quando a simulação aplica o dano) → AggressiveLunge;
 * - deslocando de verdade → PatrolWalk, com a cadência pela velocidade real;
 * - parado → Idle.
 */
export type PatrolUnitClip = 'Idle' | 'PatrolWalk' | 'AggressiveLunge' | 'DamagedDeath';

export const PATROL_UNIT = {
    walkReferenceSpeed: 1.65,   // m/s em que o PatrolWalk roda a 1×; COMBAT.robot.speed
    walkRate: [0.6, 1.6] as const,
    moveStart: 0.3,             // m/s para entrar no PatrolWalk
    moveStop: 0.15,             // histerese para voltar ao Idle
    fade: 0.18,                 // crossfade entre clipes (s)
    deathVisible: 2.4,          // s no chão antes de sumir (clipe de 1,4 s)
    alertTint: new Color('#ff3a2a'),
    calmTint: new Color('#ffffff'),
    flashColor: 1.9,            // multiplicador da cor-base durante o acerto
};

export interface PatrolUnitInput {
    alive: boolean;
    speed: number;              // m/s medidos entre quadros
    attacking: boolean;
}

export function nextPatrolUnitClip(previous: PatrolUnitClip, input: PatrolUnitInput): PatrolUnitClip {
    if (!input.alive) return 'DamagedDeath';
    if (input.attacking) return 'AggressiveLunge';
    const moving = previous === 'PatrolWalk' ? input.speed >= PATROL_UNIT.moveStop : input.speed >= PATROL_UNIT.moveStart;
    return moving ? 'PatrolWalk' : 'Idle';
}

export function walkTimeScale(speed: number) {
    const [min, max] = PATROL_UNIT.walkRate;
    return Math.min(max, Math.max(min, speed / PATROL_UNIT.walkReferenceSpeed));
}

export interface PatrolUnitRobot { x: number; z: number; hp: number; flash: number; alerted: boolean }

/**
 * Uma instância por robô: esqueleto e material próprios; malha e texturas
 * compartilhadas com o cache. Posição e rumo ficam no grupo do CombatScene.
 */
export class PatrolUnitRig {
    readonly root: Object3D;
    clip: PatrolUnitClip = 'Idle';
    visible = true;
    private readonly mixer: AnimationMixer;
    private readonly actions = new Map<PatrolUnitClip, AnimationAction>();
    private readonly materials: MeshStandardMaterial[] = [];
    private readonly baseColors: Color[] = [];
    private lastX = Number.NaN;
    private lastZ = Number.NaN;
    private deadFor = 0;
    private speed = 0;          // suavizada: a simulação anda em passos fixos, 0–2 por quadro

    constructor(source: Object3D, clips: AnimationClip[]) {
        this.root = clone(source);
        this.root.traverse(object => {
            const mesh = object as SkinnedMesh;
            if (!mesh.isMesh) return;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const material = (mesh.material as MeshStandardMaterial).clone();
            mesh.material = material;
            this.materials.push(material);
            this.baseColors.push(material.color.clone());
        });
        this.mixer = new AnimationMixer(this.root);
        for (const name of ['Idle', 'PatrolWalk', 'AggressiveLunge', 'DamagedDeath'] as PatrolUnitClip[]) {
            const clip = clips.find(c => c.name === name);
            if (!clip) throw new Error(`Patrol Unit sem o clipe ${name}`);
            const action = this.mixer.clipAction(clip);
            if (name === 'DamagedDeath') { action.setLoop(LoopOnce, 1); action.clampWhenFinished = true; }
            else action.setLoop(LoopRepeat, Infinity);
            this.actions.set(name, action);
        }
        this.actions.get('Idle')!.play();
    }

    update(robot: PatrolUnitRobot, playerX: number, playerZ: number, contactRange: number, dt: number) {
        const alive = robot.hp > 0;
        if (dt > 0) {
            const measured = Number.isFinite(this.lastX) ? Math.hypot(robot.x - this.lastX, robot.z - this.lastZ) / dt : 0;
            this.speed += (measured - this.speed) * (1 - Math.exp(-12 * dt));
            this.lastX = robot.x;
            this.lastZ = robot.z;
        }
        const speed = this.speed;
        const attacking = alive && robot.alerted && Math.hypot(robot.x - playerX, robot.z - playerZ) <= contactRange;
        const next = nextPatrolUnitClip(this.clip, { alive, speed, attacking });
        if (next !== this.clip) {
            const from = this.actions.get(this.clip)!, to = this.actions.get(next)!;
            to.reset().play();
            from.crossFadeTo(to, PATROL_UNIT.fade, false);
            this.clip = next;
        }
        if (next === 'PatrolWalk') this.actions.get('PatrolWalk')!.timeScale = walkTimeScale(speed);
        this.deadFor = alive ? 0 : this.deadFor + dt;
        this.visible = alive || this.deadFor < PATROL_UNIT.deathVisible;
        for (let i = 0; i < this.materials.length; i++) {
            const material = this.materials[i];
            material.color.copy(this.baseColors[i]).multiplyScalar(robot.flash > 0 ? PATROL_UNIT.flashColor : 1);
            material.emissive.copy(robot.alerted && alive ? PATROL_UNIT.alertTint : PATROL_UNIT.calmTint);
        }
        if (this.visible) this.mixer.update(dt);
    }

    dispose() {
        this.mixer.stopAllAction();
        this.mixer.uncacheRoot(this.root);
        for (const material of this.materials) material.dispose();
    }
}
