import { createCampaign, parseCampaignState, validCampaignAmount, type CampaignState } from './campaign';
import type { Profile } from './session';
import { SHIP_CARGO } from './shipCargo';
import { EMPTY_CARGO, cargoWeight, type ResourceCargo } from './backpackConfig';

export const CAMPAIGN_SAVE_KEY = 'exoden:campaign:v1';
export interface CampaignSave {
    version: 1;
    profile: Profile;
    briefingSeen: boolean;
    campaign: CampaignState;
    cargo: ResourceCargo;
    /** Saldo no porão ainda em risco; ausente nos saves da S3.1 vale zero. */
    attemptCargo: ResourceCargo;
    /** Parte do saldo que ainda não foi contada numa visita anterior. */
    attemptDelivery: ResourceCargo;
}
export function createCampaignSave(profile: Profile): CampaignSave {
    return { version: 1, profile: { ...profile }, briefingSeen: false, campaign: createCampaign(), cargo: { ...EMPTY_CARGO }, attemptCargo: { ...EMPTY_CARGO }, attemptDelivery: { ...EMPTY_CARGO } };
}
export function parseCampaignSave(raw: string | null): CampaignSave | null {
    try {
        const s = JSON.parse(raw ?? 'null'), state = parseCampaignState(s?.campaign), p = s?.profile;
        if (s?.version !== 1 || !state || typeof p?.displayName !== 'string' || p.displayName.trim().length < 2
            || typeof p.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(p.color)
            || typeof s.briefingSeen !== 'boolean' || !s.cargo
            || !(['iron', 'copper', 'titanium', 'organic'] as const).every(k => validCampaignAmount(s.cargo[k]))
            || cargoWeight(s.cargo) > SHIP_CARGO.capacityKg + 1e-6
            || (s.attemptCargo !== undefined && !(['iron', 'copper', 'titanium', 'organic'] as const).every(k => validCampaignAmount(s.attemptCargo?.[k]) && s.attemptCargo[k] <= s.cargo[k]))
            || (s.attemptDelivery !== undefined && !(['iron', 'copper', 'titanium', 'organic'] as const).every(k => validCampaignAmount(s.attemptDelivery?.[k]) && s.attemptDelivery[k] <= (s.attemptCargo?.[k] ?? 0)))) return null;
        return { version: 1, campaign: state, briefingSeen: s.briefingSeen,
            profile: { displayName: p.displayName.trim().slice(0, 32), color: p.color },
            cargo: { iron: s.cargo.iron, copper: s.cargo.copper, titanium: s.cargo.titanium, organic: s.cargo.organic },
            attemptCargo: { ...(s.attemptCargo ?? EMPTY_CARGO) }, attemptDelivery: { ...(s.attemptDelivery ?? s.attemptCargo ?? EMPTY_CARGO) } };
    } catch { return null; }
}
type StorageSource = () => Pick<Storage, 'getItem' | 'setItem'>;
export function loadCampaignSave(storage: StorageSource = () => localStorage): CampaignSave | null {
    try { return parseCampaignSave(storage().getItem(CAMPAIGN_SAVE_KEY)); } catch { return null; }
}
export function saveCampaignSave(save: CampaignSave, storage: StorageSource = () => localStorage): boolean {
    try { storage().setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; }
}

/** A partida nunca retoma na Terra. Reload/saída descartam só o saldo não retornado. */
export function abandonCampaignAttempt(saved: CampaignSave): CampaignSave {
    const pending = saved.attemptCargo;
    if (!pending.iron && !pending.copper && !pending.titanium && !pending.organic) return saved;
    return { ...saved, cargo: {
        iron: Math.max(0, saved.cargo.iron - pending.iron), copper: Math.max(0, saved.cargo.copper - pending.copper),
        titanium: Math.max(0, saved.cargo.titanium - pending.titanium), organic: Math.max(0, saved.cargo.organic - pending.organic)
    }, attemptCargo: { ...EMPTY_CARGO }, attemptDelivery: { ...EMPTY_CARGO } };
}
