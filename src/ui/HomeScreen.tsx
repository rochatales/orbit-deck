import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AudioControls } from '../audio/AudioRuntime';
import { DEFAULT_SUIT_COLOR } from '../game/session';
import { useExpeditionStore } from '../state/useExpeditionStore';
import introVideo from '../assets/home/intro-loop.mp4';
import introPoster from '../assets/home/intro-poster.webp';
import { ControlList } from './ControlList';
import { ExodenLogo } from './ExodenLogo';
import { useCampaignStore } from '../state/useCampaignStore';
import { bindDialogFocus } from './dialogFocus';
import { bindBackgroundVideo } from './backgroundVideo';
import './home-screen.css';

const NAME_MIN = 2;
type Panel = 'new' | 'settings' | 'development' | 'exit';

function HomeBackdrop() {
    const video = useRef<HTMLVideoElement>(null);
    useEffect(() => bindBackgroundVideo(video.current!, introVideo, document, window.matchMedia('(prefers-reduced-motion: reduce)')), []);
    return <div className="home-backdrop" aria-hidden="true">
        <img src={introPoster} alt=""/>
        <video ref={video} poster={introPoster} muted loop playsInline preload="auto"/>
    </div>;
}

function HomeFrame() {
    return <svg className="home-frame" viewBox="0 0 1327 737" preserveAspectRatio="none" aria-hidden="true">
        <path d="M174 10H28L13 25V139L28 155V522L13 538V708L31 726H276
            M1144 726H1295L1312 708V593L1296 575V217L1312 200V35L1298 21H915V32
            M1282 30H1294V41 M1144 720V731"/>
        <path className="home-frame-accent" d="M1303 726H1312V717Z"/>
    </svg>;
}

function HomeDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
    const root = useRef<HTMLElement>(null);
    useEffect(() => {
        const release = bindDialogFocus(root.current!, document);
        const key = (event: KeyboardEvent) => {
            if (event.code === 'Escape') { event.preventDefault(); onClose(); }
        };
        document.addEventListener('keydown', key);
        return () => { release(); document.removeEventListener('keydown', key); };
    }, [onClose]);
    return <section ref={root} className="overlay home-settings" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <article>
            <p className="eyebrow">EXODEN · RECOMEÇO</p>
            <h2>{title}</h2>
            {children}
        </article>
    </section>;
}

export function HomeScreen({ onEnter, onExit }: { onEnter: () => void; onExit: () => void }) {
    const profile = useExpeditionStore(s => s.profile);
    const saved = useCampaignStore(s => s.saved);
    const [panel, setPanel] = useState<Panel | null>(null);
    const [name, setName] = useState('');
    const [invalid, setInvalid] = useState(false);
    const menu = useRef<HTMLElement>(null), nameInput = useRef<HTMLInputElement>(null);
    const opener = useRef<HTMLButtonElement | null>(null);
    const close = useCallback(() => setPanel(null), []);

    useEffect(() => {
        menu.current?.toggleAttribute('inert', panel !== null);
        if (panel === null) opener.current?.focus();
    }, [panel]);

    const open = (next: Panel, button?: HTMLButtonElement) => {
        if (button) opener.current = button;
        if (next === 'new' || next === 'development') {
            setName(next === 'new' ? saved?.profile.displayName ?? profile?.displayName ?? '' : '');
            setInvalid(false);
        }
        setPanel(next);
    };
    const loadCampaign = () => {
        if (useExpeditionStore.getState().enterCampaign()) onEnter();
    };
    const enterDevelopment = () => {
        if (useExpeditionStore.getState().enterDevelopment()) onEnter();
    };
    const submitName = () => {
        const displayName = name.trim();
        if (displayName.length < NAME_MIN) { setInvalid(true); nameInput.current?.focus(); return; }
        const expedition = useExpeditionStore.getState();
        if (panel === 'development') {
            expedition.start(displayName, DEFAULT_SUIT_COLOR);
            enterDevelopment();
        } else if (expedition.enterCampaign({ displayName, color: saved?.profile.color ?? profile?.color ?? DEFAULT_SUIT_COLOR }, Boolean(saved))) {
            onEnter();
        }
    };
    const exit = () => {
        onExit();
        window.close();
    };

    return <main className="home">
        <HomeBackdrop/>
        <HomeFrame/>
        <ExodenLogo/>
        <nav ref={menu} className="home-actions" aria-label="Menu principal">
            <svg className="home-action-frame" viewBox="0 0 342 322" preserveAspectRatio="none" aria-hidden="true">
                <path d="M13 16H236L250 3H328 M1 27V21H7 M1 303V309H7 M13 314H239L246 320H328 M334 313H341V306"/>
                <path className="home-frame-accent" d="M249 12L253 8H281L277 12Z"/>
            </svg>
            <span className="home-action is-primary"><button type="button" onClick={event => open('new', event.currentTarget)}>Novo jogo</button></span>
            <span className="home-action is-load"><button type="button" disabled={!saved} onClick={loadCampaign}>Carregar</button></span>
            <span className="home-action"><button type="button" onClick={event => open('settings', event.currentTarget)}>Configurações</button></span>
            <span className="home-action"><button type="button" onClick={event => open('exit', event.currentTarget)}>Sair</button></span>
        </nav>
        {panel === 'settings' && <HomeDialog title="Configurações" onClose={close}>
            <AudioControls/>
            <h3>Controles</h3><ControlList/>
            <details className="home-development"><summary>Modo de desenvolvimento</summary>
                <div className="actions">
                    <button type="button" className="secondary" disabled={!profile} onClick={enterDevelopment}>Continuar</button>
                    <button type="button" className="secondary" onClick={() => profile ? enterDevelopment() : open('development')}>Encontro de teste</button>
                </div>
            </details>
            <button type="button" className="secondary" onClick={close}>Voltar</button>
        </HomeDialog>}
        {(panel === 'new' || panel === 'development') && <HomeDialog title={panel === 'new' ? 'Novo jogo' : 'Encontro de teste'} onClose={close}>
            {panel === 'new' && saved && <p>Iniciar um novo jogo vai substituir a campanha de {saved.profile.displayName}.</p>}
            <form noValidate onSubmit={event => { event.preventDefault(); submitName(); }}
                onKeyDown={event => { if (event.key === 'Enter' && event.repeat) event.preventDefault(); }}>
                <label htmlFor="home-name-input">Nome do explorador</label>
                <input id="home-name-input" ref={nameInput} value={name} maxLength={32} autoComplete="off" spellCheck={false}
                    aria-invalid={invalid} aria-describedby={invalid ? 'home-name-error' : undefined}
                    onChange={event => { setName(event.target.value); if (event.target.value.trim().length >= NAME_MIN) setInvalid(false); }}/>
                {invalid && <p id="home-name-error" className="home-name-error" role="alert">Digite um nome com pelo menos {NAME_MIN} letras.</p>}
                <div className="actions">
                    <button type="button" className="secondary" onClick={close}>Cancelar</button>
                    <button type="submit" onClick={event => { if (event.detail > 1) event.preventDefault(); }}>
                        {panel === 'new' && saved ? 'Substituir e iniciar' : 'Iniciar'}
                    </button>
                </div>
            </form>
        </HomeDialog>}
        {panel === 'exit' && <HomeDialog title="Sair de EXODEN?" onClose={close}>
            <div className="actions">
                <button type="button" className="secondary" onClick={close}>Cancelar</button>
                <button type="button" onClick={exit}>Sair</button>
            </div>
        </HomeDialog>}
    </main>;
}
