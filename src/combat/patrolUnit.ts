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
export type PatrolUnitClip = 'Idle' | 'PatrolWalk' | 'ChaseRun' | 'AggressiveLunge' | 'DamagedDeath';

/** Explorador no jogo: 1,50 m (player-main e r7, escala 0,857). Modelo do autor: 1,49 m. */
export const PLAYER_HEIGHT = 1.5;
export const PATROL_UNIT_MODEL_HEIGHT = 1.49;

export const PATROL_UNIT = {
    // Pedidos do autor (18/10/2026): 1/3 maior que o personagem (2,0 m) e depois
    // mais 1/3 sobre isso → 1,5 × 4/3 × 4/3 = 2,67 m.
    height: PLAYER_HEIGHT * 16 / 9,
    scale: (PLAYER_HEIGHT * 16 / 9) / PATROL_UNIT_MODEL_HEIGHT,
    walkReferenceSpeed: 1.65,   // m/s em que o PatrolWalk roda a 1×; COMBAT.robot.speed (chaseSpeed 2,05 → 1,24×)
    walkRate: [0.6, 1.6] as const,
    moveStart: 0.3,             // m/s para entrar no PatrolWalk
    moveStop: 0.15,             // histerese para voltar ao Idle
    fade: 0.18,                 // crossfade entre clipes (s)
    deathVisible: 2.4,          // s no chão antes de sumir (clipe de 1,4 s)
    alertTint: new Color('#ff3a2a'),
    calmTint: new Color('#ffffff'),
    flashColor: 1.9,            // multiplicador da cor-base durante o acerto
};

/** Grande: 3,20 m de altura / 3,28 m de largura, cabe nas vielas de pelo menos 3,48 m. */
export const LARGE_PATROL_VISUAL = { height: 3.2, scale: 3.2 / 2.08507967 } as const;

export interface PatrolUnitInput {
    alive: boolean;
    speed: number;              // m/s medidos entre quadros
    attacking: boolean;
    chasing?: boolean;
}

export function nextPatrolUnitClip(previous: PatrolUnitClip, input: PatrolUnitInput): PatrolUnitClip {
    if (!input.alive) return 'DamagedDeath';
    if (input.attacking) return 'AggressiveLunge';
    const moving = previous === 'PatrolWalk' || previous === 'ChaseRun' ? input.speed >= PATROL_UNIT.moveStop : input.speed >= PATROL_UNIT.moveStart;
    return moving ? input.chasing ? 'ChaseRun' : 'PatrolWalk' : 'Idle';
}

export function walkTimeScale(speed: number, reference = PATROL_UNIT.walkReferenceSpeed) {
    const [min, max] = PATROL_UNIT.walkRate;
    return Math.min(max, Math.max(min, speed / reference));
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

    private readonly stateInput: PatrolUnitInput = { alive: true, speed: 0, attacking: false, chasing: false };
    constructor(source: Object3D, clips: AnimationClip[], private readonly large = false) {
        this.root = clone(source);
        this.root.scale.setScalar(large ? LARGE_PATROL_VISUAL.scale : PATROL_UNIT.scale);
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
        const names: PatrolUnitClip[] = ['Idle', 'PatrolWalk', 'AggressiveLunge', 'DamagedDeath'];
        if (large) names.push('ChaseRun');
        for (const name of names) {
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
        this.stateInput.alive = alive; this.stateInput.speed = speed; this.stateInput.attacking = attacking; this.stateInput.chasing = this.large && robot.alerted;
        const next = nextPatrolUnitClip(this.clip, this.stateInput);
        if (next !== this.clip) {
            const from = this.actions.get(this.clip)!, to = this.actions.get(next)!;
            to.reset().play();
            from.crossFadeTo(to, PATROL_UNIT.fade, false);
            this.clip = next;
        }
        if (next === 'PatrolWalk') this.actions.get(next)!.timeScale = walkTimeScale(speed, this.large ? 1.25 : PATROL_UNIT.walkReferenceSpeed);
        if (next === 'ChaseRun') this.actions.get(next)!.timeScale = walkTimeScale(speed, 1.55);
        this.deadFor = alive ? 0 : this.deadFor + dt;
        this.visible = alive || this.deadFor < PATROL_UNIT.deathVisible;
        for (let i = 0; i < this.materials.length; i++) {
            const material = this.materials[i];
            material.color.copy(this.baseColors[i]).multiplyScalar(robot.flash > 0 ? PATROL_UNIT.flashColor : 1);
            material.emissive.copy(robot.alerted && alive ? PATROL_UNIT.alertTint : PATROL_UNIT.calmTint);
        }
        if (this.visible) this.mixer.update(dt);
    }

    /** Slot reaproveitado por uma nova horda: volta ao Idle sem herdar morte nem velocidade. */
    respawn() {
        this.mixer.stopAllAction();
        this.actions.get('Idle')!.reset().play();
        this.clip = 'Idle';
        this.lastX = Number.NaN;
        this.lastZ = Number.NaN;
        this.speed = 0;
        this.deadFor = 0;
        this.visible = true;
    }

    dispose() {
        this.mixer.stopAllAction();
        this.mixer.uncacheRoot(this.root);
        for (const material of this.materials) material.dispose();
        this.root.traverse(o => { const mesh = o as SkinnedMesh; if (mesh.isSkinnedMesh) mesh.skeleton.dispose(); });
    }
}
