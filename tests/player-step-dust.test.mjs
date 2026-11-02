import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Bone, Group, Vector3 } from 'three';
import { loadSource } from './load-source.mjs';
const { StepDustPool, STEP_DUST, dustSurfaceHeight } = loadSource('src/characters/player/stepDust.ts');
const { FootstepClock } = loadSource('src/audio/events.ts');
const { createWorld } = loadSource('src/game/marsWorld.ts');
const { createPhase01Terrain } = loadSource('src/game/shanghai/layout.ts');

test('Poeira: mesmos dois apoios do ciclo, alterna pés, não acumula no ar e independe do som/mudo', () => {
    const pool = new StepDustPool(), clock = new FootstepClock();
    for (const time of [0, .3, .51, .7, .99, .01]) if (clock.advance('Run', time, 1)) pool.request(Math.floor(time * 2) % 2, .7, true);
    assert.equal(pool.pending, 2); assert.deepEqual(Array.from(pool.sides.slice(0, 2)), [1, 0]);
    assert.ok(Math.abs(pool.angles[0] - .7) < 1e-6);
    pool.request(1, 0, false); assert.equal(pool.pending, 2, 'sem poeira no ar');
    for (let i = 0; i < 20; i++) pool.request(i % 2, 0, true);
    assert.equal(pool.pending, STEP_DUST.pendingCapacity, 'fila limitada');
    const controller = fs.readFileSync('src/characters/player/LocomotionController.tsx', 'utf8');
    assert.match(controller, /stepClock\.current\.advance[\s\S]*playerSounds\.emit\('playerStep'[\s\S]*playerStepDust\.request/);
    assert.match(controller, /motion\.animationState === "walking" \|\| motion\.animationState === "backward"/);
    assert.match(controller, /motion\.planarSpeed >= PLAYER_LOCOMOTION\.stopSpeed/);
    assert.match(controller, /motion\.isGrounded/);
});

test('Poeira: pool fixo de 96, nuvem curta cresce e desaparece, pausa congela e reset reutiliza tudo', () => {
    const pool = new StepDustPool(), slots = [...pool.particles], random = () => .5;
    pool.emit(2, .1, 4, 0, random); assert.equal(pool.particles.filter(p => p.life > 0).length, STEP_DUST.perStep);
    const first = pool.particles[0]; assert.ok(first.y >= .1); assert.ok(first.vz < 0, 'poeira fica para trás do movimento');
    const startSize = first.size; pool.step(.03); assert.ok(first.size > startSize); assert.ok(first.alpha > 0);
    const beforePause = JSON.stringify(pool.particles); pool.step(0); assert.equal(JSON.stringify(pool.particles), beforePause);
    for (let i = 0; i < 200; i++) pool.emit(i, .025, 3, Math.PI, random);
    assert.equal(pool.particles.length, STEP_DUST.capacity); assert.equal(pool.particles.filter(p => p.life > 0).length, STEP_DUST.capacity);
    pool.particles.forEach((p, i) => assert.equal(p, slots[i]));
    for (let i = 0; i < 20; i++) pool.step(.05);
    assert.ok(pool.particles.every(p => p.life === 0 && p.alpha === 0));
    pool.request(0, 0, true); pool.emit(0, 0, 0, 0, random); pool.reset();
    assert.equal(pool.pending, 0); assert.ok(pool.particles.every(p => p.life === 0));
    pool.particles.forEach((p, i) => assert.equal(p, slots[i]));
});

test('Poeira: pés reais em nomes glTF/Mixamo e limpeza de variante não desliga o novo modelo', () => {
    const a = new Group(), b = new Group(), left = new Bone(), right = new Bone();
    left.name = 'mixamorig:LeftFoot'; right.name = 'mixamorigRightFoot'; a.add(left, right);
    a.position.set(2, .16, 4); left.position.set(-.15, .03, 0); right.position.set(.15, .03, 0);
    const pool = new StepDustPool(); pool.bind(a);
    assert.equal(pool.leftFoot, left); assert.equal(pool.rightFoot, right);
    assert.ok(left.getWorldPosition(new Vector3()).distanceTo(new Vector3(1.85, .19, 4)) < 1e-6);
    pool.bind(b); pool.unbind(a); assert.equal(pool.leftFoot, null);
    const foot = new Bone(); foot.name = 'mixamorigLeftFoot'; b.add(foot); pool.bind(b); pool.unbind(a);
    assert.equal(pool.leftFoot, foot); pool.unbind(b); assert.equal(pool.leftFoot, null); assert.equal(pool.rightFoot, null);
});

test('Poeira: apoia em rua/calçada/canteiro/grama e no piso do Hangar sem consultar malha', () => {
    const mars = createWorld(); assert.equal(dustSurfaceHeight(mars, 0, 14), .16 + STEP_DUST.groundOffset);
    assert.equal(dustSurfaceHeight(mars, 0, 25), STEP_DUST.groundOffset);
    const world = createPhase01Terrain();
    const data = JSON.parse(fs.readFileSync('src/assets/shanghai-fase01/layout.json'));
    // Pontos do ensaio de apoio já exportados pela fase 01; também verifica a precedência do piso.
    const found = new Map();
    for (let x = data.bounds.minX; x <= data.bounds.maxX && found.size < 4; x += .5)
        for (let z = data.bounds.minZ; z <= data.bounds.maxZ; z += .5) {
            const h = world.surfaceHeight(x, z);
            for (const wanted of [0, .12, .148, .25]) if (Math.abs(h - wanted) < 1e-6 && !found.has(wanted)) found.set(wanted, [x, z]);
        }
    assert.equal(found.size, 4);
    for (const [height, [x, z]] of found) assert.ok(Math.abs(dustSurfaceHeight(world, x, z) - height - STEP_DUST.groundOffset) < 1e-6);
    assert.equal(dustSurfaceHeight({ surfaceHeight: () => .25, supportHeight: () => 0 }, 0, 0), .25 + STEP_DUST.groundOffset);
});

test('Poeira: Marte avermelhado, Shanghai cinza, renderer mundial e reinício por mapa/retry', () => {
    assert.equal(STEP_DUST.colors.mars, '#bd6f4c'); assert.equal(STEP_DUST.colors.shanghai, '#a2a5a6');
    const scene = fs.readFileSync('src/scene/OfficeScene.tsx', 'utf8');
    assert.match(scene, /<\/PhysicsWorld>[\s\S]*<PlayerStepDust key=\{`dust-\$\{map\}-\$\{revision\}`\}/);
    const renderer = fs.readFileSync('src/characters/player/PlayerStepDust.tsx', 'utf8');
    assert.match(renderer, /if \(!blocked\)/); assert.match(renderer, /pool\.pending = 0/);
    assert.match(renderer, /foot\.getWorldPosition/); assert.match(renderer, /depthWrite: false/);
    assert.match(renderer, /dustSurfaceHeight\(world/); assert.doesNotMatch(renderer.slice(renderer.indexOf('useFrame(')), /\bnew\s+/);
});
