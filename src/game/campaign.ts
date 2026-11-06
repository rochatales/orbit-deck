/** Regras puras do circuito inicial; coleta, entrega e ativação são eventos distintos. */
export const CAMPAIGN_STAGES = [
    'engineer-briefing', 'expedition-copper', 'eden-activation', 'eden-briefing',
    'sword-pickup', 'expedition-organic', 'synthesizer-activation', 'main-progression'
] as const;
export type CampaignStage = typeof CAMPAIGN_STAGES[number];
export const CAMPAIGN_QUOTAS = { copper: 4, organic: 10 } as const;
export interface CampaignState {
    readonly stage: CampaignStage;
    readonly copperDelivered: number;
    readonly organicDelivered: number;
    readonly edenActive: boolean;
    readonly synthesizerActive: boolean;
    readonly swordReceived: boolean;
    readonly lastExpeditionId: string | null;
    /** Guarda também IDs anteriores: A → B → A não pode conceder A de novo. */
    readonly depositedExpeditionIds: readonly string[];
}
export function createCampaign(): CampaignState {
    return { stage: 'engineer-briefing', copperDelivered: 0, organicDelivered: 0,
        edenActive: false, synthesizerActive: false, swordReceived: false,
        lastExpeditionId: null, depositedExpeditionIds: [] };
}
export type CampaignEvent = 'finish-engineer-briefing' | 'finish-copper-expedition' | 'activate-eden'
    | 'finish-eden-briefing' | 'pick-up-sword' | 'finish-organic-expedition' | 'activate-synthesizer'
    | 'defeat' | 'restart';
/** Evento fora de ordem, repetido ou de tentativa derrotada não altera o estado. */
export function transitionCampaign(state: CampaignState, event: CampaignEvent): CampaignState {
    switch (event) {
        case 'finish-engineer-briefing':
            return state.stage === 'engineer-briefing' ? { ...state, stage: 'expedition-copper' } : state;
        case 'finish-copper-expedition':
            return state.stage === 'expedition-copper' && state.copperDelivered >= CAMPAIGN_QUOTAS.copper
                ? { ...state, stage: 'eden-activation' } : state;
        case 'activate-eden':
            return state.stage === 'eden-activation' && state.copperDelivered >= CAMPAIGN_QUOTAS.copper
                ? { ...state, stage: 'eden-briefing', edenActive: true } : state;
        case 'finish-eden-briefing':
            return state.stage === 'eden-briefing' ? { ...state, stage: 'sword-pickup' } : state;
        case 'pick-up-sword':
            return state.stage === 'sword-pickup' ? { ...state, stage: 'expedition-organic', swordReceived: true } : state;
        case 'finish-organic-expedition':
            return state.stage === 'expedition-organic' && state.organicDelivered >= CAMPAIGN_QUOTAS.organic
                ? { ...state, stage: 'synthesizer-activation' } : state;
        case 'activate-synthesizer':
            return state.stage === 'synthesizer-activation' && state.organicDelivered >= CAMPAIGN_QUOTAS.organic
                ? { ...state, stage: 'main-progression', synthesizerActive: true } : state;
        default: return state;
    }
}
export interface ExpeditionDelivery { id: string; copper: number; organic: number }
export const validCampaignAmount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const validId = (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0;
/** Não consome recursos nem conclui a etapa: a confirmação é outro evento explícito. */
export function depositExpedition(state: CampaignState, delivery: ExpeditionDelivery): CampaignState {
    if ((state.stage !== 'expedition-copper' && state.stage !== 'expedition-organic')
        || !delivery || !validId(delivery.id) || state.depositedExpeditionIds.includes(delivery.id)
        || !validCampaignAmount(delivery.copper) || !validCampaignAmount(delivery.organic)
        || !validCampaignAmount(state.copperDelivered + delivery.copper)
        || !validCampaignAmount(state.organicDelivered + delivery.organic)) return state;
    return { ...state, copperDelivered: state.copperDelivered + delivery.copper,
        organicDelivered: state.organicDelivered + delivery.organic, lastExpeditionId: delivery.id,
        depositedExpeditionIds: [...state.depositedExpeditionIds, delivery.id] };
}
/** Parser estrito quanto à coerência; um save corrompido não desbloqueia etapas. */
export function parseCampaignState(value: unknown): CampaignState | null {
    if (!value || typeof value !== 'object') return null;
    const s = value as CampaignState, index = CAMPAIGN_STAGES.indexOf(s.stage);
    if (index < 0 || !validCampaignAmount(s.copperDelivered) || !validCampaignAmount(s.organicDelivered)
        || s.edenActive !== (index >= 3) || s.swordReceived !== (index >= 5) || s.synthesizerActive !== (index === 7)
        || (index >= 2 && s.copperDelivered < CAMPAIGN_QUOTAS.copper)
        || (index >= 6 && s.organicDelivered < CAMPAIGN_QUOTAS.organic)
        || !Array.isArray(s.depositedExpeditionIds) || !s.depositedExpeditionIds.every(validId)
        || new Set(s.depositedExpeditionIds).size !== s.depositedExpeditionIds.length
        || s.lastExpeditionId !== (s.depositedExpeditionIds[s.depositedExpeditionIds.length - 1] ?? null)
        || ((s.copperDelivered > 0 || s.organicDelivered > 0) && !s.depositedExpeditionIds.length)
        || (index === 0 && (s.copperDelivered !== 0 || s.organicDelivered !== 0 || s.depositedExpeditionIds.length))) return null;
    return { stage: s.stage, copperDelivered: s.copperDelivered, organicDelivered: s.organicDelivered,
        edenActive: s.edenActive, synthesizerActive: s.synthesizerActive, swordReceived: s.swordReceived,
        lastExpeditionId: s.lastExpeditionId, depositedExpeditionIds: [...s.depositedExpeditionIds] };
}
export const CAMPAIGN_OBJECTIVES: Record<CampaignStage, string> = {
    'engineer-briefing': 'Procure o Engenheiro na Oficina ou no Data Center',
    'expedition-copper': 'Recupere e entregue 4 unidades de cobre',
    'eden-activation': 'Ligue EDEN na colônia',
    'eden-briefing': 'Converse com EDEN',
    'sword-pickup': 'Receba a espada na Oficina',
    'expedition-organic': 'Recupere e entregue 10 matérias orgânicas',
    'synthesizer-activation': 'Ligue o sintetizador orgânico',
    'main-progression': 'Prepare sua próxima expedição'
};

export function campaignObjective(state: CampaignState) {
    return state.stage === 'expedition-copper' ? `Cobre entregue: ${state.copperDelivered} / ${CAMPAIGN_QUOTAS.copper}` : CAMPAIGN_OBJECTIVES[state.stage];
}
