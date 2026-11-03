import { create } from 'zustand';
import type { PlayerWeapon } from '../combat/melee';
/** Arma principal da sessão, mantida entre mapas/tentativas; golpe/tempo/dano seguem na simulação. */
export const useWeaponStore = create<{ weapon: PlayerWeapon; equip: (weapon: PlayerWeapon) => void }>((set, get) => ({
  weapon: 'rifle', equip: weapon => { if (weapon !== get().weapon) set({ weapon }); }
}));
