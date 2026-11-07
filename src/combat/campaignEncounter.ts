import { COPPER_ENCOUNTER, HORDE_ENCOUNTER, ORGANIC_ENCOUNTER, type EncounterChoice } from './config';
import type { CampaignStage } from '../game/campaign';
/** A campanha resolve o encontro pela etapa, sem ler a escolha dev. */
export function campaignEncounter(stage: CampaignStage | undefined): EncounterChoice {
    if (stage === 'expedition-copper') return COPPER_ENCOUNTER;
    if (stage === 'expedition-organic') return ORGANIC_ENCOUNTER;
    return HORDE_ENCOUNTER;
}
/** Quatro esquinas próximas ao quarteirão de desembarque, sem seletor de teste. */
export function copperPatrolCorners(phase01: boolean) {
    return phase01 ? [{ x: -17.5, z: -18.5 }, { x: 17.5, z: -18.5 }, { x: 17.5, z: 21 }, { x: -17.5, z: 21 }]
        : [{ x: -14, z: -8 }, { x: 14, z: -8 }, { x: 14, z: 13 }, { x: -14, z: 13 }];
}
