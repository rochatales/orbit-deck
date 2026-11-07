import { useCampaignStore } from '../state/useCampaignStore';
/** Política única consultada na seleção, tecla, clique e ações diretas. Sem alocação por quadro. */
export function engineerBriefingRequired() {
    const s = useCampaignStore.getState();
    return s.mode === 'campaign' && s.saved?.campaign.stage === 'engineer-briefing';
}
export function campaignInteractionAllowed(id: string) {
    const s = useCampaignStore.getState();
    if (s.mode !== 'campaign') return id !== 'activate-eden' && id !== 'activate-synthesizer';
    const campaign = s.saved?.campaign;
    if (campaign?.stage === 'engineer-briefing') return id === 'npc:engineer';
    if (id === 'activate-eden') return campaign?.stage === 'eden-activation';
    if (id === 'npc:eden') return !!campaign?.edenActive;
    if (id === 'activate-synthesizer') return campaign?.stage === 'synthesizer-activation';
    return id !== 'synthesizer';
}
export function campaignSwordAllowed(s = useCampaignStore.getState()) {
    return s.mode !== 'campaign' || !!s.saved?.campaign.swordReceived;
}
