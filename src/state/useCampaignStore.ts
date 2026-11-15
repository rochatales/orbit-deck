import { create } from 'zustand';
import { depositExpedition, transitionCampaign, type CampaignEvent, type ExpeditionDelivery } from '../game/campaign';
import { abandonCampaignAttempt, createCampaignSave, loadCampaignSave, parseCampaignSave, saveCampaignSave, type CampaignSave } from '../game/campaignSave';
import type { Profile } from '../game/session';
import { EMPTY_CARGO, type ResourceCargo } from '../game/backpackConfig';

export type PlayMode = 'development' | 'campaign';
interface CampaignStore {
    mode: PlayMode;
    inGame: boolean;
    saved: CampaignSave | null;
    saveError: string | null;
    /** Carga antiga retirada para a mochila: não pode virar entrega nova ao redepositar. */
    withdrawnCargo: ResourceCargo;
    startCampaign: (profile: Profile, replace?: boolean) => boolean;
    resumeCampaign: () => boolean;
    enterDevelopment: () => boolean;
    leave: () => void;
    dispatch: (event: CampaignEvent) => boolean;
    depositExpedition: (delivery: ExpeditionDelivery) => void;
    setCargo: (cargo: ResourceCargo) => void;
    transferCargo: (cargo: ResourceCargo) => void;
    beginAttempt: () => void;
    abandonAttempt: () => void;
    consolidateExpedition: (id: string) => void;
    setIdentity: (profile: Profile | null, briefingSeen: boolean) => void;
}
const write = (saved: CampaignSave) => saveCampaignSave(saved) ? null
    : 'Não foi possível salvar a campanha neste navegador. O progresso desta sessão não está garantido.';
/** O modo só muda na entrada/saída; nenhuma ação de combate/viagem muda a campanha. */
export const useCampaignStore = create<CampaignStore>((set, get) => {
    const update = (saved: CampaignSave, withdrawnCargo?: ResourceCargo) => set({ saved, saveError: write(saved), ...(withdrawnCargo ? { withdrawnCargo } : {}) });
    const active = () => get().mode === 'campaign' && get().inGame ? get().saved : null;
    const loaded = loadCampaignSave(), cleaned = loaded ? abandonCampaignAttempt(loaded) : null;
    const loadError = cleaned && cleaned !== loaded ? write(cleaned) : null;
    return {
        mode: 'development', inGame: false, withdrawnCargo: { ...EMPTY_CARGO }, saved: cleaned, saveError: loadError,
        startCampaign: (profile, replace = false) => {
            if (get().inGame || (get().saved && !replace)) return false;
            const saved = parseCampaignSave(JSON.stringify(createCampaignSave(profile)));
            if (!saved) return false;
            set({ saved, saveError: write(saved), mode: 'campaign', inGame: true, withdrawnCargo: { ...EMPTY_CARGO } });
            return true;
        },
        resumeCampaign: () => {
            if (get().inGame || !get().saved) return false;
            set({ mode: 'campaign', inGame: true, withdrawnCargo: { ...EMPTY_CARGO } }); return true;
        },
        enterDevelopment: () => {
            if (get().inGame) return false;
            set({ mode: 'development', inGame: true }); return true;
        },
        leave: () => { get().abandonAttempt(); set({ mode: 'development', inGame: false }); },
        beginAttempt: () => {
            const saved = active();
            if (saved && !saved.departureCargo) update({ ...saved, departureCargo: { ...saved.cargo } });
        },
        abandonAttempt: () => {
            const saved = active(); if (!saved) return;
            set({ withdrawnCargo: { ...EMPTY_CARGO } });
            const next = abandonCampaignAttempt(saved);
            if (next !== saved) update(next);
        },
        transferCargo: cargo => {
            const saved = active(); if (!saved) return;
            const attemptCargo = { ...saved.attemptCargo }, attemptDelivery = { ...saved.attemptDelivery }, withdrawnCargo = { ...get().withdrawnCargo };
            for (const kind of ['iron', 'copper', 'titanium', 'organic'] as const) {
                const delta = cargo[kind] - saved.cargo[kind];
                if (delta > 0) {
                    const returned = Math.min(delta, withdrawnCargo[kind]);
                    withdrawnCargo[kind] -= returned;
                    attemptDelivery[kind] += delta - returned;
                } else if (delta < 0) {
                    const eligible = Math.min(-delta, attemptDelivery[kind]);
                    attemptDelivery[kind] -= eligible;
                    withdrawnCargo[kind] += -delta - eligible;
                }
                attemptCargo[kind] = Math.max(0, attemptCargo[kind] + delta);
            }
            update({ ...saved, cargo: { ...cargo }, attemptCargo, attemptDelivery }, withdrawnCargo);
        },
        consolidateExpedition: id => {
            const saved = active(); if (!saved || saved.campaign.depositedExpeditionIds.includes(id)) return;
            const campaign = transitionCampaign(depositExpedition(saved.campaign, {
                id, copper: saved.attemptDelivery.copper, organic: saved.attemptDelivery.organic
            }), saved.campaign.stage === 'expedition-organic' ? 'finish-organic-expedition' : 'finish-copper-expedition');
            // Uma única escrita: carga definitiva e entrega não podem divergir num reload.
            const { departureCargo: _departureCargo, ...rest } = saved;
            update({ ...rest, campaign, attemptCargo: { ...EMPTY_CARGO }, attemptDelivery: { ...EMPTY_CARGO } }, { ...EMPTY_CARGO });
        },
        dispatch: event => {
            const saved = active(); if (!saved) return false;
            const campaign = transitionCampaign(saved.campaign, event);
            if (campaign === saved.campaign) return false;
            update({ ...saved, campaign, briefingSeen: saved.briefingSeen || event === 'finish-eden-briefing' });
            return true;
        },
        depositExpedition: delivery => {
            const saved = active(); if (!saved) return;
            const campaign = depositExpedition(saved.campaign, delivery);
            if (campaign !== saved.campaign) update({ ...saved, campaign });
        },
        setCargo: cargo => { const saved = active(); if (saved) update({ ...saved, cargo: { ...cargo } }); },
        setIdentity: (profile, briefingSeen) => {
            const saved = active(); if (saved && profile) update({ ...saved, profile: { ...profile }, briefingSeen });
        }
    };
});
