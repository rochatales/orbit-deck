import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { loadSource } from './load-source.mjs';
const { MusicPlayer } = loadSource('src/audio/MusicPlayer.ts');
const { AudioEngine } = loadSource('src/audio/AudioEngine.ts');
const { AUDIO, soundFor } = loadSource('src/audio/config.ts');
const { CombatSimulation } = loadSource('src/combat/simulation.ts');
const { COMBAT } = loadSource('src/combat/config.ts');
const musicFiles = { mars: { url: 'mars.mp3' }, shanghai: { url: 'shanghai.mp3' } };
function context() {
    const node = () => ({ connect(target) { this.target = target; } });
    const param = () => ({ value: 1, ramps: [], setValueAtTime(v) { this.value = v; }, setTargetAtTime(v) { this.value = v; }, cancelScheduledValues() {}, linearRampToValueAtTime(v, t) { this.ramps.push([v, t]); } });
    return { state: 'suspended', currentTime: 0, destination: {}, decodes: 0, mediaSources: [], gains: [],
        async resume() { this.state = 'running'; }, async suspend() { this.state = 'suspended'; },
        createGain() { const n = { ...node(), gain: param() }; this.gains.push(n); return n; },
        createMediaElementSource(media) { const n = { ...node(), media }; this.mediaSources.push(n); return n; },
        async decodeAudioData() { this.decodes++; return { duration: .2 }; },
    };
}
function media() {
    return { paused: true, currentTime: 0, plays: 0, loads: 0,
        async play() { this.plays++; this.paused = false; }, pause() { this.paused = true; },
        load() { this.loads++; this.currentTime = 0; },
    };
}
const event = (type, kind = 'patrol') => ({ type, kind, x: 0, z: 0 });
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };

test('Músicas: gesto obrigatório, streaming sem decode, mesma faixa nas salas, pausa/mudo preservam posição e volume geral', async () => {
    const original = globalThis.Audio, c = context(), m = media(); let created = 0;
    globalThis.Audio = function () { created++; return m; };
    try {
        const engine = new AudioEngine(() => c, [], undefined, undefined, undefined, musicFiles);
        engine.setMap('mars'); engine.setBlocked(false); assert.equal(created, 0);
        await engine.unlock(); await tick();
        assert.equal(created, 1); assert.equal(m.src, 'mars.mp3'); assert.equal(m.loop, true); assert.equal(m.plays, 1);
        assert.equal(c.decodes, 0, 'músicas não viram buffers de PCM JS');
        assert.equal(c.mediaSources.length, 1); assert.equal(c.mediaSources[0].target.target, c.gains[0], 'saída passa pelo master compartilhado');
        assert.deepEqual(c.gains[1].gain.ramps.at(-1), [AUDIO.music.volume, AUDIO.music.fadeIn]);
        m.currentTime = 37; engine.setMarsInterior(true); assert.equal(m.currentTime, 37); assert.equal(m.plays, 1);
        engine.setBlocked(true); assert.equal(m.paused, true); engine.setBlocked(false); await tick();
        assert.equal(m.currentTime, 37); assert.equal(m.paused, false);
        engine.setMuted(true); assert.equal(m.paused, true); engine.setVolume(.35); assert.equal(c.gains[0].gain.value, 0);
        engine.setMuted(false); await tick(); assert.equal(c.gains[0].gain.value, .35); assert.equal(m.currentTime, 37);
        engine.setMap('shanghai'); await tick(); assert.equal(m.src, 'shanghai.mp3'); assert.equal(m.currentTime, 0);
        engine.setMap('mars'); await tick(); assert.equal(m.src, 'mars.mp3'); assert.equal(m.currentTime, 0);
        assert.equal(created, 1); assert.equal(c.mediaSources.length, 1);
    } finally { globalThis.Audio = original; }
});

test('Músicas: play pendente não vaza na pausa; troca de mapa ignora a promessa da faixa antiga', async () => {
    const c = context(), m = media(), pending = [];
    m.play = () => { m.plays++; m.paused = false; return new Promise(resolve => pending.push(resolve)); };
    const player = new MusicPlayer(c, c.createGain(), musicFiles, 'mars', () => m);
    player.setBlocked(false); assert.equal(m.plays, 1);
    player.setBlocked(true); pending.shift()(); await tick(); assert.equal(m.paused, true);
    player.setBlocked(false); assert.equal(m.plays, 2);
    player.setMap('shanghai'); assert.equal(m.plays, 3);
    pending.shift()(); await tick(); assert.equal(m.src, 'shanghai.mp3');
    pending.shift()(); await tick(); assert.equal(m.paused, false);
    player.unlock(); assert.equal(m.plays, 3, 'gestos não reiniciam a trilha');
});

test('Rifle vazio: clique por pressão e cadência ao segurar, sem tiro/flash, não toca em recarga ou pausa', () => {
    const b = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
    const sim = new CombatSimulation({ bounds: b, walkableAreas: [b], obstacles: [] }, 1);
    sim.robots.forEach(r => r.hp = 0); sim.ammo = 0; sim.reserve = 0;
    const input = { player: { x: 0, z: 0 }, aim: { x: 0, z: 8 }, facingAngle: 0, firing: true, reload: false };
    sim.step(1 / 60, input); assert.equal(sim.sounds.slots[0].type, 'dryFire'); assert.equal(sim.shots.length, 0); assert.equal(sim.ammo, 0);
    sim.sounds.clear(); for (let i = 0; i < 10; i++) sim.step(1 / 60, input); assert.equal(sim.sounds.count, 0);
    sim.step(1 / 60, { ...input, firing: false }); sim.step(1 / 60, input); assert.equal(sim.sounds.slots[0].type, 'dryFire', 'nova pressão é imediata');
    sim.sounds.clear(); for (let i = 0; i < 60; i++) sim.step(1 / 60, input);
    assert.ok(sim.sounds.count >= 2 && sim.sounds.count <= 3); assert.ok(sim.sounds.slots.slice(0, sim.sounds.count).every(e => e.type === 'dryFire'));
    sim.sounds.clear(); sim.reserve = 20; sim.step(1 / 60, { ...input, reload: true }); assert.equal(sim.sounds.slots[0].type, 'reload');
    sim.sounds.clear(); for (let i = 0; i < 30; i++) sim.step(1 / 60, input); assert.equal(sim.sounds.count, 0);
    const reload = sim.reloadLeft; sim.step(1 / 60, input, true); assert.equal(sim.reloadLeft, reload); assert.equal(sim.sounds.count, 0);
    const live = new CombatSimulation({ bounds: b, walkableAreas: [b], obstacles: [] }, 1); live.robots.forEach(r => r.hp = 0); live.ammo = 1;
    live.step(1 / 60, input); assert.equal(live.ammo, 0); assert.equal(live.sounds.slots[0].type, 'shot'); live.sounds.clear();
    live.step(1 / 60, input); assert.equal(live.sounds.count, 0, 'respeita o intervalo do último tiro');
    for (let i = 0; i < Math.ceil(COMBAT.rifle.interval * 60); i++) live.step(1 / 60, input);
    assert.equal(live.sounds.slots[0].type, 'dryFire');
    assert.equal(soundFor(event('dryFire')).name, 'SFX_Rifle_Empty'); assert.equal(AUDIO.categories.dryFire.voices, 1);
});

test('Patrol pequeno: só receber tiro tem volume 40% menor; ataque, morte e demais tipos preservados', () => {
    assert.equal(soundFor(event('bulletHit', 'patrol')).gain, .6);
    for (const kind of ['largePatrol', 'smallMutant', 'largeMutant']) assert.equal(soundFor(event('bulletHit', kind)).gain, 1);
    assert.equal(soundFor(event('attack', 'patrol')).gain, 1); assert.equal(soundFor(event('death', 'patrol')).gain, 1);
});

test('Músicas/fontes intactas e sete cliques de mecanismo reproduzíveis com até 0,24 s', () => {
    const hash = data => createHash('sha256').update(data).digest('hex');
    const music = JSON.parse(fs.readFileSync('src/assets/audio/music/manifesto.json'));
    assert.equal(music.sources.length, 2);
    for (const source of music.sources) assert.equal(hash(fs.readFileSync('src/assets/audio/music/' + source.file)), source.sha256);
    const root = 'src/assets/audio/rifle/', manifest = JSON.parse(fs.readFileSync(root + 'manifesto.json'));
    assert.equal(hash(fs.readFileSync(root + manifest.source.file)), manifest.source.sha256);
    assert.equal(manifest.variations.length, 7);
    execFileSync('node', ['scripts/audio/preparar-gatilho-vazio.mjs']);
    for (const v of manifest.variations) {
        assert.equal(hash(fs.readFileSync(root + v.file)), v.sha256);
        const p = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', root + v.file]));
        assert.ok(Number(p.format.duration) > .1 && Number(p.format.duration) <= .24); assert.equal(p.streams[0].channels, 1);
    }
    const runtime = fs.readFileSync('src/audio/runtime.ts', 'utf8');
    assert.match(runtime, /music\/mars-strung-out\.mp3/); assert.match(runtime, /music\/shanghai-dov\.mp3/); assert.match(runtime, /emptyManifest\.variations/);
});
