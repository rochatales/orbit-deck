/** Pure session rules. Travel never grants loot; expeditions are not saved mid-flight. */
export type MapId = 'mars' | 'shanghai';
export type TravelPhase = 'walking' | 'aboard' | 'travelling';
export interface Session {
    map: MapId;
    phase: TravelPhase;
    destination: MapId | null;
    revision: number;
}
export type SessionEvent = 'board' | 'exit' | 'depart' | 'arrive' | 'fail';
export const INITIAL_SESSION: Session = { map: 'mars', phase: 'walking', destination: null, revision: 0 };
export function transition(s: Session, event: SessionEvent): Session {
    if (event === 'board' && s.phase === 'walking')
        return { ...s, phase: 'aboard', revision: s.revision + 1 };
    if (event === 'exit' && s.phase === 'aboard')
        return { ...s, phase: 'walking', revision: s.revision + 1 };
    if (event === 'depart' && s.phase === 'aboard')
        return { ...s, phase: 'travelling', destination: s.map === 'mars' ? 'shanghai' : 'mars' };
    if (event === 'arrive' && s.phase === 'travelling' && s.destination)
        return { map: s.destination, phase: 'aboard', destination: null, revision: s.revision + 1 };
    if (event === 'fail' && s.phase === 'travelling')
        return { ...s, phase: 'aboard', destination: null };
    return s;
}
export interface Profile {
    displayName: string;
    color: string;
}
export const DEFAULT_SUIT_COLOR = '#66e6ff';
export interface HubSave {
    version: 1;
    profile: Profile | null;
    briefingSeen: boolean;
}
export function parseSave(raw: string | null): HubSave {
    const empty: HubSave = { version: 1, profile: null, briefingSeen: false };
    try {
        const value = JSON.parse(raw ?? 'null');
        if (value?.version !== 1)
            return empty;
        const p = value.profile;
        if (typeof p?.displayName !== 'string' || p.displayName.trim().length < 2)
            return empty;
        return { version: 1, profile: { displayName: p.displayName.trim().slice(0, 32), color: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : DEFAULT_SUIT_COLOR }, briefingSeen: value.briefingSeen === true };
    }
    catch {
        return empty;
    }
}
export function migrateProfile(raw: string | null): Profile | null {
    try {
        const value = JSON.parse(raw ?? 'null');
        return parseSave(JSON.stringify({ version: 1, profile: value?.state?.profile })).profile;
    }
    catch {
        return null;
    }
}
