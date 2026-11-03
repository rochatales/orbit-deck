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
        createBufferSource() { const s = { ...node(), playbackRate: param(), start(...args) { this.started = args; }, stop(at) { this.stoppedAt = at ?? 0; if (at === undefined || at <= 0) { this.stopped = true; this.onended?.(); } } }; this.sources.push(s); return s; },
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

test('Marte: todas as nove salas ativas, exterior e histerese da soleira sem plantas antigas', () => {
    assert.equal(MARS_AUDIO_INTERIORS.length, 9);
    for (const [x, z] of [[0, 0], [0, -9], [18, -15], [16, 1], [-10, 0], [-10, 8], [11.5, 8], [0, 15], [14, 22]])
        assert.equal(new MarsInteriorProbe().update(x, z), true, `${x};${z}`);
    for (const [x, z] of [[0, 8], [0, 29.5], [0, 19], [-5, 15], [20, 18], [5, -10.5]])
        assert.equal(new MarsInteriorProbe().update(x, z), false, `${x};${z}`);
    const p = new MarsInteriorProbe(); assert.equal(p.update(0, -7.27), false);
    assert.equal(p.update(0, -7.4), true); assert.equal(p.update(0, -7.27), true); assert.equal(p.update(0, -7.24), false);
});

test('Portas: abre e fecha uma vez por transição, reverte em curso e cancela movimento mínimo', () => {
    const clock = new DoorSoundClock(), queue = new SoundQueue();
    clock.update(false, 0, 3, 7, queue); assert.equal(queue.count, 0);
    clock.update(true, 0, 3, 7, queue); assert.equal(queue.count, 1);
    assert.equal(queue.slots[0].type, 'doorOpen'); assert.equal(queue.slots[0].duration, .4);
    for (let i = 0; i < 100; i++) clock.update(true, .9, 3, 7, queue);
    assert.equal(queue.count, 1);
    clock.update(false, 1, 3, 7, queue); assert.equal(queue.slots[1].type, 'doorClose'); assert.equal(queue.slots[1].duration, .4);
    clock.update(false, .6, 3, 7, queue); assert.equal(queue.count, 2);
    clock.update(true, .5, 3, 7, queue); assert.equal(queue.count, 3);
    assert.ok(queue.slots[2].duration < .4); assert.equal(queue.slots[2].emitter, queue.slots[0].emitter);
    clock.update(false, .005, 3, 7, queue); assert.equal(queue.slots[3].duration, 0);
    assert.deepEqual(soundFor(queue.slots[1]), { name: 'SFX_Mars_Door_Open', category: 'doors', rate: 1, gain: 1 });
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

test('Marte: trecho WAV do autor acelerado sem tom agudo, duração de movimento e fades reproduzíveis', () => {
    const root = 'src/assets/audio/mars/', manifest = JSON.parse(fs.readFileSync(root + 'manifesto.json'));
    for (const source of manifest.sources) assert.equal(createHash('sha256').update(fs.readFileSync(root + source.file)).digest('hex'), source.sha256);
    const profiles = [manifest.door, manifest.quartelDoorOpen, manifest.quartelDoorClose, manifest.hangarFrontDoor, manifest.hangarFrontDoorClose];
    const before = profiles.map(profile => fs.readFileSync(root + profile.file));
    execFileSync('node', ['scripts/audio/preparar-porta-marte.mjs']);
    for (const [i, profile] of profiles.entries()) {
        assert.deepEqual(fs.readFileSync(root + profile.file), before[i]);
        const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', root + profile.file]));
        assert.equal(Number(info.format.duration), profile.durationSeconds);
        assert.equal(createHash('sha256').update(before[i]).digest('hex'), profile.sha256);
    }
    const p = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', root + manifest.door.file]));
    assert.equal(p.streams[0].channels, 2); assert.equal(p.streams[0].codec_name, 'pcm_s16le'); assert.equal(Number(p.format.duration), .4);
    assert.equal(manifest.door.source, 'door-original.wav'); assert.equal(manifest.door.file, 'mars-door-open.wav');
    assert.equal(manifest.door.startSeconds, 0); assert.equal(manifest.door.endSeconds, .8);
    assert.match(fs.readFileSync('src/audio/runtime.ts', 'utf8'), /import marsDoorUrl from '\.\.\/assets\/audio\/mars\/mars-door-open\.wav'/);
    // Evita regressão ao recorte antigo, que capturava apenas uma cauda quase inaudível.
    const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', root + manifest.door.file, '-t', '0.25', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-']);
    let energy = 0, peak = 0;
    for (let i = 0; i < pcm.length; i += 4) { const v = pcm.readFloatLE(i); energy += v * v; peak = Math.max(peak, Math.abs(v)); }
    assert.ok(20 * Math.log10(Math.sqrt(energy / (pcm.length / 4))) > -22, 'ataque da ação audível desde o início');
    assert.ok(20 * Math.log10(peak) > -10, 'rajada mecânica presente, não apenas reverberação');
    const tail = execFileSync('ffmpeg', ['-v', 'error', '-i', root + manifest.door.file, '-af', 'atrim=start=0.395', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-']);
    let tailPeak = 0;
    for (let i = 0; i < tail.length; i += 4) tailPeak = Math.max(tailPeak, Math.abs(tail.readFloatLE(i)));
    assert.ok(20 * Math.log10(tailPeak) < -35, 'últimos 5 ms terminam suaves, sem corte brusco');
    assert.equal(manifest.door.fadeOutSeconds, .025);
});

test('Hangar: som exclusivo na frente sincronizado ao abrir, laterais comuns e volume das portas reduzido', async () => {
    const { HangarRuntime } = loadSource('src/scene/marsColony/hangarRuntime.ts');
    const { HANGAR } = loadSource('src/game/hangarLayout.ts');
    const glb = await loadGlb('src/assets/hangar/hangar-v002.glb'), runtime = new HangarRuntime(glb.scene, glb.animations);
    const original = globalThis.fetch; globalThis.fetch = async () => response('door');
    try {
        playerSounds.clear(); assert.equal(runtime.status.rampOpen, 0);
        runtime.update({ x: 0, z: 21 }, 1 / 60);
        assert.ok(runtime.status.rampOpen > 0, 'evento no mesmo passo do começo da abertura');
        assert.equal(playerSounds.count, 1); assert.equal(playerSounds.slots[0].type, 'hangarDoorOpen');
        assert.equal(playerSounds.slots[0].z, HANGAR.ramp.thresholdZ);
        assert.equal(soundFor(playerSounds.slots[0]).name, 'SFX_Hangar_Front_Open');
        for (let i = 0; i < 120; i++) runtime.update({ x: 0, z: 21 }, 1 / 60);
        assert.equal(playerSounds.count, 1, 'sem repetir enquanto aberta');
        const c = context(), engine = new AudioEngine(() => c, [
            { name: 'SFX_Hangar_Front_Open', url: 'hangar' }, { name: 'SFX_Hangar_Front_Close', url: 'close' }, { name: 'SFX_Mars_Door_Open', url: 'door' },
        ]);
        engine.setBlocked(false); await engine.unlock(); engine.consume(playerSounds, 0, 21, 1, 0);
        assert.equal(engine.stats.played.SFX_Hangar_Front_Open, 1);
        assert.equal(engine.voices[0].gain.gain.value, .45);
        assert.equal(AUDIO.categories.doors.volume, .45); assert.equal(AUDIO.categories.doors.voices, 2);
        for (let i = 0; i < 120; i++) runtime.update({ x: 0, z: 30 }, 1 / 60);
        assert.equal(playerSounds.count, 1); assert.equal(playerSounds.slots[0].type, 'hangarDoorClose');
        assert.ok(Math.abs(playerSounds.slots[0].duration - .28) < 1e-6);
        engine.consume(playerSounds, 0, 21, 1, 0); assert.equal(engine.stats.played.SFX_Hangar_Front_Close, 1);
        runtime.update({ x: 0, z: 11.5 }, 1 / 60);
        assert.equal(playerSounds.count, 1); assert.equal(playerSounds.slots[0].type, 'doorOpen', 'porta norte continua usando WAV comum');
        engine.consume(playerSounds, 0, 11.5, 1, 0); assert.equal(engine.stats.played.SFX_Mars_Door_Open, 1);
        const root = 'src/assets/audio/mars/', m = JSON.parse(fs.readFileSync(root + 'manifesto.json')).hangarFrontDoor;
        assert.equal(m.source, 'hangar-door-original.mp3');
        assert.equal(createHash('sha256').update(fs.readFileSync(root + m.file)).digest('hex'), m.sha256);
        const p = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', root + m.file]));
        assert.equal(Number(p.format.duration), .2); assert.equal(p.streams[0].codec_name, 'pcm_s16le');
        assert.match(fs.readFileSync('src/audio/runtime.ts', 'utf8'), /SFX_Hangar_Front_Open/);
    } finally { globalThis.fetch = original; runtime.dispose(); playerSounds.clear(); }
});

test('Portas reais: áudio termina junto a 99% do curso nas duas direções, inclusive clipes do Quartel e Hangar', async () => {
    const { Vector3 } = await import('three');
    const Q = loadSource('src/game/quartelLayout.ts').QUARTEL;
    const specs = [
        ['Control Room', 'control-room/control-room-v002.glb', 'controlRoomRuntime', 'ControlRoomRuntime', 0, -7.25, 'D_Control_S_A', 'doorOpen', 'doorClose'],
        ['Laboratório', 'laboratorio/laboratorio-v002.glb', 'laboratorioRuntime', 'LaboratorioRuntime', 6.74, -12.7, 'Lab_AirlockDoor', 'doorOpen', 'doorClose'],
        ...Q.doors.map(d => ['Quartel ' + d.side, 'quartel/barracks-v006.glb', 'quartelRuntime', 'QuartelRuntime', d.x, d.z, Q.dynamicCuboids.find(c => c.side === d.side).id, 'quartelDoorOpen', 'quartelDoorClose']),
        ['Hangar frontal', 'hangar/hangar-v002.glb', 'hangarRuntime', 'HangarRuntime', 0, 21, 'Portal_Shutter', 'hangarDoorOpen', 'hangarDoorClose'],
    ];
    for (const [label, file, module, name, x, z, node, openType, closeType] of specs) {
        const glb = await loadGlb('src/assets/' + file), Runtime = loadSource(`src/scene/marsColony/${module}.ts`)[name];
        const runtime = new Runtime(glb.scene, glb.animations), p = glb.scene.getObjectByName(node), v = new Vector3();
        try {
            runtime.update({ x: 1000, z: 1000 }, 0); p.getWorldPosition(v); const origin = v.clone(), opened = [], closed = [];
            playerSounds.clear();
            for (let i = 0; i < 180; i++) { runtime.update({ x, z }, 1 / 120); p.getWorldPosition(v); opened.push(v.distanceTo(origin)); }
            const open = playerSounds.slots.find((e, i) => i < playerSounds.count && e.type === openType);
            assert.ok(open, label); const openTime = open.duration;
            assert.equal(playerSounds.slots.slice(0, playerSounds.count).filter(e => e.type === openType).length, 1);
            const full = opened.at(-1); assert.ok(full > .01, label + ' folha realmente se moveu');
            playerSounds.clear();
            for (let i = 0; i < 180; i++) { runtime.update({ x: 1000, z: 1000 }, 1 / 120); p.getWorldPosition(v); closed.push(1 - v.distanceTo(origin) / full); }
            const close = playerSounds.slots.find((e, i) => i < playerSounds.count && e.type === closeType);
            assert.ok(close, label); const closeTime = close.duration;
            assert.equal(playerSounds.slots.slice(0, playerSounds.count).filter(e => e.type === closeType).length, 1);
            const measuredOpen = (opened.findIndex(d => d >= .99 * full) + 1) / 120;
            const measuredClose = (closed.findIndex(d => d >= .99) + 1) / 120;
            assert.ok(Math.abs(openTime - measuredOpen) <= .02, `${label}: abre ${openTime} / ${measuredOpen}`);
            assert.ok(Math.abs(closeTime - measuredClose) <= .02, `${label}: fecha ${closeTime} / ${measuredClose}`);
        } finally { runtime.dispose(); playerSounds.clear(); }
    }
});

test('Portas: inversão encerra apenas a voz da mesma porta, corta curso parcial com fade e não deixa backlog', async () => {
    const original = globalThis.fetch; globalThis.fetch = async () => response('door');
    try {
        const c = context(), engine = new AudioEngine(() => c, [{ name: 'SFX_Mars_Door_Open', url: 'door' }]);
        const clock = new DoorSoundClock(), other = new DoorSoundClock(), queue = new SoundQueue();
        engine.setBlocked(false); await engine.unlock();
        clock.update(true, 0, 0, 0, queue); engine.consume(queue, 0, 0, 1, 0);
        const first = engine.voices[0]; assert.equal(first.source.stoppedAt, .4);
        other.update(true, 0, 0, 0, queue); engine.consume(queue, 0, 0, 1, 0); const unrelated = engine.voices.at(-1);
        clock.update(false, .5, 0, 0, queue); const duration = queue.slots[0].duration;
        engine.consume(queue, 0, 0, 1, 0);
        assert.equal(first.retiring, true); assert.equal(first.source.stoppedAt, AUDIO.stealFade);
        assert.equal(unrelated.retiring, false); assert.ok(duration < .4);
        const closing = engine.voices.at(-1); assert.equal(closing.source.stoppedAt, duration);
        assert.deepEqual(closing.gain.gain.ramps.at(-1), [0, duration]);
        assert.equal(closing.source.playbackRate.value, 1, 'sem mudança de tom no curso parcial');
        clock.update(true, .995, 0, 0, queue); engine.consume(queue, 0, 0, 1, 0);
        assert.equal(closing.retiring, true, 'reversão mínima cancela a voz');
        assert.equal(engine.voices.filter(v => !v.retiring).length, 1, 'porta sem curso não cria novo som');
        engine.setBlocked(true); clock.update(false, 1, 0, 0, queue); engine.consume(queue, 0, 0, 1, 0);
        assert.equal(queue.count, 0); const count = c.sources.length;
        engine.setBlocked(false); await Promise.resolve(); engine.consume(queue, 0, 0, 1, 0); assert.equal(c.sources.length, count);
        queue.emit('shot', 0, 0); assert.equal(queue.slots[0].emitter, 0); assert.equal(queue.slots[0].duration, 0, 'slot reutilizado não vaza duração para combate');
        assert.equal(c.decodes, 1, 'eventos reutilizam o buffer');
    } finally { globalThis.fetch = original; }
});
