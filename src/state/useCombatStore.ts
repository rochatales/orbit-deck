import { create } from 'zustand';
import { COMBAT, ENCOUNTER_CHOICES, HORDE_ENCOUNTER, encounterTotal, type EncounterChoice } from '../combat/config';
import type { CombatSimulation } from '../combat/simulation';
const initial = { medkits: 0, hp: COMBAT.playerHp as number, ammo: COMBAT.rifle.magazine as number, reserve: COMBAT.rifle.reserve as number, reloading: false, dead: false, kills: 0, iron: 0, copper: 0, titanium: 0, organic: 0, total: encounterTotal(HORDE_ENCOUNTER), cleared: false, damage: false, hit: false, wave: 0, waves: 0, nextWave: 0, queued: 0, alive: 0, clearTime: 0 };
const hudKeys = Object.keys(initial) as (keyof typeof initial)[];
export type CombatHud = typeof initial;
interface CombatState extends CombatHud {
    nearCrate: boolean;
    setNearCrate: (near: boolean) => void;
    run: number;
    clearPresented: boolean;
    markClearPresented: () => void;
    clearMarker: boolean;
    showClearMarker: () => void;
    /** Encontro da próxima rodada: 1/3/5/32 robôs em patrulha ou as hordas 13-26-32-44 (padrão). */
    encounter: EncounterChoice;
    publish: (hud: CombatHud) => void;
    restart: () => void;
    selectEncounter: (choice: EncounterChoice) => void;
}
export const useCombatStore = create<CombatState>((set, get) => ({
    ...initial, run: 0, clearPresented: false,
    markClearPresented: () => set({ clearPresented: true }), clearMarker: false,
    showClearMarker: () => { if (!get().clearMarker) set({ clearMarker: true }); }, encounter: HORDE_ENCOUNTER, nearCrate: false,
    setNearCrate: near => { if (get().nearCrate !== near) set({ nearCrate: near }); },
    publish: hud => { const previous = get();
        for (let i = 0; i < hudKeys.length; i++) {
            const key = hudKeys[i];
            if (previous[key] !== hud[key]) { set(hud); return; }
        } },
    restart: () => set(s => ({ ...initial, clearPresented: false, clearMarker: false, nearCrate: false, total: encounterTotal(s.encounter), run: s.run + 1 })),
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
