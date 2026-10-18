import { create } from 'zustand';
import { COMBAT, ENCOUNTER_CHOICES, HORDE_ENCOUNTER, encounterTotal, type EncounterChoice } from '../combat/config';
import type { CombatSimulation } from '../combat/simulation';
const initial = { hp: COMBAT.playerHp as number, ammo: COMBAT.rifle.magazine as number, reserve: COMBAT.rifle.reserve as number, reloading: false, dead: false, kills: 0, iron: 0, copper: 0, total: encounterTotal(HORDE_ENCOUNTER), cleared: false, damage: false, hit: false, wave: 0, waves: 0, nextWave: 0, alive: 0 };
export type CombatHud = typeof initial;
interface CombatState extends CombatHud {
    run: number;
    /** Encontro da próxima rodada: 1/3/5/32 robôs em patrulha ou as hordas 10-20-30-40 (padrão). */
    encounter: EncounterChoice;
    publish: (hud: CombatHud) => void;
    restart: () => void;
    selectEncounter: (choice: EncounterChoice) => void;
}
export const useCombatStore = create<CombatState>((set, get) => ({
    ...initial, run: 0, encounter: HORDE_ENCOUNTER,
    publish: hud => { if ((Object.keys(hud) as (keyof CombatHud)[]).some(k => get()[k] !== hud[k]))
        set(hud); },
    restart: () => set(s => ({ ...initial, total: encounterTotal(s.encounter), run: s.run + 1 })),
    selectEncounter: choice => { if (ENCOUNTER_CHOICES.includes(choice))
        set({ encounter: choice }); }
}));
/** Mutable simulation data never drives a React render per robot/frame. */
export const combatRuntime: {
    aim: {
        x: number;
        z: number;
    };
    aimValid: boolean;
    simulation: CombatSimulation | null;
} = {
    aim: { x: 0, z: -1 }, aimValid: false, simulation: null
};
