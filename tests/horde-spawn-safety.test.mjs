import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';

globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillText() {} }) }) };
const { CombatSimulation } = loadSource('src/combat/simulation.ts');
const { COMBAT, HORDE_ENCOUNTER, encounterLayout, robotConfig } = loadSource('src/combat/config.ts');
const { createPhase01Terrain, SHANGHAI_PHASE01: data } = loadSource('src/game/shanghai/layout.ts');
const { traversable } = loadSource('src/combat/navigation.ts');
const { useCombatStore } = loadSource('src/state/useCombatStore.ts');
const advance = (sim, player, seconds = COMBAT.fixedStep, paused = false) => {
    const input = { player, aim: player, facingAngle: 0, firing: false, reload: false };
    for (let i = 0; i < Math.ceil(seconds / COMBAT.fixedStep); i++) sim.step(COMBAT.fixedStep, input, paused);
};

for (const [label, player] of [
    ['desembarque', { x: data.exit.x, z: data.exit.z }],
    ['borda norte', { x: 0, z: data.bounds.minZ + 1 }],
    ['borda sul', { x: 0, z: data.bounds.maxZ - 1 }],
    ['borda oeste', { x: data.bounds.minX + 1, z: 0 }],
    ['borda leste', { x: data.bounds.maxX - 1, z: 0 }],
]) test(`S3.4: quatro hordas sem nascer sobre aliados nem perto do jogador (${label})`, () => {
    const terrain = createPhase01Terrain(), sim = new CombatSimulation(terrain, HORDE_ENCOUNTER, encounterLayout(true));
    for (let wave = 1; wave <= 4; wave++) {
        for (let guard = 0; sim.wave < wave; guard++) {
            assert.ok(guard < 60 * 10, 'próxima horda começa'); advance(sim, player); sim.hp = 100;
        }
        const alive = sim.robots.filter(r => r.hp > 0);
        assert.equal(alive.length, sim.waves[wave - 1], 'o mapa comporta a horda completa');
        for (let i = 0; i < alive.length; i++) {
            const r = alive[i], radius = robotConfig(r).radius;
            assert.ok(traversable(r, terrain, radius), `slot ${r.id} livre de obstáculos`);
            assert.ok(Math.hypot(r.x - player.x, r.z - player.z) >= COMBAT.hordes.minPlayerDistance, `slot ${r.id} respeita distância mínima`);
            for (let j = i + 1; j < alive.length; j++)
                assert.ok(Math.hypot(r.x - alive[j].x, r.z - alive[j].z) > radius + robotConfig(alive[j]).radius, `slots ${r.id}/${alive[j].id} sem sobreposição`);
        }
        for (const r of alive) r.hp = 0;
        advance(sim, player);
    }
    assert.equal(sim.cleared, true);
});

test('S3.1/S3.4: sem ponto seguro, fila espera, pausa congela e cada vida concede um único drop', () => {
    const sim = new CombatSimulation(createPhase01Terrain(), HORDE_ENCOUNTER, encounterLayout(true));
    // Um ponto alcançável, ocupado pelo jogador: nenhum fallback pode ignorar os 14 m.
    const point = sim.edgeSpawns[0];
    sim.edgeSpawns = [point]; sim.mutantEdgeSpawns = [point];
    advance(sim, point, COMBAT.hordes.firstDelay + .1);
    assert.equal(sim.wave, 1); assert.equal(sim.queued, 13); assert.equal(sim.alive, 0);
    assert.equal(sim.cleared, false); assert.equal(sim.waveLeft, 0);
    const elapsed = sim.elapsed;
    advance(sim, { x: data.exit.x, z: data.exit.z }, 2, true);
    assert.equal(sim.queued, 13); assert.equal(sim.elapsed, elapsed);
    advance(sim, point, 7);
    assert.equal(sim.wave, 1, 'fila vazia de ativos não antecipa a próxima horda');
    const player = { x: data.exit.x, z: data.exit.z };
    const dropSlots = new Set();
    for (let defeated = 0; defeated < 13; defeated++) {
        for (let guard = 0; sim.alive === 0; guard++) {
            assert.ok(guard < 30, 'vaga liberada permite o próximo nascimento'); advance(sim, player);
        }
        assert.equal(sim.alive, 1, 'não sobrepõe dois inimigos no mesmo ponto');
        const r = sim.robots.find(r => r.hp > 0), generation = r.generation;
        assert.ok(!dropSlots.has(r.drop), 'slot de drop reservado uma vez'); dropSlots.add(r.drop);
        sim.damageRobot(r, 1000, 0, 1);
        sim.damageRobot(r, 1000, 0, 1);
        assert.equal(sim.kills, defeated + 1, 'dano repetido não duplica morte');
        assert.equal(sim.drops.filter(d => d.spawned).length, defeated + 1, 'um drop por vida');
        advance(sim, player);
        assert.equal(r.generation, generation, 'morto não volta à fila');
    }
    advance(sim, player);
    assert.equal(sim.queued, 0); assert.equal(sim.wave, 1);
    assert.ok(sim.waveLeft > 0, 'intervalo só começa após fila e vivos zerarem');
});

test('S3.4: última horda pendente não limpa área; restart zera HUD e solicita nova rodada', () => {
    const sim = new CombatSimulation(createPhase01Terrain(), HORDE_ENCOUNTER, encounterLayout(true));
    const point = sim.edgeSpawns[0];
    // Simula chegada à última horda, sem executar o combate das anteriores.
    sim.wave = 3; sim.waveLeft = .001;
    sim.edgeSpawns = [point]; sim.mutantEdgeSpawns = [point];
    sim.largeEdgeSpawns = [point]; sim.largeMutantEdgeSpawns = [point];
    advance(sim, point);
    assert.equal(sim.wave, 4); assert.equal(sim.queued, 44); assert.equal(sim.alive, 0);
    assert.equal(sim.cleared, false);
    useCombatStore.getState().selectEncounter(HORDE_ENCOUNTER);
    useCombatStore.getState().publish(sim.snapshot);
    const previousRun = useCombatStore.getState().run;
    assert.equal(useCombatStore.getState().queued, 44);
    useCombatStore.getState().restart();
    const hud = useCombatStore.getState();
    assert.equal(hud.queued, 0); assert.equal(hud.wave, 0);
    assert.equal(hud.kills, 0); assert.equal(hud.total, 115);
    assert.equal(hud.run, previousRun + 1, 'sinaliza recriação da simulação para a cena');
});
