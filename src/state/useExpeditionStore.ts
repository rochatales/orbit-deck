import { create } from 'zustand';
import { INITIAL_SESSION, migrateProfile, parseSave, transition, type HubSave, type Profile, type Session, type SessionEvent } from '../game/session';
import { INITIAL_POSITION, MAPS, type Point } from '../game/config';
import type { MapId } from '../game/session';
import { useGameStore } from './useGameStore';
import { isNearEden, isNearShip, placePlayer } from './playerTransient';
import { combatRuntime, useCombatStore } from './useCombatStore';
import { useCampaignStore } from './useCampaignStore';
import { campaignInteractionAllowed } from '../game/campaignPolicy';
import './useWeaponStore';
import { canTalkToEngineer } from '../npcs/engineerPresence';
import { playerPosition } from './playerTransient';
const SAVE_KEY = 'exoden:hub:v1';
/** Chave do nome de trabalho anterior (Horda Survivor): só lida para migrar, nunca apagada. */
const LEGACY_SAVE_KEY = 'horda-survivor:hub:v1';
export function loadHubSave(storage: () => Pick<Storage, 'getItem'> = () => localStorage): HubSave {
    try {
        const source = storage();
        const raw = source.getItem(SAVE_KEY) ?? source.getItem(LEGACY_SAVE_KEY);
        if (raw !== null)
            return parseSave(raw);
        return { version: 1, profile: migrateProfile(source.getItem('mcp-office:journey:v1')), briefingSeen: false };
    }
    catch {
        return { version: 1, profile: null, briefingSeen: false };
    }
}
const saved = loadHubSave();
let developmentIdentity: HubSave = saved;
let developmentSaveError: string | null = null;
const INITIAL_RADIO = 'EDEN está ao norte. Encontre-a para receber o briefing. O deck de lançamento fica ao sul.';
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
    panel: 'eden' | 'engineer' | 'ship' | null;
    ready: boolean;
    error: string | null;
    saveError: string | null;
    radio: string;
    radioSender: string;
    radioSerial: number;
    copperQuotaAnnounced: boolean;
    announceCopperQuota: () => void;
    start: (name: string, color: string) => void;
    enterDevelopment: () => boolean;
    enterCampaign: (profile?: Profile, replace?: boolean) => boolean;
    returnHome: () => void;
    openEden: () => void;
    openEngineer: () => void;
    closePanel: () => void;
    send: (event: SessionEvent) => void;
    restartMission: () => void;
    setReady: (ready: boolean) => void;
    setError: (error: string | null) => void;
    setRadio: (radio: string, sender?: string) => void;
}
function save(profile: Profile | null, briefingSeen: boolean): string | null {
    if (useCampaignStore.getState().mode === 'campaign') {
        useCampaignStore.getState().setIdentity(profile, briefingSeen);
        return useCampaignStore.getState().saveError;
    }
    developmentIdentity = { version: 1, profile, briefingSeen };
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, profile, briefingSeen }));
        developmentSaveError = null;
    }
    catch {
        developmentSaveError = 'Não foi possível salvar neste navegador. O progresso desta sessão não está garantido.';
    }
    return developmentSaveError;
}
/** Cena não desenhou a tempo: recarregar é a saída segura, a sessão de perfil fica salva. */
export const SCENE_STALLED_ERROR = 'O destino está demorando para abrir. Recarregue o jogo para tentar de novo.';
export const useExpeditionStore = create<ExpeditionState>((set, get) => ({
    profile: saved.profile, briefingSeen: saved.briefingSeen, session: { ...INITIAL_SESSION }, spawn: INITIAL_POSITION,
    panel: null, ready: false, error: null, saveError: null,
    radio: INITIAL_RADIO, radioSender: 'EDEN', radioSerial: 0, copperQuotaAnnounced: false,
    start: (name, color) => {
        const profile = parseSave(JSON.stringify({ version: 1, profile: { displayName: name, color } })).profile;
        if (profile)
            set({ profile, saveError: save(profile, get().briefingSeen) });
    },
    enterDevelopment: () => {
        if (!useCampaignStore.getState().enterDevelopment()) return false;
        combatRuntime.simulation = null;
        useCombatStore.getState().restart();
        respawn(INITIAL_POSITION, 'mars');
        set({ profile: developmentIdentity.profile, briefingSeen: developmentIdentity.briefingSeen,
            session: { ...INITIAL_SESSION }, spawn: INITIAL_POSITION, panel: null, ready: false,
            error: null, saveError: developmentSaveError, radio: INITIAL_RADIO, radioSender: 'EDEN', radioSerial: 0, copperQuotaAnnounced: false });
        return true;
    },
    enterCampaign: (profile, replace = false) => {
        const campaign = useCampaignStore.getState();
        if (!(profile ? campaign.startCampaign(profile, replace) : campaign.resumeCampaign())) return false;
        const saved = useCampaignStore.getState().saved!;
        combatRuntime.simulation = null;
        useCombatStore.getState().restart();
        respawn(INITIAL_POSITION, 'mars');
        set({ profile: saved.profile, briefingSeen: saved.briefingSeen, session: { ...INITIAL_SESSION },
            spawn: INITIAL_POSITION, panel: null, ready: false, error: null, saveError: null, radio: INITIAL_RADIO, radioSender: 'EDEN', radioSerial: 0, copperQuotaAnnounced: false });
        return true;
    },
    returnHome: () => {
        combatRuntime.simulation = null;
        useCampaignStore.getState().leave();
        useCombatStore.getState().restart();
        respawn(INITIAL_POSITION, 'mars');
        set({ profile: developmentIdentity.profile, briefingSeen: developmentIdentity.briefingSeen,
            session: { ...INITIAL_SESSION }, spawn: INITIAL_POSITION, panel: null, ready: false,
            error: null, saveError: developmentSaveError, radio: INITIAL_RADIO, radioSender: 'EDEN', radioSerial: 0, copperQuotaAnnounced: false });
    },
    openEngineer: () => {
        const s = get();
        if (s.ready && s.session.map === 'mars' && s.session.phase === 'walking' && !s.panel
            && !useGameStore.getState().isPaused && canTalkToEngineer(playerPosition)) {
            set({ panel: 'engineer' });
            useCampaignStore.getState().dispatch('finish-engineer-briefing');
        }
    },
    openEden: () => {
        const s = get();
        if (!campaignInteractionAllowed('npc:eden') || !s.ready || s.session.map !== 'mars' || s.session.phase !== 'walking' || useGameStore.getState().isPaused || !isNearEden(s.session.map))
            return;
        set({ panel: 'eden', briefingSeen: true, saveError: save(s.profile, true) });
    },
    closePanel: () => { if (get().session.phase === 'walking')
        set({ panel: null }); },
    send: (event) => {
        const s = get();
        const paused = useGameStore.getState().isPaused;
        if (['board', 'exit', 'depart'].includes(event) && (!s.ready || (paused && s.session.phase === 'walking') || (s.session.map === 'shanghai' && useCombatStore.getState().dead)))
            return;
        // A cabine cobre o menu de pausa: uma pausa antiga não pode travar nem reaparecer ao desembarcar.
        if (paused && s.session.phase !== 'walking') useGameStore.setState({ isPaused: false });
        if (event === 'board' && !campaignInteractionAllowed(`ship:${s.session.map}`)) return;
        if (event === 'board' && (s.panel || !isNearShip(s.session.map)))
            return;
        const session = transition(s.session, event);
        if (session === s.session)
            return;
        if (event === 'arrive' && session.map === 'mars' && s.session.map === 'shanghai' && useCampaignStore.getState().mode === 'campaign')
            useCampaignStore.getState().consolidateExpedition(crypto.randomUUID());
        if (event === 'arrive' && session.map === 'shanghai') {
            useCombatStore.getState().restart();
            set({ copperQuotaAnnounced: false });
            if (useCampaignStore.getState().mode === 'campaign' && useCampaignStore.getState().saved?.campaign.stage === 'expedition-copper')
                get().setRadio('Conferi aqui, você vai precisar de 04 unidades de cobre.', 'Engenheiro');
        }
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
        useCampaignStore.getState().abandonAttempt();
        useCombatStore.getState().restart();
        set({ copperQuotaAnnounced: false });
        const spawn = MAPS.shanghai.exit;
        respawn(spawn, 'shanghai');
        set({ spawn, panel: null, session: { ...s.session, revision: s.session.revision + 1 }, radio: 'Nova tentativa. Mova-se, mire com o mouse e use R para recarregar.' });
    },
    announceCopperQuota: () => {
        const s = get(), c = useCampaignStore.getState(), combat = useCombatStore.getState();
        if (s.copperQuotaAnnounced || s.session.map !== 'shanghai' || !s.ready || combat.dead
            || c.mode !== 'campaign' || c.saved?.campaign.stage !== 'expedition-copper') return;
        if ((combatRuntime.simulation?.copper ?? combat.copper) + c.saved.attemptCargo.copper >= 4) {
            set({ copperQuotaAnnounced: true });
            get().setRadio('Já temos cobre suficiente. Guarde na aeronave e volte a Marte.', 'Engenheiro');
        }
    },
    setReady: (ready) => set({ ready }), setError: (error) => set({ error }),
    setRadio: (radio, radioSender = 'EDEN') => set(s => ({ radio, radioSender, radioSerial: s.radioSerial + 1 }))
}));

// A morte é publicada uma vez pela simulação; nenhum polling/render de recursos adicional.
useCombatStore.subscribe((state, previous) => {
    if (state.dead && !previous.dead && useCampaignStore.getState().mode === 'campaign') {
        useCampaignStore.getState().abandonAttempt();
        const sim = combatRuntime.simulation;
        if (sim) { sim.iron = 0; sim.copper = 0; sim.titanium = 0; sim.organic = 0; }
        useCombatStore.setState({ iron: 0, copper: 0, titanium: 0, organic: 0 });
    }
    if (state.copper !== previous.copper) useExpeditionStore.getState().announceCopperQuota();
});
useCampaignStore.subscribe(() => useExpeditionStore.getState().announceCopperQuota());
