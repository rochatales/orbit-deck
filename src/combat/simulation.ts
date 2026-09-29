import { COMBAT, HIT_LAYER, RIFLE_MASK } from './config';
import { Navigation, clearSegment, segmentBox, type Position, type Terrain } from './navigation';
export interface Robot extends Position {
    id: number;
    hp: number;
    angle: number;
    path: Position[];
    repath: number;
    flash: number;
}
export interface Shot {
    from: Position;
    to: Position;
    life: number;
    hit: boolean;
}
export interface CombatInput {
    player: Position;
    aim: Position;
    firing: boolean;
    reload: boolean;
}
export function rayCircle(a: Position, b: Position, c: Position, r: number): number | null {
    const dx = b.x - a.x, dz = b.z - a.z, ox = a.x - c.x, oz = a.z - c.z, aa = dx * dx + dz * dz;
    if (ox * ox + oz * oz <= r * r)
        return 0;
    if (aa < 1e-9)
        return null;
    const bb = 2 * (ox * dx + oz * dz), cc = ox * ox + oz * oz - r * r, disc = bb * bb - 4 * aa * cc;
    if (disc < 0)
        return null;
    const t = (-bb - Math.sqrt(disc)) / (2 * aa);
    return t >= 0 && t <= 1 ? t : null;
}
/** Hitscan uses the same obstacle footprints as movement. Player is excluded by mask. */
export function traceShot(a: Position, b: Position, terrain: Terrain, robots: Robot[], mask = RIFLE_MASK) {
    let t = 1, robot: Robot | null = null;
    if (mask & HIT_LAYER.world)
        for (const obstacle of terrain.obstacles) {
            const hit = segmentBox(a, b, obstacle);
            if (hit !== null && hit <= t) {
                t = hit;
            }
        }
    if (mask & HIT_LAYER.enemy)
        for (const candidate of robots)
            if (candidate.hp > 0) {
                const hit = rayCircle(a, b, candidate, COMBAT.robot.radius);
                if (hit !== null && hit < t) {
                    t = hit;
                    robot = candidate;
                }
            }
    return { to: { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, robot };
}
export class CombatSimulation {
    hp: number = COMBAT.playerHp;
    ammo: number = COMBAT.rifle.magazine;
    reserve: number = COMBAT.rifle.reserve;
    reloadLeft = 0;
    cooldown = 0;
    invulnerable = 0;
    damageFlash = 0;
    hitFlash = 0;
    shots: Shot[] = [];
    robots: Robot[];
    navigation: Navigation;
    kills = 0;
    elapsed = 0;
    constructor(public terrain: Terrain, count: number) {
        this.navigation = new Navigation(terrain, COMBAT.robot.radius, COMBAT.grid);
        this.robots = COMBAT.spawns.slice(0, Math.max(1, Math.min(5, count))).map((p, id) => ({ ...p, id, hp: COMBAT.robot.hp, angle: 0, path: [], repath: 0, flash: 0 }));
    }
    get dead() { return this.hp <= 0; }
    get cleared() { return this.robots.every(r => r.hp <= 0); }
    get snapshot() { return { hp: this.hp, ammo: this.ammo, reserve: this.reserve, reloading: this.reloadLeft > 0, dead: this.dead, kills: this.kills, total: this.robots.length, cleared: this.cleared, damage: this.damageFlash > 0, hit: this.hitFlash > 0 }; }
    step(dt: number, input: CombatInput, paused = false) {
        if (paused || this.dead)
            return;
        this.elapsed += dt;
        this.cooldown = Math.max(0, this.cooldown - dt);
        this.invulnerable = Math.max(0, this.invulnerable - dt);
        this.damageFlash = Math.max(0, this.damageFlash - dt);
        this.hitFlash = Math.max(0, this.hitFlash - dt);
        this.shots = this.shots.filter(s => (s.life -= dt) > 0);
        for (const r of this.robots)
            r.flash = Math.max(0, r.flash - dt);
        if (this.reloadLeft > 0) {
            this.reloadLeft = Math.max(0, this.reloadLeft - dt);
            if (this.reloadLeft === 0) {
                const transfer = Math.min(COMBAT.rifle.magazine - this.ammo, this.reserve);
                this.ammo += transfer;
                this.reserve -= transfer;
            }
        }
        if (input.reload && this.reloadLeft === 0 && this.ammo < COMBAT.rifle.magazine && this.reserve > 0)
            this.reloadLeft = COMBAT.rifle.reload;
        if (input.firing && this.reloadLeft === 0 && this.cooldown === 0 && this.ammo > 0) {
            const dx = input.aim.x - input.player.x, dz = input.aim.z - input.player.z, length = Math.hypot(dx, dz);
            if (length > 0.05) {
                const end = { x: input.player.x + dx / length * COMBAT.rifle.range, z: input.player.z + dz / length * COMBAT.rifle.range };
                const hit = traceShot(input.player, end, this.terrain, this.robots);
                this.ammo--;
                this.cooldown = COMBAT.rifle.interval;
                this.shots.push({ from: { ...input.player }, to: hit.to, life: 0.09, hit: !!hit.robot });
                if (hit.robot) {
                    hit.robot.hp = Math.max(0, hit.robot.hp - COMBAT.rifle.damage);
                    hit.robot.flash = 0.15;
                    this.hitFlash = 0.15;
                    if (hit.robot.hp === 0)
                        this.kills++;
                }
            }
        }
        for (const robot of this.robots) {
            if (robot.hp <= 0)
                continue;
            const distance = Math.hypot(robot.x - input.player.x, robot.z - input.player.z);
            if (distance <= COMBAT.robot.contactRange && clearSegment(robot, input.player, this.terrain, 0)) {
                if (this.invulnerable === 0) {
                    this.hp = Math.max(0, this.hp - COMBAT.robot.damage);
                    this.invulnerable = COMBAT.robot.contactInterval;
                    this.damageFlash = 0.24;
                }
                continue;
            }
            robot.repath -= dt;
            if (robot.repath <= 0) {
                robot.path = this.navigation.path(robot, input.player);
                robot.repath = COMBAT.robot.repath;
            }
            while (robot.path.length && Math.hypot(robot.path[0].x - robot.x, robot.path[0].z - robot.z) < 0.08)
                robot.path.shift();
            const target = robot.path[0];
            if (!target)
                continue;
            const dx = target.x - robot.x, dz = target.z - robot.z, d = Math.hypot(dx, dz), step = Math.min(COMBAT.robot.speed * dt, d);
            const next = { x: robot.x + dx / d * step, z: robot.z + dz / d * step };
            if (clearSegment(robot, next, this.terrain, COMBAT.robot.radius) && !this.robots.some(other => other !== robot && other.hp > 0 && Math.hypot(other.x - next.x, other.z - next.z) < COMBAT.robot.radius * 1.7)) {
                robot.x = next.x;
                robot.z = next.z;
            }
            robot.angle = Math.atan2(dx, dz);
        }
    }
}
