import { CAMPAIGN_QUOTAS, campaignDepartureBlock, campaignObjective } from '../game/campaign';
import { create } from 'zustand';
import { INITIAL_SESSION, migrateProfile, parseSave, transition, type HubSave, type Profile, type Session, type SessionEvent } from '../game/session';
import { INITIAL_POSITION, MAPS, type Point } from '../game/config';
import { LABORATORIO } from '../game/laboratorioLayout';
import type { MapId } from '../game/session';
import { useGameStore } from './useGameStore';
import { isNearEden, isNearShip, placePlayer, playerPosition } from './playerTransient';
import { combatRuntime, useCombatStore } from './useCombatStore';
import { useCampaignStore } from './useCampaignStore';
import { campaignInteractionAllowed, expeditionQuotaKind, missionDepositRemaining } from '../game/campaignPolicy';
import { isNearMissionDeposit } from '../game/shipCargo';
import './useWeaponStore';
import { canReceiveSword, canTalkToEngineer } from '../npcs/engineerPresence';
import { ORGANIC_QUOTA_RADIO } from '../npcs/scripts/eden';
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
export type Acquisition = 'rifle' | 'sonar' | 'machete';
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
    panel: 'eden' | 'engineer' | 'ship' | 'acquisition' | 'deposit' | null;
    acquisition: Acquisition | null;
    ready: boolean;
    error: string | null;
    saveError: string | null;
    radio: string;
    radioSender: string;
    radioSerial: number;
    radioMap: MapId | null;
    quotaAnnounced: boolean;
    start: (name: string, color: string) => void;
    enterDevelopment: () => boolean;
    enterCampaign: (profile?: Profile, replace?: boolean) => boolean;
    returnHome: () => void;
    openEden: () => void;
    activateEden: () => void;
    acknowledgeEden: () => void;
    openEngineer: () => void;
    receiveSword: () => void;
    finishAcquisition: (item: Acquisition) => void;
    openDeposit: () => void;
    activateSynthesizer: () => void;
    closePanel: () => void;
    send: (event: SessionEvent) => void;
    restartMission: () => void;
    setReady: (ready: boolean) => void;
    setError: (error: string | null) => void;
    setRadio: (radio: string, sender?: string, map?: MapId) => void;
}
function onFootInColony(s: ExpeditionState) {
    return s.ready && s.session.map === 'mars' && s.session.phase === 'walking' && !useGameStore.getState().isPaused;
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
    panel: null, acquisition: null, ready: false, error: null, saveError: null,
    radio: INITIAL_RADIO, radioSender: 'EDEN', radioSerial: 0, radioMap: null, quotaAnnounced: false,
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
            session: { ...INITIAL_SESSION }, spawn: INITIAL_POSITION, panel: null, acquisition: null, ready: false,
            error: null, saveError: developmentSaveError, radio: INITIAL_RADIO, radioSender: 'EDEN', radioSerial: 0, radioMap: null, quotaAnnounced: false });
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
            spawn: INITIAL_POSITION, panel: null, acquisition: null, ready: false, error: null, saveError: null,
            radio: campaignObjective(saved.campaign),
            radioSender: 'Sistema', radioSerial: 0, radioMap: null, quotaAnnounced: false });
        return true;
    },
    returnHome: () => {
        combatRuntime.simulation = null;
        useCampaignStore.getState().leave();
        useCombatStore.getState().restart();
        respawn(INITIAL_POSITION, 'mars');
        set({ profile: developmentIdentity.profile, briefingSeen: developmentIdentity.briefingSeen,
            session: { ...INITIAL_SESSION }, spawn: INITIAL_POSITION, panel: null, acquisition: null, ready: false,
            error: null, saveError: developmentSaveError, radio: INITIAL_RADIO, radioSender: 'EDEN', radioSerial: 0, radioMap: null, quotaAnnounced: false });
    },
    openEngineer: () => {
        const s = get();
        if (onFootInColony(s) && !s.panel && canTalkToEngineer(playerPosition)) {
            set({ panel: 'engineer' });
            if (useCampaignStore.getState().dispatch('finish-engineer-briefing'))
                set({ acquisition: 'rifle', radio: campaignObjective(useCampaignStore.getState().saved!.campaign), radioSender: 'Sistema', radioSerial: 0, radioMap: null });
        }
    },
    openEden: () => {
        const s = get();
        if (!campaignInteractionAllowed('npc:eden') || !onFootInColony(s) || s.panel || !isNearEden(s.session.map))
            return;
        if (useCampaignStore.getState().mode === 'campaign') set({ panel: 'eden' });
        else set({ panel: 'eden', briefingSeen: true, saveError: save(s.profile, true) });
    },
    activateEden: () => {
        const s = get();
        if (onFootInColony(s) && !s.panel && isNearEden(s.session.map) && useCampaignStore.getState().dispatch('activate-eden'))
            s.setRadio('EDEN conectada. Salvager, aproxime-se do pedestal para conversarmos.');
    },
    acknowledgeEden: () => {
        const s = get(), c = useCampaignStore.getState();
        if (!onFootInColony(s) || s.panel !== 'eden') return;
        if (c.mode !== 'campaign') s.setRadio('Siga ao sul até o deck de lançamento. Entre na aeronave e escolha Shanghai.');
        else if (c.dispatch('finish-eden-briefing')) {
            set({ briefingSeen: true });
            s.setRadio('O Engenheiro está à sua espera na Oficina com o facão de plasma.');
        }
        s.closePanel();
    },
    receiveSword: () => {
        const s = get();
        if (onFootInColony(s) && s.panel === 'engineer' && canReceiveSword(playerPosition)
            && useCampaignStore.getState().dispatch('pick-up-sword')) {
            set({ panel: 'acquisition', acquisition: 'machete' });
            s.setRadio('Facão de plasma entregue. Use 2 para equipá-lo. Pode seguir para Shanghai.', 'Engenheiro');
        }
    },
    finishAcquisition: item => {
        const s = get();
        if (s.panel !== 'acquisition' || s.acquisition !== item) return;
        if (item === 'rifle') set({ acquisition: 'sonar' });
        else set({ acquisition: null, panel: null });
    },
    openDeposit: () => {
        if (canOpenMissionDeposit()) set({ panel: 'deposit' });
    },
    activateSynthesizer: () => {
        const s = get(), { x, z, radius } = LABORATORIO.console;
        if (onFootInColony(s) && !s.panel && Math.hypot(playerPosition.x - x, playerPosition.z - z) <= radius
            && useCampaignStore.getState().dispatch('activate-synthesizer'))
            s.setRadio('O sintetizador orgânico está ligado. O Laboratório, a Estufa e o Food Storage receberam energia. Podemos seguir para a próxima expedição.');
    },
    closePanel: () => {
        const s = get();
        if (s.session.phase !== 'walking' || s.panel === 'acquisition') return;
        set({ panel: s.panel === 'engineer' && s.acquisition ? 'acquisition' : null });
    },
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
        if ((event === 'board' || event === 'depart') && (missionDepositRemaining(s.session.map) ?? 0) > 0) return;
        const campaign = useCampaignStore.getState();
        if (event === 'depart' && s.session.map === 'mars' && campaign.mode === 'campaign'
            && campaign.saved && campaignDepartureBlock(campaign.saved.campaign)) return;
        const session = transition(s.session, event);
        if (session === s.session)
            return;
        if (event === 'arrive' && session.map === 'mars' && s.session.map === 'shanghai' && useCampaignStore.getState().mode === 'campaign')
        {
            useCampaignStore.getState().consolidateExpedition(crypto.randomUUID());
            get().setRadio('Chegamos a Marte. A carga da aeronave está consolidada.', 'Sistema', 'mars');
        }
        if (event === 'arrive' && session.map === 'shanghai') {
            useCombatStore.getState().restart();
            set({ quotaAnnounced: false });
            if (campaign.mode === 'campaign' && campaign.saved?.campaign.stage === 'expedition-copper')
                get().setRadio('Conferi aqui, você vai precisar de 04 unidades de cobre.', 'Engenheiro', 'shanghai');
            if (campaign.mode === 'campaign' && campaign.saved?.campaign.stage === 'expedition-organic')
                get().setRadio('Salvager, recolha a matéria orgânica dos mutantes e guarde as amostras na aeronave.', 'EDEN', 'shanghai');
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
        set({ quotaAnnounced: false });
        const spawn = MAPS.shanghai.exit;
        respawn(spawn, 'shanghai');
        set({ spawn, panel: null, session: { ...s.session, revision: s.session.revision + 1 } });
        const radio = 'Nova tentativa. Mova-se, mire com o mouse e use R para recarregar.';
        if (useCampaignStore.getState().mode === 'campaign') get().setRadio(radio, 'Sistema');
        else set({ radio });
    },
    setReady: (ready) => set({ ready }), setError: (error) => set({ error }),
    setRadio: (radio, radioSender = 'EDEN', radioMap = get().session.map) => set(s => ({ radio, radioSender, radioMap, radioSerial: s.radioSerial + 1 }))
}));

export function canOpenMissionDeposit() {
    const s = useExpeditionStore.getState();
    return s.ready && s.session.phase === 'walking' && !s.panel && !useGameStore.getState().isPaused
        && !useCombatStore.getState().dead && s.quotaAnnounced && missionDepositRemaining(s.session.map) !== null
        && isNearMissionDeposit(playerPosition);
}

// A morte é publicada uma vez pela simulação; nenhum polling/render de recursos adicional.
useCombatStore.subscribe((state, previous) => {
    if (state.dead && !previous.dead && useCampaignStore.getState().mode === 'campaign') {
        useCampaignStore.getState().abandonAttempt();
        const sim = combatRuntime.simulation;
        if (sim) { sim.iron = 0; sim.copper = 0; sim.titanium = 0; sim.organic = 0; }
        useCombatStore.setState({ iron: 0, copper: 0, titanium: 0, organic: 0 });
    }
    const c = useCampaignStore.getState(), saved = c.saved;
    if (state.dead || c.mode !== 'campaign' || !saved) return;
    const kind = expeditionQuotaKind(saved.campaign.stage);
    if (!kind || state[kind] === previous[kind]) return;
    const s = useExpeditionStore.getState();
    if (s.quotaAnnounced || !s.ready || s.session.map !== 'shanghai' || s.session.phase === 'travelling') return;
    const backpack = combatRuntime.simulation?.[kind] ?? state[kind];
    const collected = Math.max(0, backpack - c.withdrawnCargo[kind]) + saved.attemptDelivery[kind];
    const delivered = kind === 'copper' ? saved.campaign.copperDelivered : saved.campaign.organicDelivered;
    if (collected > 0 && delivered + collected >= CAMPAIGN_QUOTAS[kind]) {
        useExpeditionStore.setState({ quotaAnnounced: true });
        if (kind === 'organic') s.setRadio(ORGANIC_QUOTA_RADIO);
        else s.setRadio('Já temos cobre suficiente. Guarde na aeronave pelo acesso traseiro e volte a Marte.', 'Engenheiro');
    }
});
// A coleta/transferência publica o HUD depois dos saldos finais; não reage a estados intermediários do save.
