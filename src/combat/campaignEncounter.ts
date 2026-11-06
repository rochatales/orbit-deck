import { COPPER_ENCOUNTER, HORDE_ENCOUNTER, type EncounterChoice } from './config';
import type { CampaignStage } from '../game/campaign';
/** Etapas ainda sem encontro usam o comportamento padrão atual (hordas), sem ler a escolha dev. */
export function campaignEncounter(stage: CampaignStage | undefined): EncounterChoice {
    return stage === 'expedition-copper' ? COPPER_ENCOUNTER : HORDE_ENCOUNTER;
}
/** Quatro esquinas próximas ao quarteirão de desembarque, sem seletor de teste. */
export function copperPatrolCorners(phase01: boolean) {
    return phase01 ? [{ x: -17.5, z: -18.5 }, { x: 17.5, z: -18.5 }, { x: 17.5, z: 21 }, { x: -17.5, z: 21 }]
        : [{ x: -14, z: -8 }, { x: 14, z: -8 }, { x: 14, z: 13 }, { x: -14, z: 13 }];
}
