import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Group } from 'three';
import { loadSource } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';
const { AmbienceMixer } = loadSource('src/audio/AmbienceMixer.ts');
const { AudioEngine } = loadSource('src/audio/AudioEngine.ts');
const { AUDIO, soundFor } = loadSource('src/audio/config.ts');
const { SoundQueue, DoorSoundClock, playerSounds } = loadSource('src/audio/events.ts');
const { MarsInteriorProbe, MARS_AUDIO_INTERIORS } = loadSource('src/audio/marsInterior.ts');
const files = { outside: { name: 'wind', url: 'outside' }, inside: { name: 'room', url: 'inside' } };
const shanghai = { name: 'city', url: 'shanghai' };
function context() {
    const node = () => ({ connect(target) { this.target = target; }, disconnect() { this.disconnected = true; } });
    const param = () => ({ value: 1, ramps: [], holds: [], setTargetAtTime(v) { this.value = v; }, cancelScheduledValues() {},
        setValueAtTime(v) { this.value = v; }, cancelAndHoldAtTime(t) { this.holds.push(t); }, linearRampToValueAtTime(v, t) { this.ramps.push([v, t]); } });
    return { currentTime: 0, state: 'suspended', decodes: 0, sources: [], gains: [], destination: {},
        async resume() { this.state = 'running'; }, async suspend() { this.state = 'suspended'; },
        async decodeAudioData(data) { this.decodes++; return { duration: 120, id: data.byteLength }; },
        createGain() { const g = { ...node(), gain: param() }; this.gains.push(g); return g; },
        createStereoPanner() { return { ...node(), pan: param() }; },
        createBufferSource() { const s = { ...node(), playbackRate: param(), start(...args) { this.started = args; }, stop() { this.stopped = true; this.onended?.(); } }; this.sources.push(s); return s; },
    };
}
const response = url => ({ ok: true, arrayBuffer: async () => new ArrayBuffer({ outside: 1, inside: 2, shanghai: 3 }[url] ?? 4) });

test('Marte: duas camadas pré-decodificadas, crossfade de 0,8 s sem reiniciar loops e reversão suave', async () => {
    const original = globalThis.fetch; globalThis.fetch = async url => response(url);
    try {
        const c = context(), master = c.createGain(), mixer = new AmbienceMixer(c, master, shanghai, files, () => assert.fail('decode'));
        mixer.select('mars', false); await mixer.ready(); assert.equal(c.sources.length, 0, 'bloqueio inicial');
        assert.equal(c.decodes, 2, 'interior pronto antes de entrar');
        mixer.setBlocked(false); const wind = c.sources[0]; assert.equal(wind.buffer.id, 1);
        c.currentTime = 4; mixer.select('mars', true);
        assert.equal(c.sources.length, 2); const room = c.sources[1]; assert.equal(room.buffer.id, 2);
        assert.deepEqual(c.gains[1].gain.ramps.at(-1), [0, 4 + AUDIO.marsAmbience.crossfade]);
        assert.deepEqual(c.gains[2].gain.ramps.at(-1), [AUDIO.marsAmbience.insideVolume, 4.8]);
        assert.equal(wind.stopped, undefined, 'exterior continua durante a transição');
        c.currentTime = 4.2; mixer.select('mars', false);
        assert.equal(c.sources.length, 2); assert.equal(c.gains[1].gain.holds.at(-1), 4.2, 'preserva ganho interpolado na reversão');
        for (let i = 0; i < 20; i++) { mixer.select('mars', true); mixer.select('mars', false); }
        assert.equal(c.sources.length, 2); assert.equal(c.decodes, 2);
        c.currentTime = 7; mixer.setBlocked(true); assert.ok(c.sources.every(s => s.stopped));
        c.currentTime = 50; mixer.setBlocked(false); assert.deepEqual(c.sources.at(-1).started, [0, 7]);
        mixer.select('shanghai', false); await mixer.ready(); assert.equal(c.sources.at(-1).buffer.id, 3);
        assert.equal(c.decodes, 3); mixer.select('mars', false); assert.equal(c.sources.at(-1).buffer.id, 1);
        assert.deepEqual(c.sources.at(-1).started, [0, 0], 'viagem reinicia as faixas');
    } finally { globalThis.fetch = original; }
});

test('Marte: troca antes do decode mantém vento, e pausa/mudo/gesto usam o gate compartilhado', async () => {
    const original = globalThis.fetch; let release;
    globalThis.fetch = url => url === 'inside' ? new Promise(resolve => { release = () => resolve(response(url)); }) : Promise.resolve(response(url));
    try {
        const c = context(), mixer = new AmbienceMixer(c, c.createGain(), undefined, files, () => assert.fail());
        mixer.setBlocked(false); mixer.select('mars', false);
        for (let i = 0; i < 6; i++) await Promise.resolve();
        assert.equal(c.sources.length, 1);
        const wind = c.sources[0], gain = c.gains[1]; mixer.select('mars', true);
        assert.equal(wind.stopped, undefined); assert.equal(gain.gain.ramps.at(-1)[0], AUDIO.marsAmbience.outsideVolume);
        mixer.setBlocked(true); release(); await mixer.ready(); assert.equal(c.sources.length, 1, 'decode em pausa fica silencioso');
        mixer.setBlocked(false); assert.equal(c.sources.at(-1).buffer.id, 2);
        globalThis.fetch = async url => response(url);
        const engineContext = context(), engine = new AudioEngine(() => engineContext, [], undefined, shanghai, files);
        engine.setMarsInterior(true); engine.setBlocked(false); assert.equal(engineContext.decodes, 0);
        await engine.unlock(); assert.equal(engineContext.sources.at(-1).buffer.id, 2, 'primeiro gesto já dentro da sala');
        engine.setMuted(true); assert.ok(engineContext.sources.at(-1).stopped);
        engine.setMuted(false); assert.equal(engineContext.sources.at(-1).buffer.id, 2);
        engine.setBlocked(true); assert.ok(engineContext.sources.at(-1).stopped);
        engine.setMap('shanghai'); engine.setMarsInterior(true); engine.setBlocked(false); await engine.unlock();
        assert.equal(engineContext.sources.at(-1).buffer.id, 3, 'salas não sobrescrevem Shanghai');
    } finally { globalThis.fetch = original; }
});

test('Marte: todas as dez salas ativas, exterior e histerese da soleira sem plantas antigas', () => {
    assert.equal(MARS_AUDIO_INTERIORS.length, 10);
    for (const [x, z] of [[0, 0], [0, -9], [18, -15], [16, 1], [-10, 0], [-10, 8], [10, 8], [7, 15], [0, 15], [14, 22]])
        assert.equal(new MarsInteriorProbe().update(x, z), true, `${x};${z}`);
    for (const [x, z] of [[0, 8], [0, 29.5], [0, 19], [-5, 15], [20, 18], [5, -10.5]])
        assert.equal(new MarsInteriorProbe().update(x, z), false, `${x};${z}`);
    const p = new MarsInteriorProbe(); assert.equal(p.update(0, -7.27), false);
    assert.equal(p.update(0, -7.4), true); assert.equal(p.update(0, -7.27), true); assert.equal(p.update(0, -7.24), false);
});

test('Portas: uma emissão na abertura, não repete por folha/quadro/soleira nem toca ao fechar', () => {
    const clock = new DoorSoundClock(), queue = new SoundQueue();
    clock.update(true, 0, 3, 7, queue); assert.equal(queue.count, 1); assert.equal(queue.slots[0].type, 'doorOpen');
    for (let i = 0; i < 100; i++) clock.update(true, .9, 3, 7, queue);
    clock.update(false, .6, 3, 7, queue); clock.update(true, .5, 3, 7, queue); assert.equal(queue.count, 1);
    clock.update(false, .02, 3, 7, queue); clock.update(true, 0, 3, 7, queue); assert.equal(queue.count, 2);
    assert.deepEqual(soundFor(queue.slots[0]), { name: 'SFX_Mars_Door_Open', category: 'doors', rate: 1, gain: 1 });
    assert.equal(AUDIO.categories.doors.voices, 2);
});

test('Portas reais: masterplan emite uma vez por par; Hangar, Quartel, Lab e Control Room emitem ao abrir', async () => {
    const { MasterplanRuntime } = loadSource('src/scene/marsColony/masterplanRuntime.ts');
    const scene = new Group(), parts = [];
    for (const side of ['L', 'R']) {
        const n = new Group(), id = `D_test_${side}`;
        n.userData = { id_estavel: id, estado_inicial: 'visivel', apoiado_em: [], apoiado_em_todos: [], slide_x: 1, slide_z: 0 };
        parts.push({ id, papel: 'door', ambiente: 'test', estado_inicial: 'visivel', apoiado_em: [], apoiado_em_todos: [] }); scene.add(n);
    }
    const r = new MasterplanRuntime(scene, { parts, walkableAreas: [], doors: [{ id: 'D_test', x: 0, z: 0, axis: 'x', width: 2.2, owner: 'test' }] }, 14.575);
    playerSounds.clear(); for (let i = 0; i < 20; i++) r.update({ x: 0, z: 0 }, 1 / 60);
    assert.equal(playerSounds.count, 1); assert.equal(playerSounds.slots[0].z, 14.575); r.dispose();
    const specs = [
        ['hangar/hangar-v002.glb', 'hangarRuntime', 'HangarRuntime', 0, 11.5],
        ['quartel/barracks-v006.glb', 'quartelRuntime', 'QuartelRuntime', 10.5, -4.5],
        ['laboratorio/laboratorio-v002.glb', 'laboratorioRuntime', 'LaboratorioRuntime', 6.74, -12.7],
        ['control-room/control-room-v002.glb', 'controlRoomRuntime', 'ControlRoomRuntime', 0, -7.25],
    ];
    for (const [file, module, name, x, z] of specs) {
        const glb = await loadGlb('src/assets/' + file), Runtime = loadSource(`src/scene/marsColony/${module}.ts`)[name];
        const runtime = new Runtime(glb.scene, glb.animations);
        playerSounds.clear(); runtime.update({ x, z }, 1 / 60);
        assert.equal(playerSounds.count, 1, name); assert.ok(Math.abs(playerSounds.slots[0].z - z) < 1e-6, name);
        for (let i = 0; i < 120; i++) runtime.update({ x, z }, 1 / 60);
        assert.equal(playerSounds.count, 1, name + ' sem repetição');
        runtime.dispose();
    }
    playerSounds.clear();
});

test('Marte: fontes intactas, última ação mecânica forte preservada e recorte reproduzível', () => {
    const root = 'src/assets/audio/mars/', manifest = JSON.parse(fs.readFileSync(root + 'manifesto.json'));
    for (const source of manifest.sources) assert.equal(createHash('sha256').update(fs.readFileSync(root + source.file)).digest('hex'), source.sha256);
    const before = fs.readFileSync(root + manifest.door.file);
    execFileSync('node', ['scripts/audio/preparar-porta-marte.mjs']);
    assert.deepEqual(fs.readFileSync(root + manifest.door.file), before);
    const p = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', root + manifest.door.file]));
    assert.equal(p.streams[0].channels, 1); assert.ok(Number(p.format.duration) >= 1.10 && Number(p.format.duration) < 1.16);
    assert.equal(manifest.door.startSeconds, 2.75); assert.equal(manifest.door.endSeconds, 3.85);
    // Evita regressão ao recorte antigo, que capturava apenas uma cauda quase inaudível.
    const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', root + manifest.door.file, '-t', '0.25', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-']);
    let energy = 0, peak = 0;
    for (let i = 0; i < pcm.length; i += 4) { const v = pcm.readFloatLE(i); energy += v * v; peak = Math.max(peak, Math.abs(v)); }
    assert.ok(20 * Math.log10(Math.sqrt(energy / (pcm.length / 4))) > -22, 'ataque da ação audível desde o início');
    assert.ok(20 * Math.log10(peak) > -10, 'rajada mecânica presente, não apenas reverberação');
});
