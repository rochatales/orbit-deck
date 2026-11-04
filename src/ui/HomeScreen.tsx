import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioControls } from '../audio/AudioRuntime';
import { audio } from '../audio/runtime';
import { DEFAULT_SUIT_COLOR } from '../game/session';
import { useExpeditionStore } from '../state/useExpeditionStore';
import colonyArt from '../assets/home/colonia.webp';
import explorerArt from '../assets/home/explorador-perfil.webp';
import { ControlList } from './ControlList';
import { ExodenLogo } from './ExodenLogo';

const NAME_MIN = 2;

function HomeSettings({ onClose }: { onClose: () => void }) {
    const close = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        close.current?.focus();
        const key = (event: KeyboardEvent) => { if (event.code === 'Escape') onClose(); };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [onClose]);
    return <section className="overlay home-settings" role="dialog" aria-modal="true" aria-label="Configurações"><article>
        <div className="beta-menu-heading"><p className="eyebrow">EXODEN · CONFIGURAÇÕES</p><button ref={close} type="button" className="secondary" onClick={onClose} aria-label="Fechar configurações">✕</button></div>
        <AudioControls/>
        <h2>Controles</h2><ControlList/>
    </article></section>;
}

/** Entrada do jogo. Início e Continuar só levam ao hub; a partida segue na aeronave. */
export function HomeScreen({ onEnter }: { onEnter: () => void }) {
    const profile = useExpeditionStore(s => s.profile), start = useExpeditionStore(s => s.start);
    const [name, setName] = useState(profile?.displayName ?? ''), [invalid, setInvalid] = useState(false), [settings, setSettings] = useState(false);
    const layout = useRef<HTMLFormElement>(null), nameInput = useRef<HTMLInputElement>(null), settingsButton = useRef<HTMLButtonElement>(null), continueButton = useRef<HTMLButtonElement>(null), settingsWereOpen = useRef(false);
    // Com perfil salvo o caminho provável é Continuar; sem ele, falta só o nome.
    useEffect(() => { (profile ? continueButton : nameInput).current?.focus(); }, []);
    useEffect(() => {
        layout.current?.toggleAttribute('inert', settings);
        if (settingsWereOpen.current && !settings) settingsButton.current?.focus();
        settingsWereOpen.current = settings;
    }, [settings]);
    const closeSettings = useCallback(() => setSettings(false), []);
    const begin = () => {
        if (name.trim().length < NAME_MIN) { setInvalid(true); nameInput.current?.focus(); return; }
        void audio.unlock();
        // A cor segue fora da tela por enquanto: mantém a salva ou a padrão do traje.
        start(name, profile?.color ?? DEFAULT_SUIT_COLOR);
        onEnter();
    };
    const resume = () => { void audio.unlock(); onEnter(); };
    return <main className="home">
        <div className="home-backdrop"><img className="home-colony" src={colonyArt} alt="" draggable={false}/></div>
        <form ref={layout} className="home-layout" noValidate onSubmit={event => { event.preventDefault(); begin(); }}>
            <section className="home-card" aria-label="Perfil do explorador"><div className="home-card-inner">
                <i className="home-card-corner is-top"/><i className="home-card-corner is-bottom"/>
                <h2 className="home-card-title">Perfil <span>/ Explorador</span></h2>
                <div className="home-portrait"><i className="home-bracket is-a"/><i className="home-bracket is-b"/><i className="home-bracket is-c"/><i className="home-bracket is-d"/>
                    <img src={explorerArt} alt="Explorador de traje laranja e capacete claro" draggable={false}/>
                </div>
                <div className="home-name">
                    <label htmlFor="home-name-input">Nome do explorador</label>
                    <input id="home-name-input" ref={nameInput} value={name} maxLength={32} autoComplete="off" spellCheck={false} aria-invalid={invalid} aria-describedby={invalid ? 'home-name-error' : undefined}
                        onChange={event => { setName(event.target.value); if (event.target.value.trim().length >= NAME_MIN) setInvalid(false); }}/>
                    {invalid && <p id="home-name-error" className="home-name-error" role="alert">Digite um nome com pelo menos {NAME_MIN} letras.</p>}
                </div>
            </div></section>
            <div className="home-side">
                <ExodenLogo/>
                <nav className="home-actions" aria-label="Menu principal">
                    <span className="home-action is-primary"><button type="submit">Início</button></span>
                    <span className="home-action"><button ref={continueButton} type="button" disabled={!profile} onClick={resume}>Continuar{profile && <small>{profile.displayName}</small>}</button></span>
                    <span className="home-action"><button ref={settingsButton} type="button" onClick={() => setSettings(true)}>Configurações</button></span>
                </nav>
            </div>
        </form>
        {settings && <HomeSettings onClose={closeSettings}/>}
    </main>;
}
