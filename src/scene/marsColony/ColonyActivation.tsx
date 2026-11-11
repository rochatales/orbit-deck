import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { audio } from '../../audio/runtime';
import { releaseMovementKeys } from '../../game/simulationGate';
import { useCampaignStore } from '../../state/useCampaignStore';
import { useExpeditionStore } from '../../state/useExpeditionStore';
import { useGameStore } from '../../state/useGameStore';
import { advanceActivation, beginActivation, finishActivation, useActivationSequence } from './activationSequence';

const synthesisRadio = 'O Laboratório, a Estufa e a Cafeteria receberam energia. As próximas expedições em Shanghai terão quatro hordas.';

export function ColonyActivation() {
    const kind = useActivationSequence(s => s.kind);
    const played = useRef(false);
    const { width, height } = useThree(state => state.size);
    const center = useMemo(() => {
        const position = [width / 2, height / 2];
        return () => position;
    }, [width, height]);
    useLayoutEffect(() => {
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const off = useCampaignStore.subscribe((state, previous) => {
            if (state.mode !== 'campaign' || !state.inGame || !previous.inGame || previous.mode !== 'campaign') return;
            const next = state.saved?.campaign, old = previous.saved?.campaign;
            if (!old || !next) return;
            const activation = !old.edenActive && next.edenActive ? 'edenActive'
                : !old.synthesizerActive && next.synthesizerActive ? 'synthesizerActive' : null;
            if (!activation) return;
            if (beginActivation(activation, motion.matches)) {
                releaseMovementKeys();
                played.current = false;
            }
        });
        const finish = () => {
            if (!useActivationSequence.getState().kind) return;
            finishActivation();
            audio.stopPowerUp();
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.code !== 'Escape' || !useActivationSequence.getState().kind) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            finish();
        };
        const onMotion = () => { if (motion.matches) finish(); };
        // A ação existente grava o rádio depois do dispatch. Atualiza seu texto antes do próximo render.
        const offRadio = useExpeditionStore.subscribe((state, before) => {
            if (state.radioSerial === before.radioSerial || !state.radio.startsWith('O sintetizador orgânico está ligado.')) return;
            useExpeditionStore.setState({ radio: synthesisRadio });
        });
        window.addEventListener('keydown', onKey, true);
        motion.addEventListener('change', onMotion);
        return () => {
            off(); offRadio(); finish();
            motion.removeEventListener('change', onMotion);
            window.removeEventListener('keydown', onKey, true);
        };
    }, []);
    useFrame((_, delta) => {
        if (!useActivationSequence.getState().kind || useGameStore.getState().isPaused || document.hidden) return;
        if (!played.current && audio.context?.state === 'running') {
            played.current = true;
            audio.playPowerUp();
        }
        if (advanceActivation(Math.min(delta, .05))) audio.stopPowerUp();
    }, -5);
    return kind && <Html fullscreen calculatePosition={center} style={{ pointerEvents: 'none' }}>
        <div role="status" style={{ position: 'absolute', bottom: '10%', width: '100%', textAlign: 'center', color: '#affff4', textShadow: '0 2px 8px #001a24' }}>
            <strong>{kind === 'edenActive' ? 'Iniciando EDEN' : 'Iniciando sintetizador orgânico'}</strong>
            <p>Escape para pular</p>
        </div>
    </Html>;
}
