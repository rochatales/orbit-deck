import { useCombatStore } from '../state/useCombatStore';
import { useCampaignStore } from '../state/useCampaignStore';
import { campaignDepartureBlock } from '../game/campaign';
import { missionDepositRemaining } from '../game/campaignPolicy';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowUpRight, ChevronRight, Package, Plane, Radio, LogOut } from 'lucide-react';
import type { ExpeditionMapId, MapId, TravelPhase } from '../game/session';
import { cargoWeight } from '../game/backpackConfig';
import { SHIP_CARGO, shipCapacityLabel } from '../game/shipCargo';
import { useShipCargoStore } from '../state/useShipCargoStore';
import { ShipCargoPanel } from './ShipCargoPanel';
import { bindBackgroundVideo } from './backgroundVideo';
import { bindDialogFocus } from './dialogFocus';
import { EARTH_DOTS, GLOBE_TARGETS, MARS_DOTS, globeDotsPath, globeGridPath, globePoint, globeTween, globeViewFor, type GlobeTarget, type GlobeView } from './cockpitGlobe';
import { BOOT, WARP_STREAKS, flightStep, type BootMode, type CockpitSounds, type FlightStage } from './cockpitSequence';
import frameUrl from '../assets/ui/cockpit/cabine.jpg';
import marsVideo from '../assets/ui/cockpit/mars.mp4';
import shanghaiVideo from '../assets/ui/cockpit/shanghai.mp4';
import marsPoster from '../assets/ui/cockpit/mars.png';
import shanghaiPoster from '../assets/ui/cockpit/shanghai.png';
import './ship-cockpit.css';

const RIO_ROUTE = { destination: 'Rio de Janeiro', destinationPlanet: 'TERRA', description: 'Orla do Rio de Janeiro. Explore a avenida e a praia, e procure suprimentos nos quiosques.', action: 'Decolar para Rio de Janeiro' };
const EXTERIOR = {
    mars: { video: marsVideo, poster: marsPoster, planet: 'MARTE', location: 'Colônia humana', destination: 'Shanghai', destinationPlanet: 'TERRA', description: 'Ruínas de Shanghai. Explore a cidade, enfrente as ameaças e recupere materiais para a colônia.', action: 'Decolar para Shanghai' },
    shanghai: { video: shanghaiVideo, poster: shanghaiPoster, planet: 'TERRA', location: 'Shanghai', destination: 'Colônia humana', destinationPlanet: 'MARTE', description: 'Nosso lar, em Marte. Retorne ao deck de lançamento e desembarque para voltar à colônia.', action: 'Retornar a Marte' },
    rio: { video: shanghaiVideo, poster: shanghaiPoster, planet: 'TERRA', location: 'Rio de Janeiro', destination: 'Colônia humana', destinationPlanet: 'MARTE', description: 'Retorne ao deck de lançamento e desembarque para voltar à colônia de Marte.', action: 'Retornar a Marte' }
} as const;
/** Telas, faixas e botões do painel na arte da cabine (1200 × 896): acendem na entrada. */
const PANEL_LIGHTS = [
    [300, 590, 100, 5], [430, 576, 82, 5], [548, 565, 107, 5], [690, 576, 82, 5], [800, 588, 100, 5],
    [302, 618, 66, 42], [434, 598, 72, 44], [694, 598, 74, 44], [560, 740, 38, 24],
    [385, 603, 24, 70], [432, 655, 72, 22], [700, 662, 80, 14]
] as const;
const GLOBE_RADIUS = 100;
/** A primeira entrada da sessão mostra a partida completa; as seguintes são curtas. */
let boardedOnce = false;

function CockpitExterior({ map }: { map: MapId }) {
    const video = useRef<HTMLVideoElement>(null), exterior = EXTERIOR[map];
    useEffect(() => bindBackgroundVideo(video.current!, exterior.video, document, window.matchMedia('(prefers-reduced-motion: reduce)')), [exterior.video]);
    return <div className={`cockpit-scenery is-${map}`} aria-hidden="true">
        <img className="cockpit-poster" src={exterior.poster} alt=""/>
        <video ref={video} className="cockpit-video" poster={exterior.poster} muted loop playsInline preload="metadata"/>
        <div className="cockpit-glass"/>
        <div className="cockpit-smoke"/>
        <div className="cockpit-warp">{WARP_STREAKS.map((streak, index) => <i key={index}
            style={{ '--a': `${streak.angle}deg`, animationDelay: `-${streak.delay}s`, animationDuration: `${streak.duration}s` } as CSSProperties}/>)}</div>
        <div className="cockpit-clouds"/>
        <svg className="cockpit-frame" viewBox="0 0 1200 896" preserveAspectRatio="xMidYMid slice">
            <defs><mask id="cockpit-windows" maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="896">
                <rect width="1200" height="896" fill="white"/>
                <path fill="black" d="M364 140H830L764 237H435Z M205 213L333 149L410 245L340 281Z M789 245L867 149L992 212L857 281Z M376 314L441 279H761L828 313L720 527H484Z M207 276L328 335L451 536L272 573Z M870 333L994 277L927 574L752 535Z M0 201L29 226L180 552L167 598L0 639Z M1200 202L1170 230L1019 554L1032 598L1200 642Z"/>
            </mask></defs>
            <image href={frameUrl} width="1200" height="896" mask="url(#cockpit-windows)"/>
            <g className="cockpit-lights">{PANEL_LIGHTS.map(([x, y, width, height], index) => <rect key={index} className={index > 8 ? 'is-warm' : undefined}
                x={x} y={y} width={width} height={height} style={{ animationDelay: `${(index * 7 % 12) * .09}s` }}/>)}</g>
        </svg>
        <div className="cockpit-shade"/>
        <div className="cockpit-visor"/>
    </div>;
}

/** Globo de pontos: gira até o destino e marca a cidade. Só existe com o menu aberto. */
function CockpitGlobe({ target }: { target: GlobeTarget }) {
    const [view, setView] = useState<GlobeView>(globeViewFor(target));
    const current = useRef<GlobeView | null>(null);
    useEffect(() => {
        const to = globeViewFor(target), from = current.current ?? { lon: to.lon - 90, lat: 0 };
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { current.current = to; setView(to); return; }
        const start = performance.now();
        let frame = requestAnimationFrame(function turn(now) {
            const t = Math.min(1, (now - start) / 900), next = globeTween(from, to, t);
            current.current = next; setView(next);
            if (t < 1) frame = requestAnimationFrame(turn);
        });
        return () => cancelAnimationFrame(frame);
    }, [target.body, target.lon, target.lat]);
    const mark = globePoint(target.lon, target.lat, view, GLOBE_RADIUS);
    return <svg className={`cockpit-globe is-${target.body}`} viewBox="-132 -132 264 264" aria-hidden="true">
        <circle className="globe-halo" r={GLOBE_RADIUS + 5}/>
        <circle className="globe-rim" r={GLOBE_RADIUS}/>
        <path className="globe-grid" d={globeGridPath(view, GLOBE_RADIUS)}/>
        <path className="globe-land" d={globeDotsPath(target.body === 'earth' ? EARTH_DOTS : MARS_DOTS, view, GLOBE_RADIUS)}/>
        <line className="globe-axis" x1="0" y1="-124" x2="0" y2="124"/>
        <ellipse className="globe-orbit" rx="126" ry="27" transform="rotate(-14)"/>
        {mark.visible && <g className="globe-mark" transform={`translate(${mark.x.toFixed(1)} ${mark.y.toFixed(1)})`}><circle className="globe-ping" r="9"/><circle r="3"/></g>}
    </svg>;
}

export interface ShipCockpitProps {
    map: MapId;
    phase: TravelPhase;
    ready: boolean;
    error: string | null;
    name: string;
    onDepart: (destination?: ExpeditionMapId) => void;
    onExit: () => void;
    onRetry: (destination?: ExpeditionMapId) => void;
    encounter?: ReactNode;
    /** Sons da cabine; sem eles a sequência é só visual (testes e áudio bloqueado). */
    sounds?: CockpitSounds;
}

/** Cabine de navegação: sessão real, porão persistente e ações separadas de voo/desembarque. */
export function ShipCockpit({ map, phase, ready, error, name, onDepart, onExit, onRetry, encounter, sounds }: ShipCockpitProps) {
    const campaign = useCampaignStore(s => s.mode === 'campaign');
    const edenActive = useCampaignStore(s => s.mode !== 'campaign' || !!s.saved?.campaign.edenActive);
    const colonyBlock = useCampaignStore(s => map === 'mars' && s.mode === 'campaign' && s.saved
        ? campaignDepartureBlock(s.saved.campaign) : null);
    const depositRemaining = useCampaignStore(s => missionDepositRemaining(map, s));
    const remainingThreats = useCombatStore(s => Math.max(0, s.total - s.kills));
    const cleared = useCombatStore(s => s.cleared);
    const extracting = campaign && map === 'shanghai';
    const departureBlock = extracting && !cleared ? 'Neutralize as ameaças para liberar a decolagem.' : colonyBlock;
    const [tab, setTab] = useState<'navigation' | 'cargo'>('navigation');
    const [outbound, setOutbound] = useState<ExpeditionMapId>('shanghai');
    const busy = !ready || phase === 'travelling';
    const [boot] = useState<BootMode>(boardedOnce ? 'quick' : 'full');
    const [stage, setStage] = useState<FlightStage>(busy ? 'warp' : 'idle');
    const [clock, setClock] = useState(0);
    const stageSince = useRef(0), previousStage = useRef<FlightStage>(stage), sceneMap = useRef(map);
    // A vista só troca de mapa escondida pelas estrelas: nunca durante a fumaça da decolagem.
    if (stage !== 'launch') sceneMap.current = map;
    const selectDestination = map === 'mars' && !campaign;
    const destination = selectDestination ? outbound : undefined;
    const root = useRef<HTMLElement>(null), exterior = EXTERIOR[map];
    const info = destination === 'rio' ? { ...exterior, ...RIO_ROUTE } : exterior;
    const target: GlobeTarget = map === 'mars' ? GLOBE_TARGETS[destination ?? 'shanghai'] : GLOBE_TARGETS.mars;
    const hold = cargoWeight(useShipCargoStore(s => s.cargo));
    const flying = busy || stage !== 'idle';
    useEffect(() => bindDialogFocus(root.current!, document), []);
    useEffect(() => { if (map !== 'mars') setOutbound('shanghai'); }, [map]);
    // Um voo/chegada nunca deixa os controles de carga da outra região ativos.
    useEffect(() => { setTab('navigation'); }, [map, phase]);
    useEffect(() => {
        const mode = boot, reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        boardedOnce = true;
        if (reduced || !sounds) return;
        if (mode === 'full') sounds.cue('engineStart');
        const panel = mode === 'full' ? window.setTimeout(() => sounds.cue('panel'), BOOT.full.panelMs) : 0;
        const hologram = window.setTimeout(() => sounds.cue('hologram'), BOOT[mode].hologramMs);
        return () => { window.clearTimeout(panel); window.clearTimeout(hologram); };
    }, []);
    useEffect(() => {
        if (error) { if (stage !== 'idle') setStage('idle'); return; }
        const now = performance.now(), step = flightStep(stage, busy, now - stageSince.current);
        if (step.stage !== stage) { stageSince.current = now; setStage(step.stage); return; }
        if (step.wait === null) return;
        const timer = window.setTimeout(() => setClock(value => value + 1), step.wait);
        return () => window.clearTimeout(timer);
    }, [stage, busy, error, clock]);
    useEffect(() => {
        const before = previousStage.current;
        previousStage.current = stage;
        if (!sounds || before === stage) return;
        if (stage === 'launch') sounds.cue('takeoff');
        sounds.warp(stage === 'warp');
        if (stage === 'landing') sounds.cue('landing');
        if (stage === 'idle' && before === 'landing') { sounds.cue('engineStop'); sounds.cue('hologram'); }
    }, [stage]);
    useEffect(() => () => sounds?.warp(false), []);
    const choose = (id: ExpeditionMapId) => { if (id !== outbound) { setOutbound(id); sounds?.cue('globe'); } };
    const open = (next: 'navigation' | 'cargo') => { if (next !== tab) { setTab(next); sounds?.cue('tick'); } };
    return <section className="ship-cockpit" role="dialog" aria-modal="true" aria-label="Cabine da aeronave" ref={root} tabIndex={-1} data-boot={boot} data-stage={stage}>
        <CockpitExterior map={sceneMap.current}/>
        <div className="cockpit-boot" aria-hidden="true"/>
        <header className="cockpit-header">
            <div className="cockpit-brand"><Plane aria-hidden="true"/><span>ARES–I<small>EXODEN / NAVEGAÇÃO</small></span></div>
            <div className="cockpit-signal"><i/>{flying ? 'EM TRÂNSITO' : error ? 'VOO INTERROMPIDO' : 'ESTACIONADA'}<span><Radio size={13} aria-hidden="true"/> {edenActive ? 'EDEN · CONECTADA' : 'ENGENHEIRO · RÁDIO'}</span></div>
            <button className="cockpit-close" disabled={flying} onClick={onExit} aria-label="Desembarcar da aeronave"><LogOut size={17} aria-hidden="true"/> Desembarcar <kbd>E / ESC</kbd></button>
        </header>
        <div className="cockpit-console">
            {flying || error ? <section className="cockpit-flight cockpit-hologram" role="status" aria-live="polite">
                <p className="cockpit-kicker">CONTROLE DE VOO / {edenActive ? 'EDEN' : 'ENGENHEIRO'}</p>
                <h1>{error ? 'Viagem interrompida' : busy ? 'Preparando a chegada' : 'Pouso em andamento'}</h1>
                <p>{error ?? (busy ? 'Carregando a região de destino. Aguarde para desembarcar.' : 'Aguarde a aeronave tocar o solo para desembarcar.')}</p>
                {error && <button className="cockpit-depart" disabled={!!departureBlock} onClick={() => onRetry(destination)}>Tentar novamente <ArrowUpRight size={20}/></button>}
            </section> : <>
                <nav className="cockpit-tabs" aria-label="Painéis da cabine">
                    <button aria-pressed={tab === 'navigation'} onClick={() => open('navigation')}><Plane size={15} aria-hidden="true"/> Navegação</button>
                    {depositRemaining === null && <button aria-pressed={tab === 'cargo'} onClick={() => open('cargo')}><Package size={15} aria-hidden="true"/> Carga <small>{hold.toFixed(1).replace('.', ',')} / {shipCapacityLabel(hold)}</small></button>}
                </nav>
                {tab === 'cargo' && depositRemaining === null ? <div className="cockpit-cargo cockpit-hologram"><ShipCargoPanel map={map}/></div> : <div className="cockpit-navigation">
                    <section className="cockpit-route cockpit-hologram">
                        <p className="cockpit-kicker">01 / DESTINO</p>
                        <div className="cockpit-target">
                            <CockpitGlobe target={target}/>
                            <p className="cockpit-coords"><span>ALVO</span>{target.label}<small>{target.coords}</small></p>
                        </div>
                        {selectDestination && <div className="cockpit-destination" role="group" aria-label="Destino da expedição">
                            <button aria-pressed={outbound === 'shanghai'} onClick={() => choose('shanghai')}>Shanghai</button>
                            <button aria-pressed={outbound === 'rio'} onClick={() => choose('rio')}>Rio de Janeiro</button>
                        </div>}
                        <div className="cockpit-route-heading"><div><span>{info.destinationPlanet}</span><h2>{info.destination}</h2></div><ArrowUpRight aria-hidden="true"/></div>
                        <p>{info.description}</p>
                        {extracting && <p role="status">{cleared ? 'Mapa limpo' : `Inimigos restantes · ${remainingThreats}`}
                            {depositRemaining !== null && ` · ${depositRemaining === 0 ? 'Cota no porão' : `Faltam ${depositRemaining} para a cota`}`}</p>}
                        {encounter && <details className="cockpit-encounter"><summary>Configurar encontro de teste <ChevronRight size={13}/></summary>{encounter}</details>}
                        <button className="cockpit-depart" disabled={!!departureBlock} onClick={() => { sounds?.cue('confirm'); onDepart(destination); }}>{info.action}<ArrowUpRight size={21} aria-hidden="true"/></button>
                        <small className="cockpit-route-note">{departureBlock ?? 'A viagem só começa ao confirmar a decolagem.'}</small>
                    </section>
                    <section className="cockpit-location cockpit-hologram">
                        <p className="cockpit-kicker">02 / AERONAVE</p>
                        <p className="cockpit-planet">CABINE DE COMANDO</p><h1>ARES–I</h1>
                        <div className="cockpit-level"><span>NÍVEL</span><b>01</b><small>Progressão da aeronave em definição</small></div>
                        <div className="cockpit-meter"><p><span>PORÃO</span><b>{hold.toFixed(1).replace('.', ',')} / {shipCapacityLabel(hold)}</b></p>
                            <i><i style={{ width: `${Math.min(100, hold / SHIP_CARGO.capacityKg * 100).toFixed(1)}%` }}/></i></div>
                        <dl><div><dt>LOCALIZAÇÃO</dt><dd>{info.planet} · {info.location}</dd></div><div><dt>EXPLORADOR</dt><dd>{name}</dd></div><div><dt>ESTADO</dt><dd>No solo · embarque concluído</dd></div></dl>
                        {!colonyBlock && <p className="cockpit-guidance">{map === 'mars' ? 'A colônia fica para trás. O próximo passo está na Terra.'
                            : depositRemaining === 0 ? 'Cota no porão. A carga desta tentativa só fica a salvo ao chegar a Marte.'
                            : campaign ? 'Guarde os recursos no porão antes de partir. A carga desta tentativa só fica a salvo ao chegar a Marte.'
                            : 'Guarde os recursos no porão antes de partir. A carga da nave permanece salva.'}</p>}
                    </section>
                </div>}
            </>}
        </div>
        <footer className="cockpit-footer"><span>ARES–I <i/> CABINE DE COMANDO</span><span>{info.planet} / {info.location.toLocaleUpperCase('pt-BR')}</span></footer>
    </section>;
}
