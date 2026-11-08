import { AUDIO } from './config';
import type { MapId } from '../game/session';
export type MusicScene = 'home' | MapId;
export type MusicFiles = Record<MusicScene, { url: string }>;
/** Uma trilha em streaming por vez, com o volume geral compartilhado. */
export class MusicPlayer {
    private media: HTMLAudioElement;
    private gain: GainNode;
    private blocked = true;
    private pending = false;
    private revision = 0;
    errors = 0;
    constructor(private context: AudioContext, master: GainNode, private files: MusicFiles,
        private scene: MusicScene, factory: () => HTMLAudioElement = () => new Audio()) {
        this.media = factory(); this.media.loop = true; this.media.preload = 'metadata';
        this.media.src = files[scene].url;
        this.gain = context.createGain(); this.gain.gain.value = 0;
        context.createMediaElementSource(this.media).connect(this.gain); this.gain.connect(master);
    }
    setScene(scene: MusicScene) {
        if (scene === this.scene) return;
        this.scene = scene; this.revision++; this.pending = false;
        this.media.pause(); this.media.src = this.files[scene].url; this.media.load();
        this.gain.gain.cancelScheduledValues(this.context.currentTime); this.gain.gain.value = 0;
        this.sync();
    }
    setBlocked(blocked: boolean) { this.blocked = blocked; this.sync(); }
    private sync() {
        if (this.blocked) { this.media.pause(); return; }
        if (!this.media.paused || this.pending) return;
        this.pending = true;
        const revision = this.revision;
        this.gain.gain.cancelScheduledValues(this.context.currentTime); this.gain.gain.value = 0;
        void this.media.play().then(() => {
            if (revision !== this.revision) return;
            this.pending = false;
            if (this.blocked) { this.media.pause(); return; }
            if (this.media.paused) { this.sync(); return; }
            const now = this.context.currentTime;
            this.gain.gain.setValueAtTime(0, now);
            this.gain.gain.linearRampToValueAtTime(AUDIO.music.volume, now + AUDIO.music.fadeIn);
        }).catch((error: unknown) => {
            if (revision !== this.revision) return;
            this.pending = false;
            if (!this.blocked && (error as { name?: string })?.name === 'AbortError') this.sync();
            else this.errors++;
        });
    }
}
