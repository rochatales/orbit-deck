import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/runtime';
import { missionDepositRemaining } from '../game/campaignPolicy';
import { RESOURCE_KINDS } from '../game/shipCargo';
import { useCampaignStore } from '../state/useCampaignStore';
import { useCombatStore } from '../state/useCombatStore';
import './level-clear.css';

function victorySound() {
    const context = audio.context;
    if (!context || context.state !== 'running' || audio.muted || audio.blocked || audio.volume <= 0) return;
    const start = context.currentTime;
    for (const [index, pitch] of [392, 523, 659].entries()) {
        const tone = context.createOscillator(), envelope = context.createGain();
        const at = start + index * .09;
        tone.frequency.value = pitch;
        envelope.gain.setValueAtTime(0, at);
        envelope.gain.linearRampToValueAtTime(.045 * audio.volume, at + .025);
        envelope.gain.exponentialRampToValueAtTime(.0001, at + .24);
        tone.connect(envelope); envelope.connect(context.destination);
        tone.onended = () => { tone.disconnect(); envelope.disconnect(); };
        tone.start(at); tone.stop(at + .24);
    }
}

export function LevelClear() {
    const [presenting, setPresenting] = useState(false);
    const started = useRef(false);
    const [result] = useState(() => {
        const combat = useCombatStore.getState(), campaign = useCampaignStore.getState();
        const resources = RESOURCE_KINDS.reduce((total, kind) => total + Math.max(0, combat[kind] - campaign.withdrawnCargo[kind])
            + (campaign.saved?.attemptDelivery[kind] ?? 0), 0);
        return { kills: combat.kills, seconds: Math.floor(combat.clearTime), resources,
            remaining: missionDepositRemaining('shanghai', campaign) };
    });
    useEffect(() => {
        const store = useCombatStore.getState();
        if (store.clearPresented && !started.current) { store.showClearMarker(); return; }
        if (!started.current) {
            started.current = true;
            store.markClearPresented();
            victorySound();
        }
        setPresenting(true);
        const escape = (event: KeyboardEvent) => {
            if (event.code !== 'Escape') return;
            event.stopImmediatePropagation();
            finish();
        };
        const finish = () => {
            window.removeEventListener('keydown', escape, true);
            store.showClearMarker();
            setPresenting(false);
        };
        const timer = window.setTimeout(finish, 3000);
        window.addEventListener('keydown', escape, true);
        return () => { window.clearTimeout(timer); window.removeEventListener('keydown', escape, true); };
    }, []);
    return <aside className={presenting ? 'level-clear is-presenting' : 'level-clear'} role="status">
        <strong>SHANGHAI CLEAR</strong>
        {presenting && <small>{result.kills} ameaças · {Math.floor(result.seconds / 60)} min {result.seconds % 60} s
            {' · '}{result.resources} recursos recolhidos{result.remaining === null ? '' : result.remaining ? ` · Faltam ${result.remaining} para a cota` : ' · Cota no porão'}</small>}
    </aside>;
}
