import { COMBAT, HIT_LAYER, HORDE_ENCOUNTER, RIFLE_MASK, encounterLayout, type EncounterChoice, type EncounterLayout } from './config';
import { Navigation, clearSegment, segmentBox, smoothPath, traversable, type Position, type Terrain } from './navigation';
export interface Robot extends Position {
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
    return { x, z, routeIndex, waypoint, id, hp: spawned ? COMBAT.robot.hp : 0, angle, path: [], repath: 0, flash: 0, alerted: false, alertLeft: 0, spawned, generation: spawned ? 1 : 0, pace: COMBAT.robot.speed, drop: id, stuck: 0 };
}
/**
 * Pontos de nascimento das hordas: o perímetro do mapa recuado `edgeInset`, a cada
 * `edgeStep` metros, em ordem ao redor do mapa. Só entram pontos livres de prédios e
 * com caminho até o desembarque (nenhum robô nasce preso).
 */
export function hordeEdgeSpawns(terrain: Terrain, navigation: Navigation, arrival: Position): Position[] {
    const { edgeInset: inset, edgeStep } = COMBAT.hordes, b = terrain.bounds;
    const minX = b.minX + inset, maxX = b.maxX - inset, minZ = b.minZ + inset, maxZ = b.maxZ - inset;
    const w = maxX - minX, d = maxZ - minZ, result: Position[] = [];
    for (let s = 0; s < 2 * (w + d); s += edgeStep) {
        const p = s < w ? { x: minX + s, z: minZ }
            : s < w + d ? { x: maxX, z: minZ + s - w }
                : s < 2 * w + d ? { x: maxX - (s - w - d), z: maxZ }
                    : { x: minX, z: maxZ - (s - 2 * w - d) };
        if (traversable(p, terrain, COMBAT.robot.radius + 0.2) && navigation.path(p, arrival).length) result.push(p);
    }
    return result;
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
    /** Tamanho de cada horda; vazio no encontro fixo (patrulhas presentes desde o início). */
    waves: readonly number[] = [];
    /** Hordas já iniciadas (a atual é `waves[wave - 1]`). */
    wave = 0;
    /** Segundos até a próxima horda; 0 durante uma horda. */
    waveLeft = 0;
    readonly total: number;
    edgeSpawns: Position[] = [];
    private dropCursor = 0;
    constructor(public terrain: Terrain, encounter: EncounterChoice, private readonly layout: EncounterLayout = encounterLayout()) {
        this.navigation = new Navigation(terrain, COMBAT.robot.radius, COMBAT.grid);
        this.hearts = layout.hearts.map(p => ({ x: p.x, z: p.z, active: true }));
        if (encounter === HORDE_ENCOUNTER) {
            // Slots reutilizados entre hordas (tamanho da maior); peças têm um slot por robô da rodada.
            this.waves = COMBAT.hordes.waves;
            this.edgeSpawns = hordeEdgeSpawns(terrain, this.navigation, layout.arrival);
            this.robots = Array.from({ length: Math.max(...this.waves) }, (_, id) => createRobot(id, 0, 0, -1, 0, 0, false));
            this.total = this.waves.reduce((a, b) => a + b, 0);
            this.waveLeft = COMBAT.hordes.firstDelay;
        }
        else {
            const size = Number.isFinite(encounter) ? Math.max(1, Math.min(COMBAT.encounterSize, Math.floor(encounter))) : COMBAT.encounterSize;
            const spawns = (size <= 5 ? layout.small : layout.spawns).slice(0, size);
            this.robots = spawns.map(({ x, z, routeIndex, waypoint }, id) => {
                const target = layout.routes[routeIndex][waypoint];
                return createRobot(id, x, z, routeIndex, waypoint, Math.atan2(target.x - x, target.z - z), true);
            });
            this.total = this.robots.length;
        }
        this.drops = Array.from({ length: this.total }, () => ({ x: 0, z: 0, active: false }));
    }
    get dead() { return this.hp <= 0; }
    get alive() {
        let n = 0;
        for (const r of this.robots) if (r.hp > 0) n++;
        return n;
    }
    get cleared() { return this.wave >= this.waves.length && this.waveLeft === 0 && this.alive === 0; }
    get snapshot() { return { hp: this.hp, iron: this.iron, copper: this.copper, ammo: this.ammo, reserve: this.reserve, reloading: this.reloadLeft > 0, dead: this.dead, kills: this.kills, total: this.total, cleared: this.cleared, damage: this.damageFlash > 0, hit: this.hitFlash > 0, wave: this.wave, waves: this.waves.length, nextWave: Math.ceil(this.waveLeft), alive: this.alive }; }
    /**
     * Próxima horda: `count` pontos da borda, um por setor igual do perímetro, com o
     * início girando a cada horda (pontos diferentes). Em cada setor, o primeiro ponto
     * a `minPlayerDistance` do jogador; sem nenhum, o mais distante dele.
     */
    private startWave(player: Position) {
        const count = this.waves[this.wave++], spawns = this.edgeSpawns, m = spawns.length, sector = m / count;
        // Início girado pela razão áurea do perímetro inteiro: setores de hordas seguidas não se alinham.
        const offset = (this.wave * 0.618034 % 1) * m;
        for (let i = 0; i < count; i++) {
            const from = Math.floor(offset + i * sector), to = Math.max(from + 1, Math.floor(offset + (i + 1) * sector));
            let pick = from % m, best = -1;
            for (let j = from; j < to; j++) {
                const p = spawns[j % m], distance = Math.hypot(p.x - player.x, p.z - player.z);
                if (distance >= COMBAT.hordes.minPlayerDistance) { pick = j % m; break; }
                if (distance > best) { best = distance; pick = j % m; }
            }
            const r = this.robots[i], p = spawns[pick];
            r.x = p.x; r.z = p.z; r.hp = COMBAT.robot.hp; r.spawned = true; r.generation++;
            r.alerted = false; r.alertLeft = 0; r.flash = 0; r.stuck = 0; r.pace = COMBAT.robot.speed;
            r.routeIndex = -1; r.waypoint = 0; r.path = []; r.drop = this.dropCursor++;
            // Caminhos em quadros alternados: 40 robôs não calculam rota no mesmo passo.
            r.repath = (i % 10) * COMBAT.fixedStep;
            r.angle = Math.atan2(player.x - p.x, player.z - p.z);
        }
        for (const heart of this.hearts) heart.active = true;
        const need = Math.ceil(count * Math.ceil(COMBAT.robot.hp / COMBAT.rifle.damage) * COMBAT.hordes.ammoMargin);
        if (this.ammo + this.reserve < need) this.reserve = need - this.ammo;
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
                    // O primeiro tiro recebido identifica o jogador, mesmo fora do campo de visão.
                    if (hit.robot.hp > 0) alertRobot(hit.robot);
                    if (hit.robot.hp === 0) {
                        this.kills++;
                        const drop = this.drops[hit.robot.drop];
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
            const player = input.player, distance = Math.hypot(robot.x - player.x, robot.z - player.z);
            if (!robot.alerted && canSeePlayer(robot, player, this.terrain))
                alertRobot(robot);
            if (robot.alerted && distance <= COMBAT.robot.contactRange && clearSegment(robot, player, this.terrain, 0)) {
                if (this.invulnerable === 0) {
                    this.hp = Math.max(0, this.hp - COMBAT.robot.damage);
                    this.invulnerable = COMBAT.robot.contactInterval;
                    this.damageFlash = 0.24;
                }
                robot.stuck = 0;
                turnToward(robot, player.x - robot.x, player.z - robot.z, dt);
                continue;
            }
            this.moveRobot(robot, player, distance, dt);
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
        if (this.waves.length) {
            if (this.waveLeft > 0) {
                this.waveLeft = Math.max(0, this.waveLeft - dt);
                if (this.waveLeft === 0) this.startWave(input.player);
            }
            else if (this.wave < this.waves.length && this.alive === 0) this.waveLeft = COMBAT.hordes.intermission;
        }
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
        const R = COMBAT.robot;
        robot.pace += ((robot.alerted ? R.chaseSpeed : R.speed) - robot.pace) * Math.min(1, R.paceRate * dt);
        const hunting = robot.alerted || robot.routeIndex < 0;
        let tx: number, tz: number;
        if (hunting && distance <= R.directChase && clearSegment(robot, player, this.terrain, R.radius)) {
            tx = player.x; tz = player.z;
            robot.repath = 0;
        }
        else {
            if (!hunting) {
                const route = this.layout.routes[robot.routeIndex], point = route[robot.waypoint];
                const away = Math.hypot(robot.x - point.x, robot.z - point.z);
                // Canto ocupado por outro robô: segue para o próximo ponto em vez de esperar.
                if (away < R.waypointReach || (robot.stuck > R.stuckAdvance && away < 2.5)) {
                    robot.waypoint = (robot.waypoint + 1) % route.length;
                    robot.repath = 0;
                    robot.stuck = 0;
                }
            }
            robot.repath -= dt;
            if (robot.repath <= 0) {
                const goal = hunting ? player : this.layout.routes[robot.routeIndex][robot.waypoint];
                robot.path = smoothPath(robot, this.navigation.path(robot, goal), this.terrain, R.radius);
                robot.repath = R.repath;
            }
            // Pula o nó só ao chegar nele ou quando o seguinte já está à vista (desvios de
            // vizinhos); cortar a quina antes da hora prende o robô na face do prédio.
            while (robot.path.length && (Math.hypot(robot.path[0].x - robot.x, robot.path[0].z - robot.z) < 0.08
                || robot.path.length > 1 && clearSegment(robot, robot.path[1], this.terrain, R.radius)))
                robot.path.shift();
            const target = robot.path[0];
            if (!target)
                return;
            tx = target.x; tz = target.z;
        }
        let dx = tx - robot.x, dz = tz - robot.z;
        const d = Math.hypot(dx, dz);
        if (d < 1e-6)
            return;
        dx /= d; dz /= d;
        let sx = 0, sz = 0;
        for (const other of this.robots) {
            if (other === robot || other.hp <= 0)
                continue;
            let ox = robot.x - other.x, oz = robot.z - other.z;
            const od = Math.hypot(ox, oz);
            if (od >= R.separation)
                continue;
            if (od < 1e-4) {
                const a = robot.id * 2.399963;
                ox = Math.sin(a); oz = Math.cos(a);
            }
            else {
                ox /= od; oz /= od;
            }
            const weight = (R.separation - od) / R.separation;
            sx += ox * weight; sz += oz * weight;
            // Vizinho à frente: desvia para a direita do próprio rumo, quebrando a simetria de frente.
            if (ox * dx + oz * dz < -0.5) {
                sx += dz * weight; sz -= dx * weight;
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
        // 0°, depois ±36° e ±72° começando pela direita; ±108° só depois de um tempo preso.
        const tries = robot.stuck > 0.3 ? 7 : 5;
        for (let k = 0; k < tries; k++) {
            const turn = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * R.sidestep, c = Math.cos(turn), s = Math.sin(turn);
            const nx = mx * c + mz * s, nz = mz * c - mx * s;
            next.x = robot.x + nx * step;
            next.z = robot.z + nz * step;
            if (clearSegment(robot, next, this.terrain, R.radius) && this.roomAt(robot, next)) {
                robot.x = next.x;
                robot.z = next.z;
                robot.stuck = 0;
                turnToward(robot, nx, nz, dt);
                return;
            }
        }
        robot.stuck += dt;
        turnToward(robot, dx, dz, dt);
    }
    /** Passo permitido se não aproxima o robô de outro já a menos de `spacing`. */
    private roomAt(robot: Robot, next: Position) {
        for (const other of this.robots) {
            if (other === robot || other.hp <= 0)
                continue;
            const after = Math.hypot(other.x - next.x, other.z - next.z);
            if (after < COMBAT.robot.spacing && after < Math.hypot(other.x - robot.x, other.z - robot.z) - 1e-6)
                return false;
        }
        return true;
    }
}

/** Gira o rumo do robô com velocidade angular limitada (o cone de visão acompanha). */
function turnToward(robot: Robot, x: number, z: number, dt: number) {
    if (x * x + z * z < 1e-12) return;
    const delta = Math.atan2(Math.sin(Math.atan2(x, z) - robot.angle), Math.cos(Math.atan2(x, z) - robot.angle));
    const max = COMBAT.robot.turnRate * dt;
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
 * percebe em qualquer direção (quem passa rente pela lateral ou pelas costas). Paredes
 * bloqueiam os dois casos.
 */
export function canSeePlayer(robot: Robot, player: Position, terrain: Terrain) {
    const dx = player.x - robot.x, dz = player.z - robot.z, distance = Math.hypot(dx, dz);
    if (distance > COMBAT.robot.visionRange) return false;
    if (distance > COMBAT.robot.nearSense && (dx * Math.sin(robot.angle) + dz * Math.cos(robot.angle)) / distance < COMBAT.robot.visionCos) return false;
    return clearSegment(robot, player, terrain, 0);
}
