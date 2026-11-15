import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { loadSource } from './load-source.mjs';

const { rioSandHeight, rioSandStepKind } = loadSource('src/game/rio/sandSurface.ts');
const { rioWaveSwashFrontX } = loadSource('src/game/rio/seabed.ts');
const { RioFootprints } = loadSource('src/game/rio/footprints.ts');
const { STEP_DUST, StepDustPool } = loadSource('src/characters/player/stepDust.ts');
const { createWorld } = loadSource('src/game/rio/world.ts');

test('Rio: passos distinguem praia, canteiro, madeira e a parte submersa da costa', () => {
    assert.equal(rioSandHeight(25, 42), 0, 'pouso sobre areia');
    assert.equal(rioSandHeight(0, 0), .13, 'pegada sobre o topo do canteiro');
    assert.equal(rioSandHeight(12, 0), null, 'calçadão');
    assert.equal(rioSandHeight(19, 17.5), null, 'deck do quiosque');
    assert.equal(rioSandHeight(31, -50), null, 'rampa do píer');
    assert.equal(rioSandStepKind(37, 10, 0), null, 'mar raso');
    assert.equal(rioSandStepKind(25, 42, 0), 'dry');
    const z = 6, time = 2;
    const front = rioWaveSwashFrontX(z, time);
    assert.equal(rioSandStepKind(front - .3, z, time), 'damp');
    assert.equal(rioSandStepKind(front + .27, z, time), null);
});

test('Rio: marcas ficam no ponto de contato, congelam em pausa e liberam espaço ao sumir', () => {
    const marks = new RioFootprints();
    const alpha = marks.mesh.geometry.getAttribute('impression');
    marks.stamp(27, 0, 44, 0, true, false);
    marks.stamp(27, -.035, 45, 0, false, true);
    assert.equal(marks.mesh.geometry.instanceCount, 2);
    const centers = marks.mesh.geometry.getAttribute('center').array;
    assert.deepEqual(Array.from(centers.slice(0, 3)).map(x => +x.toFixed(3)), [27, .012, 44]);
    assert.ok(alpha.getX(1) > alpha.getX(0), 'areia úmida recebe marca mais nítida');
    for (let i = 0; i < 300; i++) marks.step(.1);
    const fade = alpha.getX(0);
    assert.ok(fade > 0 && fade < .82);
    marks.step(0);
    assert.equal(alpha.getX(0), fade);
    for (let i = 0; i < 70; i++) marks.step(.1);
    assert.equal(marks.mesh.geometry.instanceCount, 0);
    marks.dispose();
});

test('Rio: areia seca levanta mais poeira e usa o mesmo material na praia e nas praças', () => {
    const dry = new StepDustPool(), damp = new StepDustPool(), street = new StepDustPool();
    const random = () => .5;
    dry.emit(25, 0, 42, 0, random, 2, 1);
    damp.emit(34, 0, 42, 0, random, 2, .26);
    street.emit(7, 0, 42, 0, random);
    assert.ok(dry.particles.filter(p => p.life > 0).length > STEP_DUST.perStep);
    assert.ok(dry.particles[0].duration > damp.particles[0].duration);
    assert.ok(dry.particles[0].size > street.particles[0].size);
    assert.equal(dry.particles[0].tint, 2);
    const world = createWorld();
    const beach = world.group.getObjectByName('areia');
    assert.equal(world.group.getObjectByName('Praca_Central_areia').material, beach.material);
    world.group.userData.coastalWater.update(new Vector3(25, 0, 42), .1);
    assert.equal(beach.material.uniforms.uTime.value, .1);
});
