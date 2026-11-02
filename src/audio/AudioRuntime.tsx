import { Vector3 } from 'three';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { audio } from './runtime';
import { playerSounds } from './events';
import { playerPosition } from '../state/playerTransient';
import { combatRuntime, useCombatStore } from '../state/useCombatStore';
import { useGameStore } from '../state/useGameStore';
import { useExpeditionStore } from '../state/useExpeditionStore';
import { simulationBlocked } from '../game/simulationGate';
/** Gate imediato, inclusive quando o canvas não recebe quadros em aba oculta. */
export function AudioLifecycle() {
    useEffect(() => {
        let focused = document.hasFocus();
        const update = () => {
            const blocked = !focused || document.hidden || simulationBlocked();
            audio.setMap(useExpeditionStore.getState().session.map);
            audio.setBlocked(blocked);
            if (blocked) { playerSounds.clear(); combatRuntime.simulation?.sounds.clear(); }
        };
        const blur = () => { focused = false; update(); };
        const focus = () => { focused = true; update(); };
        const gesture = () => { focused = true; update(); if (useExpeditionStore.getState().profile) void audio.unlock(); };
        const key = (e: KeyboardEvent) => {
            if (e.code !== 'KeyM' || e.repeat || (e.target instanceof HTMLInputElement && !['range', 'checkbox', 'button'].includes(e.target.type)) || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement || (e.target instanceof HTMLElement && e.target.isContentEditable)) return;
            audio.setMuted(!audio.muted);
        };
        const subscriptions = [useGameStore.subscribe(update), useExpeditionStore.subscribe(update), useCombatStore.subscribe(update)];
        window.addEventListener('blur', blur); window.addEventListener('focus', focus);
        document.addEventListener('visibilitychange', update);
        window.addEventListener('pointerdown', gesture); window.addEventListener('keydown', gesture);
        window.addEventListener('keydown', key); update();
        return () => {
            subscriptions.forEach(f => f()); window.removeEventListener('blur', blur); window.removeEventListener('focus', focus);
            document.removeEventListener('visibilitychange', update);
            window.removeEventListener('pointerdown', gesture); window.removeEventListener('keydown', gesture); window.removeEventListener('keydown', key);
            audio.setBlocked(true); playerSounds.clear(); combatRuntime.simulation?.sounds.clear();
            audio.setMap('mars');
        };
    }, []);
    return null;
}
export function AudioFrame() {
    const { camera } = useThree();
    const point = useMemo(() => new Vector3(), []);
    const screenPan = useMemo(() => (x: number, z: number) =>
        Math.max(-1, Math.min(1, point.set(x, .65, z).project(camera).x)), [point, camera]);
    useFrame(() => {
        const matrix = camera.matrixWorld.elements;
        audio.consume(playerSounds, playerPosition.x, playerPosition.z, matrix[0], matrix[2], screenPan);
        if (combatRuntime.simulation) audio.consume(combatRuntime.simulation.sounds, playerPosition.x, playerPosition.z, matrix[0], matrix[2], screenPan);
    });
    return null;
}
export function AudioControls() {
    useSyncExternalStore(audio.subscribe, audio.snapshot);
    return <fieldset className="audio-controls"><legend>Áudio</legend>
        <label>Volume geral <input aria-label="Volume geral" type="range" min="0" max="1" step="0.05" value={audio.volume} onChange={e => audio.setVolume(Number(e.target.value))}/></label>
        <button type="button" aria-pressed={audio.muted} onClick={() => audio.setMuted(!audio.muted)}>{audio.muted ? 'Ativar som' : 'Silenciar'} · M</button>
    </fieldset>;
}
