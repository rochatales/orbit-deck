import { isExpedition } from '../game/config';
import { MusicPlayer, type MusicFiles, type MusicScene } from './MusicPlayer';
import { AmbienceMixer, type MarsAmbienceFiles } from './AmbienceMixer';
import { AUDIO, distanceGain, soundFor, variationIndex, type Category } from './config';
import type { SoundEvent, SoundQueue } from './events';
import type { MapId } from '../game/session';
interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
interface Voice { source: AudioBufferSourceNode; gain: GainNode; pan: StereoPannerNode; category: Category; retiring: boolean; emitter?: number }
export interface SoundFile { name: string; url: string }
/** Serviço único por página. Contexto e buffers só existem depois de um gesto. */
function musicScene(map: MapId | null): MusicScene {
    return isExpedition(map ?? '') ? 'shanghai' : map === 'mars' ? 'mars' : 'home';
}

export class AudioEngine {
    context: AudioContext | null = null;
    volume: number = AUDIO.defaultVolume;
    muted = false;
    unlocked = false;
    blocked = true;
    readonly stats = { events: {} as Record<string, number>, played: {} as Record<string, number>, playedEvents: {} as Record<string, number>, stolen: 0, discarded: 0, decodeErrors: 0 };
    readonly voices: Voice[] = [];
    readonly buffers = new Map<string, AudioBuffer[]>();
    private previous = new Map<string, number>();
    private powerTone: OscillatorNode | null = null;
    private master: GainNode | null = null;
    private loading: Promise<void> | null = null;
    private listeners = new Set<() => void>();
    private revision = 0;
    private ready = false;
    private gateRevision = 0;
    private musicPlayer: MusicPlayer | null = null;
    private preparedHomeMusic: HTMLAudioElement | null = null;
    private ambienceMixer: AmbienceMixer | null = null;
    private map: MapId | null = 'mars';
    private marsInside = false;
    constructor(private factory: () => AudioContext, private files: readonly SoundFile[], private storage?: StorageLike,
        private ambience?: SoundFile, private marsAmbience?: MarsAmbienceFiles, private music?: MusicFiles) {
        try {
            const saved = JSON.parse(storage?.getItem(AUDIO.storageKey) ?? 'null');
            if (saved && Number.isFinite(saved.volume)) this.volume = Math.max(0, Math.min(1, saved.volume));
            if (typeof saved?.muted === 'boolean') this.muted = saved.muted;
        } catch { /* Save inválido ou armazenamento indisponível: padrão local. */ }
    }
    subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
    snapshot = () => this.revision;
    setVolume(volume: number) { this.volume = Math.max(0, Math.min(1, volume)); this.settingsChanged(); }
    setMuted(muted: boolean) { this.muted = muted; if (muted) this.stopAll(); this.settingsChanged(); }
    private settingsChanged() {
        if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, .01);
        this.syncPlayback();
        try { this.storage?.setItem(AUDIO.storageKey, JSON.stringify({ volume: this.volume, muted: this.muted })); } catch { /* Sem persistência: controle continua funcional. */ }
        this.revision++; this.listeners.forEach(f => f());
    }
    async unlock() {
        if (!this.context) {
            this.context = this.factory(); this.master = this.context.createGain();
            this.master.gain.value = this.muted ? 0 : this.volume; this.master.connect(this.context.destination);
            this.unlocked = true;
            this.ambienceMixer = new AmbienceMixer(this.context, this.master, this.ambience, this.marsAmbience, () => { this.stats.decodeErrors++; });
            this.prepareGameplay();
            if (this.music) {
                this.musicPlayer = new MusicPlayer(this.context, this.master, this.music, musicScene(this.map), this.preparedHomeMusic ?? undefined);
                this.preparedHomeMusic = null;
            }
        }
        // resume deve ser chamado na pilha do gesto, antes de aguardar fetch/decode.
        const resume = !this.blocked && this.context.state !== 'running' ? this.context.resume().catch(() => {}) : undefined;
        this.syncPlayback();
        await resume;
        await this.loading;
        await this.ambienceMixer?.ready();
        if (this.blocked) await this.context.suspend().catch(() => {});
    }
    private prepareGameplay() {
        if (!this.map || !this.ambienceMixer) return;
        this.loading ??= this.load();
        this.ambienceMixer.select(this.map, this.marsInside);
    }
    playPowerUp() {
        const context = this.context;
        if (!context || !this.master || this.blocked || this.muted || context.state !== 'running') return;
        this.stopPowerUp();
        const tone = context.createOscillator(), gain = context.createGain();
        const now = context.currentTime;
        tone.type = 'triangle';
        tone.frequency.setValueAtTime(68, now);
        tone.frequency.exponentialRampToValueAtTime(392, now + 1.55);
        gain.gain.setValueAtTime(.001, now);
        gain.gain.exponentialRampToValueAtTime(.14, now + .36);
        gain.gain.exponentialRampToValueAtTime(.001, now + 1.7);
        tone.connect(gain); gain.connect(this.master);
        tone.onended = () => {
            tone.disconnect(); gain.disconnect();
            if (this.powerTone === tone) this.powerTone = null;
        };
        this.powerTone = tone;
        tone.start(now); tone.stop(now + 1.72);
    }
    stopPowerUp() {
        this.powerTone?.stop();
        this.powerTone = null;
    }
    private syncPlayback() {
        const blocked = this.blocked || this.muted;
        this.ambienceMixer?.setBlocked(blocked || this.map === null);
        this.musicPlayer?.setBlocked(blocked);
    }
    private async load() {
        await Promise.all(this.files.map(async file => {
            try {
                const response = await fetch(file.url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const buffer = await this.context!.decodeAudioData(await response.arrayBuffer());
                const list = this.buffers.get(file.name) ?? []; list.push(buffer); this.buffers.set(file.name, list);
            } catch { this.stats.decodeErrors++; }
        }));
        this.ready = true;
    }
    /** Na home não há mapa, ambiência nem carregamento de efeitos. */
    setMap(map: MapId | null) {
        if (this.map === map) return;
        this.map = map; this.marsInside = false;
        if (map === null && this.music && !this.musicPlayer && !this.preparedHomeMusic) {
            // Prepara a faixa sem abrir o contexto nem tocar antes do gesto.
            this.preparedHomeMusic = new Audio();
            this.preparedHomeMusic.preload = 'auto';
            this.preparedHomeMusic.src = this.music.home.url;
        }
        this.prepareGameplay();
        this.musicPlayer?.setScene(musicScene(map));
        this.syncPlayback();
    }
    setMarsInterior(inside: boolean) {
        if (this.map !== 'mars' || this.marsInside === inside) return;
        this.marsInside = inside;
        this.ambienceMixer?.select('mars', inside);
    }
    setBlocked(blocked: boolean) {
        if (blocked === this.blocked) return;
        this.blocked = blocked;
        this.syncPlayback();
        const revision = ++this.gateRevision;
        if (blocked) { this.stopAll(); this.stopPowerUp(); }
        const c = this.context;
        if (c) void (blocked ? c.suspend() : c.resume()).then(() => {
            // Mudança de foco/diálogo durante uma transição assíncrona: converge ao gate atual.
            if (revision !== this.gateRevision) void (this.blocked ? c.suspend() : c.resume()).catch(() => {});
        }).catch(() => {});
    }
    consume(queue: SoundQueue, x: number, z: number, rightX: number, rightZ: number, screenPan?: (x: number, z: number) => number) {
        for (let i = 0; i < queue.count; i++) {
            const e = queue.slots[i];
            const key = `${e.type}:${e.kind}`;
            this.stats.events[key] = (this.stats.events[key] ?? 0) + 1;
            const dx = e.x - x, dz = e.z - z, distance = Math.hypot(dx, dz);
            this.play(e, distance, screenPan ? screenPan(e.x, e.z) : Math.max(-1, Math.min(1, (dx * rightX + dz * rightZ) / Math.max(4, distance))));
        }
        queue.clear(); // inclusive bloqueado/mudo/carregando: nunca reproduzir backlog.
    }
    play(event: SoundEvent, distance = 0, pan = 0) {
        const sound = soundFor(event), c = this.context;
        const far = sound?.category === 'enemySteps' ? AUDIO.enemyStepDistance : sound?.category === 'heavySteps' ? AUDIO.heavyStepDistance : AUDIO.far;
        if (!sound || !c || !this.map || !this.ready || !this.unlocked || this.blocked || this.muted || c.state !== 'running'
            || distance >= far) { this.stats.discarded++; return; }
        const category = AUDIO.categories[sound.category];
        if (sound.category === 'doors' && event.emitter) {
            for (const voice of this.voices) if (voice.emitter === event.emitter) this.retire(voice);
            if (!event.duration) return; // inversão sem curso perceptível só encerra o som anterior.
        }
        const buffers = this.buffers.get(sound.name);
        if (!buffers?.length) { this.stats.discarded++; return; }
        let oldest: Voice | undefined, count = 0;
        for (const voice of this.voices) if (!voice.retiring && voice.category === sound.category) { count++; oldest ??= voice; }
        if (count >= category.voices && oldest) { this.retire(oldest); this.stats.stolen++; }
        const index = variationIndex(buffers.length, this.previous.get(sound.name) ?? -1);
        this.previous.set(sound.name, index);
        const source = c.createBufferSource(), gain = c.createGain(), stereo = c.createStereoPanner();
        source.buffer = buffers[index];
        const duration = sound.category === 'doors' && event.duration ? event.duration : 0;
        source.playbackRate.value = sound.rate;
        gain.gain.value = category.volume * sound.gain * distanceGain(distance, far); stereo.pan.value = pan;
        if (duration > 0) {
            const now = c.currentTime;
            gain.gain.setValueAtTime(gain.gain.value, now + Math.max(0, duration - .02));
            gain.gain.linearRampToValueAtTime(0, now + duration);
        }
        source.connect(gain); gain.connect(stereo); stereo.connect(this.master!);
        const voice: Voice = { source, gain, pan: stereo, category: sound.category, retiring: false, emitter: sound.category === 'doors' ? event.emitter : undefined };
        this.voices.push(voice);
        source.onended = () => {
            source.disconnect(); gain.disconnect(); stereo.disconnect();
            const at = this.voices.indexOf(voice); if (at >= 0) this.voices.splice(at, 1);
        };
        source.start();
        if (duration > 0) source.stop(c.currentTime + duration);
        const key=`${event.type}:${event.kind}`;this.stats.playedEvents[key]=(this.stats.playedEvents[key]??0)+1; this.stats.played[sound.name] = (this.stats.played[sound.name] ?? 0) + 1;
    }
    private retire(voice: Voice) {
        if (voice.retiring || !this.context) return;
        voice.retiring = true;
        const now = this.context.currentTime;
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
        voice.gain.gain.linearRampToValueAtTime(0, now + AUDIO.stealFade);
        voice.source.stop(now + AUDIO.stealFade);
    }
    private stopAll() {
        // Pausa/foco/mudo cancelam imediatamente: nada volta a tocar ao retomar.
        for (const voice of this.voices) {
            voice.gain.gain.cancelScheduledValues(this.context!.currentTime);
            voice.gain.gain.value = 0; voice.retiring = true; voice.source.stop();
        }
    }
}
