import { AUDIO } from './config';
export type MusicScene = 'home' | 'mars' | 'shanghai';
export type MusicFiles = Record<MusicScene, { url: string }>;
/** Uma trilha em streaming por vez, com o volume geral compartilhado. */
export class MusicPlayer {
    private gain: GainNode;
    private blocked = true;
    private pending = false;
    private revision = 0;
    errors = 0;
    constructor(private context: AudioContext, master: GainNode, private files: MusicFiles,
        private scene: MusicScene, private media = new Audio()) {
        this.media.loop = true;
        this.setSource();
        this.gain = context.createGain(); this.gain.gain.value = 0;
        context.createMediaElementSource(this.media).connect(this.gain); this.gain.connect(master);
    }
    private setSource() {
        this.media.preload = this.scene === 'home' ? 'auto' : 'metadata';
        const url = this.files[this.scene].url;
        // Atribuir src novamente descartaria o buffer preparado na home.
        if (this.media.getAttribute('src') !== url) this.media.src = url;
    }
    setScene(scene: MusicScene) {
        if (scene === this.scene) return;
        this.scene = scene; this.revision++; this.pending = false;
        this.media.pause(); this.setSource();
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
            const fadeIn = this.scene === 'home' ? AUDIO.music.homeFadeIn : AUDIO.music.fadeIn;
            this.gain.gain.linearRampToValueAtTime(AUDIO.music.volume, now + fadeIn);
        }).catch((error: unknown) => {
            if (revision !== this.revision) return;
            this.pending = false;
            if (!this.blocked && (error as { name?: string })?.name === 'AbortError') this.sync();
            else this.errors++;
        });
    }
}
