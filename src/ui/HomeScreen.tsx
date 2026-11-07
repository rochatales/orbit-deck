import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioControls } from '../audio/AudioRuntime';
import { audio } from '../audio/runtime';
import { DEFAULT_SUIT_COLOR } from '../game/session';
import { useExpeditionStore } from '../state/useExpeditionStore';
import colonyArt from '../assets/home/colonia-marte.webp';
import salvagorArt from '../assets/home/salvagor.webp';
import { ControlList } from './ControlList';
import { ExodenLogo } from './ExodenLogo';
import { useCampaignStore } from '../state/useCampaignStore';
import { bindDialogFocus } from './dialogFocus';

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

/** A segunda batida de um duplo clique em Recomeçar não confirma o apagamento. */
export function CampaignActions({ confirm, onResume, onRestart, onConfirm, onClose }: {
    confirm: boolean; onResume: () => void; onRestart: () => void; onConfirm: () => void; onClose: () => void;
}) {
    return confirm ? <><button key="cancel-restart" type="button" className="secondary" onClick={onClose}>Cancelar</button>
        <button key="confirm-restart" type="button" onClick={event => { if (event.detail <= 1) onConfirm(); }}>Confirmar · Recomeçar campanha</button></>
        : <><button key="resume" type="button" onClick={onResume}>Retomar campanha</button><button key="request-restart" type="button" className="secondary" onClick={onRestart}>Recomeçar</button><button key="close" type="button" className="secondary" onClick={onClose}>Voltar</button></>;
}

function CampaignDialog({ confirm, name, onResume, onRestart, onConfirm, onClose }: {
    confirm: boolean; name: string; onResume: () => void; onRestart: () => void; onConfirm: () => void; onClose: () => void;
}) {
    const root = useRef<HTMLElement>(null);
    useEffect(() => {
        const release = root.current ? bindDialogFocus(root.current, document) : undefined;
        const key = (event: KeyboardEvent) => { if (event.code === 'Escape') onClose(); };
        window.addEventListener('keydown', key);
        return () => { release?.(); window.removeEventListener('keydown', key); };
    }, [confirm, onClose]);
    return <section ref={root} className="overlay home-settings" role="dialog" aria-modal="true" aria-label={confirm ? 'Confirmar reinício da campanha' : 'Campanha em andamento'} tabIndex={-1}><article>
        <p className="eyebrow">EXODEN · CAMPANHA</p>
        <h2>{confirm ? 'Recomeçar a campanha?' : 'Sua campanha continua.'}</h2>
        <p>{confirm ? `O progresso da campanha de ${name} será substituído. O desenvolvimento será preservado.` : `Há uma campanha salva de ${name}. Como deseja entrar?`}</p>
        <CampaignActions confirm={confirm} onResume={onResume} onRestart={onRestart} onConfirm={onConfirm} onClose={onClose}/>
    </article></section>;
}

/** Início escolhe campanha; Continuar/Encontro de teste preservam o desenvolvimento. */
export function HomeScreen({ onEnter }: { onEnter: () => void }) {
    const profile = useExpeditionStore(s => s.profile), start = useExpeditionStore(s => s.start);
    const savedCampaign = useCampaignStore(s => s.saved);
    const [name, setName] = useState(profile?.displayName ?? savedCampaign?.profile.displayName ?? ''), [invalid, setInvalid] = useState(false), [settings, setSettings] = useState(false);
    const [campaignDialog, setCampaignDialog] = useState<'resume' | 'restart' | null>(null);
    const layout = useRef<HTMLFormElement>(null), nameInput = useRef<HTMLInputElement>(null), settingsButton = useRef<HTMLButtonElement>(null), continueButton = useRef<HTMLButtonElement>(null), beginButton = useRef<HTMLButtonElement>(null), settingsWereOpen = useRef(false), campaignWasOpen = useRef(false);
    // Com perfil salvo o caminho provável é Continuar; sem ele, falta só o nome.
    useEffect(() => { (profile ? continueButton : nameInput).current?.focus(); }, []);
    useEffect(() => {
        layout.current?.toggleAttribute('inert', settings);
        if (settingsWereOpen.current && !settings) settingsButton.current?.focus();
        settingsWereOpen.current = settings;
    }, [settings]);
    useEffect(() => {
        layout.current?.toggleAttribute('inert', settings || campaignDialog !== null);
        if (campaignWasOpen.current && !campaignDialog) beginButton.current?.focus();
        campaignWasOpen.current = campaignDialog !== null;
    }, [settings, campaignDialog]);
    useEffect(() => { if (invalid && !campaignDialog) nameInput.current?.focus(); }, [invalid, campaignDialog]);
    const closeSettings = useCallback(() => setSettings(false), []);
    const closeCampaign = useCallback(() => setCampaignDialog(null), []);
    const validName = () => {
        if (name.trim().length >= NAME_MIN) return true;
        setInvalid(true); setCampaignDialog(null); nameInput.current?.focus(); return false;
    };
    const newCampaign = (replace = false) => {
        if (replace ? !savedCampaign : !validName()) return;
        void audio.unlock();
        // Recomeçar mantém a identidade da campanha, sem herdar o perfil dev do formulário.
        const campaignProfile = replace ? savedCampaign!.profile : { displayName: name.trim().slice(0, 32), color: profile?.color ?? DEFAULT_SUIT_COLOR };
        if (useExpeditionStore.getState().enterCampaign(campaignProfile, replace)) onEnter();
    };
    const begin = () => {
        if (savedCampaign) setCampaignDialog('resume');
        else newCampaign();
    };
    const resume = () => {
        void audio.unlock();
        if (useExpeditionStore.getState().enterDevelopment()) onEnter();
    };
    const testEncounter = () => {
        if (!profile) { if (!validName()) return; start(name, DEFAULT_SUIT_COLOR); }
        resume();
    };
    const resumeCampaign = () => {
        void audio.unlock();
        if (useExpeditionStore.getState().enterCampaign()) onEnter();
    };
    return <main className="home">
        <div className="home-backdrop"><img className="home-colony" src={colonyArt} alt="" draggable={false}/></div>
        <form ref={layout} className="home-layout" noValidate onSubmit={event => { event.preventDefault(); begin(); }}>
            <section className="home-card" aria-labelledby="home-profile-title"><div className="home-card-inner">
                <i className="home-card-corner is-top"/><i className="home-card-corner is-bottom"/>
                <h2 id="home-profile-title" className="home-card-title">Perfil <span>/ SALVAGOR</span></h2>
                <div className="home-portrait"><i className="home-bracket is-a"/><i className="home-bracket is-b"/><i className="home-bracket is-c"/><i className="home-bracket is-d"/>
                    <img src={salvagorArt} alt="Salvagor de traje laranja, capacete claro e mochila" draggable={false}/>
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
                    <span className="home-action is-primary"><button ref={beginButton} type="submit">Início</button></span>
                    <span className="home-action"><button ref={continueButton} type="button" disabled={!profile} onClick={resume}>Continuar{profile && <small>{profile.displayName}</small>}</button></span>
                    <span className="home-action"><button type="button" onClick={testEncounter}>Encontro de teste</button></span>
                    <span className="home-action"><button ref={settingsButton} type="button" onClick={() => setSettings(true)}>Configurações</button></span>
                </nav>
            </div>
        </form>
        {settings && <HomeSettings onClose={closeSettings}/>}
        {campaignDialog && savedCampaign && <CampaignDialog confirm={campaignDialog === 'restart'} name={savedCampaign.profile.displayName}
            onResume={resumeCampaign} onRestart={() => setCampaignDialog('restart')} onConfirm={() => newCampaign(true)} onClose={closeCampaign}/>}
    </main>;
}
