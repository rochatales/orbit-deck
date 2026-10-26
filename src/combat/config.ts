import phase01 from '../assets/shanghai-fase01/layout.json';
import { isShanghaiPhase01 } from '../game/shanghai/previewMode';
/** First playable tuning; units are metres, seconds and hit points. */
export const COMBAT = {
    version: 's2.4-hordas-1', encounterSize: 32, playerHp: 100,
    rifle: { magazine: 24, reserve: 96, damage: 25, interval: 0.18, reload: 1.5, range: 32 },
    robot: {
        hitHeight: { minY: 0, maxY: 2.31 },
        hp: 75, speed: 1.65, radius: 0.67, contactRange: 1.07, damage: 15, contactInterval: 0.8, repath: 0.5, visionRange: 10, visionCos: Math.cos(Math.PI / 3),
        /** Muito perto percebe frente e laterais; costas cegas, sem parede no meio. */
        nearSense: 3,
        nearSenseCos: Math.cos(3 * Math.PI / 4),
        // Ao avistar o jogador o passo acelera ~25% (cadência do PatrolWalk acompanha), sem tranco.
        chaseSpeed: 2.05, paceRate: 3,
        // Desvio local: distância mínima entre robôs, raio de separação e preferência de lado
        // (todos desviam para o mesmo lado relativo, então dois robôs de frente se cruzam).
        spacing: 1.34, separation: 1.60, separationWeight: 1.1, sidestep: Math.PI / 5, turnRate: 9,
        /** Até esta distância e com caminho livre o robô vai direto ao jogador, em vez da grade. */
        directChase: 9,
        waypointReach: 0.5, stuckAdvance: 1.2,
    },
    pickupRadius: 1.1, heartHeal: 50, alertDuration: 1.5,
    hearts: [{ x: -5, z: 7 }, { x: 5, z: -5 }],
    grid: 0.5, fixedStep: 1 / 60,
    spawns: [{ x: 0, z: -3 }, { x: -5, z: -8 }, { x: 5, z: -8 }, { x: -14, z: 1 }, { x: 14, z: 1 }],
    /**
     * Combate em hordas (pedido do autor, 18/10/2026): 10 → 20 → 30 → 40 robôs nascendo em pontos
     * diferentes do limite do mapa. Cada horda começa só depois da anterior zerada. Os robôs marcham
     * até a posição do jogador em ritmo de patrulha e aceleram ao avistá-lo.
     */
    hordes: {
        waves: [10, 20, 30, 40], largePatrols: [0, 0, 5, 10], smallMutants: [3, 6, 0, 0], largeMutants: [0, 0, 2, 4], firstDelay: 4, intermission: 6,
        edgeInset: 1.5, edgeStep: 1.5, minPlayerDistance: 14,
        /** No início de cada horda, munição total ≥ acertos necessários × margem. */
        ammoMargin: 1.5,
    },
} as const;
/** Valor do seletor de encontro para o combate em hordas. */
export const HORDE_ENCOUNTER = 'hordas' as const;
/**
 * Patrulha de teste com um só tipo de inimigo (pedido do autor, 26/10/2026). O Patrol comum
 * continua como número (1/3/5/32), preservando as escolhas já existentes; os demais tipos
 * usam `tipo:quantidade`, só com 1, 3 ou 5.
 */
export type PatrolChoice = `${Exclude<RobotKind, 'patrol'>}:${number}`;
export type EncounterChoice = number | typeof HORDE_ENCOUNTER | PatrolChoice;
export const PATROL_KINDS: readonly RobotKind[] = ['patrol', 'largePatrol', 'smallMutant', 'largeMutant'];
export const PATROL_COUNTS = [1, 3, 5] as const;
export function patrolChoice(kind: RobotKind, count: number): EncounterChoice {
    return kind === 'patrol' ? count : `${kind}:${count}`;
}
/** Hordas devolvem null; patrulhas devolvem o tipo e a quantidade. */
export function parseEncounter(choice: EncounterChoice): { kind: RobotKind; count: number } | null {
    if (choice === HORDE_ENCOUNTER) return null;
    if (typeof choice === 'number') return { kind: 'patrol', count: choice };
    const [kind, count] = choice.split(':');
    return { kind: kind as RobotKind, count: Number(count) };
}
export const ENCOUNTER_CHOICES: readonly EncounterChoice[] = [
    ...PATROL_COUNTS, COMBAT.encounterSize, HORDE_ENCOUNTER,
    ...PATROL_KINDS.filter(kind => kind !== 'patrol').flatMap(kind => PATROL_COUNTS.map(count => patrolChoice(kind, count))),
];
export function encounterTotal(choice: EncounterChoice) {
    return choice === HORDE_ENCOUNTER ? HORDE_TOTALS.reduce((a, b) => a + b, 0) : parseEncounter(choice)!.count;
}
export const HIT_LAYER = { world: 1, enemy: 2, player: 4 } as const;
export const RIFLE_MASK = HIT_LAYER.world | HIT_LAYER.enemy;

/** Circuitos em sentido fixo, fora dos prédios e da área de desembarque. */
export const PATROL_ROUTES = [
    [{ x: -15, z: -15 }, { x: -5, z: -15 }, { x: -5, z: 6 }, { x: -15, z: 6 }],
    [{ x: 5, z: -15 }, { x: 15, z: -15 }, { x: 15, z: 6 }, { x: 5, z: 6 }],
    [{ x: -3, z: -12 }, { x: 3, z: -12 }, { x: 3, z: 3 }, { x: -3, z: 3 }]
];
export const HORDE_SPAWNS = PATROL_ROUTES.flatMap((route, routeIndex) => {
    const count = routeIndex === 2 ? 8 : 12;
    const lengths = route.map((p, i) => Math.hypot(route[(i + 1) % route.length].x - p.x, route[(i + 1) % route.length].z - p.z));
    const perimeter = lengths.reduce((a, b) => a + b, 0);
    return Array.from({ length: count }, (_, i) => {
        let distance = i * perimeter / count, edge = 0;
        while (distance >= lengths[edge] && edge < route.length - 1) distance -= lengths[edge++];
        const a = route[edge], b = route[(edge + 1) % route.length], t = distance / lengths[edge];
        return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, routeIndex, waypoint: (edge + 1) % route.length };
    });
});

export interface EncounterSpawn { x: number; z: number; routeIndex: number; waypoint: number }
/** Onde a horda nasce, patrulha e onde ficam os corações, por mapa de Shanghai. */
export interface EncounterLayout {
    routes: readonly (readonly { x: number; z: number }[])[];
    spawns: readonly EncounterSpawn[];
    /** Encontros pequenos (1–5 robôs) do seletor de teste. */
    small: readonly EncounterSpawn[];
    hearts: readonly { x: number; z: number }[];
    /** Ponto de desembarque: spawns de horda precisam ter caminho até ele. */
    arrival: { x: number; z: number };
}
const CURRENT_LAYOUT: EncounterLayout = {
    routes: PATROL_ROUTES, spawns: HORDE_SPAWNS, hearts: COMBAT.hearts,
    small: COMBAT.spawns.map((p, id) => ({ ...p, routeIndex: id < 3 ? 2 : id - 3, waypoint: 0 })),
    arrival: { x: 0, z: 9.5 },
};
const exit = phase01.exit;
/**
 * Fase 01 (S6.3): 32 spawns e 4 patrulhas exportados com o mapa. Encontros
 * pequenos usam os spawns mais próximos da chegada; corações nos cruzamentos
 * das rotas a oeste e a leste do desembarque (fora da reserva de pouso).
 */
const PHASE01_LAYOUT: EncounterLayout = {
    routes: phase01.patrolRoutes, spawns: phase01.spawns, hearts: [{ x: -17.5, z: 9.5 }, { x: 17.5, z: 9.5 }],
    small: [...phase01.spawns].sort((a, b) => Math.hypot(a.x - exit.x, a.z - exit.z) - Math.hypot(b.x - exit.x, b.z - exit.z)),
    arrival: { x: exit.x, z: exit.z },
};
export function encounterLayout(phase = isShanghaiPhase01()): EncounterLayout {
    return phase ? PHASE01_LAYOUT : CURRENT_LAYOUT;
}

/** S2.12 B: arma provisória. Alturas sobre o chão; offsets no corpo, frente +Z. */
export const RIFLE_POSE = {
    height: 0.85, reticleLift: 0.01,
    side: 0.34, gripForward: 0.42, barrelForward: 0.42, barrelLength: 0.22,
    nearAim: 0.9,
} as const;
/** Ponta do cano a partir da mesma pose suavizada que gira o corpo. Sem alocação. */
export function writeRifleMuzzle(out: { x: number; z: number }, x: number, z: number, angle: number) {
    const forward = RIFLE_POSE.gripForward + RIFLE_POSE.barrelForward + RIFLE_POSE.barrelLength / 2;
    const sin = Math.sin(angle), cos = Math.cos(angle);
    out.x = x + RIFLE_POSE.side * cos + forward * sin;
    out.z = z - RIFLE_POSE.side * sin + forward * cos;
}

/** S6.1: Patrol grande, apenas nas duas últimas hordas. Tuning inicial do pedido. */
export const LARGE_PATROL = {
    hitHeight: { minY: 0, maxY: 3.28 }, hp: 150, speed: 1.25, chaseSpeed: 1.55,
    radius: 1.65, spacing: 3.3, separation: 3.6, separationWeight: 0.5,
    contactRange: 2.5, damage: 25, contactInterval: 1.2, repath: .5,
    visionRange: 10, visionCos: Math.cos(Math.PI / 3), nearSense: 3,
    nearSenseCos: Math.cos(3 * Math.PI / 4), paceRate: 3,
    sidestep: Math.PI / 5, turnRate: 9, directChase: 9, waypointReach: .5, stuckAdvance: 1.2,
} as const;
/** Animal pequeno: valores próprios, sem herdar tuning do Patrol. Raio é aproximação circular. */
export const SMALL_MUTANT = {
    hitHeight: { minY: 0, maxY: 1.20 },
    hp: 50, speed: 2.2, chaseSpeed: 4.6, radius: .5, contactRange: .5 + .32 + .08,
    damage: 8, contactInterval: .8, repath: .35, visionRange: 10, visionCos: Math.cos(Math.PI / 3),
    nearSense: 3, nearSenseCos: Math.cos(3 * Math.PI / 4), paceRate: 4,
    spacing: .65, separation: 1.1, separationWeight: 1.1, sidestep: Math.PI / 5, turnRate: 9,
    directChase: 9, waypointReach: .5, stuckAdvance: 1.2,
} as const;
export const MUTANT_PACK = { distance: 6, resetDistance: 8, radius: 1.6, reach: .35, arcStep: .55, approach: .78 } as const;
/** Corpo sem patas: meia-largura viva 1,558902 m na escala 2,5 + 0,10 m, arredondado para cima. */
export const LARGE_MUTANT = {
    hitHeight: { minY: 0, maxY: 2.92 }, hp: 280, speed: 1.4, chaseSpeed: 2.2,
    radius: 1.66, spacing: 3.32, separation: 3.62, separationWeight: 1.1,
    contactRange: 2.06, damage: 15, contactInterval: 1.2, repath: .5,
    visionRange: 10, visionCos: Math.cos(Math.PI / 3), nearSense: 3,
    nearSenseCos: Math.cos(3 * Math.PI / 4), paceRate: 3,
    sidestep: Math.PI / 5, turnRate: 9, directChase: 9, waypointReach: .5, stuckAdvance: 1.2,
} as const;
export const MUTANT_CHARGE = { min: 4, max: 9, windup: .8, speed: 9, distance: 10, warningHalfWidth: 2.58, pushMargin: .08, cooldown: 3, damage: 30, playerRadius: .32, anticipationClip: .24 } as const;
export type RobotKind = 'patrol' | 'largePatrol' | 'smallMutant' | 'largeMutant';
/** `waves` conserva os números de robôs; estes totais incluem os animais adicionais. */
export const HORDE_TOTALS = COMBAT.hordes.waves.map((robots, i) => robots + COMBAT.hordes.smallMutants[i] + COMBAT.hordes.largeMutants[i]);
export function robotConfig(robot: { kind?: RobotKind }) {
    return robot.kind === 'largeMutant' ? LARGE_MUTANT : robot.kind === 'smallMutant' ? SMALL_MUTANT : robot.kind === 'largePatrol' ? LARGE_PATROL : COMBAT.robot;
}

/** Distribuição uniforme dos grandes ao redor do perímetro, preservando o total da horda. */
export function waveRobotKind(waveIndex: number, slot: number): RobotKind {
    const count = HORDE_TOTALS[waveIndex], big = COMBAT.hordes.largeMutants[waveIndex];
    const beforeBig = Math.floor(slot * big / count);
    if (Math.floor((slot + 1) * big / count) > beforeBig) return 'largeMutant';
    const remaining = count - big, index = slot - beforeBig, mutants = COMBAT.hordes.smallMutants[waveIndex];
    const before = Math.floor(index * mutants / remaining);
    if (Math.floor((index + 1) * mutants / remaining) > before) return 'smallMutant';
    const robotSlot = index - before, robots = COMBAT.hordes.waves[waveIndex], large = COMBAT.hordes.largePatrols[waveIndex];
    return Math.floor((robotSlot + 1) * large / robots) > Math.floor(robotSlot * large / robots) ? 'largePatrol' : 'patrol';
}
