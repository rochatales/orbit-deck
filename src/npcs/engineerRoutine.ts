import { Navigation, segmentBox, smoothPath, type Position, type Terrain } from '../combat/navigation';
import type { SimpleCuboid } from '../world/createOfficeMap';
import { PLAYER_MOVEMENT, PLAYER_PHYSICS } from '../characters/player/playerConfig';

// O GLB v001 mede 2,23 m na origem; o astronauta ativo do player mede 1,50 m.
const VISUAL_SCALE = PLAYER_MOVEMENT.visualHeight / 2.23;
const SEAT_RADIUS = .28 * VISUAL_SCALE;
// COL_Shelf_0 fica na parede em +Z; COL_Workbench_0 fica ao lado do banco, em -X.
const WORKSHOP_SHELF_STOP = { x: -10.4, z: 13.65, angle: 0, activity: 'crouch' } as const;
const WORKSHOP_SEAT = { x: -14.9, z: 12.5, approach: .85, scale: VISUAL_SCALE } as const;

export const ENGINEER = {
    height: PLAYER_MOVEMENT.visualHeight, visualScale: VISUAL_SCALE,
    colliderHeight: PLAYER_MOVEMENT.colliderHeight, radius: PLAYER_MOVEMENT.colliderRadius,
    navigationRadius: PLAYER_MOVEMENT.colliderRadius + PLAYER_PHYSICS.controllerOffset,
    interactionRadius: 2.5, speed: .789572 * VISUAL_SCALE,
    start: { x: -6.1, z: 6 }, bumpRadius: 2 * PLAYER_MOVEMENT.colliderRadius + .14, bumpRearm: 1.4,
    crouchTransition: 77 / 30, bumpDuration: 128 / 30,
    seat: WORKSHOP_SEAT,
    seatObstacle: { minX: WORKSHOP_SEAT.x - SEAT_RADIUS, maxX: WORKSHOP_SEAT.x + SEAT_RADIUS,
        minZ: WORKSHOP_SEAT.z - SEAT_RADIUS, maxZ: WORKSHOP_SEAT.z + SEAT_RADIUS },
    stops: [
        WORKSHOP_SHELF_STOP,
        { x: -10.3, z: 0, angle: -Math.PI / 2, activity: 'crouch' },
        { x: WORKSHOP_SEAT.x + WORKSHOP_SEAT.approach, z: WORKSHOP_SEAT.z, angle: Math.PI / 2, activity: 'sit' }
    ]
} as const;
export type EngineerAnimation = 'Idle' | 'StartWalking' | 'Walk' | 'CrouchDown' | 'Crouch' | 'CrouchToStand' | 'Sitting' | 'ShovedReaction' | 'Yelling' | 'Acknowledging';
export type EngineerPhase = 'walk' | 'crouch-down' | 'crouch' | 'stand-up' | 'sit';
export function engineerHasStandingRoom(approach: Position, player: Position) {
    const nearestX = Math.max(approach.x - ENGINEER.seat.approach, Math.min(approach.x, player.x));
    return Math.hypot(player.x - approach.x, player.z - approach.z) >= .9
        && Math.hypot(player.x - nearestX, player.z - approach.z) >= .8;
}
export interface EngineerState extends Position {
    y: number; angle: number; animation: EngineerAnimation; phase: EngineerPhase;
    moving: boolean; cycles: number; seated: number; clipTime: number | null;
}
/** Projeção conservadora dos colisores simples animados das portas, sem criar vetores. */
export function engineerDoorClear(from: Position, to: Position, doors: readonly SimpleCuboid[], box: { minX: number; maxX: number; minZ: number; maxZ: number }, radius: number = ENGINEER.radius) {
    for (const door of doors) {
        const q = door.rotation, h = door.halfExtents, p = door.position;
        const ex = Math.abs(1 - 2 * (q.y * q.y + q.z * q.z)) * h[0] + Math.abs(2 * (q.x * q.y - q.z * q.w)) * h[1] + Math.abs(2 * (q.x * q.z + q.y * q.w)) * h[2];
        const ey = Math.abs(2 * (q.x * q.y + q.z * q.w)) * h[0] + Math.abs(1 - 2 * (q.x * q.x + q.z * q.z)) * h[1] + Math.abs(2 * (q.y * q.z - q.x * q.w)) * h[2];
        if (p.y - ey > ENGINEER.height || p.y + ey < .05) continue;
        const ez = Math.abs(2 * (q.x * q.z - q.y * q.w)) * h[0] + Math.abs(2 * (q.y * q.z + q.x * q.w)) * h[1] + Math.abs(1 - 2 * (q.x * q.x + q.y * q.y)) * h[2];
        box.minX = p.x - ex; box.maxX = p.x + ex; box.minZ = p.z - ez; box.maxZ = p.z + ez;
        if (segmentBox(from, to, box, radius) !== null) return false;
    }
    return true;
}

/** Uma rotina mutável. Caminhos calculados só na criação; pausa/conversa preservam a tarefa. */
export class EngineerRoutine {
    readonly state: EngineerState = { ...ENGINEER.start, y: 0, angle: Math.PI, animation: 'Idle', phase: 'walk', moving: false, cycles: 0, seated: 0, clipTime: null };
    /** Apoio visual/físico: aproximação livre antes de recuar para a pose sentada. */
    readonly position: Position & { y: number } = { ...ENGINEER.start, y: 0 };
    readonly paths: Position[][];
    private route = 0;
    private waypoint = 0;
    private left = 0;
    private walkingTime = 0;
    private speed = 0;
    private bumpLeft = 0;
    private bumpArmed = true;
    private lastPlayerX = NaN;
    private lastPlayerZ = NaN;
    private next = { x: 0, z: 0 };
    private doorBox = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
    constructor(private readonly world: Terrain & { movingCuboids?: SimpleCuboid[] }) {
        const terrain = { ...world, obstacles: [...world.obstacles, ENGINEER.seatObstacle] };
        const nav = new Navigation(terrain, ENGINEER.navigationRadius, .5), stops = ENGINEER.stops;
        const route = (a: Position, b: Position) => {
            const path = smoothPath(a, nav.path(a, b), terrain, ENGINEER.navigationRadius);
            if (!path.length) throw Error('Engenheiro sem trajeto livre entre Oficina e Data Center.');
            return path;
        };
        this.paths = [route(ENGINEER.start, stops[0]), route(stops[0], stops[1]), route(stops[1], stops[2]), route(stops[2], stops[0])];
    }
    private face(angle: number, dt: number) {
        const delta = Math.atan2(Math.sin(angle - this.state.angle), Math.cos(angle - this.state.angle));
        this.state.angle += delta * (1 - Math.exp(-8 * dt));
    }
    update(delta: number, player: Position, talking = false, edenActive = false, paused = false, waitInWorkshop = false) {
        if (paused || delta <= 0) return;
        const dt = Math.min(delta, .05), s = this.state;
        s.clipTime = null;
        this.advance(dt, player, talking, edenActive, waitInWorkshop);
        const target = s.animation === 'Sitting' ? 1 : 0;
        const nextSeated = s.seated + Math.sign(target - s.seated) * Math.min(Math.abs(target - s.seated), dt / .35);
        const nextX = s.x - ENGINEER.seat.approach * nextSeated;
        const clearance = Math.hypot(player.x - nextX, player.z - s.z);
        if (clearance >= .8 || clearance >= Math.hypot(player.x - this.position.x, player.z - this.position.z)) s.seated = nextSeated;
        this.position.x = s.x - ENGINEER.seat.approach * s.seated;
        this.position.z = s.z; this.position.y = s.y;
    }
    private advance(dt: number, player: Position, talking: boolean, edenActive: boolean, waitInWorkshop: boolean) {
        const s = this.state;
        const distance = Math.hypot(player.x - this.position.x, player.z - this.position.z);
        const playerMoved = Number.isFinite(this.lastPlayerX) && Math.hypot(player.x - this.lastPlayerX, player.z - this.lastPlayerZ) > .002;
        this.lastPlayerX = player.x; this.lastPlayerZ = player.z;
        if (distance > ENGINEER.bumpRearm) this.bumpArmed = true;
        s.moving = false;
        if (s.seated > 0 && !engineerHasStandingRoom(s, player)) {
            this.bumpLeft = 0; this.bumpArmed = false; this.speed = 0;
            s.animation = 'Sitting';
            return; // Sem levantar, reagir ou gastar a atividade sobre o jogador.
        }
        if (talking) {
            this.bumpLeft = 0; this.bumpArmed = false; this.speed = 0;
            s.animation = edenActive ? 'Acknowledging' : 'Yelling';
            this.face(Math.atan2(player.x - this.position.x, player.z - this.position.z), dt);
            return;
        }
        if (this.bumpArmed && playerMoved && distance < ENGINEER.bumpRadius) {
            this.bumpLeft = ENGINEER.bumpDuration; this.bumpArmed = false; this.speed = 0;
        }
        if (this.bumpLeft > 0) {
            this.bumpLeft = Math.max(0, this.bumpLeft - dt);
            s.animation = 'ShovedReaction';
            return;
        }
        if (s.phase === 'walk') {
            // A rota 1 sai da estante da Oficina. Na campanha, fica ali até entregar a arma.
            if (waitInWorkshop && this.route === 1 && this.waypoint === 0
                && Math.hypot(s.x - ENGINEER.stops[0].x, s.z - ENGINEER.stops[0].z) < .08) {
                s.animation = 'Idle'; this.speed = 0; return;
            }
            const path = this.paths[this.route];
            while (this.waypoint < path.length && Math.hypot(path[this.waypoint].x - s.x, path[this.waypoint].z - s.z) < .06) this.waypoint++;
            if (this.waypoint >= path.length) {
                const stop = ENGINEER.stops[this.route === 1 ? 1 : this.route === 2 ? 2 : 0];
                this.speed = 0;
                if (stop === WORKSHOP_SHELF_STOP) {
                    this.face(stop.angle, dt);
                    if (Math.cos(s.angle - stop.angle) < .999) { s.animation = 'Idle'; return; }
                }
                s.phase = stop.activity === 'sit' ? 'sit' : 'crouch-down';
                this.left = s.phase === 'sit' ? 14 : ENGINEER.crouchTransition;
                if (this.route === 3) s.cycles++;
            } else {
                const target = path[this.waypoint], dx = target.x - s.x, dz = target.z - s.z, remaining = Math.hypot(dx, dz);
                this.speed += (ENGINEER.speed - this.speed) * (1 - Math.exp(-1.1 * dt));
                const step = Math.min(remaining, this.speed * dt);
                this.next.x = s.x + dx / remaining * step; this.next.z = s.z + dz / remaining * step;
                if (distance < 1.05 || Math.hypot(this.next.x - player.x, this.next.z - player.z) < .85
                    || !engineerDoorClear(s, this.next, this.world.movingCuboids ?? EMPTY_DOORS, this.doorBox)) {
                    this.speed = 0; s.animation = 'Idle'; return;
                }
                s.x = this.next.x; s.z = this.next.z;
                s.y = this.world.surfaceHeight?.(s.x, s.z) ?? 0;
                this.walkingTime += dt;
                s.animation = this.walkingTime < 88 / 30 ? 'StartWalking' : 'Walk'; s.moving = true;
                s.clipTime = this.walkingTime - (s.animation === 'Walk' ? 88 / 30 : 0);
                this.face(Math.atan2(dx, dz), dt);
                return;
            }
        }
        const stop = ENGINEER.stops[this.route === 1 ? 1 : this.route === 2 ? 2 : 0];
        if (s.phase === 'sit' && s.seated === 0 && !engineerHasStandingRoom(s, player)) {
            s.animation = 'Idle';
            return; // Espera em pé antes de ocupar o banco ou iniciar o blend.
        }
        if (stop === WORKSHOP_SHELF_STOP) s.angle = stop.angle;
        else this.face(stop.angle, dt);
        s.animation = s.phase === 'crouch-down' ? 'CrouchDown' : s.phase === 'crouch' ? 'Crouch' : s.phase === 'sit' ? 'Sitting' : 'CrouchToStand';
        s.clipTime = (s.phase === 'sit' ? 14 : s.phase === 'crouch' ? 7 : ENGINEER.crouchTransition) - this.left;
        this.left -= dt;
        if (this.left > 0) return;
        if (s.phase === 'crouch-down') { s.phase = 'crouch'; this.left = 7; }
        else if (s.phase === 'crouch' || s.phase === 'sit') { s.phase = 'stand-up'; this.left = ENGINEER.crouchTransition; }
        else {
            this.route = this.route === 0 || this.route === 3 ? 1 : this.route + 1;
            this.waypoint = 0; this.walkingTime = 0; s.phase = 'walk';
        }
    }
}
const EMPTY_DOORS: readonly SimpleCuboid[] = [];
/** Só o desenvolvimento permite comparação sem alterar o save da campanha. */
export function engineerPreviewMood(search: string): boolean | null {
    const value = new URLSearchParams(search).get('engineerEden');
    return value === '1' ? true : value === '0' ? false : null;
}
export function engineerIsCalm(mode: 'campaign' | 'development', edenActive: boolean, preview: boolean | null) {
    return mode === 'campaign' ? edenActive : preview ?? true;
}
