import { MEDICAL_KIT } from '../game/props/medicalKit';
import { MACHETE, MACHETE_COMBO, meleeCanHit, type PlayerWeapon } from './melee';
import { canCarryDrop } from '../game/backpackConfig';
import type { WeaponMuzzleOffset } from '../state/playerWeaponPose';
import { ENEMY_MOTION } from './enemyMotion';
import { newMovementRecovery, resetMovementRecovery, trackMovementGoal, updateMovementRecovery, movementPriority, MOVEMENT_RECOVERY, type MovementRecovery } from './movementRecovery';
import { pushChargeEnemy, prepareCharge, finishCharge, type ChargeState } from './mutantCharge';
import { CombatEffects, COMBAT_VFX, impactKind } from './effects';
import { enemySpacing, enemySeparation } from './enemySpacing';
import { containsShotHeight } from './shotVolume';
import { SoundQueue } from '../audio/events';
import { writeMutantPackTarget } from './mutantPack';
import { placeResourceDrop } from './resourcePlacement';
import { COMBAT, LARGE_PATROL, LARGE_MUTANT, MUTANT_CHARGE, SMALL_MUTANT, HORDE_TOTALS, robotConfig, waveRobotKind, parseEncounter, type RobotKind, HIT_LAYER, HORDE_ENCOUNTER, RIFLE_MASK, RIFLE_POSE, writeRifleMuzzle, writeRifleAimTarget, encounterLayout, type EncounterChoice, type EncounterLayout } from './config';
import { Navigation, clearSegment, segmentBox, smoothPath, traversable, type Position, type Terrain } from './navigation';
import { advanceCrate, openCrate, SUPPLY_CRATE, crateMarker, type CratePlacement, type CrateState } from '../game/props/supplyCrate';
export interface SupplyCrate extends CrateState, CratePlacement { marker: Position; rewarded: boolean }
export interface Robot extends Position, ChargeState, MovementRecovery {
    recoil: number; recoilX: number; recoilZ: number;
    /** Atordoado pela espada: não anda nem golpeia. */
    staggerLeft: number;
    kind: RobotKind;
    packAngle: number;
    packReady: boolean;
    id: number;
    hp: number;
    angle: number;
    path: Position[];
    repath: number;
    flash: number;
    alerted: boolean;
    alertLeft: number;
    /** Patrulha seguida; -1 = robô de horda, que marcha até o jogador. */
    routeIndex: number;
    waypoint: number;
    /** Slot em uso. Na horda, slots que ainda não nasceram ficam fora de cena. */
    spawned: boolean;
    /** Muda a cada nascimento do slot: o visual reinicia clipe e medição de velocidade. */
    generation: number;
    /** Velocidade atual (m/s); sobe suavemente até `chaseSpeed` depois de avistar o jogador. */
    pace: number;
    /** Slot de peças desta vida. */
    drop: number;
    /** Segundos seguidos sem conseguir andar. */
    stuck: number;
}
function createRobot(id: number, x: number, z: number, routeIndex: number, waypoint: number, angle: number, spawned: boolean): Robot {
    return { ...newMovementRecovery(), chargePhase: 'ready', chargeLeft:0, chargeDirX:0, chargeDirZ:1, chargeOriginX:0, chargeOriginZ:0, chargeDistance:0, chargeTraveled:0, chargeHit:false, staggerLeft:0, recoil:0, recoilX:0, recoilZ:0, kind: 'patrol', packAngle: 0, packReady: false, x, z, routeIndex, waypoint, id, hp: spawned ? COMBAT.robot.hp : 0, angle, path: [], repath: 0, flash: 0, alerted: false, alertLeft: 0, spawned, generation: spawned ? 1 : 0, pace: COMBAT.robot.speed, drop: id, stuck: 0 };
}
/** Spawn só vale com caminho inteiro livre e término dentro do contato do tipo. */
export function validContactSpawn(terrain: Terrain, navigation: Navigation, start: Position, arrival: Position, radius: number, contactRange: number) {
    if (!traversable(start, terrain, radius)) return false;
    const path = navigation.path(start, arrival);
    if (!path.length) return false;
    let previous = start;
    for (const point of path) {
        if (!clearSegment(previous, point, terrain, radius)) return false;
        previous = point;
    }
    return traversable(previous, terrain, radius) && Math.hypot(previous.x - arrival.x, previous.z - arrival.z) <= contactRange;
}
/**
 * Pontos de nascimento das hordas: o perímetro do mapa recuado `edgeInset`, a cada
 * `edgeStep` metros, em ordem ao redor do mapa. Só entram pontos livres de prédios e
 * com caminho até o desembarque (nenhum robô nasce preso).
 */
export function hordeEdgeSpawns(terrain: Terrain, navigation: Navigation, arrival: Position, radius = COMBAT.robot.radius as number, contactRange = COMBAT.robot.contactRange as number): Position[] {
    const { edgeStep } = COMBAT.hordes, inset = Math.max(COMBAT.hordes.edgeInset, radius + 0.2), b = terrain.bounds;
    const minX = b.minX + inset, maxX = b.maxX - inset, minZ = b.minZ + inset, maxZ = b.maxZ - inset;
    const w = maxX - minX, d = maxZ - minZ, result: Position[] = [];
    for (let s = 0; s < 2 * (w + d); s += edgeStep) {
        const p = s < w ? { x: minX + s, z: minZ }
            : s < w + d ? { x: maxX, z: minZ + s - w }
                : s < 2 * w + d ? { x: maxX - (s - w - d), z: maxZ }
                    : { x: minX, z: maxZ - (s - 2 * w - d) };
        if (!traversable(p, terrain, radius + 0.2)) continue;
        if (validContactSpawn(terrain, navigation, p, arrival, radius, contactRange)) result.push(p);
    }
    return result;
}
export interface ResourceDrop extends Pickup { kind: 'metals' | 'titanium' | 'organic'; spawned: boolean; surfaceIron: number; surfaceCopper: number; surfaceTitanium: number; surfaceOrganic: number }
export interface Pickup extends Position {
    active: boolean;
}
export interface Shot {
    height: number;
    from: Position;
    to: Position;
    life: number;
    hit: boolean;
}
export interface CombatInput {
    weapon?: PlayerWeapon;
    dashing?: boolean;
    player: Position & { y?: number };
    muzzle?: WeaponMuzzleOffset;
    aim: Position;
    /** Rumo suavizado do corpo publicado pelo controller; nunca o ângulo instantâneo do cursor. */
    facingAngle: number;
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
export interface ShotTrace { to: Position; robot: Robot | null; blocked: boolean }
/** Tiro horizontal: filtra a altura antes da pegada X/Z. Movimento e visão seguem 2D. */
export function traceShot(a: Position, b: Position, terrain: Terrain, robots: Robot[], mask = RIFLE_MASK, out: ShotTrace = { to: { x: 0, z: 0 }, robot: null, blocked: false }, height: number = RIFLE_POSE.height) {
    out.blocked = false;
    let t = 1, robot: Robot | null = null;
    if (mask & HIT_LAYER.world)
        for (const obstacle of terrain.obstacles) {
            if (!containsShotHeight(obstacle, height)) continue;
            const hit = segmentBox(a, b, obstacle);
            if (hit !== null && hit <= t) {
                t = hit;
                out.blocked = true;
            }
        }
    if (mask & HIT_LAYER.enemy)
        for (const candidate of robots)
            if (candidate.hp > 0 && containsShotHeight(robotConfig(candidate).hitHeight, height - (terrain.surfaceHeight?.(candidate.x, candidate.z) ?? 0))) {
                const hit = rayCircle(a, b, candidate, robotConfig(candidate).radius);
                if (hit !== null && hit <= t && (!out.blocked || hit < t - 1e-9)) {
                    t = hit;
                    robot = candidate;
                    out.blocked = true;
                }
            }
    out.to.x = a.x + (b.x - a.x) * t;
    out.to.z = a.z + (b.z - a.z) * t;
    out.robot = robot;
    return out;
}
export class CombatSimulation {
    readonly sounds = new SoundQueue();
    readonly effects = new CombatEffects((x,z)=>this.terrain.surfaceHeight?.(x,z)??0);
    hp: number = COMBAT.playerHp;
    ammo: number = COMBAT.rifle.magazine;
    reserve: number = COMBAT.rifle.reserve;
    reloadLeft = 0;
    cooldown = 0;
    meleeCooldown = 0;
    meleeLeft = 0;
    swingId = 0;
    /** Corte atual do combo (0, 1 ou 2). */
    comboStage = 0;
    private comboWindow = 0;
    private meleeHit = false;
    private dryCooldown = 0;
    private wasFiring = false;
    invulnerable = 0;
    damageFlash = 0;
    hitFlash = 0;
    shots: Shot[] = [];
    // Origem/destino, resultado e três traçadores pré-alocados; nenhum objeto por disparo/passo.
    private muzzle: Position = { x: 0, z: 0 };
    private rifleEnd: Position = { x: 0, z: 0 };
    private shotTrace: ShotTrace = { to: { x: 0, z: 0 }, robot: null, blocked: false };
    private shotPool: Shot[] = Array.from({ length: 3 }, () => ({ from: { x: 0, z: 0 }, to: { x: 0, z: 0 }, height: RIFLE_POSE.height, life: 0, hit: false }));
    private shotCursor = 0;
    robots: Robot[];
    navigation: Navigation;
    mutantNavigation: Navigation | null = null;
    mutantEdgeSpawns: Position[] = [];
    largeMutantNavigation: Navigation | null = null;
    largeMutantEdgeSpawns: Position[] = [];
    largeNavigation: Navigation | null = null;
    largeEdgeSpawns: Position[] = [];
    kills = 0;
    iron = 0;
    copper = 0;
    titanium = 0;
    organic = 0;
    drops: ResourceDrop[];
    /** Nome legado mantido para compatibilidade; agora são kits interativos. */
    hearts: Pickup[];
    medkits = 0;
    elapsed = 0;
    /** Tamanho de cada horda; vazio no encontro fixo (patrulhas presentes desde o início). */
    waves: readonly number[] = [];
    /** Hordas já iniciadas (a atual é `waves[wave - 1]`). */
    wave = 0;
    /** Segundos até a próxima horda; 0 durante uma horda. */
    waveLeft = 0;
    readonly total: number;
    edgeSpawns: Position[] = [];
    private dropCursor = 0;
    crates: SupplyCrate[];
    constructor(public terrain: Terrain, encounter: EncounterChoice, private readonly layout: EncounterLayout = encounterLayout(), crates: readonly CratePlacement[] = []) {
        this.crates = crates.map(p => ({ ...p, marker: crateMarker(p), phase: 'closed', elapsed: 0, rewarded: false }));
        this.navigation = new Navigation(terrain, COMBAT.robot.radius, COMBAT.grid);
        this.hearts = layout.hearts.map(p => ({ x: p.x, z: p.z, active: true }));
        if (encounter === HORDE_ENCOUNTER) {
            // Slots reutilizados entre hordas (tamanho da maior); peças têm um slot por robô da rodada.
            this.waves = HORDE_TOTALS;
            this.edgeSpawns = hordeEdgeSpawns(terrain, this.navigation, layout.arrival);
            this.largeNavigation = new Navigation(terrain, LARGE_PATROL.radius, COMBAT.grid);
            this.largeEdgeSpawns = hordeEdgeSpawns(terrain, this.largeNavigation, layout.arrival, LARGE_PATROL.radius, LARGE_PATROL.contactRange);
            this.mutantNavigation = new Navigation(terrain, SMALL_MUTANT.radius, COMBAT.grid);
            this.mutantEdgeSpawns = hordeEdgeSpawns(terrain, this.mutantNavigation, layout.arrival, SMALL_MUTANT.radius, SMALL_MUTANT.contactRange);
            this.largeMutantNavigation = new Navigation(terrain, LARGE_MUTANT.radius, COMBAT.grid);
            this.largeMutantEdgeSpawns = hordeEdgeSpawns(terrain, this.largeMutantNavigation, layout.arrival, LARGE_MUTANT.radius, LARGE_MUTANT.contactRange);
            if (!this.edgeSpawns.length || !this.largeEdgeSpawns.length || !this.mutantEdgeSpawns.length || !this.largeMutantEdgeSpawns.length) throw new Error('Mapa sem ponto livre e alcançável para as hordas.');
            this.robots = Array.from({ length: Math.max(...this.waves) }, (_, id) => createRobot(id, 0, 0, -1, 0, 0, false));
            this.total = this.waves.reduce((a, b) => a + b, 0);
            this.waveLeft = COMBAT.hordes.firstDelay;
        }
        else {
            const patrol = parseEncounter(encounter)!, kind = patrol.kind;
            if (kind === 'patrol') {
                const size = Number.isFinite(patrol.count) ? Math.max(1, Math.min(COMBAT.encounterSize, Math.floor(patrol.count))) : COMBAT.encounterSize;
                const spawns = (size <= 5 ? layout.small : layout.spawns).slice(0, size);
                for (const spawn of spawns)
                    if (!validContactSpawn(terrain, this.navigation, spawn, layout.arrival, COMBAT.robot.radius, COMBAT.robot.contactRange))
                        throw new Error('Spawn de patrulha sem caminho válido até contato no desembarque.');
                this.robots = spawns.map(({ x, z, routeIndex, waypoint }, id) => {
                    const target = layout.routes[routeIndex][waypoint];
                    return createRobot(id, x, z, routeIndex, waypoint, Math.atan2(target.x - x, target.z - z), true);
                });
            }
            else this.robots = this.singleKindPatrol(kind, Math.max(1, Math.min(5, Math.floor(patrol.count))));
            this.total = this.robots.length;
            // Patrulha de um tipo: munição suficiente para o tipo escolhido, pela mesma margem das hordas.
            const need = Math.ceil(this.robots.reduce((hits, r) => hits + Math.ceil(r.hp / COMBAT.rifle.damage), 0) * COMBAT.hordes.ammoMargin);
            if (this.ammo + this.reserve < need) this.reserve = need - this.ammo;
        }
        const extraDrops = this.waves.length ? COMBAT.hordes.largeMutants.reduce<number>((a, b) => a + b, 0) * 2
            : this.robots.filter(r => r.kind === 'largeMutant').length * 2;
        this.drops = Array.from({ length: this.total + extraDrops }, () => ({ x: 0, z: 0, active: false, kind: 'metals', spawned: false, surfaceIron: 0, surfaceCopper: 0, surfaceTitanium: 0, surfaceOrganic: 0 }));
    }
    /** Grade de navegação no raio do tipo; criada só quando o encontro usa esse tipo. */
    private navigationFor(kind: Exclude<RobotKind, 'patrol'>) {
        const R = robotConfig({ kind }), create = () => new Navigation(this.terrain, R.radius, COMBAT.grid);
        if (kind === 'largePatrol') return this.largeNavigation ??= create();
        if (kind === 'smallMutant') return this.mutantNavigation ??= create();
        return this.largeMutantNavigation ??= create();
    }
    /**
     * Patrulha de teste com um só tipo: usa os spawns/rotas da fase que forem válidos no raio do
     * tipo (caminho livre até o contato no desembarque), alternando rotas. Sem pontos suficientes,
     * completa pela borda, como nas hordas; esses marcham até o jogador.
     */
    private singleKindPatrol(kind: Exclude<RobotKind, 'patrol'>, count: number): Robot[] {
        const R = robotConfig({ kind }), layout = this.layout, navigation = this.navigationFor(kind);
        const candidates = [...layout.small, ...layout.spawns].filter((spawn, i, all) =>
            all.findIndex(other => other.x === spawn.x && other.z === spawn.z) === i
            && validContactSpawn(this.terrain, navigation, spawn, layout.arrival, R.radius, R.contactRange));
        const byRoute = new Map<number, typeof candidates>();
        for (const spawn of candidates) byRoute.set(spawn.routeIndex, [...(byRoute.get(spawn.routeIndex) ?? []), spawn]);
        const picked: typeof candidates = [], queues = [...byRoute.values()];
        for (let round = 0; picked.length < count && queues.some(q => q.length > round); round++)
            for (const queue of queues) if (picked.length < count && queue[round]) picked.push(queue[round]);
        const robots = picked.map(({ x, z, routeIndex, waypoint }, id) => {
            const target = layout.routes[routeIndex][waypoint];
            return createRobot(id, x, z, routeIndex, waypoint, Math.atan2(target.x - x, target.z - z), true);
        });
        if (robots.length < count) {
            const edge = hordeEdgeSpawns(this.terrain, navigation, layout.arrival, R.radius, R.contactRange);
            if (!edge.length) throw new Error(`Mapa sem ponto livre e alcançável para a patrulha de ${kind}.`);
            for (let i = robots.length; i < count; i++) {
                const p = edge[Math.floor((i + .5) * edge.length / count) % edge.length];
                robots.push(createRobot(i, p.x, p.z, -1, 0, Math.atan2(layout.arrival.x - p.x, layout.arrival.z - p.z), true));
            }
        }
        let drop = 0;
        robots.forEach((r, slot) => {
            r.kind = kind; r.hp = R.hp; r.pace = R.speed; r.drop = drop; drop += kind === 'largeMutant' ? 3 : 1;
            r.packAngle = kind === 'smallMutant' ? slot * Math.PI * 2 / robots.length : 0;
        });
        return robots;
    }
    get dead() { return this.hp <= 0; }
    get alive() {
        let n = 0;
        for (const r of this.robots) if (r.hp > 0) n++;
        return n;
    }
    get cleared() { return this.wave >= this.waves.length && this.waveLeft === 0 && this.alive === 0; }
    get snapshot() { return { hp: this.hp, medkits: this.medkits, iron: this.iron, copper: this.copper, titanium: this.titanium, organic: this.organic, ammo: this.ammo, reserve: this.reserve, reloading: this.reloadLeft > 0, dead: this.dead, kills: this.kills, total: this.total, cleared: this.cleared, damage: this.damageFlash > 0, hit: this.hitFlash > 0, wave: this.wave, waves: this.waves.length, nextWave: Math.ceil(this.waveLeft), alive: this.alive }; }
    /**
     * Próxima horda: `count` pontos da borda, um por setor igual do perímetro, com o
     * início girando a cada horda (pontos diferentes). Em cada setor, o primeiro ponto
     * a `minPlayerDistance` do jogador; sem nenhum, o mais distante dele.
     */
    private startWave(player: Position) {
        const waveIndex = this.wave++, count = this.waves[waveIndex];
        let requiredHits = 0, mutantSlot = 0;
        for (let i = 0; i < count; i++) {
            const kind = waveRobotKind(waveIndex, i), r = this.robots[i]; r.kind = kind; const R = robotConfig(r);
            const spawns = kind === 'largeMutant' ? this.largeMutantEdgeSpawns : kind === 'smallMutant' ? this.mutantEdgeSpawns : kind === 'largePatrol' ? this.largeEdgeSpawns : this.edgeSpawns;
            const m = spawns.length, sector = m / count, offset = ((this.wave * 0.618034) % 1) * m;
            const from = Math.floor(offset + i * sector), to = Math.max(from + 1, Math.floor(offset + (i + 1) * sector));
            let pick = from % m, best = -1;
            for (let j = from; j < to; j++) {
                const p = spawns[j % m], distance = Math.hypot(p.x - player.x, p.z - player.z);
                if (distance >= COMBAT.hordes.minPlayerDistance) { pick = j % m; break; }
                if (distance > best) { best = distance; pick = j % m; }
            }
            const p = spawns[pick];
            r.packReady = false;
            r.packAngle = kind === 'smallMutant' ? mutantSlot++ * Math.PI * 2 / COMBAT.hordes.smallMutants[waveIndex] + this.wave * 2.399963 : 0;
            r.kind = kind; r.x = p.x; r.z = p.z; r.hp = R.hp;
            requiredHits += Math.ceil(R.hp / COMBAT.rifle.damage); r.spawned = true; r.generation++;
            r.alerted = false; r.alertLeft = 0; r.flash = 0; r.recoil=0; r.staggerLeft=0; r.stuck = 0; r.pace = R.speed;
            r.routeIndex = -1; r.waypoint = 0; r.path.length = 0; r.drop = this.dropCursor; this.dropCursor += kind === 'largeMutant' ? 3 : 1;
            r.chargePhase='ready';r.chargeLeft=0;r.chargeHit=false;resetMovementRecovery(r);r.avoidSide=1;
            // Caminhos em quadros alternados: 40 robôs não calculam rota no mesmo passo.
            r.repath = (i % 10) * COMBAT.fixedStep;
            r.angle = Math.atan2(player.x - p.x, player.z - p.z);
        }
        const need = Math.ceil(requiredHits * COMBAT.hordes.ammoMargin);
        if (this.ammo + this.reserve < need) this.reserve = need - this.ammo;
    }
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
    nearbyMedicalKit(player: Position): Pickup | undefined {
        if (this.dead || !Number.isFinite(player.x + player.z)) return;
        let nearest: Pickup | undefined, distance = Infinity;
        for (const kit of this.hearts) {
            const d = Math.hypot(player.x - kit.x, player.z - kit.z);
            if (kit.active && d <= COMBAT.pickupRadius && d < distance && clearSegment(player, kit, this.terrain, 0)) { nearest = kit; distance = d; }
        }
        return nearest;
    }
    collectMedicalKit(player: Position, paused = false): boolean {
        if (paused) return false;
        const kit = this.nearbyMedicalKit(player);
        if (!kit) return false;
        kit.active = false; this.medkits++;
        this.sounds.emit('collect', kit.x, kit.z);
        return true;
    }
    useMedicalKit(paused = false): boolean {
        if (paused || this.dead || this.medkits <= 0 || this.hp >= COMBAT.playerHp) return false;
        this.hp = Math.min(COMBAT.playerHp, this.hp + MEDICAL_KIT.heal); this.medkits--;
        return true;
    }
    private canCollect(player: Position, pickup: Position) {
        return Math.hypot(player.x - pickup.x, player.z - pickup.z) <= COMBAT.pickupRadius
            && clearSegment(player, pickup, this.terrain, 0);
    }
    private nextPosition: Position = { x: 0, z: 0 };
    private pushPosition: Position = {x:0,z:0};
    private packTarget: Position = { x: 0, z: 0 };
    step(dt: number, input: CombatInput, paused = false) {
        if (paused || this.dead)
            return;
        this.elapsed += dt;
        this.effects.step(dt);
        for (const crate of this.crates) {
            advanceCrate(crate, dt);
            if (!crate.rewarded && crate.elapsed >= SUPPLY_CRATE.rewardAt) {
                crate.rewarded = true;
                this.reserve += SUPPLY_CRATE.ammo;
            }
        }
        this.cooldown = Math.max(0, this.cooldown - dt);
        this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
        this.meleeLeft = Math.max(0, this.meleeLeft - dt);
        this.comboWindow = Math.max(0, this.comboWindow - dt);
        const machete = input.weapon === 'machete';
        if (!machete || input.dashing) this.meleeLeft = this.comboWindow = 0;
        if (machete) this.reloadLeft = 0;
        this.dryCooldown = Math.max(0, this.dryCooldown - dt);
        this.invulnerable = Math.max(0, this.invulnerable - dt);
        this.damageFlash = Math.max(0, this.damageFlash - dt);
        this.hitFlash = Math.max(0, this.hitFlash - dt);
        let visibleShots = 0;
        for (let i = 0; i < this.shots.length; i++) {
            const shot = this.shots[i];
            shot.life -= dt;
            if (shot.life > 0) this.shots[visibleShots++] = shot;
        }
        this.shots.length = visibleShots;
        for (const r of this.robots) {
            r.recoil = Math.max(0,r.recoil-dt);
            r.staggerLeft = Math.max(0,r.staggerLeft-dt);
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
        if (!machete && input.reload && this.reloadLeft === 0 && this.ammo < COMBAT.rifle.magazine && this.reserve > 0) {
            this.reloadLeft = COMBAT.rifle.reload;
            this.sounds.emit('reload', input.player.x, input.player.z);
        }
        const triggerPressed = input.firing && !this.wasFiring;
        this.wasFiring = input.firing;
        if (!machete && input.firing && this.reloadLeft === 0 && this.cooldown === 0 && this.ammo === 0
            && (triggerPressed || this.dryCooldown === 0) && Number.isFinite(input.player.x + input.player.z)) {
            this.sounds.emit('dryFire', input.player.x, input.player.z);
            this.dryCooldown = COMBAT.rifle.dryInterval;
        }
        if (!machete && input.firing && this.reloadLeft === 0 && this.cooldown === 0 && this.ammo > 0
            && Number.isFinite(input.facingAngle) && Number.isFinite(input.player.x + input.player.z + input.aim.x + input.aim.z)) {
            const { muzzle, rifleEnd } = this;
            const pose = input.muzzle?.valid ? input.muzzle : undefined;
            const height = pose ? pose.height + (input.player.y ?? 0) : RIFLE_POSE.height;
            writeRifleMuzzle(muzzle, input.player.x, input.player.z, input.facingAngle, pose);
            writeRifleAimTarget(rifleEnd, input.player, input.aim, input.facingAngle, muzzle);
            const dx = rifleEnd.x - muzzle.x, dz = rifleEnd.z - muzzle.z, length = Math.hypot(dx, dz);
            rifleEnd.x = muzzle.x + dx / length * COMBAT.rifle.range;
            rifleEnd.z = muzzle.z + dz / length * COMBAT.rifle.range;
            // O cano não pode nascer do outro lado de uma parede/quina. Esta checagem só vê mundo.
            let from: Position = input.player;
            let hit = traceShot(input.player, muzzle, this.terrain, this.robots, HIT_LAYER.world, this.shotTrace, height);
            if (!hit.blocked) {
                from = muzzle;
                hit = traceShot(muzzle, rifleEnd, this.terrain, this.robots, RIFLE_MASK, this.shotTrace, height);
            }
            this.effects.fire(muzzle.x,muzzle.z,height);
            if(hit.blocked) this.effects.impact(hit.to.x,hit.to.z,impactKind(hit.robot?.kind),-dx/length,-dz/length,height);
            this.sounds.emit('shot', muzzle.x, muzzle.z);
            this.ammo--;
            this.cooldown = COMBAT.rifle.interval;
            const shot = this.shotPool[this.shotCursor++ % this.shotPool.length];
            shot.from.x = from.x; shot.from.z = from.z;
            shot.to.x = hit.to.x; shot.to.z = hit.to.z;
            shot.height = height;
            shot.life = COMBAT_VFX.tracerLife; shot.hit = !!hit.robot;
            this.shots.push(shot);
            if (hit.robot) {
                this.damageRobot(hit.robot, COMBAT.rifle.damage, dx / length, dz / length);
            }
        }
        if (machete && !input.dashing && input.firing && this.meleeCooldown <= 1e-8 && Number.isFinite(input.facingAngle)) {
            this.comboStage = this.comboWindow > 0 ? (this.comboStage + 1) % MACHETE_COMBO.length : 0;
            this.meleeCooldown = this.meleeLeft = MACHETE_COMBO[this.comboStage].interval;
            this.comboWindow = this.meleeLeft + MACHETE.chainWindow;
            this.meleeHit = false;
            this.swingId++;
        }
        if (machete && this.meleeLeft > 0 && !this.meleeHit && this.meleeLeft <= MACHETE_COMBO[this.comboStage].interval - MACHETE_COMBO[this.comboStage].impact + 1e-8) {
            this.meleeHit = true;
            for (const robot of this.robots) {
                if (robot.hp <= 0 || !meleeCanHit(input.player, input.facingAngle, robot, robotConfig(robot).radius, this.terrain)) continue;
                const dx = robot.x - input.player.x, dz = robot.z - input.player.z, distance = Math.hypot(dx, dz);
                const nx = distance > 1e-8 ? dx / distance : Math.sin(input.facingAngle), nz = distance > 1e-8 ? dz / distance : Math.cos(input.facingAngle);
                this.effects.impact(robot.x - nx * robotConfig(robot).radius * .7, robot.z - nz * robotConfig(robot).radius * .7, impactKind(robot.kind), -nx, -nz, (input.player.y ?? 0) + .85);
                this.damageRobot(robot, MACHETE.damage, nx, nz);
                if (robot.hp > 0) robot.staggerLeft = MACHETE.stagger;
            }
        }
        for (const robot of this.robots) {
            if (robot.hp <= 0)
                continue;
            const R = robotConfig(robot);
            const player = input.player, distance = Math.hypot(robot.x - player.x, robot.z - player.z);
            if (!robot.alerted && canSeePlayer(robot, player, this.terrain))
                alertRobot(robot);
            if (robot.staggerLeft > 0) {
                if (robot.chargePhase === 'windup' || robot.chargePhase === 'dash') finishCharge(robot);
                robot.stuck = 0;resetMovementRecovery(robot);
                turnToward(robot, player.x - robot.x, player.z - robot.z, dt);
                continue;
            }
            if (robot.kind === 'largeMutant' && this.stepCharge(robot, input.player, dt)) {resetMovementRecovery(robot);continue;}
            if(robot.yieldLeft>0){this.moveYield(robot,player,dt);continue;}
            if (robot.alerted && distance <= R.contactRange && clearSegment(robot, player, this.terrain, 0)) {
                if (this.invulnerable === 0) {
                    this.hp = Math.max(0, this.hp - R.damage);
                    this.invulnerable = R.contactInterval;
                    this.damageFlash = 0.24;
                    this.sounds.emit('attack', robot.x, robot.z, robot.kind);
                }
                robot.stuck = 0;resetMovementRecovery(robot);
                turnToward(robot, player.x - robot.x, player.z - robot.z, dt);
                continue;
            }
            this.moveRobot(robot, player, distance, dt);
        }
        if (this.dead) return;
        for (const drop of this.drops) {
            if (drop.active && this.canCollect(input.player, drop) && canCarryDrop(this, drop.kind)) {
                drop.active = false;
                this.sounds.emit('collect', drop.x, drop.z);
                if (drop.kind === 'metals') this.sounds.emit('collect', drop.x, drop.z); // ferro e cobre: um evento por item
                if (drop.kind === 'organic') this.organic++;
                else if (drop.kind === 'titanium') this.titanium++;
                else { this.iron++; this.copper++; }
            }
        }
        // Kit de vida: basta passar por cima, como os recursos; fica guardado para usar com 3.
        this.collectMedicalKit(input.player);
        if (this.waves.length) {
            if (this.waveLeft > 0) {
                this.waveLeft = Math.max(0, this.waveLeft - dt);
                if (this.waveLeft === 0) this.startWave(input.player);
            }
            else if (this.wave < this.waves.length && this.alive === 0) this.waveLeft = COMBAT.hordes.intermission;
        }
    }
    /** Rifle e facão compartilham morte/drop/contadores: um único caminho de dano. */
    private damageRobot(robot: Robot, damage: number, dx: number, dz: number) {
        robot.hp = Math.max(0, robot.hp - damage);
        this.sounds.emit(robot.hp > 0 ? 'bulletHit' : 'death', robot.x, robot.z, robot.kind);
        robot.recoil=COMBAT_VFX.recoil;robot.recoilX=dx;robot.recoilZ=dz;
        robot.flash = 0.15;
        this.hitFlash = 0.15;
        // O primeiro tiro recebido identifica o jogador, mesmo fora do campo de visão.
        if (robot.hp > 0) alertRobot(robot);
        if (robot.hp === 0) {
            this.kills++;
            const drop = this.drops[robot.drop];
            if(robot.kind === 'largeMutant') {
                for(let i=0;i<3;i++) placeResourceDrop(this.drops[robot.drop+i],robot.x+Math.cos(i*Math.PI*2/3)*.75,robot.z+Math.sin(i*Math.PI*2/3)*.75,'organic',this.terrain.surfaceHeight);
            } else placeResourceDrop(drop, robot.x, robot.z, robot.kind === 'smallMutant' ? 'organic' : robot.kind === 'largePatrol' ? 'titanium' : 'metals', this.terrain.surfaceHeight);
        }
    }
    /** Investe na faixa previamente avisada; dano usa a mesma invulnerabilidade global. */
    private stepCharge(r: Robot, player: Position, dt: number) {
        if(r.chargePhase==='cooldown') {
            r.chargeLeft=Math.max(0,r.chargeLeft-dt);if(r.chargeLeft<=1e-6)r.chargePhase='ready';
            return false;
        }
        if(r.chargePhase==='ready') {
            if(!r.alerted||!prepareCharge(r,player,this.terrain,this.nextPosition))return false;
            this.sounds.emit('chargeWarning',r.x,r.z,r.kind);
            r.angle=Math.atan2(r.chargeDirX,r.chargeDirZ);return true;
        }
        if(r.chargePhase==='windup') {
            r.chargeLeft=Math.max(0,r.chargeLeft-dt);if(r.chargeLeft<=1e-6){r.chargePhase='dash';r.chargeLeft=0;}
            return true;
        }
        const step=Math.min(MUTANT_CHARGE.speed*dt,r.chargeDistance-r.chargeTraveled),p=this.nextPosition;
        p.x=r.x+r.chargeDirX*step;p.z=r.z+r.chargeDirZ*step;
        if(!clearSegment(r,p,this.terrain,LARGE_MUTANT.radius)){finishCharge(r);return true;}
        for(const other of this.robots)if(other!==r&&other.hp>0)pushChargeEnemy(r,p,other,this.terrain,this.pushPosition);
        if(!r.chargeHit && rayCircle(r,p,player,LARGE_MUTANT.radius+MUTANT_CHARGE.playerRadius)!==null) {
            r.chargeHit=true;
            if(this.invulnerable===0){this.hp=Math.max(0,this.hp-MUTANT_CHARGE.damage);this.invulnerable=LARGE_MUTANT.contactInterval;this.damageFlash=.24;this.sounds.emit('attack',r.x,r.z,r.kind);}
        }
        r.x=p.x;r.z=p.z;r.chargeTraveled+=step;r.stuck=0;r.path.length=0;r.repath=0;
        if(r.chargeTraveled>=r.chargeDistance-1e-6)finishCharge(r);
        return true;
    }
    /**
     * Um passo de deslocamento. Corrige o enfileiramento: antes, um robô cujo próximo
     * passo encostava em outro simplesmente parava. Dois robôs de frente num canto de
     * patrulhas compartilhado travavam para sempre e todos os de trás formavam fila; na
     * perseguição, todos chegavam pelas mesmas linhas da grade e paravam atrás do primeiro.
     * Agora: separação entre vizinhos, desvio sempre para o mesmo lado relativo (quem vem de
     * frente cruza), direções alternativas quando o passo está ocupado, ida direta ao jogador
     * quando a linha está livre e caminhos da grade suavizados.
     */
    private moveRobot(robot: Robot, player: Position, distance: number, dt: number) {
        const action=updateMovementRecovery(robot,dt);
        if(action===1)robot.repath=0;
        if(action===2)this.requestYield(robot);
        if(action===-1&&robot.passing&&this.alliesClear(robot)){robot.passing=false;robot.recoveryStage=0;}
        if(robot.yieldLeft>0){this.moveYield(robot,player,dt,false);return;}
        const R = robotConfig(robot), navigation = robot.kind === 'largeMutant' ? this.largeMutantNavigation! : robot.kind === 'smallMutant' ? this.mutantNavigation! : robot.kind === 'largePatrol' ? this.largeNavigation! : this.navigation;
        robot.pace += ((robot.alerted ? R.chaseSpeed : R.speed) - robot.pace) * Math.min(1, R.paceRate * dt);
        const hunting = robot.alerted || robot.routeIndex < 0;
        const chaseGoal = robot.kind === 'smallMutant' && writeMutantPackTarget(this.packTarget, robot, player, distance, this.terrain) ? this.packTarget : player;
        let tx: number, tz: number;
        if (hunting && distance <= R.directChase && clearSegment(robot, chaseGoal, this.terrain, R.radius)) {
            tx = chaseGoal.x; tz = chaseGoal.z;
            robot.repath = 0;
        }
        else {
            if (!hunting) {
                const route = this.layout.routes[robot.routeIndex], point = route[robot.waypoint];
                const away = Math.hypot(robot.x - point.x, robot.z - point.z);
                // Canto ocupado por outro robô: segue para o próximo ponto em vez de esperar.
                const following = route[(robot.waypoint + 1) % route.length];
                const canRound = away < R.spacing && clearSegment(robot, following, this.terrain, R.radius);
                if (away < R.waypointReach || canRound || (robot.stuck > R.stuckAdvance && away < 2.5)) {
                    robot.waypoint = (robot.waypoint + 1) % route.length;
                    robot.repath = 0;
                    robot.stuck = 0;
                }
            }
            robot.repath -= dt;
            if (robot.repath <= 0) {
                const goal = hunting ? chaseGoal : this.layout.routes[robot.routeIndex][robot.waypoint];
                robot.path = smoothPath(robot, navigation.path(robot, goal), this.terrain, R.radius);
                robot.repath = R.repath;
            }
            // Pula o nó só ao chegar nele ou quando o seguinte já está à vista (desvios de
            // vizinhos); cortar a quina antes da hora prende o robô na face do prédio.
            while (robot.path.length && (Math.hypot(robot.path[0].x - robot.x, robot.path[0].z - robot.z) < 0.08
                || robot.path.length > 1 && clearSegment(robot, robot.path[1], this.terrain, R.radius)))
                robot.path.shift();
            const target = robot.path[0];
            if (!target){trackMovementGoal(robot,chaseGoal.x,chaseGoal.z);return;}
            tx = target.x; tz = target.z;
        }
        trackMovementGoal(robot,hunting?player.x:tx,hunting?player.z:tz);
        let dx = tx - robot.x, dz = tz - robot.z;
        const d = Math.hypot(dx, dz);
        if (d < 1e-6)
            return;
        dx /= d; dz /= d;
        let sx = 0, sz = 0, neighbors = 0;
        for (const other of this.robots) {
            if (other === robot || other.hp <= 0 || robot.passing || other.passing)
                continue;
            let ox = robot.x - other.x, oz = robot.z - other.z;
            const od = Math.hypot(ox, oz);
            const separation = enemySeparation(robot, other);
            if (od >= separation)
                continue;
            neighbors++;
            if (od < 1e-4) {
                const a = robot.id * 2.399963;
                ox = Math.sin(a); oz = Math.cos(a);
            }
            else {
                ox /= od; oz /= od;
            }
            const weight = (separation - od) / separation;
            sx += ox * weight; sz += oz * weight;
            // Vizinho à frente: desvia para a direita do próprio rumo, quebrando a simetria de frente.
            if (ox * dx + oz * dz < -0.5) {
                sx += dz * weight * robot.avoidSide; sz -= dx * weight * robot.avoidSide;
            }
        }
        let mx = dx + sx * R.separationWeight, mz = dz + sz * R.separationWeight;
        const ml = Math.hypot(mx, mz);
        if (ml < 1e-4) {
            mx = dz; mz = -dx;
        }
        else {
            mx /= ml; mz /= ml;
        }
        const step = Math.min(robot.pace * dt, d), next = this.nextPosition;
        const committing=neighbors>=2&&distance>R.directChase;
        if(!committing)robot.steerLeft=0; // Cruzamento simples e aproximação final precisam reagir sem espera.
        if(robot.steerLeft>0){
            robot.steerLeft=Math.max(0,robot.steerLeft-dt);
            const c=Math.cos(robot.steerTurn),s=Math.sin(robot.steerTurn),nx=mx*c+mz*s,nz=mz*c-mx*s;
            next.x=robot.x+nx*step;next.z=robot.z+nz*step;
            if(!clearSegment(robot,next,this.terrain,R.radius)||!this.clearPlayerStep(robot,next,player))robot.steerLeft=0;
            else if(this.roomAt(robot,next)){robot.x=next.x;robot.z=next.z;robot.stuck=0;turnToward(robot,nx,nz,dt);return;}
            else{
                // Mantém o lado escolhido; se um aliado fecha o passo, abre mais o arco do mesmo lado.
                const side=robot.steerTurn===0?robot.avoidSide:Math.sign(robot.steerTurn);
                for(let j=1;j<=5;j++){
                    const turn=side*Math.min(Math.PI,Math.abs(robot.steerTurn)+j*R.sidestep),c=Math.cos(turn),s=Math.sin(turn),nx=mx*c+mz*s,nz=mz*c-mx*s;
                    next.x=robot.x+nx*step;next.z=robot.z+nz*step;
                    if(clearSegment(robot,next,this.terrain,R.radius)&&this.clearPlayerStep(robot,next,player)&&this.roomAt(robot,next)){
                        robot.x=next.x;robot.z=next.z;robot.stuck=0;robot.steerTurn=turn;turnToward(robot,nx,nz,dt);return;
                    }
                }
                robot.stuck+=dt;return;
            }
        }
        // Começa pelo avanço e desvios laterais; preso por 0,3 s pode recuar até 180°.
        const tries = robot.stuck > 0.3 ? 10 : 5;
        for (let k = 0; k < tries; k++) {
            const turn = k === 0 ? 0 : (k % 2 ? 1 : -1) * robot.avoidSide * Math.ceil(k / 2) * R.sidestep, c = Math.cos(turn), s = Math.sin(turn);
            const nx = mx * c + mz * s, nz = mz * c - mx * s;
            next.x = robot.x + nx * step;
            next.z = robot.z + nz * step;
            if (clearSegment(robot, next, this.terrain, R.radius) && this.clearPlayerStep(robot,next,player) && this.roomAt(robot, next)) {
                robot.x = next.x;
                robot.z = next.z;
                robot.stuck = 0;robot.steerTurn=turn;robot.steerLeft=committing?ENEMY_MOTION.steerHold:0;
                turnToward(robot, nx, nz, dt);
                return;
            }
        }
        robot.stuck += dt; // Bloqueio não faz o corpo alternar rumo do alvo/desvio.
    }
    private clearPlayerStep(r: Robot, next: Position, player: Position) {
        const radius=robotConfig(r).radius+MUTANT_CHARGE.playerRadius;
        if(rayCircle(r,next,player,radius)===null)return true;
        const before=Math.hypot(r.x-player.x,r.z-player.z),after=Math.hypot(next.x-player.x,next.z-player.z);
        return before<radius && after>before+1e-6; // Uma sobreposição preexistente só pode diminuir.
    }
    private alliesClear(r: Robot) {
        for(const other of this.robots)if(other!==r&&other.hp>0&&Math.hypot(other.x-r.x,other.z-r.z)<enemySpacing(r,other))return false;
        return true;
    }
    /** A prioridade pode pedir ao menor que recue mesmo se ele próprio já estiver em contato. */
    private requestYield(r: Robot) {
        let smaller: Robot|undefined,bigger: Robot|undefined;
        for(const other of this.robots){
            if(other===r||other.hp<=0||Math.hypot(other.x-r.x,other.z-r.z)>enemySeparation(r,other)+.5)continue;
            const dx=r.progressX-r.x,dz=r.progressZ-r.z;
            if((other.x-r.x)*dx+(other.z-r.z)*dz<=0)continue;
            if(movementPriority(other.kind)>movementPriority(r.kind))bigger=other;
            if(movementPriority(other.kind)<movementPriority(r.kind)&&(!smaller||movementPriority(other.kind)<movementPriority(smaller.kind)))smaller=other;
        }
        const yielding=bigger?r:smaller;if(!yielding||yielding.yieldLeft>0||yielding.passing)return;
        const dx=yielding.progressX-yielding.x,dz=yielding.progressZ-yielding.z,d=Math.hypot(dx,dz);
        yielding.yieldX=yielding.x-(d>1e-6?dx/d:Math.sin(yielding.angle))*MOVEMENT_RECOVERY.yieldDistance;
        yielding.yieldZ=yielding.z-(d>1e-6?dz/d:Math.cos(yielding.angle))*MOVEMENT_RECOVERY.yieldDistance;
        yielding.steerLeft=0;yielding.yieldLeft=MOVEMENT_RECOVERY.yieldDuration;yielding.recoveryYields++;
    }
    private moveYield(r: Robot, player: Position, dt: number, update=true) {
        r.yieldLeft=Math.max(0,r.yieldLeft-dt);
        // O relógio de progresso não é apagado por recuo, inclusive quando ordenado por outro slot.
        if(update)updateMovementRecovery(r,dt);
        const dx=r.yieldX-r.x,dz=r.yieldZ-r.z,d=Math.hypot(dx,dz),R=robotConfig(r);
        if(d<.08||r.passing){r.yieldLeft=0;r.repath=0;return;}
        const step=Math.min(R.speed*dt,d),next=this.nextPosition;
        for(let i=0;i<5;i++){
            const angle=i===0?0:(i%2?1:-1)*Math.ceil(i/2)*Math.PI/4,c=Math.cos(angle),s=Math.sin(angle);
            next.x=r.x+(dx*c+dz*s)/d*step;next.z=r.z+(dz*c-dx*s)/d*step;
            if(clearSegment(r,next,this.terrain,R.radius)&&this.clearPlayerStep(r,next,player)&&this.roomAt(r,next)){r.x=next.x;r.z=next.z;break;}
        }
        if(r.yieldLeft===0)r.repath=0;
    }
    /** Passo permitido se não aproxima o robô de outro já a menos de `spacing`. */
    private roomAt(robot: Robot, next: Position) {
        for (const other of this.robots) {
            if (other === robot || other.hp <= 0 || robot.passing || other.passing)
                continue;
            const after = Math.hypot(other.x - next.x, other.z - next.z);
            const spacing = enemySpacing(robot, other);
            if (after < spacing && after < Math.hypot(other.x - robot.x, other.z - robot.z) - 1e-6)
                return false;
        }
        return true;
    }
}

/** Gira o rumo do robô com velocidade angular limitada (o cone de visão acompanha). */
function turnToward(robot: Robot, x: number, z: number, dt: number) {
    if (x * x + z * z < 1e-12) return;
    const delta = Math.atan2(Math.sin(Math.atan2(x, z) - robot.angle), Math.cos(Math.atan2(x, z) - robot.angle));
    const max = robotConfig(robot).turnRate * dt;
    robot.angle += Math.max(-max, Math.min(max, delta));
    if (robot.angle > Math.PI) robot.angle -= 2 * Math.PI;
    else if (robot.angle < -Math.PI) robot.angle += 2 * Math.PI;
}

/** Aquisição do jogador: exclamação, visor vermelho e perseguição no passo acelerado. */
function alertRobot(robot: Robot) {
    if (robot.alerted) return;
    robot.alerted = true;
    robot.alertLeft = COMBAT.alertDuration;
    robot.repath = 0;
}

/**
 * Percepção do robô: cone frontal de 120 graus até `visionRange`; dentro de `nearSense`
 * percebe frente e laterais até 135 graus do rumo, com ponto cego traseiro de 90 graus. Paredes
 * bloqueiam os dois casos.
 */
export function canSeePlayer(robot: Robot, player: Position, terrain: Terrain) {
    const dx = player.x - robot.x, dz = player.z - robot.z, distance = Math.hypot(dx, dz);
    const R = robotConfig(robot);
    if (distance > R.visionRange) return false;
    const cos = distance > 0 ? (dx * Math.sin(robot.angle) + dz * Math.cos(robot.angle)) / distance : 1;
    if (cos < (distance <= R.nearSense ? R.nearSenseCos : R.visionCos)) return false;
    return clearSegment(robot, player, terrain, 0);
}
