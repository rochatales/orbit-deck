import { useCampaignStore } from '../state/useCampaignStore';
import type { PlayerWeapon } from '../combat/melee';
import { CAMPAIGN_QUOTAS, type CampaignStage } from './campaign';
import type { MapId } from './session';

export function expeditionQuotaKind(stage: CampaignStage | undefined) {
    return stage === 'expedition-copper' ? 'copper' : stage === 'expedition-organic' ? 'organic' : null;
}

/** Saldo a colocar no porão durante o circuito. Entregas de visitas anteriores também contam. */
export function missionDepositRemaining(map: MapId, s = useCampaignStore.getState()) {
    if (map !== 'shanghai' || s.mode !== 'campaign' || !s.saved) return null;
    const { campaign, attemptDelivery } = s.saved;
    const kind = expeditionQuotaKind(campaign.stage);
    if (!kind) return null;
    const delivered = kind === 'copper' ? campaign.copperDelivered : campaign.organicDelivered;
    return Math.max(0, CAMPAIGN_QUOTAS[kind] - delivered - attemptDelivery[kind]);
}
/** Política única consultada na seleção, tecla, clique e ações diretas. Sem alocação por quadro. */
export function engineerBriefingRequired(s = useCampaignStore.getState()) {
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
export function campaignRifleAllowed(s = useCampaignStore.getState()) {
    return !engineerBriefingRequired(s);
}
export function campaignWeaponAllowed(weapon: PlayerWeapon) {
    return weapon === 'rifle' ? campaignRifleAllowed() : campaignSwordAllowed();
}
