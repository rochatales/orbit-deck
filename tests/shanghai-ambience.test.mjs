import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { loadSource } from './load-source.mjs';
import { run } from '../scripts/audio/fatiar-sfx.mjs';
const { AudioEngine } = loadSource('src/audio/AudioEngine.ts');
const { AUDIO } = loadSource('src/audio/config.ts');
const track = { name: 'Shanghai_Empty_City', url: 'ambience.mp3' };
function fakeContext() {
    const param = () => ({ value: 1, ramps: [], setTargetAtTime(v) { this.value = v; }, cancelScheduledValues() {}, cancelAndHoldAtTime() {}, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v, t) { this.ramps.push([v, t]); } });
    const node = () => ({ connect(target) { this.target = target; }, disconnect() { this.disconnected = true; } });
    return { state: 'suspended', currentTime: 0, destination: {}, decodes: 0, sources: [], gains: [],
        async resume() { this.state = 'running'; }, async suspend() { this.state = 'suspended'; },
        async decodeAudioData() { this.decodes++; return { duration: 120 }; },
        createGain() { const g = { ...node(), gain: param() }; this.gains.push(g); return g; },
        createStereoPanner() { return { ...node(), pan: param() }; },
        createBufferSource() { const s = { ...node(), playbackRate: param(), start(...args) { this.started = args; }, stop() { this.stopped = true; this.onended?.(); } }; this.sources.push(s); return s; },
    };
}
const response = () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });

test('Shanghai: loop só após gesto e no mapa correto; pausa/foco/mudo retomam a posição, Marte reinicia', async () => {
    const c = fakeContext(), saved = new Map(); let requests = 0, created = 0;
    const original = globalThis.fetch;
    globalThis.fetch = async () => { requests++; return response(); };
    try {
        const engine = new AudioEngine(() => { created++; return c; }, [{ name: 'SFX_Rifle_shot', url: 'shot.mp3' }], { getItem: k => saved.get(k), setItem: (k, v) => saved.set(k, v) }, track);
        engine.setMap('shanghai'); engine.setBlocked(false);
        assert.equal(created, 0); assert.equal(requests, 0, 'sem fetch/decode/play antes do gesto');
        engine.setMap('mars'); await engine.unlock();
        assert.equal(c.decodes, 1); assert.equal(c.sources.length, 0, 'Marte só carrega SFX');
        engine.setMap('shanghai'); await engine.unlock();
        assert.equal(c.decodes, 2); assert.equal(c.sources.length, 1);
        const music = c.sources[0]; assert.equal(music.loop, true); assert.deepEqual(music.started, [0, 0]);
        assert.deepEqual(c.gains[1].gain.ramps[0], [AUDIO.shanghaiAmbience.volume, AUDIO.shanghaiAmbience.fadeIn]);
        assert.equal(c.gains[1].target, c.gains[0], 'ambiência passa pelo mesmo volume geral dos SFX');
        engine.setMap('shanghai'); await engine.unlock(); assert.equal(c.sources.length, 1, 'loop único');
        engine.play({ type: 'shot', kind: 'patrol', x: 0, z: 0 });
        assert.equal(engine.voices.length, 1, 'música não consome vozes de combate');
        c.currentTime = 7; engine.setBlocked(true); await Promise.resolve();
        assert.equal(music.stopped, true); assert.equal(music.disconnected, true); assert.equal(c.state, 'suspended');
        c.currentTime = 40; engine.setBlocked(false); await Promise.resolve();
        const resumed = c.sources.at(-1); assert.deepEqual(resumed.started, [0, 7], 'pausa não avança a faixa');
        c.currentTime = 43; engine.setMuted(true); assert.equal(resumed.stopped, true);
        engine.setVolume(.45); engine.setMuted(false);
        assert.deepEqual(c.sources.at(-1).started, [0, 10]); assert.equal(c.gains[0].gain.value, .45);
        const restored = new AudioEngine(fakeContext, [], { getItem: k => saved.get(k), setItem() {} }, track);
        assert.equal(restored.volume, .45); assert.equal(restored.muted, false);
        const last = c.sources.at(-1); engine.setMap('mars'); assert.equal(last.stopped, true);
        engine.setMap('shanghai'); assert.deepEqual(c.sources.at(-1).started, [0, 0], 'nova visita começa no início');
        assert.equal(c.decodes, 2, 'buffer reaproveitado entre pausas, mudo e visitas');
    } finally { globalThis.fetch = original; }
});

test('Shanghai: decode atrasado não toca no mapa antigo nem durante pausa; SFX carregam independentemente', async () => {
    const c = fakeContext(); let release;
    const original = globalThis.fetch;
    globalThis.fetch = url => url === track.url ? new Promise(resolve => { release = () => resolve(response()); }) : Promise.resolve(response());
    try {
        const engine = new AudioEngine(() => c, [{ name: 'SFX_Rifle_shot', url: 'shot.mp3' }], undefined, track);
        engine.setBlocked(false); await engine.unlock();
        engine.setMap('shanghai');
        engine.play({ type: 'shot', kind: 'patrol', x: 0, z: 0 });
        assert.equal(engine.voices.length, 1, 'tiro funciona enquanto a música carrega');
        engine.setMap('mars'); engine.setBlocked(true); release(); await engine.unlock();
        assert.equal(c.sources.length, 1, 'decode não vaza som em Marte');
        engine.setMap('shanghai'); assert.equal(c.sources.length, 1, 'gate de pausa impede início');
        engine.setBlocked(false); assert.equal(c.sources.at(-1).loop, true);
    } finally { globalThis.fetch = original; }
});

test('Shanghai: faixa ausente não quebra SFX; mudo salvo impede a música no gesto inicial', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async url => url === track.url ? { ok: false, status: 404 } : response();
    try {
        const c = fakeContext(), engine = new AudioEngine(() => c, [{ name: 'SFX_Rifle_shot', url: 'shot.mp3' }], undefined, track);
        engine.setMap('shanghai'); engine.setBlocked(false); await engine.unlock();
        assert.equal(engine.stats.decodeErrors, 1);
        engine.play({ type: 'shot', kind: 'patrol', x: 0, z: 0 }); assert.equal(engine.voices.length, 1);
        globalThis.fetch = async () => response();
        const silent = fakeContext(), muted = new AudioEngine(() => silent, [], { getItem: () => '{"volume":0.3,"muted":true}', setItem() {} }, track);
        muted.setMap('shanghai'); muted.setBlocked(false); await muted.unlock();
        assert.equal(silent.sources.length, 0); muted.setMuted(false); assert.equal(silent.sources.length, 1);
    } finally { globalThis.fetch = original; }
});

test('Shanghai: cópia MP3 estéreo intacta, dois minutos, e integração ao gate de mapa existente', () => {
    const root = 'src/assets/audio/ambience/', manifest = JSON.parse(fs.readFileSync(root + 'manifesto.json'));
    const file = root + manifest.file;
    assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), manifest.sha256);
    const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file]).stdout);
    assert.equal(probe.streams[0].channels, 2); assert.equal(Number(probe.streams[0].sample_rate), 48000);
    assert.equal(Number(probe.format.duration), 120);
    assert.match(fs.readFileSync('src/audio/runtime.ts', 'utf8'), /assets\/audio\/ambience\/shanghai-empty-city\.mp3/);
    assert.match(fs.readFileSync('src/audio/AudioRuntime.tsx', 'utf8'), /audio\.setMap\(useExpeditionStore\.getState\(\)\.session\.map\)/);
});
