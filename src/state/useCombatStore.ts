import { create } from 'zustand';
import { COMBAT } from '../combat/config';
import type { CombatSimulation } from '../combat/simulation';
const initial = { hp: COMBAT.playerHp as number, ammo: COMBAT.rifle.magazine as number, reserve: COMBAT.rifle.reserve as number, reloading: false, dead: false, kills: 0, total: 3, cleared: false, damage: false, hit: false };
export type CombatHud = typeof initial;
interface CombatState extends CombatHud {
    run: number;
    encounterSize: number;
    publish: (hud: CombatHud) => void;
    restart: () => void;
    selectEncounter: (count: number) => void;
}
export const useCombatStore = create<CombatState>((set, get) => ({
    ...initial, run: 0, encounterSize: 3,
    publish: hud => { if ((Object.keys(hud) as (keyof CombatHud)[]).some(k => get()[k] !== hud[k]))
        set(hud); },
    restart: () => set(s => ({ ...initial, total: s.encounterSize, run: s.run + 1 })),
    selectEncounter: count => { if ([1, 3, 5].includes(count))
        set({ encounterSize: count }); }
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
