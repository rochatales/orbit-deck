/** First playable tuning; units are metres, seconds and hit points. */
export const COMBAT = {
    version: 'sprint-2.1', playerHp: 100,
    rifle: { magazine: 24, reserve: 96, damage: 25, interval: 0.18, reload: 1.5, range: 32 },
    robot: { hp: 75, speed: 1.65, radius: 0.42, contactRange: 0.92, damage: 15, contactInterval: 0.8, repath: 0.5 },
    grid: 0.5, fixedStep: 1 / 60,
    spawns: [{ x: 0, z: -3 }, { x: -5, z: -8 }, { x: 5, z: -8 }, { x: -14, z: 1 }, { x: 14, z: 1 }]
} as const;
export const HIT_LAYER = { world: 1, enemy: 2, player: 4 } as const;
export const RIFLE_MASK = HIT_LAYER.world | HIT_LAYER.enemy;
