import { create } from 'zustand';
import type { PlayerWeapon } from '../combat/melee';
/** Só seleção relevante da UI; golpe/tempo/dano continuam na simulação. */
export const useWeaponStore = create<{ weapon: PlayerWeapon; equip: (weapon: PlayerWeapon) => void }>((set, get) => ({
  weapon: 'rifle', equip: weapon => { if (weapon !== get().weapon) set({ weapon }); }
}));
