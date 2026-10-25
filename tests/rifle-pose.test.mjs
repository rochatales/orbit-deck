import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { loadSource } from './load-source.mjs';
const { COMBAT, HIT_LAYER, RIFLE_POSE: P, writeRifleMuzzle } = loadSource('src/combat/config.ts');
const { PLAYER_COLLIDER_CENTER_Y } = loadSource('src/characters/player/playerConfig.ts');
const { CombatSimulation, traceShot } = loadSource('src/combat/simulation.ts');
const bounds = { minX: -50, maxX: 50, minZ: -50, maxZ: 50 };
const ground = { bounds, walkableAreas: [bounds], obstacles: [] };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
function fire({ terrain = ground, player = { x: 0, z: 0 }, aim = { x: .34, z: 10 }, facingAngle = 0, robots = [] } = {}) {
    const sim = new CombatSimulation(terrain, 3);
    sim.robots.forEach(r => { r.hp = 0; });
    robots.forEach((r, i) => Object.assign(sim.robots[i], r, { hp: 75 }));
    sim.step(1 / 60, { player, aim, facingAngle, firing: true, reload: false });
    return sim;
}

test('S2.12 B1: muzzle corresponde à ponta da arma girada, a 0,85 m; retícula a 0,86 m', () => {
    close(P.height, .85); close(P.height + P.reticleLift, .86);
    close(P.height - PLAYER_COLLIDER_CENTER_Y, .225);
    const forward = P.gripForward + P.barrelForward + P.barrelLength / 2;
    close(forward, .95);
    const out = { x: 0, z: 0 };
    for (const angle of [0, .4, Math.PI / 2, Math.PI, -Math.PI + .01, Math.PI * 7]) {
        const tip = new Vector3(P.side, 0, forward).applyAxisAngle(new Vector3(0, 1, 0), angle);
        writeRifleMuzzle(out, 7, -4, angle);
        close(out.x, tip.x + 7); close(out.z, tip.z - 4);
    }
});

test('S2.12 B1: parede encostada bloqueia centro→cano, consome só um tiro e não fere além', () => {
    const terrain = { ...ground, obstacles: [{ minX: -2, maxX: 2, minZ: .5, maxZ: .6 }] };
    const sim = fire({ terrain, robots: [{ x: .34, z: 4 }] }), shot = sim.shots[0];
    assert.deepEqual(shot.from, { x: 0, z: 0 });
    close(shot.to.z, .5); close(shot.to.x, .34 * .5 / .95);
    assert.equal(sim.robots[0].hp, 75); assert.equal(shot.hit, false);
    assert.equal(sim.ammo, 23); assert.equal(sim.kills, 0);
});

test('S2.12 B1: quina intercepta o segmento lateral mesmo com muzzle e alvo fora da parede', () => {
    const terrain = { ...ground, obstacles: [{ minX: .18, maxX: .28, minZ: .45, maxZ: .8 }] };
    const sim = fire({ terrain, robots: [{ x: .34, z: 4 }] }), shot = sim.shots[0];
    close(shot.to.x, .18); close(shot.to.z, .95 * .18 / .34);
    assert.deepEqual(shot.from, { x: 0, z: 0 });
    assert.equal(sim.robots[0].hp, 75); assert.equal(shot.hit, false);
});

test('S2.12 B1: o primeiro obstáculo após o cano interrompe o mesmo segmento que vira traçador', () => {
    const terrain = { ...ground, obstacles: [{ minX: -2, maxX: 2, minZ: 3, maxZ: 3.1 }] };
    const sim = fire({ terrain, robots: [{ x: .34, z: 5 }] }), shot = sim.shots[0];
    close(shot.from.x, .34); close(shot.from.z, .95); close(shot.to.z, 3);
    assert.equal(shot.hit, false); assert.equal(sim.robots[0].hp, 75);
});

test('S2.12 B1: acertar usa o primeiro robô vivo, antes da parede, no segmento desenhado', () => {
    const terrain = { ...ground, obstacles: [{ minX: -2, maxX: 2, minZ: 6, maxZ: 6.1 }] };
    const sim = fire({ terrain, robots: [{ x: .34, z: 3 }, { x: .34, z: 5 }] }), shot = sim.shots[0];
    assert.equal(sim.robots[0].hp, 50); assert.equal(sim.robots[1].hp, 75);
    assert.equal(shot.hit, true); close(shot.to.z, 3 - COMBAT.robot.radius);
});

test('S2.12 B1: cursores perto/longe na mesma direção do cano produzem o mesmo alcance de 32 m', () => {
    const near = fire({ aim: { x: .34, z: 2 } }).shots[0];
    const far = fire({ aim: { x: .34, z: 30 } }).shots[0];
    assert.deepEqual(near, far);
    close(Math.hypot(near.to.x - near.from.x, near.to.z - near.from.z), 32);
    close(near.to.z, 32.95);
    const sim = fire({ aim: { x: .34, z: 2 }, robots: [{ x: .34, z: 8 }] });
    assert.equal(sim.robots[0].hp, 50, 'cursor não é ponto final da bala');
});

test('S2.12 B1: cursor sobre o corpo, no cano ou atrás dele usa o rumo do corpo, sem inversão', () => {
    for (const aim of [{ x: 0, z: 0 }, { x: .92, z: -.34 }, { x: .95, z: -.34 }, { x: -5, z: 2 }]) {
        const shot = fire({ aim, facingAngle: Math.PI / 2 }).shots[0];
        close(shot.from.x, .95); close(shot.from.z, -.34);
        close(shot.to.x, 32.95); close(shot.to.z, -.34);
    }
});

test('S2.12 B1: origem acompanha o giro suavizado real, não o rumo instantâneo do cursor', () => {
    for (const angle of [0, .15, .4, Math.PI / 2, -Math.PI + .01]) {
        const player = { x: 2, z: -4 }, shot = fire({ player, aim: { x: 20, z: 20 }, facingAngle: angle }).shots[0];
        const muzzle = { x: 0, z: 0 }; writeRifleMuzzle(muzzle, player.x, player.z, angle);
        close(shot.from.x, muzzle.x); close(shot.from.z, muzzle.z);
        close(Math.hypot(shot.to.x - shot.from.x, shot.to.z - shot.from.z), 32);
    }
});

test('S2.12 B1: fallback próximo preserva a checagem de parede; segmento zero permanece finito', () => {
    const terrain = { ...ground, obstacles: [{ minX: -.1, maxX: .5, minZ: -.1, maxZ: 1 }] };
    const shot = fire({ terrain, aim: { x: 0, z: 0 } }).shots[0];
    assert.deepEqual(shot.from, shot.to); assert.equal(shot.hit, false);
    assert.ok(Number.isFinite(shot.to.x + shot.to.z));
});

test('S2.12 B1: centro→cano não causa dano em inimigos; paredes vencem empate exato', () => {
    const robot = { x: .17, z: .475, hp: 75 };
    assert.equal(traceShot({ x: 0, z: 0 }, { x: .34, z: .95 }, ground, [robot], HIT_LAYER.world).robot, null);
    const terrain = { ...ground, obstacles: [{ minX: -1, maxX: 1, minZ: 3, maxZ: 3.1 }] };
    const hit = traceShot({ x: 0, z: 1 }, { x: 0, z: 5 }, terrain, [{ x: 0, z: 3 + COMBAT.robot.radius, hp: 75 }]);
    assert.equal(hit.robot, null); close(hit.to.z, 3);
});

test('S2.12 B1: entradas sem pose válida não disparam e tiro ativo não aponta para o input mutável', () => {
    const sim = fire(), input = { player: { x: 0, z: 0 }, aim: { x: 0, z: 5 }, facingAngle: NaN, firing: true, reload: false };
    sim.cooldown = 0; sim.step(1 / 60, input); assert.equal(sim.ammo, 23);
    input.facingAngle = 0; input.aim.x = NaN; sim.step(1 / 60, input); assert.equal(sim.ammo, 23);
    const clean = new CombatSimulation(ground, 1); clean.robots[0].hp = 0;
    input.aim.x = .34; clean.step(1 / 60, input);
    const from = { ...clean.shots[0].from }, to = { ...clean.shots[0].to };
    input.player.x = 30; input.aim.z = -20;
    assert.deepEqual(clean.shots[0].from, from); assert.deepEqual(clean.shots[0].to, to);
    const result = { to: { x: 0, z: 0 }, robot: null, blocked: false }, endpoint = result.to;
    assert.equal(traceShot(from, to, ground, [], HIT_LAYER.world, result), result);
    assert.equal(result.to, endpoint, 'saída reutilizada sem substituir o vetor');
});
