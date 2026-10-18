import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';

globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillText() {} }) }) };
const { CombatSimulation } = loadSource('src/combat/simulation.ts');
const { COMBAT, encounterLayout } = loadSource('src/combat/config.ts');
const { traversable } = loadSource('src/combat/navigation.ts');
const { createPhase01Terrain, isLandingReserved, SHANGHAI_PHASE01: data } = loadSource('src/game/shanghai/layout.ts');

test('integração: horda da S2.4 nos 32 spawns e 4 patrulhas da fase 01', () => {
    const terrain = createPhase01Terrain(), layout = encounterLayout(true);
    const sim = new CombatSimulation(terrain, 32, layout);
    assert.equal(sim.robots.length, 32);
    assert.deepEqual(sim.robots.map(r => [r.x, r.z]), data.spawns.map(s => [s.x, s.z]));
    for (const r of sim.robots) {
        assert.ok(traversable(r, terrain, COMBAT.robot.radius), `robô ${r.id} em ponto livre`);
        assert.ok(!isLandingReserved(r.x, r.z, COMBAT.robot.radius), `robô ${r.id} fora da reserva de pouso`);
    }
    for (const h of sim.hearts) {
        assert.ok(traversable(h, terrain, 0.32), 'coração alcançável');
        assert.ok(!isLandingReserved(h.x, h.z), 'coração fora da reserva de pouso');
    }
    // Patrulha sem alerta: anda nas rotas do mapa novo sem atravessar prédios.
    const far = { player: { x: 0, z: 9.5 }, aim: { x: 0, z: 0 }, firing: false, reload: false };
    const start = sim.robots.map(r => [r.x, r.z]);
    for (let i = 0; i < 600; i++) {
        sim.step(1 / 60, far);
        for (const r of sim.robots) if (!r.alerted) assert.ok(traversable(r, terrain, COMBAT.robot.radius));
    }
    assert.ok(sim.robots.some((r, i) => Math.hypot(r.x - start[i][0], r.z - start[i][1]) > 5), 'patrulha anda');
});

test('integração: encontros pequenos nascem perto da chegada; mapa anterior intacto', () => {
    const exit = data.exit, layout = encounterLayout(true);
    const sim = new CombatSimulation(createPhase01Terrain(), 3, layout);
    const nearest = Math.min(...data.spawns.map(s => Math.hypot(s.x - exit.x, s.z - exit.z)));
    assert.ok(Math.abs(Math.hypot(sim.robots[0].x - exit.x, sim.robots[0].z - exit.z) - nearest) < 1e-9);
    const old = encounterLayout(false);
    assert.equal(old.spawns.length, 32);
    assert.deepEqual(old.hearts, COMBAT.hearts);
    assert.notEqual(old.routes, layout.routes);
});
