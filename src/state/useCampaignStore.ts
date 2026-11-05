import { create } from 'zustand';
import { depositExpedition, transitionCampaign, type CampaignEvent, type ExpeditionDelivery } from '../game/campaign';
import { createCampaignSave, loadCampaignSave, parseCampaignSave, saveCampaignSave, type CampaignSave } from '../game/campaignSave';
import type { Profile } from '../game/session';
import { EMPTY_CARGO, type ResourceCargo } from '../game/backpackConfig';

export type PlayMode = 'development' | 'campaign';
interface CampaignStore {
    mode: PlayMode;
    inGame: boolean;
    saved: CampaignSave | null;
    saveError: string | null;
    startCampaign: (profile: Profile, replace?: boolean) => boolean;
    resumeCampaign: () => boolean;
    enterDevelopment: () => boolean;
    leave: () => void;
    dispatch: (event: CampaignEvent) => void;
    depositExpedition: (delivery: ExpeditionDelivery) => void;
    setCargo: (cargo: ResourceCargo) => void;
    discardAttempt: () => void;
    setIdentity: (profile: Profile | null, briefingSeen: boolean) => void;
}
const write = (saved: CampaignSave) => saveCampaignSave(saved) ? null
    : 'Não foi possível salvar a campanha neste navegador. O progresso desta sessão não está garantido.';
/** O modo só muda na entrada/saída; nenhuma ação de combate/viagem muda a campanha. */
export const useCampaignStore = create<CampaignStore>((set, get) => {
    const update = (saved: CampaignSave) => set({ saved, saveError: write(saved) });
    const active = () => get().mode === 'campaign' && get().inGame ? get().saved : null;
    return {
        mode: 'development', inGame: false, saved: loadCampaignSave(), saveError: null,
        startCampaign: (profile, replace = false) => {
            if (get().inGame || (get().saved && !replace)) return false;
            const saved = parseCampaignSave(JSON.stringify(createCampaignSave(profile)));
            if (!saved) return false;
            set({ saved, saveError: write(saved), mode: 'campaign', inGame: true });
            return true;
        },
        resumeCampaign: () => {
            if (get().inGame || !get().saved) return false;
            set({ mode: 'campaign', inGame: true }); return true;
        },
        enterDevelopment: () => {
            if (get().inGame) return false;
            set({ mode: 'development', inGame: true }); return true;
        },
        leave: () => set({ mode: 'development', inGame: false }),
        dispatch: event => {
            const saved = active(); if (!saved) return;
            const campaign = transitionCampaign(saved.campaign, event);
            if (campaign !== saved.campaign) update({ ...saved, campaign });
        },
        depositExpedition: delivery => {
            const saved = active(); if (!saved) return;
            const campaign = depositExpedition(saved.campaign, delivery);
            if (campaign !== saved.campaign) update({ ...saved, campaign });
        },
        setCargo: cargo => { const saved = active(); if (saved) update({ ...saved, cargo: { ...cargo } }); },
        discardAttempt: () => {
            const saved = active();
            if (saved && Object.values(saved.cargo).some(n => n > 0)) update({ ...saved, cargo: { ...EMPTY_CARGO } });
        },
        setIdentity: (profile, briefingSeen) => {
            const saved = active(); if (saved && profile) update({ ...saved, profile: { ...profile }, briefingSeen });
        }
    };
});
