import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { create } from 'zustand';
import type { Group } from 'three';
import { simulationBlocked } from '../../game/simulationGate';
import { playerPosition } from '../../state/playerTransient';
import { useGameStore } from '../../state/useGameStore';
import { sandwindQAEnabled, sandwindQAPose } from './sandwindQA';
import { SANDWIND_PROFILES, type SandwindProfile } from './sandwindPolicy';
import { SandwindController, sandwindResources, type SandwindSettings } from './SandwindController';
import manifest from '../../assets/colony-v007.manifest.json';
import { sandwindTargets } from './sandwindTargets';
import quartelUrl from '../../assets/quartel/barracks-v005.glb';
import colonyUrl from '../../assets/colony-v007.glb';
import hangarUrl from '../../assets/hangar/hangar-v002.glb';
import greenhouseUrl from '../../assets/greenhouse/greenhouse-v001.glb';
import legacyUrl from '../../assets/colony-v006.glb';
import shipUrl from '../../assets/ares-lander/ares-lander.glb';
import deckUrl from '../../assets/ares-mars/deck-mars.glb';

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const usePreview = create<SandwindSettings>(() => ({ enabled: true, culling: true, wind: !reducedMotion, profile: 'balanced' }));
let activeController: SandwindController | null = null;

export function ColonySandwind({ scope, masterplan }: { scope: RefObject<Group>; masterplan: RefObject<Group> }) {
    const scene = useThree(s => s.scene), gl = useThree(s => s.gl);
    // Os caches já usados pelos componentes permitem distinguir materiais
    // compartilhados dos privados finais, sem modificar nenhum runtime.
    // useLoader usa a lista de URLs como chave: chamadas individuais devem casar
    // com Masterplan/Hangar/Greenhouse/DeckProps; AresLanding usa o par de URLs.
    const colony = useGLTF(colonyUrl), hangar = useGLTF(hangarUrl), greenhouse = useGLTF(greenhouseUrl), legacy = useGLTF(legacyUrl);
    const quartel = useGLTF(quartelUrl);
    const [ship, deck] = useGLTF([shipUrl, deckUrl]);
    const controller = useRef<SandwindController | null>(null);
    const enabled = usePreview(s => s.enabled);
    useEffect(() => {
        const root = scope.current!, architecture = masterplan.current!.children[0];
        const next = new SandwindController(root, [colony.scene, hangar.scene, greenhouse.scene, legacy.scene, ship.scene, deck.scene, quartel.scene],
            sandwindTargets(root, architecture, manifest), gl.outputColorSpace);
        controller.current = next; activeController = next;
        return () => { if (activeController === next) activeController = null; controller.current = null; next.dispose(); };
    }, [scope, masterplan, colony.scene, hangar.scene, greenhouse.scene, legacy.scene, ship.scene, deck.scene, quartel.scene, gl]);
    useEffect(() => {
        if (!enabled) return;
        const original = scene.fog;
        scene.fog = null; // névoa radial substitui a névoa de profundidade só nesta prévia.
        return () => { scene.fog = original; };
    }, [scene, enabled]);
    useFrame((_, delta) => controller.current?.update(playerPosition.x, playerPosition.z, delta, usePreview.getState(), simulationBlocked()));
    return null;
}

const panelStyle: CSSProperties = {
    position: 'absolute', right: 16, bottom: 110, zIndex: 8, width: 'min(285px, calc(100vw - 32px))', maxHeight: '48vh', overflowY: 'auto',
    padding: 16, border: '1px solid #c7a278', borderRadius: 12, background: 'rgba(30,32,38,.94)',
    color: '#f3e5d2', fontSize: 13, boxShadow: '0 8px 30px #0006'
};
export function SandwindPanel() {
    const [report, setReport] = useState('');
    const settings = usePreview(), [stats, setStats] = useState({ total: 0, hidden: 0, retained: 0, hiddenTriangles: 0, materials: 0, clones: 0 });
    useEffect(() => {
        const timer = window.setInterval(() => { if (activeController) setStats({ ...activeController.stats }); }, 500);
        return () => window.clearInterval(timer);
    }, []);
    const profile = SANDWIND_PROFILES[settings.profile];
    return <aside style={panelStyle} aria-label="Prévia da cortina de areia"><details open>
        <summary style={{ cursor: 'pointer', color: '#efb976', fontWeight: 700 }}>SANDWIND · PRÉVIA</summary>
        <p style={{ margin: '0 0 12px' }}>Areia no horizonte e descarte de prédios completos.</p>
        <label style={{ display: 'block', marginBottom: 10 }}>Alcance
            <select value={settings.profile} onChange={e => usePreview.setState({ profile: e.target.value as SandwindProfile })}>
                {Object.entries(SANDWIND_PROFILES).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
            </select>
        </label>
        {([['enabled', 'Cortina de areia'], ['culling', 'Descarte distante'], ['wind', 'Movimento do vento']] as const).map(([key, label]) =>
            <label key={key} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0' }}>
                <input style={{ width: 16 }} type="checkbox" checked={settings[key]} disabled={key !== 'enabled' && !settings.enabled}
                    onChange={e => usePreview.setState({ [key]: e.target.checked })}/>{label}
            </label>)}
        <p style={{ margin: '12px 0 6px' }}>Área clara: {profile.clear} m · Areia opaca: {profile.opaque} m</p>
        <p style={{ margin: '6px 0' }}>Grupos descartados: <b>{stats.hidden}/{stats.total}</b></p>
        <p style={{ margin: '6px 0' }}>Triângulos nos grupos descartados: <b>{Math.round(stats.hiddenTriangles).toLocaleString('pt-BR')}</b></p>
        <p style={{ margin: '6px 0' }}>Materiais do efeito: {stats.materials} · Clones próprios: {stats.clones}</p>
        {new URLSearchParams(window.location.search).has('perf') && <button type="button" onClick={() => setReport(JSON.stringify({ perf: window.__hordaPerf?.report(), sandwind: { settings: usePreview.getState(), resources: { ...sandwindResources }, stats: activeController ? { ...activeController.stats } : null } }, null, 2))}>Gerar relatório QA</button>}
        {sandwindQAEnabled(window.location.search) && <fieldset style={{ margin: '10px 0' }}><legend>Poses de QA · sem salvar</legend>
            <button onClick={() => sandwindQAPose(window.location.search, 'plaza')}>QA · Praça</button>
            <button onClick={() => sandwindQAPose(window.location.search, 'deck')}>QA · Deck</button>
            {(['quartel', 'quartel-west', 'quartel-north'] as const).map(pose => <button key={pose} onClick={() => sandwindQAPose(window.location.search, pose)}>QA · {pose}</button>)}
            <button onClick={() => useGameStore.getState().setZoom(useGameStore.getState().minZoom)}>QA · Afastar</button>
        </fieldset>}
        {report && <textarea aria-label="Relatório QA Sandwind" readOnly value={report} style={{ width: '100%', height: 100, fontSize: 10 }}/>}
        <small style={{ display: 'block', color: '#b8b3ad', lineHeight: 1.5 }}>Contagem geométrica; não é medição de GPU. GLB continua na memória. Builder, LODs e NPCs ainda não implementados nesta prévia.</small>
    </details></aside>;
}
