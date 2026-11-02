import { PauseMenuFrame } from '../ui/PauseMenuFrame';
import { GameplayHud, BackpackContents } from '../ui/GameplayHud';
import { activateWorldInteraction } from '../interactions/runtime';
import { AudioControls, AudioLifecycle } from '../audio/AudioRuntime';
import { audio } from '../audio/runtime';
import { CombatHud, EncounterSelect } from '../combat/CombatHud';
import { useCombatStore } from '../state/useCombatStore';
import { lazy, Suspense, useEffect, useState } from 'react';
import { GameCanvas } from './GameCanvas';
import { useExpeditionStore } from '../state/useExpeditionStore';
import { useGameStore } from '../state/useGameStore';
import { MAPS } from '../game/config';
import { PlayerAssetBadge } from '../characters/player/PlayerAssetBadge';
import { comparacaoDisponivel } from '../characters/player/playerAssetChoice';
import { EDEN_BRIEFING, SHANGHAI_BRIEFING } from '../npcs/scripts/eden';
import { disposeWorld } from '../game/worldUtils';
import type { OfficeWorld } from '../world/createOfficeMap';
import type { MapId } from '../game/session';
import { sandwindPanelEnabled } from '../scene/marsColony/sandwindPolicy';
const SandwindPanel = lazy(() => import('../scene/marsColony/ColonySandwind').then(m => ({ default: m.SandwindPanel })));
function Welcome() {
    const [name, setName] = useState(''), [color, setColor] = useState('#66e6ff');
    const start = useExpeditionStore(s => s.start);
    return <main className="welcome"><form onSubmit={e => { e.preventDefault(); void audio.unlock(); start(name, color); }}>
    <p className="eyebrow">EXODEN · PROTÓTIPO</p><h1>O mundo acabou. A humanidade, não.</h1>
    <p>Marte é nosso lar. A Terra guarda os materiais do próximo passo.</p>
    <label>Nome do explorador<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={32} required autoFocus/></label>
    <label>Cor do traje<input type="color" value={color} onChange={e => setColor(e.target.value)}/></label>
    <button disabled={name.trim().length < 2}>Entrar na colônia</button>
  </form></main>;
}
function Runtime() {
    const s = useExpeditionStore();
    const paused = useGameStore(g => g.isPaused);
    const [world, setWorld] = useState<{
        map: MapId;
        data: OfficeWorld;
    } | null>(null);
    const [retry, setRetry] = useState(0), [pauseView, setPauseView] = useState<'menu' | 'backpack'>('menu');
    const requested = s.session.destination ?? s.session.map;
    useEffect(() => {
        let cancelled = false;
        if (world?.map === requested && useExpeditionStore.getState().error) {
            useExpeditionStore.getState().setReady(true);
            return;
        }
        useExpeditionStore.getState().setReady(false);
        (requested === 'mars' ? import('../game/marsWorld') : import('../game/shanghaiWorld')).then(module => {
            if (cancelled)
                return;
            const data = module.createWorld();
            setWorld({ map: requested, data });
            const state = useExpeditionStore.getState();
            if (state.session.phase === 'travelling') {
                state.send('arrive');
                state.setRadio(requested === 'shanghai' ? SHANGHAI_BRIEFING : 'Pousamos em Marte. Desembarque para voltar à colônia.');
            }
            state.setReady(true);
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
    const dead = useCombatStore(state => state.dead);
    useEffect(() => {
        const key = (e: KeyboardEvent) => {
            if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement || (e.target instanceof HTMLElement && e.target.isContentEditable))
                return;
            const state = useExpeditionStore.getState();
            if (!state.ready || state.session.phase === 'travelling' || (state.session.map === 'shanghai' && useCombatStore.getState().dead))
                return;
            if (e.code === 'Escape') {
                if (state.panel === 'eden')
                    state.closePanel();
                else if (state.session.phase === 'walking')
                    useGameStore.getState().togglePaused();
            }
            if (e.code === 'KeyB' && state.session.phase === 'walking' && !state.panel) {
                e.preventDefault(); setPauseView('backpack'); useGameStore.setState({ isPaused: true });
            }
            if (e.code === 'KeyE' && !useGameStore.getState().isPaused) {
                if (state.session.phase === 'aboard')
                    state.send('exit');
                else if (state.panel === 'eden')
                    state.closePanel();
                else if (activateWorldInteraction())
                    e.preventDefault();
            }
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, []);
    return <main className={`runtime ${s.session.map === 'shanghai' ? 'in-combat' : 'in-hub'}`}>
    {world && <GameCanvas key={world.map} world={world.data} map={world.map}/>}
    {world?.map === 'mars' && s.session.map === 'mars' && sandwindPanelEnabled(window.location.search) && <Suspense fallback={null}><SandwindPanel/></Suspense>}
    <header className="beta-header"><div className="beta-location"><b>EXODEN<span> / BETA</span></b><small>{MAPS[s.session.map].title} · {s.profile?.displayName}</small></div>
      <nav><button onClick={() => { setPauseView('menu'); useGameStore.setState({ isPaused: true }); }} disabled={!s.ready || s.session.phase !== 'walking' || !!s.panel || (s.session.map === 'shanghai' && dead)}>Controles <span>☰</span></button><button aria-label={paused ? 'Retomar jogo' : 'Pausar jogo'} disabled={!s.ready || s.session.phase !== 'walking' || !!s.panel || (s.session.map === 'shanghai' && dead)} onClick={() => { setPauseView('menu'); useGameStore.getState().togglePaused(); }}>{paused ? 'RETOMAR' : 'Ⅱ'}</button></nav>
    </header>
    <aside className="beta-objective"><span>OBJETIVO</span>{s.session.map === 'mars' ? 'Prepare sua expedição · Encontre EDEN' : 'Sobreviva às hordas · Recupere materiais'}</aside>
    <GameplayHud combat={s.session.map === 'shanghai'} openBackpack={() => { if (s.ready && s.session.phase === 'walking' && !s.panel && !dead) { setPauseView('backpack'); useGameStore.setState({ isPaused: true }); } }}/>
    {s.session.map === 'shanghai' && <CombatHud/>}
    {s.saveError && <p className="save-warning" role="alert">{s.saveError}</p>}
    {s.panel === 'eden' && <section className="overlay" role="dialog" aria-label="Conversa com EDEN"><article>
      <p className="eyebrow">EDEN · GUIA DA COLÔNIA</p><h2>Uma nova expedição.</h2>{EDEN_BRIEFING.map(line => <p key={line}>{line}</p>)}
      <button onClick={() => { s.setRadio('Siga ao sul até o deck de lançamento. Entre na aeronave e escolha Shanghai.'); s.closePanel(); }}>Entendido · Voltar à exploração</button>
    </article></section>}
    {s.panel === 'ship' && s.session.phase === 'aboard' && s.ready && <section className="overlay" role="dialog" aria-label="Cabine da aeronave"><article>
      <p className="eyebrow">AERONAVE · ESTACIONADA</p><h2>{s.session.map === 'mars' ? 'Deck de lançamento · Marte' : 'Área de pouso · Shanghai'}</h2>
      <p>Você está a bordo. Pode desembarcar antes de iniciar a viagem.</p>
      <label>Destino<select value={s.session.map === 'mars' ? 'shanghai' : 'mars'} onChange={() => { }}><option value={s.session.map === 'mars' ? 'shanghai' : 'mars'}>{s.session.map === 'mars' ? 'Terra · Shanghai' : 'Marte · Colônia humana'}</option></select></label>
      {s.session.map === 'mars' && <EncounterSelect/>}
      {s.session.map === 'shanghai' && <p>Retorno livre à colônia. As peças desta tentativa são temporárias.</p>}
      <div className="actions"><button onClick={() => s.send('depart')}>{s.session.map === 'mars' ? 'Decolar para Shanghai' : 'Retornar a Marte'}</button><button className="secondary" onClick={() => s.send('exit')}>Desembarcar · E</button></div>
    </article></section>}
    {paused && !(s.session.map === 'shanghai' && dead) && <PauseMenuFrame label={pauseView === 'backpack' ? 'Mochila' : 'Pausa e controles'}>
      <div className="beta-menu-heading"><p className="eyebrow">EXODEN · EXPLORAÇÃO PAUSADA</p><button className="secondary" onClick={() => useGameStore.setState({ isPaused: false })} aria-label="Fechar menu">✕</button></div>
      <div className="beta-menu-tabs"><button className={pauseView === 'menu' ? 'is-active' : 'secondary'} onClick={() => setPauseView('menu')}>Controles</button><button className={pauseView === 'backpack' ? 'is-active' : 'secondary'} onClick={() => setPauseView('backpack')}>Mochila</button></div>
      {pauseView === 'backpack' ? <BackpackContents combat={s.session.map === 'shanghai'}/> : <>
        <h2>À sua maneira.</h2><dl className="beta-control-list"><div><dt>W / S</dt><dd>Correr pela mira / recuar</dd></div><div><dt>MOUSE</dt><dd>Mirar · botão esquerdo para atirar</dd></div><div><dt>ESPAÇO</dt><dd>Dash em Shanghai · 2 cargas · recarga total em 5 s</dd></div><div><dt>R / E</dt><dd>Recarregar / interagir</dd></div><div><dt>Q / C</dt><dd>Girar câmera · roda para zoom</dd></div><div><dt>B / ESC / M</dt><dd>Mochila / pausa / som</dd></div></dl>
        <AudioControls/>
        <details className="beta-radio-log"><summary>Última transmissão · EDEN</summary><p>{s.radio}</p></details>
        {s.session.map === 'shanghai' && <details className="beta-test-tools"><summary>Encontro de teste</summary><EncounterSelect/><button onClick={() => { s.restartMission(); }}>Reiniciar encontro</button></details>}
        {comparacaoDisponivel() && <details className="beta-test-tools"><summary>Comparação de personagem</summary><PlayerAssetBadge/></details>}
      </>}
      <button className="beta-resume" onClick={() => useGameStore.setState({ isPaused: false })}>Voltar à exploração <span>ESC</span></button>
    </PauseMenuFrame>}
    {(!s.ready || s.error) && <section className="overlay" role="status"><article><h2>{s.error ? 'Viagem interrompida' : s.session.phase === 'travelling' ? 'Viajando…' : 'Preparando o mapa…'}</h2><p>{s.error ?? 'Aguarde o carregamento da região.'}</p>{s.error && <button onClick={() => { s.setError(null); if (world && s.session.phase === 'aboard')
        s.send('depart');
    else
        setRetry(x => x + 1); }}>Tentar novamente</button>}</article></section>}
  </main>;
}
export function App() { const profile = useExpeditionStore(s => s.profile); return <><AudioLifecycle/>{profile ? <Runtime /> : <Welcome />}</>; }
