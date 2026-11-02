import { AUDIO } from './config';
export interface MusicFiles { mars: { url: string }; shanghai: { url: string } }
/** Uma trilha em streaming: evita decodificar seis minutos de PCM em memória JS. */
export class MusicPlayer {
    private media: HTMLAudioElement;
    private gain: GainNode;
    private blocked = true;
    private pending = false;
    private revision = 0;
    errors = 0;
    constructor(private context: AudioContext, master: GainNode, private files: MusicFiles,
        private map: 'mars' | 'shanghai', factory: () => HTMLAudioElement = () => new Audio()) {
        this.media = factory(); this.media.loop = true; this.media.preload = 'metadata';
        this.media.src = files[map].url;
        this.gain = context.createGain(); this.gain.gain.value = 0;
        context.createMediaElementSource(this.media).connect(this.gain); this.gain.connect(master);
    }
    setMap(map: 'mars' | 'shanghai') {
        if (map === this.map) return;
        this.map = map; this.revision++; this.pending = false;
        this.media.pause(); this.media.src = this.files[map].url; this.media.load();
        this.gain.gain.cancelScheduledValues(this.context.currentTime); this.gain.gain.value = 0;
        this.sync();
    }
    setBlocked(blocked: boolean) { this.blocked = blocked; this.sync(); }
    unlock() { this.sync(); }
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
