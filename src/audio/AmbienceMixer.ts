import { AUDIO } from './config';
export interface AmbienceFile { name: string; url: string }
export interface MarsAmbienceFiles { outside: AmbienceFile; inside: AmbienceFile }
type Scene = 'shanghai' | 'marsOutside' | 'marsInside';
interface Layer {
    file: AmbienceFile; volume: number; buffer: AudioBuffer | null; loading: Promise<void> | null;
    source: AudioBufferSourceNode | null; gain: GainNode | null; offset: number; startedAt: number; target: number;
}
/** Camadas persistentes: crossfade sem recarregar ou reiniciar os loops nas soleiras. */
export class AmbienceMixer {
    private layers = new Map<Scene, Layer>();
    private scene: Scene = 'marsOutside';
    private blocked = true;
    constructor(private context: AudioContext, private master: GainNode, shanghai: AmbienceFile | undefined,
        mars: MarsAmbienceFiles | undefined, private onError: () => void) {
        const add = (key: Scene, file: AmbienceFile, volume: number) => this.layers.set(key,
            { file, volume, buffer: null, loading: null, source: null, gain: null, offset: 0, startedAt: 0, target: -1 });
        if (shanghai) add('shanghai', shanghai, AUDIO.shanghaiAmbience.volume);
        if (mars) { add('marsOutside', mars.outside, AUDIO.marsAmbience.outsideVolume); add('marsInside', mars.inside, AUDIO.marsAmbience.insideVolume); }
    }
    select(map: 'mars' | 'shanghai', inside: boolean) {
        const next: Scene = map === 'shanghai' ? 'shanghai' : inside ? 'marsInside' : 'marsOutside';
        if ((next === 'shanghai') !== (this.scene === 'shanghai')) {
            for (const layer of this.layers.values()) { this.stop(layer); layer.offset = 0; }
        }
        this.scene = next;
        for (const [key, layer] of this.layers) if ((key === 'shanghai') === (next === 'shanghai') && !layer.loading)
            layer.loading = this.load(layer);
        this.sync();
    }
    async ready() { await Promise.all(Array.from(this.layers.values(), l => l.loading)); }
    setBlocked(blocked: boolean) { this.blocked = blocked; this.sync(); }
    private async load(layer: Layer) {
        try {
            const response = await fetch(layer.file.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            layer.buffer = await this.context.decodeAudioData(await response.arrayBuffer());
            this.sync();
        } catch { this.onError(); }
    }
    private sync() {
        if (this.blocked) { for (const layer of this.layers.values()) this.stop(layer); return; }
        const desired = this.layers.get(this.scene);
        // Mantém a camada atual até a próxima estar decodificada.
        if (!desired?.buffer) return;
        const c = this.context, now = c.currentTime;
        for (const layer of this.layers.values()) {
            const target = layer === desired ? layer.volume : 0;
            if (!layer.source && target > 0) {
                const source = c.createBufferSource(), gain = c.createGain();
                source.buffer = layer.buffer; source.loop = true;
                gain.gain.setValueAtTime(0, now); source.connect(gain); gain.connect(this.master);
                source.onended = () => { source.disconnect(); gain.disconnect(); };
                layer.source = source; layer.gain = gain; layer.startedAt = now;
                source.start(0, layer.offset);
            }
            if (layer.gain && layer.target !== target) {
                const param = layer.gain.gain;
                param.cancelAndHoldAtTime(now);
                param.linearRampToValueAtTime(target, now + (this.scene === 'shanghai' ? AUDIO.shanghaiAmbience.fadeIn : AUDIO.marsAmbience.crossfade));
                layer.target = target;
            }
        }
    }
    private stop(layer: Layer) {
        if (!layer.source || !layer.buffer) return;
        layer.offset = (layer.offset + this.context.currentTime - layer.startedAt) % layer.buffer.duration;
        layer.source.stop(); layer.source = null; layer.gain = null; layer.target = -1;
    }
}
