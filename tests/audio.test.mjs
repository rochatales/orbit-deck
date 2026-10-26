import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { loadSource } from './load-source.mjs';
import { audibleRanges, joinFragments, limitFor, run } from '../scripts/audio/fatiar-sfx.mjs';
const { AudioEngine } = loadSource('src/audio/AudioEngine.ts');
const { SoundQueue, FootstepClock } = loadSource('src/audio/events.ts');
const { AUDIO, soundFor, distanceGain, variationIndex } = loadSource('src/audio/config.ts');
const { CombatSimulation } = loadSource('src/combat/simulation.ts');
const { robotConfig } = loadSource('src/combat/config.ts');
const manifest = JSON.parse(fs.readFileSync('src/assets/audio/sfx/manifesto.json'));
function fakeContext() {
    const param = () => ({ value: 1, ramps: [], setTargetAtTime(v) { this.value = v; }, cancelScheduledValues() {}, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v, t) { this.ramps.push([v, t]); } });
    const node = () => ({ connect() {}, disconnect() { this.disconnected = true; } });
    return { state: 'suspended', currentTime: 2, destination: {}, decodes: 0, sources: [],
        async resume() { this.state = 'running'; }, async suspend() { this.state = 'suspended'; },
        async decodeAudioData() { this.decodes++; return { duration: .2 }; },
        createGain() { return { ...node(), gain: param() }; }, createStereoPanner() { return { ...node(), pan: param() }; },
        createBufferSource() { const s = { ...node(), playbackRate: param(), start() {}, stop(at) { this.stoppedAt = at ?? 0; }, finish() { this.onended?.(); } }; this.sources.push(s); return s; },
    };
}
const event = (type, kind = 'patrol') => ({ type, kind, x: 0, z: 0 });

test('S3.10: mapa completo por tipo, grande provisório e lacunas explícitas', () => {
    assert.equal(soundFor(event('shot')).name, 'SFX_Rifle_shot');
    assert.equal(soundFor(event('reload')).name, 'SFX_Rifle_Reload');
    assert.equal(soundFor(event('playerStep')).name, 'SFX_Main_character_step');
    assert.equal(soundFor(event('collect')).name, 'SFX_Item_collected');
    for (const [kind, prefix] of [['patrol', 'Patrol_small'], ['largePatrol', 'Patrol_big'], ['smallMutant', 'Mutant_small']]) {
        assert.equal(soundFor(event('bulletHit', kind)).name, `SFX_${prefix}_bullet_hit`);
        assert.equal(soundFor(event('death', kind)).name, `SFX_${prefix}_death_hit`);
        assert.equal(soundFor(event('enemyStep', kind))?.name ?? null, kind === 'smallMutant' ? null : `SFX_${prefix}_step`);
        assert.equal(soundFor(event('attack', kind)).name, `SFX_${kind === 'largePatrol' ? 'Patrol_small' : prefix}_attack_hit`);
    }
    assert.equal(soundFor(event('attack', 'largePatrol')).rate, .8);
    assert.ok(manifest.sources.filter(s => s.name.startsWith('SFX_Mutant_big_')).length === 3);
    for (const kind of ['patrol', 'largePatrol', 'smallMutant']) for (const type of ['shot', 'reload', 'playerStep', 'collect', 'bulletHit', 'death', 'attack'])
        assert.ok(manifest.sources.some(s => s.name === soundFor(event(type, kind)).name));
});

test('S3.10: buffers uma vez, gesto obrigatório, voz por categoria, fade e descarte', async () => {
    const context = fakeContext(); let created = 0;
    const storage = new Map(), save = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };
    const files = manifest.sources.flatMap(s => s.variations.map(v => ({ name: s.name, url: v.file })));
    const oldFetch = globalThis.fetch; globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    try {
        const engine = new AudioEngine(() => { created++; return context; }, files, save), queue = new SoundQueue();
        queue.emit('shot', 0, 0); engine.consume(queue, 0, 0, 1, 0);
        assert.equal(created, 0); assert.equal(queue.count, 0); assert.equal(context.sources.length, 0);
        engine.setBlocked(false); await engine.unlock(); await engine.unlock();
        assert.equal(created, 1); assert.equal(context.decodes, files.length);
        for (const [type, category] of [['shot', 'shot'], ['reload', 'reload'], ['bulletHit', 'impacts'], ['death', 'deaths'], ['attack', 'attacks'], ['enemyStep', 'enemySteps'], ['collect', 'collect'], ['playerStep', 'playerSteps']]) {
            const limit = AUDIO.categories[category].voices;
            for (let i = 0; i < limit + 2; i++) engine.play(event(type), 2, -.5);
            assert.equal(engine.voices.filter(v => v.category === category && !v.retiring).length, limit);
            const retired = engine.voices.find(v => v.category === category && v.retiring);
            assert.equal(retired.source.stoppedAt, 2.03);
            assert.deepEqual(retired.gain.gain.ramps.at(-1), [0, 2.03]);
        }
        const before = context.sources.length;
        engine.play(event('enemyStep'), 15.1); engine.play(event('shot'), 25); engine.play(event('enemyStep', 'smallMutant'));
        assert.equal(context.sources.length, before);
        engine.setBlocked(true); await Promise.resolve(); assert.equal(context.state, 'suspended');
        queue.emit('shot', 0, 0); engine.consume(queue, 0, 0, 1, 0); assert.equal(queue.count, 0);
        assert.ok(engine.voices.every(v => v.retiring && v.source.stoppedAt === 0));
        engine.setBlocked(false); await Promise.resolve(); engine.consume(queue, 0, 0, 1, 0); assert.equal(context.sources.length, before);
        engine.setVolume(.35); engine.setMuted(true); engine.play(event('shot')); assert.equal(context.sources.length, before);
        const restored = new AudioEngine(() => fakeContext(), files, save); assert.equal(restored.volume, .35); assert.equal(restored.muted, true);
        assert.deepEqual(JSON.parse(storage.get('exoden:audio:v1')), { volume: .35, muted: true });
        context.sources.forEach(s => s.finish()); assert.equal(engine.voices.length, 0);
        assert.equal(context.decodes, files.length, 'nenhum buffer novo por evento');
    } finally { globalThis.fetch = oldFetch; }
});

test('S3.10: fila reutiliza slots, pan pela câmera, distância e sorteio sem repetição', async () => {
    const q = new SoundQueue(2), first = q.slots[0]; q.emit('shot', 0, 0); q.emit('collect', 0, 0); q.emit('reload', 0, 0);
    assert.equal(q.count, 2); assert.equal(q.dropped, 1); q.clear(); q.emit('death', 0, 0); assert.equal(q.slots[0], first);
    for (let n = 2; n <= 8; n++) for (let previous = 0; previous < n; previous++) for (const random of [0, .2, .5, .99]) assert.notEqual(variationIndex(n, previous, random), previous);
    assert.equal(distanceGain(0), 1); assert.equal(distanceGain(4), 1); assert.equal(distanceGain(14.5), .5); assert.equal(distanceGain(25), 0);
    const engine = new AudioEngine(fakeContext, []), calls = []; engine.play = (...args) => calls.push(args);
    q.clear(); q.emit('shot', 10, 0); engine.consume(q, 0, 0, 1, 0); assert.equal(calls[0][2], 1);
    q.emit('shot', 10, 0); engine.consume(q, 0, 0, -1, 0); assert.equal(calls[1][2], -1);
    q.emit('shot', 10, 0); engine.consume(q, 0, 0, -1, 0, () => .35); assert.equal(calls[2][2], .35, 'projeção horizontal da tela tem precedência');
    const clock = new FootstepClock(); assert.equal(clock.advance('Run', 0, 1), false); assert.equal(clock.advance('Run', .49, 1), false);
    assert.equal(clock.advance('Run', .51, 1), true); assert.equal(clock.advance('Run', .9, 1), false); assert.equal(clock.advance('Run', .01, 1), true);
    clock.reset(); assert.equal(clock.advance('Backward', .6, 1), false);
});

test('S3.10: simulação emite tiro/hit ou morte por tipo; ataque só quando aplica dano', () => {
    const bounds = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, terrain = { bounds, walkableAreas: [bounds], obstacles: [] };
    const input = { player: { x: 0, z: 9.5 }, aim: { x: 0, z: -3 }, facingAngle: Math.PI, firing: true, reload: false };
    for (const kind of ['patrol', 'largePatrol', 'smallMutant']) {
        const sim = new CombatSimulation(terrain, 1), r = sim.robots[0]; Object.assign(r, { x: 0, z: -3, kind, hp: 50 }); sim.largeNavigation = sim.navigation; sim.mutantNavigation = sim.navigation;
        sim.step(1 / 60, input); assert.deepEqual(sim.sounds.slots.slice(0, sim.sounds.count).map(e => [e.type, e.kind]), [['shot', 'patrol'], ['bulletHit', kind]]);
        sim.sounds.clear(); sim.cooldown = 0; sim.step(1 / 60, input);
        assert.deepEqual(sim.sounds.slots.slice(0, sim.sounds.count).map(e => [e.type, e.kind]), [['shot', 'patrol'], ['death', kind]]);
        sim.sounds.clear(); sim.ammo = 10; sim.step(1 / 60, { ...input, firing: false, reload: true }); assert.equal(sim.sounds.slots[0].type, 'reload');
        sim.sounds.clear(); sim.step(1 / 60, { ...input, firing: false, reload: true }); assert.equal(sim.sounds.count, 0);
        r.hp = 50; Object.assign(r, input.player, { alerted: true }); sim.invulnerable = 0;
        sim.step(1 / 60, { ...input, firing: false, reload: false }); assert.equal(sim.sounds.slots[0].type, 'attack'); assert.equal(sim.sounds.slots[0].kind, kind);
        assert.equal(sim.hp, 100 - robotConfig(r).damage); sim.sounds.clear(); sim.step(1 / 60, { ...input, firing: false }); assert.equal(sim.sounds.count, 0);
        r.hp = 0; const drop = sim.drops[0]; Object.assign(drop, input.player, { active: true, kind: kind === 'patrol' ? 'metals' : kind === 'largePatrol' ? 'titanium' : 'organic' });
        sim.step(1 / 60, { ...input, firing: false }); assert.equal(sim.sounds.count, kind === 'patrol' ? 2 : 1, 'um som por item, metais são dois');
        sim.sounds.clear(); sim.step(1 / 60, { ...input, firing: false }, true); assert.equal(sim.sounds.count, 0);
    }
});

test('S3.10: 17 fontes intactas, detecção reproduzível, variações/durações/picos/mono 96k', () => {
    const expected = [4, 2, 1, 1, 14, 8, 3, 1, 1, 1, 5, 1, 1, 1, 5, 1, 5];
    assert.equal(manifest.sources.length, 17);
    const outputs = new Set();
    for (const [i, s] of manifest.sources.entries()) {
        assert.equal(createHash('sha256').update(fs.readFileSync(s.original)).digest('hex'), s.sha256);
        assert.equal(s.sourceSampleRate, 48000); assert.ok([1, 2].includes(s.sourceChannels));
        const log = run('ffmpeg', ['-hide_banner', '-i', s.original, '-af', 'silencedetect=noise=-38dB:d=0.06', '-f', 'null', '-']).stderr;
        const ranges = audibleRanges(log, s.sourceDuration), takes = joinFragments(ranges, s.name.includes('Rifle_shot') ? .35 : s.name.includes('Reload') ? .2 : 0);
        assert.equal(ranges.length, s.detectedSegments); assert.equal(takes.length, s.detectedTakes);
        assert.equal(s.variations.length, expected[i], s.name); assert.equal(s.maxDuration, limitFor(s.name));
        for (const v of s.variations) {
            const p = JSON.parse(run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', `src/assets/audio/sfx/${v.file}`]).stdout);
            assert.ok(Number(p.format.duration) <= s.maxDuration + .001, v.file); assert.equal(p.streams[0].channels, 1); assert.equal(Number(p.streams[0].sample_rate), 48000);
            assert.ok(Number(p.streams[0].bit_rate) <= 100000); assert.ok(Number.isFinite(v.peakDb) && v.peakDb <= 0); outputs.add(v.file);
        }
    }
    assert.equal(outputs.size, 55);
    assert.equal(fs.readdirSync('src/assets/audio/sfx').filter(n => n.endsWith('.mp3')).length, outputs.size);
});

test('Passos pesados: duas vozes reservadas, até 25 m, sem disputar quatro passos comuns; aviso grave/baixo',async()=>{
 const context=fakeContext(),oldFetch=globalThis.fetch;globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
 try{const files=manifest.sources.flatMap(s=>s.variations.map(v=>({name:s.name,url:v.file}))),engine=new AudioEngine(()=>context,files);engine.setBlocked(false);await engine.unlock();
 for(let i=0;i<4;i++)engine.play(event('enemyStep'),10);
 for(let i=0;i<3;i++)engine.play(event('enemyStep',i%2?'largePatrol':'largeMutant'),20);
 assert.equal(engine.voices.filter(v=>v.category==='enemySteps'&&!v.retiring).length,4);assert.equal(engine.voices.filter(v=>v.category==='heavySteps'&&!v.retiring).length,2);
 assert.equal(engine.stats.stolen,1);assert.equal(soundFor(event('enemyStep','largePatrol')).category,'heavySteps');assert.equal(soundFor(event('enemyStep','largeMutant')).category,'heavySteps');assert.ok(AUDIO.categories.heavySteps.volume>AUDIO.categories.enemySteps.volume);
 engine.play(event('chargeWarning','largeMutant'),2);const warning=engine.voices.at(-1);assert.equal(warning.source.playbackRate.value,.65);assert.equal(warning.gain.gain.value,.75*.25);assert.equal(engine.stats.playedEvents['chargeWarning:largeMutant'],1);
 engine.play(event('attack','largeMutant'),2);assert.equal(engine.voices.at(-1).source.playbackRate.value,1);assert.equal(engine.voices.at(-1).gain.gain.value,.75);
 }finally{globalThis.fetch=oldFetch;}
});
test('Passos pesados: 14 variações normalizadas por pico, fontes e durações preservadas',()=>{
 const source=manifest.sources.find(s=>s.name==='SFX_Mutant_big_step');assert.equal(source.variations.length,14);assert.equal(source.normalization.targetPeakDb,-6);
 const peaks=source.variations.map(v=>v.peakDb);assert.ok(Math.max(...peaks)-Math.min(...peaks)<1);assert.ok(peaks.every(p=>p>=-7&&p<=-5));
});
test('Investida: aviso de áudio ocorre uma vez ao começar a antecipação e não repete durante os 0,8 s',()=>{
 const b={minX:-30,maxX:30,minZ:-30,maxZ:30},s=new CombatSimulation({bounds:b,walkableAreas:[b],obstacles:[]},'hordas'),input={player:{x:0,z:0},aim:{x:0,z:10},facingAngle:0,firing:false,reload:false};
 s.wave=2;s.waveLeft=.001;s.step(1/60,input);s.robots.forEach(r=>r.hp=0);const r=s.robots.find(r=>r.kind==='largeMutant');Object.assign(r,{x:0,z:-6,hp:200,alerted:true,chargePhase:'ready'});s.sounds.clear();
 for(let i=0;i<40;i++)s.step(1/60,input);assert.equal(s.sounds.slots.slice(0,s.sounds.count).filter(e=>e.type==='chargeWarning').length,1);
});
