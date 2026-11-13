import { Pause, Play, Settings } from 'lucide-react';
import { WeaponControls } from '../characters/player/WeaponControls';
import { ControlList } from '../ui/ControlList';
import { HomeScreen } from '../ui/HomeScreen';
import { useCampaignStore } from '../state/useCampaignStore';
import { engineerBriefingRequired, missionDepositRemaining } from '../game/campaignPolicy';
import { RadioToast } from '../ui/RadioToast';
import { campaignObjective } from '../game/campaign';
import { EngineerDialogue } from '../npcs/EngineerDialogue';
import { canReceiveSword } from '../npcs/engineerPresence';
import { sessionEscape } from '../game/sessionEscape';
import { engineerIsCalm, engineerPreviewMood } from '../npcs/engineerRoutine';
import { PauseMenuFrame } from '../ui/PauseMenuFrame';
import { GameplayHud, BackpackContents } from '../ui/GameplayHud';
import { MissionDepositPanel, ShipCargoPanel } from '../ui/ShipCargoPanel';
import { EquipmentAcquisition } from '../ui/EquipmentAcquisition';
import { ShipCockpit } from '../ui/ShipCockpit';
import { OPEN_CARGO_EVENT, isNearCargo } from '../game/shipCargo';
import { playerPosition } from '../state/playerTransient';
import { activateWorldInteraction } from '../interactions/runtime';
import { AudioControls, AudioLifecycle } from '../audio/AudioRuntime';
import { CombatHud, EncounterSelect } from '../combat/CombatHud';
import { useCombatStore } from '../state/useCombatStore';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { GameCanvas } from './GameCanvas';
import { useExpeditionStore, SCENE_STALLED_ERROR } from '../state/useExpeditionStore';
import { useGameStore } from '../state/useGameStore';
import { MAPS, isExpedition } from '../game/config';
import { PlayerAssetBadge } from '../characters/player/PlayerAssetBadge';
import { comparacaoDisponivel } from '../characters/player/playerAssetChoice';
import { CAMPAIGN_EDEN_BRIEFING, EDEN_BRIEFING, SHANGHAI_BRIEFING, RIO_BRIEFING } from '../npcs/scripts/eden';
import { disposeWorld } from '../game/worldUtils';
import type { OfficeWorld } from '../world/createOfficeMap';
import type { MapId } from '../game/session';
import { sandwindPanelEnabled } from '../scene/marsColony/sandwindPolicy';
const SandwindPanel = lazy(() => import('../scene/marsColony/ColonySandwind').then(m => ({ default: m.SandwindPanel })));
const SCENE_STALL_MS = 90000;
const loadWorld = {
    mars: () => import('../game/marsWorld'),
    shanghai: () => import('../game/shanghaiWorld'),
    rio: () => import('../game/rio/world'),
};
const ARRIVAL_BRIEFING: Record<MapId, string> = {
    mars: 'Pousamos em Marte. Desembarque para voltar à colônia.',
    shanghai: SHANGHAI_BRIEFING,
    rio: RIO_BRIEFING,
};
function Runtime({ onHome }: { onHome: () => void }) {
    const s = useExpeditionStore();
    const combat = isExpedition(s.session.map);
    const campaign = useCampaignStore();
    const briefingRequired = engineerBriefingRequired(campaign);
    const progress = campaign.mode === 'campaign' ? campaign.saved?.campaign : undefined;
    const depositRemaining = missionDepositRemaining(s.session.map, campaign);
    const [engineerPreview] = useState(() => engineerPreviewMood(window.location.search));
    const paused = useGameStore(g => g.isPaused);
    const [world, setWorld] = useState<{
        map: MapId;
        data: OfficeWorld;
    } | null>(null);
    const [retry, setRetry] = useState(0), [pauseView, setPauseView] = useState<'pause' | 'menu' | 'backpack' | 'cargo'>('pause');
    const pauseViewRef = useRef(pauseView);
    pauseViewRef.current = pauseView;
    const dead = useCombatStore(state => state.dead);
    const settingsRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!paused) { setPauseView('pause'); settingsRef.current?.focus({ preventScroll: true }); }
    }, [paused]);
    const openControls = () => { setPauseView('menu'); useGameStore.setState({ isPaused: true }); };
    const settingsButton = <button ref={settingsRef} className="game-settings-button" onClick={openControls} aria-label="Abrir controles e opções" title="Controles e opções"
        disabled={!s.ready || s.session.phase !== 'walking' || !!s.panel || (combat && dead)}><Settings size={22} aria-hidden="true"/></button>;
    const pauseButton = <button className="game-settings-button" aria-label={paused ? 'Retomar jogo' : 'Pausar jogo'} title={paused ? 'Retomar jogo' : 'Pausar jogo'}
        disabled={!s.ready || s.session.phase !== 'walking' || !!s.panel || (combat && dead)}
        onClick={() => { setPauseView('pause'); useGameStore.getState().togglePaused(); }}>{paused ? <Play size={22} aria-hidden="true"/> : <Pause size={22} aria-hidden="true"/>}</button>;
    const requested = s.session.destination ?? s.session.map;
    useEffect(() => {
        let cancelled = false;
        if (world?.map === requested && useExpeditionStore.getState().error) {
            useExpeditionStore.getState().setReady(true);
            return;
        }
        useExpeditionStore.getState().setReady(false);
        loadWorld[requested]().then(module => {
            if (cancelled)
                return;
            const data = module.createWorld();
            setWorld({ map: requested, data });
            const state = useExpeditionStore.getState();
            if (state.session.phase === 'travelling') {
                state.send('arrive');
                if (useCampaignStore.getState().mode !== 'campaign') state.setRadio(ARRIVAL_BRIEFING[requested]);
            }
            // setReady(true) vem de SceneReady, quando o mapa já desenhou.
            state.setError(null);
        }).catch(() => {
            if (cancelled)
                return;
            const state = useExpeditionStore.getState();
            state.send('fail');
            state.setReady(Boolean(world));
            state.setError('Não foi possível carregar o destino. Tente novamente. Sua sessão foi preservada.');
        });
        return () => { cancelled = true; };
    }, [requested, retry]);
    useEffect(() => () => { if (world)
        disposeWorld(world.data); }, [world]);
    useEffect(() => {
        if (s.ready || s.error) return;
        const timer = window.setTimeout(() => { if (!useExpeditionStore.getState().ready) useExpeditionStore.getState().setError(SCENE_STALLED_ERROR); }, SCENE_STALL_MS);
        return () => window.clearTimeout(timer);
    }, [s.ready, s.error]);
    useEffect(() => {
        /** F, balão ou botão: abre o porão perto da aeronave; F de novo fecha. */
        const toggleCargo = () => {
            const state = useExpeditionStore.getState();
            if (missionDepositRemaining(state.session.map) !== null) {
                if (state.panel === 'deposit') state.closePanel();
                else state.openDeposit();
                return state.panel === 'deposit' || useExpeditionStore.getState().panel === 'deposit';
            }
            if (engineerBriefingRequired() || !state.ready || state.session.phase !== 'walking' || state.panel || (isExpedition(state.session.map) && useCombatStore.getState().dead) || !isNearCargo(state.session.map, playerPosition)) return false;
            if (useGameStore.getState().isPaused && pauseViewRef.current === 'cargo') useGameStore.setState({ isPaused: false });
            else { setPauseView('cargo'); useGameStore.setState({ isPaused: true }); }
            return true;
        };
        const key = (e: KeyboardEvent) => {
            if (e.repeat || (e.code !== 'Escape' && (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement || (e.target instanceof HTMLElement && e.target.isContentEditable))))
                return;
            const state = useExpeditionStore.getState();
            if (!state.ready || state.session.phase === 'travelling' || (isExpedition(state.session.map) && useCombatStore.getState().dead))
                return;
            if (state.panel === 'acquisition') {
                if (e.code === 'Escape' && state.acquisition) { e.preventDefault(); state.finishAcquisition(state.acquisition); }
                return;
            }
            if (e.code === 'Escape') {
                const action = sessionEscape(state.session.phase, useGameStore.getState().isPaused, state.panel);
                if (action === 'resume' || action === 'pause') {
                    if (action === 'pause') setPauseView('pause');
                    useGameStore.getState().togglePaused();
                }
                else if (action === 'exit')
                    state.send('exit');
                else if (action === 'close-dialogue')
                    state.closePanel();
            }
            if (e.code === 'KeyB' && !engineerBriefingRequired() && state.session.phase === 'walking' && !state.panel) {
                e.preventDefault(); setPauseView('backpack'); useGameStore.setState({ isPaused: true });
            }
            if (e.code === 'KeyF' && toggleCargo()) e.preventDefault();
            if (e.code === 'KeyE' && !useGameStore.getState().isPaused) {
                if (state.session.phase === 'aboard')
                    state.send('exit');
                else if (state.panel === 'eden' || state.panel === 'engineer' || state.panel === 'deposit')
                    state.closePanel();
                else if (activateWorldInteraction())
                    e.preventDefault();
            }
        };
        window.addEventListener('keydown', key);
        window.addEventListener(OPEN_CARGO_EVENT, toggleCargo);
        return () => { window.removeEventListener('keydown', key); window.removeEventListener(OPEN_CARGO_EVENT, toggleCargo); };
    }, []);
    const inCockpit = s.panel === 'ship' && s.session.phase !== 'walking';
    const objective = depositRemaining === 0 ? 'Embarque pela escada da aeronave'
        : depositRemaining !== null && s.quotaAnnounced ? `Deposite a carga na traseira da aeronave · faltam ${depositRemaining} no porão`
        : progress ? campaignObjective(progress) : s.session.map === 'mars' ? 'Prepare sua expedição · Encontre EDEN' : 'Sobreviva às hordas · Recupere materiais';
    return <main className={`runtime ${combat ? 'in-combat' : 'in-hub'}${s.session.map === 'rio' ? ' in-rio' : ''}${s.panel === 'deposit' ? ' is-deposit-open' : ''}`}>
    <WeaponControls/>
    {world && <GameCanvas key={world.map} world={world.data} map={world.map}/>}
    {world?.map === 'mars' && s.session.map === 'mars' && sandwindPanelEnabled(window.location.search) && <Suspense fallback={null}><SandwindPanel/></Suspense>}
    {!inCockpit && <><header className="beta-header"><div className="beta-location"><b>EXODEN<span> / BETA</span></b><small>{MAPS[s.session.map].title} · {s.profile?.displayName}</small></div>
      <nav aria-label="Menu do jogo">{!paused && <>{settingsButton}{pauseButton}</>}</nav>
    </header>
    <aside className="beta-objective"><span>OBJETIVO</span>{objective}</aside>
    <GameplayHud combat={combat} map={s.session.map} openBackpack={() => { if (!engineerBriefingRequired() && s.ready && s.session.phase === 'walking' && !s.panel && !dead) { setPauseView('backpack'); useGameStore.setState({ isPaused: true }); } }}
      openCargo={() => {
          if (depositRemaining !== null) s.openDeposit();
          else if (!engineerBriefingRequired() && isNearCargo(s.session.map, playerPosition) && s.ready && s.session.phase === 'walking' && !s.panel && !dead) { setPauseView('cargo'); useGameStore.setState({ isPaused: true }); }
      }}/>
    {combat && <CombatHud/>}</>}
    {(campaign.mode === 'campaign' || s.session.map === 'rio') && <RadioToast text={s.radio} sender={s.radioSender} serial={s.radioSerial} active={s.ready && !paused && !s.panel && s.session.phase === 'walking' && s.radioMap === s.session.map}/>}
    {(campaign.mode === 'campaign' ? campaign.saveError : s.saveError) && <p className="save-warning" role="alert">{campaign.mode === 'campaign' ? campaign.saveError : s.saveError}</p>}
    {s.panel === 'eden' && <section className="overlay" role="dialog" aria-label="Conversa com EDEN"><article>
      <p className="eyebrow">EDEN · GUIA DA COLÔNIA</p><h2>Uma nova expedição.</h2>
      {progress && progress.stage !== 'eden-briefing' ? <p>{campaignObjective(progress)}.</p>
          : (progress ? CAMPAIGN_EDEN_BRIEFING : EDEN_BRIEFING).map(line => <p key={line}>{line}</p>)}
      <button onClick={s.acknowledgeEden}>Entendido · Voltar à exploração</button>
    </article></section>}
    {s.panel === 'engineer' && !paused && <EngineerDialogue calm={engineerIsCalm(campaign.mode, campaign.saved?.campaign.edenActive ?? false, engineerPreview)}
      copperMission={progress?.stage === 'expedition-copper'}
      returnBriefing={progress?.stage === 'engineer-return-briefing'}
      swordPickup={progress?.stage === 'sword-pickup' && canReceiveSword(playerPosition)}/>}
    {s.panel === 'acquisition' && s.acquisition && <EquipmentAcquisition key={s.acquisition} item={s.acquisition} onFinish={s.finishAcquisition}/>}
    {s.panel === 'deposit' && <MissionDepositPanel onClose={s.closePanel}/>}
    {inCockpit && <ShipCockpit map={s.session.map} phase={s.session.phase} ready={s.ready} error={s.error} name={s.profile?.displayName ?? 'Explorador'}
      onDepart={destination => s.send('depart', destination)} onExit={() => s.send('exit')} onRetry={destination => { if (s.error === SCENE_STALLED_ERROR) { window.location.reload(); return; } s.setError(null); s.send('depart', destination); }}
      encounter={campaign.mode !== 'campaign' && s.session.map === 'mars' ? <EncounterSelect/> : undefined}/>}
    {paused && pauseView === 'pause' && !(combat && dead) && <PauseMenuFrame label="Jogo pausado" minimal tools={<div className="pause-settings">{settingsButton}{pauseButton}</div>}>
      <h2>Pausado</h2><button className="secondary" onClick={() => useGameStore.setState({ isPaused: false })}>Retomar · ESC</button>
    </PauseMenuFrame>}
    {paused && pauseView !== 'pause' && !(combat && dead) && <PauseMenuFrame label={pauseView === 'backpack' ? 'Mochila' : pauseView === 'cargo' ? 'Carga da aeronave' : 'Controles e opções'} wide={pauseView === 'cargo'}>
      <div className="beta-menu-heading"><p className="eyebrow">EXODEN · EXPLORAÇÃO PAUSADA</p><button className="secondary" onClick={() => useGameStore.setState({ isPaused: false })} aria-label="Fechar menu">✕</button></div>
      <div className="beta-menu-tabs"><button className={pauseView === 'menu' ? 'is-active' : 'secondary'} onClick={() => setPauseView('menu')}>Controles</button>
        {!briefingRequired && <button className={pauseView === 'backpack' ? 'is-active' : 'secondary'} onClick={() => setPauseView('backpack')}>Mochila</button>}
        {!briefingRequired && depositRemaining === null && <button className={pauseView === 'cargo' ? 'is-active' : 'secondary'} onClick={() => setPauseView('cargo')}>Aeronave</button>}
      </div>
      {pauseView === 'cargo' ? <ShipCargoPanel map={s.session.map}/> : pauseView === 'backpack' ? <BackpackContents combat={combat}/> : <>
        <h2>À sua maneira.</h2><ControlList/>
        <AudioControls/>
        <details className="beta-radio-log"><summary>Última transmissão · {s.radioSender}</summary><p>{s.radio}</p></details>
        {campaign.mode !== 'campaign' && combat && <details className="beta-test-tools"><summary>Encontro de teste</summary><EncounterSelect/><button onClick={() => { s.restartMission(); }}>Reiniciar encontro</button></details>}
        {comparacaoDisponivel() && <details className="beta-test-tools"><summary>Comparação de personagem</summary><PlayerAssetBadge/></details>}
      </>}
      <button className="beta-resume" onClick={() => useGameStore.setState({ isPaused: false })}>Voltar à exploração <span>ESC</span></button>
      {campaign.mode === 'campaign' && combat && <p className="pause-exit-note">Sair descarta a mochila e o saldo de carga desta tentativa.</p>}
      <button className="secondary" onClick={onHome}>Sair e voltar ao menu principal</button>
    </PauseMenuFrame>}
    {!inCockpit && (!s.ready || s.error) && <section className="overlay" role="status"><article><h2>{s.error ? 'Viagem interrompida' : s.session.phase === 'travelling' ? 'Viajando…' : 'Preparando o mapa…'}</h2><p>{s.error ?? 'Aguarde o carregamento da região.'}</p>{s.error && <button onClick={() => { if (s.error === SCENE_STALLED_ERROR) { window.location.reload(); return; } s.setError(null); if (world && s.session.phase === 'aboard')
        s.send('depart');
    else
        setRetry(x => x + 1); }}>Tentar novamente</button>}</article></section>}
  </main>;
}
export function App() {
    const profile = useExpeditionStore(s => s.profile), [entered, setEntered] = useState(false);
    const [exited, setExited] = useState(false);
    const home = !entered || !profile;
    if (exited) return <main className="home-exited">
        <h1>Sessão encerrada</h1>
        <button type="button" onClick={() => setExited(false)}>Voltar ao menu</button>
    </main>;
    return <><AudioLifecycle home={home}/>{home ? <HomeScreen onEnter={() => setEntered(true)} onExit={() => setExited(true)}/> : <Runtime onHome={() => { setEntered(false); useExpeditionStore.getState().returnHome(); }}/>}</>;
}
