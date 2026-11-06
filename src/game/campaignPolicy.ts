import { useCampaignStore } from '../state/useCampaignStore';
/** Política única consultada na seleção, tecla, clique e ações diretas. Sem alocação por quadro. */
export function engineerBriefingRequired() {
    const s = useCampaignStore.getState();
    return s.mode === 'campaign' && s.saved?.campaign.stage === 'engineer-briefing';
}
export function campaignInteractionAllowed(id: string) {
    if (engineerBriefingRequired()) return id === 'npc:engineer';
    const s = useCampaignStore.getState();
    return id !== 'npc:eden' || s.mode !== 'campaign' || !!s.saved?.campaign.edenActive;
}
export function campaignSwordAllowed() {
    const s = useCampaignStore.getState();
    return s.mode !== 'campaign' || !!s.saved?.campaign.swordReceived;
}
