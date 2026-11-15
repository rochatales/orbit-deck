import type { Object3D } from 'three';
export const STEP_DUST = {
    capacity: 96, perStep: 8, pendingCapacity: 4,
    minLife: .45, maxLife: .75, groundOffset: .025,
    initialSize: .14, growth: .3, opacity: .48, supportTolerance: .1,
    colors: { sand: '#dbbd92', mars: '#bd6f4c', shanghai: '#a2a5a6', rio: '#c3a77e', indoor: '#d9dde0' },
} as const;
interface DustParticle {
    x: number; y: number; z: number; vx: number; vy: number; vz: number;
    life: number; duration: number; size: number; stretch: number; alpha: number; sand: number;
    /** 0 usa a cor do mapa; 1 usa a poeira interna; 2 usa areia bege. */
    tint: number;
}
interface Ground { surfaceHeight?: (x: number, z: number) => number; supportHeight?: (x: number, z: number) => number }
/** Mesmos pisos analíticos do mundo: consulta só ao emitir, nunca à malha. */
export function dustSurfaceHeight(world: Ground, x: number, z: number) {
    return (world.surfaceHeight?.(x, z) ?? world.supportHeight?.(x, z) ?? 0) + STEP_DUST.groundOffset;
}
/** O piso é analítico; Rapier pode informar grounded=false mesmo com os pés em y=0. */
export function hasDustSupport(grounded: boolean, feetY: number, floorY: number) {
    return grounded || Math.abs(feetY - floorY) <= STEP_DUST.supportTolerance;
}
/** Pool e fila fixos; posições em mundo, sem partículas seguindo o corpo depois do passo. */
export class StepDustPool {
    readonly particles: DustParticle[];
    readonly sides = new Int8Array(STEP_DUST.pendingCapacity);
    readonly angles = new Float32Array(STEP_DUST.pendingCapacity);
    readonly grounded = new Uint8Array(STEP_DUST.pendingCapacity);
    pending = 0;
    leftFoot: Object3D | null = null;
    rightFoot: Object3D | null = null;
    private owner: Object3D | null = null;
    private cursor = 0;
    constructor(capacity = STEP_DUST.capacity) {
        this.particles = Array.from({ length: capacity }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
            life: 0, duration: 1, size: 0, stretch: 1, alpha: 0, tint: 0, sand: 0 }));
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
        if (this.pending === this.sides.length) return;
        this.grounded[this.pending] = grounded ? 1 : 0;
        this.sides[this.pending] = side; this.angles[this.pending++] = moveAngle;
    }
    emit(x: number, y: number, z: number, moveAngle: number, random = Math.random, tint = 0, sand = 0) {
        const count = sand ? Math.round(5 + 11 * sand) : STEP_DUST.perStep;
        for (let i = 0; i < count; i++) {
            const p = this.particles[this.cursor]; this.cursor = (this.cursor + 1) % this.particles.length;
            const angle = random() * Math.PI * 2, radius = (.035 + .035 * sand) * random(), drift = (.08 + .14 * random()) * (1 + .85 * sand);
            p.x = x + Math.cos(angle) * radius; p.y = y + random() * .02; p.z = z + Math.sin(angle) * radius;
            p.vx = Math.cos(angle) * drift - Math.sin(moveAngle) * (.15 + .25 * sand);
            p.vz = Math.sin(angle) * drift - Math.cos(moveAngle) * (.15 + .25 * sand);
            p.vy = .12 + random() * (.16 + .22 * sand);
            p.life = p.duration = STEP_DUST.minLife + .24 * sand + random() * (STEP_DUST.maxLife - STEP_DUST.minLife);
            p.size = STEP_DUST.initialSize + .075 * sand; p.stretch = .8 + random() * .5; p.alpha = 0; p.tint = tint; p.sand = sand;
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
            p.size = STEP_DUST.initialSize + .075 * p.sand + (STEP_DUST.growth + .24 * p.sand) * age;
            p.alpha = (STEP_DUST.opacity + .16 * p.sand) * Math.min(1, age / .08) * (1 - age) ** 2;
        }
    }
    reset() {
        this.pending = 0; this.cursor = 0;
        for (let i = 0; i < this.particles.length; i++) { this.particles[i].life = 0; this.particles[i].alpha = 0; }
    }
}
export const playerStepDust = new StepDustPool();
