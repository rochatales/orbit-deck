import { audio } from './runtime';
import type { CockpitCue, CockpitSounds } from '../ui/cockpitSequence';

/**
 * Sons PROVISÓRIOS da cabine, sintetizados na hora. Servem para ensaiar tempos e volumes
 * até os arquivos finais do roteiro (docs/sprint-6/PLANO_CABINE_HOLOGRAFICA.md) chegarem.
 * Respeitam volume e mudo do jogo; sem contexto de áudio liberado, não fazem nada.
 */
let noiseBuffer: AudioBuffer | null = null, noiseContext: AudioContext | null = null;
let warpStop: (() => void) | null = null;

function context() {
    const c = audio.context;
    return c && c.state === 'running' && !audio.muted ? c : null;
}
function envelope(c: AudioContext, peak: number, at: number, duration: number, attack: number) {
    const gain = c.createGain(), level = Math.max(.0001, peak * audio.volume);
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + Math.min(attack, duration * .9));
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    gain.connect(c.destination);
    return gain;
}
function tone(c: AudioContext, type: OscillatorType, from: number, to: number, duration: number, peak: number, delay = 0, attack = .02) {
    const at = c.currentTime + delay, osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(to, at + duration);
    osc.connect(envelope(c, peak, at, duration, attack));
    osc.start(at); osc.stop(at + duration + .05);
}
function noise(c: AudioContext) {
    if (!noiseBuffer || noiseContext !== c) {
        noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); noiseContext = c;
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const source = c.createBufferSource();
    source.buffer = noiseBuffer; source.loop = true;
    return source;
}
function rush(c: AudioContext, from: number, to: number, duration: number, peak: number, delay = 0, attack = .05) {
    const at = c.currentTime + delay, source = noise(c), filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(from, at);
    filter.frequency.exponentialRampToValueAtTime(to, at + duration);
    source.connect(filter); filter.connect(envelope(c, peak, at, duration, attack));
    source.start(at); source.stop(at + duration + .05);
}

const CUES: Record<CockpitCue, (c: AudioContext) => void> = {
    engineStart(c) { tone(c, 'sine', 70, 40, .35, .7); tone(c, 'sawtooth', 38, 120, 2.6, .22, 0, 1.9); rush(c, 120, 1100, 2.6, .55, 0, 2); },
    panel(c) { for (let i = 0; i < 6; i++) tone(c, 'square', i % 2 ? 1700 : 1200, i % 2 ? 1700 : 1200, .06, .04, i * .16, .005); },
    hologram(c) { tone(c, 'sine', 500, 1900, .7, .1, 0, .3); tone(c, 'triangle', 1000, 2600, .5, .04, .1, .2); },
    tick(c) { tone(c, 'sine', 1700, 1500, .05, .05, 0, .005); },
    confirm(c) { tone(c, 'sine', 880, 880, .14, .09, 0, .01); tone(c, 'sine', 1320, 1320, .2, .09, .1, .01); },
    globe(c) { rush(c, 600, 2400, .85, .06, 0, .4); tone(c, 'sine', 1500, 1500, .09, .09, .85, .005); },
    denied(c) { tone(c, 'square', 170, 170, .12, .06, 0, .01); tone(c, 'square', 170, 170, .12, .06, .18, .01); },
    takeoff(c) { rush(c, 90, 1600, 2.8, .9, 0, 2.2); tone(c, 'sawtooth', 45, 95, 2.8, .28, 0, 2.2); },
    landing(c) { rush(c, 1600, 120, 2.4, .7, 0, .25); tone(c, 'sine', 70, 38, .5, .6, 1.9, .01); },
    engineStop(c) { tone(c, 'sawtooth', 110, 32, 1.8, .16, 0, .05); }
};

export const cockpitSounds: CockpitSounds = {
    cue(name) { const c = context(); if (c) CUES[name](c); },
    warp(on) {
        warpStop?.(); warpStop = null;
        const c = on ? context() : null;
        if (!c) return;
        const source = noise(c), band = c.createBiquadFilter(), gain = c.createGain(), drone = c.createOscillator(), droneGain = c.createGain();
        band.type = 'bandpass'; band.frequency.value = 520; band.Q.value = .6;
        gain.gain.setValueAtTime(.0001, c.currentTime); gain.gain.exponentialRampToValueAtTime(Math.max(.0001, .3 * audio.volume), c.currentTime + .5);
        drone.type = 'sine'; drone.frequency.value = 62; droneGain.gain.value = .5;
        source.connect(band); band.connect(gain); drone.connect(droneGain); droneGain.connect(gain); gain.connect(c.destination);
        source.start(); drone.start();
        warpStop = () => {
            const end = c.currentTime + .4;
            gain.gain.cancelScheduledValues(c.currentTime); gain.gain.setTargetAtTime(.0001, c.currentTime, .1);
            source.stop(end); drone.stop(end);
        };
    }
};
