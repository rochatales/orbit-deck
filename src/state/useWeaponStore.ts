import { campaignSwordAllowed } from '../game/campaignPolicy';
import { useCampaignStore } from './useCampaignStore';
import { create } from 'zustand';
import type { PlayerWeapon } from '../combat/melee';
/** Arma principal da sessão, mantida entre mapas/tentativas; golpe/tempo/dano seguem na simulação. */
export const useWeaponStore = create<{ weapon: PlayerWeapon; equip: (weapon: PlayerWeapon) => void }>((set, get) => ({
  weapon: 'rifle', equip: weapon => { if (weapon === 'machete' && !campaignSwordAllowed()) return; if (weapon !== get().weapon) set({ weapon }); }
}));

let developmentWeapon: PlayerWeapon = 'rifle';
useCampaignStore.subscribe((state, previous) => {
  if (state.inGame && state.mode === 'campaign' && (!previous.inGame || previous.mode !== 'campaign')) {
    developmentWeapon = useWeaponStore.getState().weapon;
    if (!campaignSwordAllowed()) useWeaponStore.setState({ weapon: 'rifle' });
  }
  if (previous.inGame && previous.mode === 'campaign' && !state.inGame)
    useWeaponStore.setState({ weapon: developmentWeapon });
});
