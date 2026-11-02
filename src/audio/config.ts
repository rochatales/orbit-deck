import type { SoundEvent } from './events';
export const AUDIO = {
    storageKey: 'exoden:audio:v1', defaultVolume: .7, near: 4, far: 25, enemyStepDistance: 15, heavyStepDistance: 25,
    stealFade: .03,
    shanghaiAmbience: { volume: .35, fadeIn: .6 },
    marsAmbience: { outsideVolume: .35, insideVolume: .3, crossfade: .8 },
    categories: {
        shot: { voices: 4, volume: .65 }, reload: { voices: 1, volume: .65 },
        impacts: { voices: 6, volume: .7 }, deaths: { voices: 6, volume: .8 },
        attacks: { voices: 3, volume: .75 }, enemySteps: { voices: 4, volume: .45 },
        heavySteps: { voices: 2, volume: .8 },
        playerSteps: { voices: 2, volume: .28 }, collect: { voices: 2, volume: .65 },
        doors: { voices: 2, volume: .65 },
    },
} as const;
export type Category = keyof typeof AUDIO.categories;
interface SoundBinding { name: string; category: Category; rate: number; gain: number }
const binding = (name: string, category: Category, rate = 1, gain = 1): SoundBinding => ({ name: `SFX_${name}`, category, rate, gain });
const SHOT = binding('Rifle_shot', 'shot'), RELOAD = binding('Rifle_Reload', 'reload');
const PLAYER_STEP = binding('Main_character_step', 'playerSteps'), COLLECT = binding('Item_collected', 'collect');
const DOOR_OPEN = binding('Mars_Door_Open', 'doors');
const CHARGE_WARNING = binding('Mutant_big_attack_hit', 'attacks', .65, .25);
const PROFILES = {
    patrol: { step: binding('Patrol_small_step', 'enemySteps'), hit: binding('Patrol_small_bullet_hit', 'impacts'), death: binding('Patrol_small_death_hit', 'deaths'), attack: binding('Patrol_small_attack_hit', 'attacks') },
    largePatrol: { step: binding('Patrol_big_step', 'heavySteps'), hit: binding('Patrol_big_bullet_hit', 'impacts'), death: binding('Patrol_big_death_hit', 'deaths'), attack: binding('Patrol_small_attack_hit', 'attacks', .8) },
    largeMutant: { step: binding('Mutant_big_step', 'heavySteps'), hit: binding('Mutant_big_bullet_hit', 'impacts'), death: binding('Mutant_small_death_hit', 'deaths', .8), attack: binding('Mutant_big_attack_hit', 'attacks') },
    smallMutant: { step: null, hit: binding('Mutant_small_bullet_hit', 'impacts'), death: binding('Mutant_small_death_hit', 'deaths'), attack: binding('Mutant_small_attack_hit', 'attacks') },
};
export function soundFor(e: SoundEvent): SoundBinding | null {
    switch (e.type) {
        case 'doorOpen': return DOOR_OPEN;
        case 'chargeWarning': return e.kind === 'largeMutant' ? CHARGE_WARNING : null;
        case 'shot': return SHOT;
        case 'reload': return RELOAD;
        case 'playerStep': return PLAYER_STEP;
        case 'collect': return COLLECT;
        case 'enemyStep': return PROFILES[e.kind].step;
        case 'bulletHit': return PROFILES[e.kind].hit;
        case 'death': return PROFILES[e.kind].death;
        case 'attack': return PROFILES[e.kind].attack;
    }
}
export function distanceGain(distance: number) {
    return Math.max(0, Math.min(1, (AUDIO.far - distance) / (AUDIO.far - AUDIO.near)));
}
/** Sorteio sem repetir o índice anterior (um único arquivo necessariamente repete). */
export function variationIndex(count: number, previous: number, random = Math.random()) {
    if (count <= 1) return 0;
    const index = Math.min(count - 2, Math.floor(random * (count - 1)));
    return previous < 0 ? Math.min(count - 1, Math.floor(random * count)) : index >= previous ? index + 1 : index;
}
