import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, ChevronRight, Package, Plane, Radio, LogOut } from 'lucide-react';
import type { MapId, TravelPhase } from '../game/session';
import { cargoWeight } from '../game/backpackConfig';
import { SHIP_CARGO } from '../game/shipCargo';
import { useShipCargoStore } from '../state/useShipCargoStore';
import { ShipCargoPanel } from './ShipCargoPanel';
import { bindCockpitVideo } from './cockpitVideo';
import { bindDialogFocus } from './dialogFocus';
import frameUrl from '../assets/ui/cockpit/cabine.jpg';
import marsVideo from '../assets/ui/cockpit/mars.mp4';
import shanghaiVideo from '../assets/ui/cockpit/shanghai.mp4';
import marsPoster from '../assets/ui/cockpit/mars.png';
import shanghaiPoster from '../assets/ui/cockpit/shanghai.png';
import './ship-cockpit.css';

const EXTERIOR = {
    mars: { video: marsVideo, poster: marsPoster, planet: 'MARTE', location: 'Colônia humana', destination: 'Shanghai', destinationPlanet: 'TERRA', description: 'Ruínas de Shanghai. Explore a cidade, enfrente as ameaças e recupere materiais para a colônia.', action: 'Decolar para Shanghai' },
    shanghai: { video: shanghaiVideo, poster: shanghaiPoster, planet: 'TERRA', location: 'Shanghai', destination: 'Colônia humana', destinationPlanet: 'MARTE', description: 'Nosso lar, em Marte. Retorne ao deck de lançamento e desembarque para voltar à colônia.', action: 'Retornar a Marte' }
} as const;

function CockpitExterior({ map }: { map: MapId }) {
    const video = useRef<HTMLVideoElement>(null), exterior = EXTERIOR[map];
    useEffect(() => bindCockpitVideo(video.current!, exterior.video, document, window.matchMedia('(prefers-reduced-motion: reduce)')), [exterior.video]);
    return <div className={`cockpit-scenery is-${map}`} aria-hidden="true">
        <img className="cockpit-poster" src={exterior.poster} alt=""/>
        <video ref={video} className="cockpit-video" poster={exterior.poster} muted loop playsInline preload="metadata"/>
        <div className="cockpit-glass"/>
        <svg className="cockpit-frame" viewBox="0 0 1200 896" preserveAspectRatio="xMidYMid slice">
            <defs><mask id="cockpit-windows" maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="896">
                <rect width="1200" height="896" fill="white"/>
                <path fill="black" d="M364 140H830L764 237H435Z M205 213L333 149L410 245L340 281Z M789 245L867 149L992 212L857 281Z M376 314L441 279H761L828 313L720 527H484Z M207 276L328 335L451 536L272 573Z M870 333L994 277L927 574L752 535Z M0 201L29 226L180 552L167 598L0 639Z M1200 202L1170 230L1019 554L1032 598L1200 642Z"/>
            </mask></defs>
            <image href={frameUrl} width="1200" height="896" mask="url(#cockpit-windows)"/>
        </svg>
        <div className="cockpit-shade"/>
    </div>;
}

export interface ShipCockpitProps {
    map: MapId;
    phase: TravelPhase;
    ready: boolean;
    error: string | null;
    name: string;
    onDepart: () => void;
    onExit: () => void;
    onRetry: () => void;
    encounter?: ReactNode;
}

/** Cabine de navegação: sessão real, porão persistente e ações separadas de voo/desembarque. */
export function ShipCockpit({ map, phase, ready, error, name, onDepart, onExit, onRetry, encounter }: ShipCockpitProps) {
    const [tab, setTab] = useState<'navigation' | 'cargo'>('navigation');
    const root = useRef<HTMLElement>(null), info = EXTERIOR[map];
    const hold = cargoWeight(useShipCargoStore(s => s.cargo));
    const busy = !ready || phase === 'travelling';
    useEffect(() => bindDialogFocus(root.current!, document), []);
    // Um voo/chegada nunca deixa os controles de carga da outra região ativos.
    useEffect(() => { setTab('navigation'); }, [map, phase]);
    return <section className="ship-cockpit" role="dialog" aria-modal="true" aria-label="Cabine da aeronave" ref={root} tabIndex={-1}>
        <CockpitExterior key={map} map={map}/>
        <header className="cockpit-header">
            <div className="cockpit-brand"><Plane aria-hidden="true"/><span>ARES–I<small>EXODEN / NAVEGAÇÃO</small></span></div>
            <div className="cockpit-signal"><i/>{busy ? 'EM TRÂNSITO' : error ? 'VOO INTERROMPIDO' : 'ESTACIONADA'}<span><Radio size={13} aria-hidden="true"/> EDEN · CONECTADA</span></div>
            <button className="cockpit-close" disabled={busy} onClick={onExit} aria-label="Desembarcar da aeronave"><LogOut size={17} aria-hidden="true"/> Desembarcar <kbd>E / ESC</kbd></button>
        </header>
        <div className="cockpit-console">
            <nav className="cockpit-tabs" aria-label="Painéis da cabine">
                <button disabled={busy} aria-pressed={tab === 'navigation'} onClick={() => setTab('navigation')}><Plane size={15} aria-hidden="true"/> Navegação</button>
                <button disabled={busy} aria-pressed={tab === 'cargo'} onClick={() => setTab('cargo')}><Package size={15} aria-hidden="true"/> Carga <small>{hold.toFixed(1).replace('.', ',')} / {SHIP_CARGO.capacityKg} kg</small></button>
            </nav>
            {busy || error ? <section className="cockpit-flight cockpit-hologram" role="status" aria-live="polite">
                <p className="cockpit-kicker">CONTROLE DE VOO / EDEN</p><h1>{error ? 'Viagem interrompida' : 'Preparando a chegada'}</h1>
                <p>{error ?? 'Carregando a região de destino. Aguarde para desembarcar.'}</p>
                {error ? <button className="cockpit-depart" onClick={onRetry}>Tentar novamente <ArrowUpRight size={20}/></button> : <div className="cockpit-loading" aria-hidden="true"><i/></div>}
            </section> : tab === 'cargo' ? <div className="cockpit-cargo cockpit-hologram"><ShipCargoPanel map={map}/></div> : <div className="cockpit-navigation">
                <section className="cockpit-location cockpit-hologram">
                    <p className="cockpit-kicker">01 / LOCALIZAÇÃO ATUAL</p><p className="cockpit-planet">{info.planet}</p><h1>{info.location}</h1>
                    <div className="cockpit-location-line"/>
                    <dl><div><dt>EXPLORADOR</dt><dd>{name}</dd></div><div><dt>AERONAVE</dt><dd>No solo · embarque concluído</dd></div><div><dt>PORÃO</dt><dd>{hold.toFixed(1).replace('.', ',')} / {SHIP_CARGO.capacityKg} kg</dd></div></dl>
                    <p className="cockpit-guidance">{map === 'mars' ? 'A colônia fica para trás. O próximo passo está na Terra.' : 'Guarde os recursos no porão antes de partir. A carga da nave permanece salva.'}</p>
                </section>
                <section className="cockpit-route cockpit-hologram">
                    <p className="cockpit-kicker">02 / DESTINO DISPONÍVEL</p>
                    <div className="cockpit-route-heading"><div><span>{info.destinationPlanet}</span><h2>{info.destination}</h2></div><ArrowUpRight aria-hidden="true"/></div>
                    <p>{info.description}</p>
                    <div className="cockpit-route-strip"><span>{info.planet}</span><i/><Plane size={16} aria-hidden="true"/><i/><span>{info.destinationPlanet}</span></div>
                    {encounter && <details className="cockpit-encounter"><summary>Configurar encontro de teste <ChevronRight size={13}/></summary>{encounter}</details>}
                    <button className="cockpit-depart" onClick={onDepart}>{info.action}<ArrowUpRight size={21} aria-hidden="true"/></button>
                    <small className="cockpit-route-note">A viagem só começa ao confirmar a decolagem.</small>
                </section>
            </div>}
        </div>
        <footer className="cockpit-footer"><span>ARES–I <i/> CABINE DE COMANDO</span><span>{info.planet} / {info.location.toLocaleUpperCase('pt-BR')}</span></footer>
    </section>;
}
