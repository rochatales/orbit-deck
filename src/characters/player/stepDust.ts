import type { Object3D } from 'three';
export const STEP_DUST = {
    capacity: 96, perStep: 6, pendingCapacity: 4,
    minLife: .4, maxLife: .65, groundOffset: .025,
    initialSize: .09, growth: .28, opacity: .32,
    colors: { mars: '#bd6f4c', shanghai: '#a2a5a6' },
} as const;
interface DustParticle {
    x: number; y: number; z: number; vx: number; vy: number; vz: number;
    life: number; duration: number; size: number; stretch: number; alpha: number;
}
interface Ground { surfaceHeight?: (x: number, z: number) => number; supportHeight?: (x: number, z: number) => number }
/** Mesmos pisos analíticos do mundo: consulta só ao emitir, nunca à malha. */
export function dustSurfaceHeight(world: Ground, x: number, z: number) {
    return (world.surfaceHeight?.(x, z) ?? world.supportHeight?.(x, z) ?? 0) + STEP_DUST.groundOffset;
}
/** Pool e fila fixos; posições em mundo, sem partículas seguindo o corpo depois do passo. */
export class StepDustPool {
    readonly particles: DustParticle[];
    readonly sides = new Int8Array(STEP_DUST.pendingCapacity);
    readonly angles = new Float32Array(STEP_DUST.pendingCapacity);
    pending = 0;
    leftFoot: Object3D | null = null;
    rightFoot: Object3D | null = null;
    private owner: Object3D | null = null;
    private cursor = 0;
    constructor(capacity = STEP_DUST.capacity) {
        this.particles = Array.from({ length: capacity }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
            life: 0, duration: 1, size: 0, stretch: 1, alpha: 0 }));
    }
    bind(scene: Object3D) {
        this.owner = scene;
        this.leftFoot = scene.getObjectByName('mixamorigLeftFoot') ?? scene.getObjectByName('mixamorig:LeftFoot') ?? null;
        this.rightFoot = scene.getObjectByName('mixamorigRightFoot') ?? scene.getObjectByName('mixamorig:RightFoot') ?? null;
        this.reset();
    }
    unbind(scene: Object3D) {
        if (this.owner !== scene) return;
        this.owner = null; this.leftFoot = null; this.rightFoot = null; this.reset();
    }
    request(side: number, moveAngle: number, grounded: boolean) {
        if (!grounded || this.pending === this.sides.length) return;
        this.sides[this.pending] = side; this.angles[this.pending++] = moveAngle;
    }
    emit(x: number, y: number, z: number, moveAngle: number, random = Math.random) {
        for (let i = 0; i < STEP_DUST.perStep; i++) {
            const p = this.particles[this.cursor]; this.cursor = (this.cursor + 1) % this.particles.length;
            const angle = random() * Math.PI * 2, radius = .035 * random(), drift = .08 + .14 * random();
            p.x = x + Math.cos(angle) * radius; p.y = y + random() * .02; p.z = z + Math.sin(angle) * radius;
            p.vx = Math.cos(angle) * drift - Math.sin(moveAngle) * .15;
            p.vz = Math.sin(angle) * drift - Math.cos(moveAngle) * .15;
            p.vy = .12 + random() * .16;
            p.life = p.duration = STEP_DUST.minLife + random() * (STEP_DUST.maxLife - STEP_DUST.minLife);
            p.size = STEP_DUST.initialSize; p.stretch = .8 + random() * .5; p.alpha = 0;
        }
    }
    step(dt: number) {
        if (dt <= 0) return;
        dt = Math.min(dt, .05);
        const drag = Math.exp(-3 * dt);
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (p.life <= 0) continue;
            p.life = Math.max(0, p.life - dt);
            p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
            p.vx *= drag; p.vy *= drag; p.vz *= drag;
            const age = 1 - p.life / p.duration;
            p.size = STEP_DUST.initialSize + STEP_DUST.growth * age;
            p.alpha = STEP_DUST.opacity * Math.min(1, age / .08) * (1 - age) ** 2;
        }
    }
    reset() {
        this.pending = 0; this.cursor = 0;
        for (let i = 0; i < this.particles.length; i++) { this.particles[i].life = 0; this.particles[i].alpha = 0; }
    }
}
export const playerStepDust = new StepDustPool();
