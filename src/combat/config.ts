/** First playable tuning; units are metres, seconds and hit points. */
export const COMBAT = {
    version: 's2.4-patrulha-1', encounterSize: 32, playerHp: 100,
    rifle: { magazine: 24, reserve: 96, damage: 25, interval: 0.18, reload: 1.5, range: 32 },
    robot: { hp: 75, speed: 1.65, radius: 0.42, contactRange: 0.92, damage: 15, contactInterval: 0.8, repath: 0.5, visionRange: 10, visionCos: Math.cos(Math.PI / 3) },
    grid: 0.5, fixedStep: 1 / 60,
    spawns: [{ x: 0, z: -3 }, { x: -5, z: -8 }, { x: 5, z: -8 }, { x: -14, z: 1 }, { x: 14, z: 1 }]
} as const;
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
