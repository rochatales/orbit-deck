import { COMBAT, HIT_LAYER, RIFLE_MASK, encounterLayout, type EncounterLayout } from './config';
import { Navigation, clearSegment, segmentBox, type Position, type Terrain } from './navigation';
import { advanceCrate, openCrate, SUPPLY_CRATE, type CratePlacement, type CrateState } from '../game/props/supplyCrate';
export interface SupplyCrate extends CrateState, CratePlacement { marker: Position; rewarded: boolean }
export interface Robot extends Position {
    id: number;
    hp: number;
    angle: number;
    path: Position[];
    repath: number;
    flash: number;
    alerted: boolean;
    alertLeft: number;
    routeIndex: number;
    waypoint: number;
}
export interface Pickup extends Position {
    active: boolean;
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
    iron = 0;
    copper = 0;
    drops: Pickup[];
    hearts: Pickup[];
    elapsed = 0;
    crates: SupplyCrate[];
    constructor(public terrain: Terrain, count: number, private readonly layout: EncounterLayout = encounterLayout(), crates: readonly CratePlacement[] = []) {
        this.crates = crates.map(p => ({ ...p, marker: { x: p.x, z: p.z + 1.1 }, phase: 'closed', elapsed: 0, rewarded: false }));
        this.navigation = new Navigation(terrain, COMBAT.robot.radius, COMBAT.grid);
        const size = Number.isFinite(count) ? Math.max(1, Math.min(COMBAT.encounterSize, Math.floor(count))) : COMBAT.encounterSize;
        const spawns = (size <= 5 ? layout.small : layout.spawns).slice(0, size);
        this.hearts = layout.hearts.map(p => ({ x: p.x, z: p.z, active: true }));
        this.robots = spawns.map(({ x, z, routeIndex, waypoint }, id) => {
            const target = layout.routes[routeIndex][waypoint];
            return { x, z, routeIndex, waypoint, id, hp: COMBAT.robot.hp, angle: Math.atan2(target.x - x, target.z - z), path: [], repath: 0, flash: 0, alerted: false, alertLeft: 0 };
        });
        this.drops = this.robots.map(() => ({ x: 0, z: 0, active: false }));
    }
    get dead() { return this.hp <= 0; }
    get cleared() { return this.robots.every(r => r.hp <= 0); }
    get snapshot() { return { hp: this.hp, iron: this.iron, copper: this.copper, ammo: this.ammo, reserve: this.reserve, reloading: this.reloadLeft > 0, dead: this.dead, kills: this.kills, total: this.robots.length, cleared: this.cleared, damage: this.damageFlash > 0, hit: this.hitFlash > 0 }; }
    nearbySupplyCrate(player: Position): SupplyCrate | undefined {
        if (this.dead || !Number.isFinite(player.x + player.z)) return;
        for (const crate of this.crates)
            if (crate.phase === 'closed'
                && Math.hypot(player.x - crate.marker.x, player.z - crate.marker.z) <= SUPPLY_CRATE.radius
                && clearSegment(player, crate.marker, this.terrain, 0)) return crate;
    }
    openSupplyCrate(player: Position, paused = false): boolean {
        if (paused || this.dead) return false;
        const crate = this.nearbySupplyCrate(player);
        return !!crate && openCrate(crate, player.x, player.z, crate.marker.x, crate.marker.z);
    }
    private canCollect(player: Position, pickup: Position) {
        return Math.hypot(player.x - pickup.x, player.z - pickup.z) <= COMBAT.pickupRadius
            && clearSegment(player, pickup, this.terrain, 0);
    }
    private nextPosition: Position = { x: 0, z: 0 };
    step(dt: number, input: CombatInput, paused = false) {
        if (paused || this.dead)
            return;
        this.elapsed += dt;
        for (const crate of this.crates) {
            advanceCrate(crate, dt);
            if (!crate.rewarded && crate.elapsed >= SUPPLY_CRATE.rewardAt) {
                crate.rewarded = true;
                this.reserve += SUPPLY_CRATE.ammo;
            }
        }
        this.cooldown = Math.max(0, this.cooldown - dt);
        this.invulnerable = Math.max(0, this.invulnerable - dt);
        this.damageFlash = Math.max(0, this.damageFlash - dt);
        this.hitFlash = Math.max(0, this.hitFlash - dt);
        this.shots = this.shots.filter(s => (s.life -= dt) > 0);
        for (const r of this.robots) {
            r.flash = Math.max(0, r.flash - dt);
            r.alertLeft = Math.max(0, r.alertLeft - dt);
        }
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
                    if (hit.robot.hp === 0) {
                        this.kills++;
                        const drop = this.drops[hit.robot.id];
                        drop.x = hit.robot.x;
                        drop.z = hit.robot.z;
                        drop.active = true;
                    }
                }
            }
        }
        for (const robot of this.robots) {
            if (robot.hp <= 0)
                continue;
            const distance = Math.hypot(robot.x - input.player.x, robot.z - input.player.z);
            if (!robot.alerted && canSeePlayer(robot, input.player, this.terrain)) {
                robot.alerted = true;
                robot.alertLeft = COMBAT.alertDuration;
                robot.repath = 0;
            }
            if (robot.alerted && distance <= COMBAT.robot.contactRange && clearSegment(robot, input.player, this.terrain, 0)) {
                if (this.invulnerable === 0) {
                    this.hp = Math.max(0, this.hp - COMBAT.robot.damage);
                    this.invulnerable = COMBAT.robot.contactInterval;
                    this.damageFlash = 0.24;
                }
                continue;
            }
            const route = this.layout.routes[robot.routeIndex];
            if (!robot.alerted && Math.hypot(robot.x - route[robot.waypoint].x, robot.z - route[robot.waypoint].z) < 0.1) {
                robot.waypoint = (robot.waypoint + 1) % route.length;
                robot.repath = 0;
            }
            robot.repath -= dt;
            if (robot.repath <= 0) {
                robot.path = this.navigation.path(robot, robot.alerted ? input.player : route[robot.waypoint]);
                robot.repath = COMBAT.robot.repath;
            }
            while (robot.path.length && Math.hypot(robot.path[0].x - robot.x, robot.path[0].z - robot.z) < 0.08)
                robot.path.shift();
            const target = robot.path[0];
            if (!target)
                continue;
            const dx = target.x - robot.x, dz = target.z - robot.z, d = Math.hypot(dx, dz), step = Math.min(COMBAT.robot.speed * dt, d);
            const next = this.nextPosition;
            next.x = robot.x + dx / d * step;
            next.z = robot.z + dz / d * step;
            if (clearSegment(robot, next, this.terrain, COMBAT.robot.radius) && !this.robots.some(other => other !== robot && other.hp > 0 && Math.hypot(other.x - next.x, other.z - next.z) < COMBAT.robot.radius * 1.7)) {
                robot.x = next.x;
                robot.z = next.z;
            }
            robot.angle = Math.atan2(dx, dz);
        }
        if (this.dead) return;
        for (const drop of this.drops) {
            if (drop.active && this.canCollect(input.player, drop)) {
                drop.active = false;
                this.iron++;
                this.copper++;
            }
        }
        for (const heart of this.hearts) {
            if (heart.active && this.hp < COMBAT.playerHp && this.canCollect(input.player, heart)) {
                heart.active = false;
                this.hp = Math.min(COMBAT.playerHp, this.hp + COMBAT.heartHeal);
            }
        }
    }
}

/** Cone frontal de 120 graus; paredes bloqueiam a aquisição do alvo. */
export function canSeePlayer(robot: Robot, player: Position, terrain: Terrain) {
    const dx = player.x - robot.x, dz = player.z - robot.z, distance = Math.hypot(dx, dz);
    if (distance > COMBAT.robot.visionRange) return false;
    if (distance > 0.001 && (dx * Math.sin(robot.angle) + dz * Math.cos(robot.angle)) / distance < COMBAT.robot.visionCos) return false;
    return clearSegment(robot, player, terrain, 0);
}
