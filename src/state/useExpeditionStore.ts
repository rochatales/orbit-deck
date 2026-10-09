import { create } from 'zustand';
import { INITIAL_SESSION, migrateProfile, parseSave, transition, type HubSave, type Profile, type Session, type SessionEvent } from '../game/session';
import { INITIAL_POSITION, MAPS, type Point } from '../game/config';
import type { MapId } from '../game/session';
import { useGameStore } from './useGameStore';
import { isNearEden, isNearShip, placePlayer } from './playerTransient';
import { useCombatStore } from './useCombatStore';
const SAVE_KEY = 'horda-survivor:hub:v1';
function load(): HubSave {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw !== null)
            return parseSave(raw);
        return { version: 1, profile: migrateProfile(localStorage.getItem('mcp-office:journey:v1')), briefingSeen: false };
    }
    catch {
        return { version: 1, profile: null, briefingSeen: false };
    }
}
const saved = load();
/** Reposiciona a fonte mutável e publica a proximidade do novo ponto no mesmo passo. */
function respawn(spawn: Point, map: MapId) {
    placePlayer(spawn);
    useGameStore.setState({ isPaused: false, nearEden: isNearEden(map), nearShip: isNearShip(map) });
}
interface ExpeditionState {
    profile: Profile | null;
    briefingSeen: boolean;
    session: Session;
    spawn: Point;
    panel: 'eden' | 'ship' | null;
    ready: boolean;
    error: string | null;
    saveError: string | null;
    radio: string;
    start: (name: string, color: string) => void;
    openEden: () => void;
    closePanel: () => void;
    send: (event: SessionEvent) => void;
    restartMission: () => void;
    setReady: (ready: boolean) => void;
    setError: (error: string | null) => void;
    setRadio: (radio: string) => void;
}
function save(profile: Profile | null, briefingSeen: boolean): string | null {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, profile, briefingSeen }));
        return null;
    }
    catch {
        return 'Não foi possível salvar neste navegador. O progresso desta sessão não está garantido.';
    }
}
export const useExpeditionStore = create<ExpeditionState>((set, get) => ({
    profile: saved.profile, briefingSeen: saved.briefingSeen, session: { ...INITIAL_SESSION }, spawn: INITIAL_POSITION,
    panel: null, ready: false, error: null, saveError: null,
    radio: 'EDEN está ao norte. Encontre-a para receber o briefing. O deck de lançamento fica ao sul.',
    start: (name, color) => {
        const profile = parseSave(JSON.stringify({ version: 1, profile: { displayName: name, color } })).profile;
        if (profile)
            set({ profile, saveError: save(profile, get().briefingSeen) });
    },
    openEden: () => {
        const s = get();
        if (!s.ready || s.session.map !== 'mars' || s.session.phase !== 'walking' || useGameStore.getState().isPaused || !isNearEden(s.session.map))
            return;
        set({ panel: 'eden', briefingSeen: true, saveError: save(s.profile, true) });
    },
    closePanel: () => { if (get().session.phase === 'walking')
        set({ panel: null }); },
    send: (event) => {
        const s = get();
        if (['board', 'exit', 'depart'].includes(event) && (!s.ready || useGameStore.getState().isPaused || (s.session.map === 'shanghai' && useCombatStore.getState().dead)))
            return;
        if (event === 'board' && (s.panel || !isNearShip(s.session.map)))
            return;
        const session = transition(s.session, event);
        if (session === s.session)
            return;
        if (event === 'arrive' && session.map === 'shanghai') useCombatStore.getState().restart();
        let spawn = s.spawn;
        if (event === 'board' || event === 'arrive')
            spawn = MAPS[session.map].ship;
        if (event === 'exit')
            spawn = MAPS[session.map].exit;
        respawn(spawn, session.map);
        set({ session, spawn, panel: session.phase === 'walking' ? null : 'ship', error: null, ready: event === 'depart' ? false : s.ready });
    },
    restartMission: () => {
        const s = get();
        if (s.session.map !== 'shanghai' || !s.ready || s.session.phase !== 'walking') return;
        useCombatStore.getState().restart();
        const spawn = MAPS.shanghai.exit;
        respawn(spawn, 'shanghai');
        set({ spawn, panel: null, session: { ...s.session, revision: s.session.revision + 1 }, radio: 'Nova tentativa. Mova-se, mire com o mouse e use R para recarregar.' });
    },
    setReady: (ready) => set({ ready }), setError: (error) => set({ error }), setRadio: (radio) => set({ radio })
}));
