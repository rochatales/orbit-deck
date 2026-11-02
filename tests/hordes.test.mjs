import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';

globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillText() {} }) }) };
const { CombatSimulation } = loadSource('src/combat/simulation.ts');
const { COMBAT, HORDE_TOTALS, robotConfig, HORDE_ENCOUNTER, encounterLayout, encounterTotal } = loadSource('src/combat/config.ts');
const { Navigation, clearSegment, smoothPath, traversable } = loadSource('src/combat/navigation.ts');
const { createPhase01Terrain, SHANGHAI_PHASE01: data } = loadSource('src/game/shanghai/layout.ts');
const { createWorld } = loadSource('src/game/shanghaiWorld.ts');
const { useCombatStore } = loadSource('src/state/useCombatStore.ts');

const open = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
const openTerrain = { bounds: open, walkableAreas: [open], obstacles: [] };
const step = (sim, player, seconds = 1 / 60, paused = false) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) sim.step(1 / 60, { player, aim: { x: 0, z: 0 }, firing: false, reload: false }, paused);
};

test('fila: patrulhas da fase 01 não travam de frente nos cantos compartilhados', () => {
    // Antes: as rotas 0 e 3 chegavam por lados opostos a (17,5; −18,5); os dois primeiros
    // travavam e, em 80 s, 16 robôs ficavam parados em duas filas.
    const terrain = createPhase01Terrain(), sim = new CombatSimulation(terrain, 32, encounterLayout(true));
    const player = { x: data.exit.x, z: data.exit.z }, idle = sim.robots.map(() => 0), last = sim.robots.map(r => [r.x, r.z]);
    let closest = Infinity;
    for (let frame = 0; frame < 60 * 90; frame++) {
        step(sim, player);
        sim.robots.forEach((r, i) => {
            assert.ok(traversable(r, terrain, COMBAT.robot.radius), `robô ${r.id} fora de prédio`);
            idle[i] = Math.hypot(r.x - last[i][0], r.z - last[i][1]) < 1e-6 ? idle[i] + 1 / 60 : 0;
            assert.ok(idle[i] < 3, `robô ${r.id} parado há 3 s em (${r.x.toFixed(1)}, ${r.z.toFixed(1)})`);
            last[i] = [r.x, r.z];
            for (let j = i + 1; j < sim.robots.length; j++) closest = Math.min(closest, Math.hypot(r.x - sim.robots[j].x, r.z - sim.robots[j].z));
        });
    }
    assert.ok(sim.robots.every(r => !r.alerted), 'patrulha sem ver o jogador');
    assert.ok(closest >= COMBAT.robot.spacing - 1e-6, `robôs não se sobrepõem (${closest.toFixed(2)} m)`);
});

test('fila: na perseguição a horda cerca o jogador em vez de parar em linha atrás do primeiro', () => {
    // Com spacing 1,34 e contato 1,07, o limite por corda é quatro círculos:
    // floor(PI / asin(spacing / (2 * contactRange))) = 4. A aproximação por
    // circunferência sugere cinco, mas ignora a distância entre centros.
    // Mantemos os seis setores e a chegada de todos; não basta reduzir a contagem.
    const sim = new CombatSimulation(createPhase01Terrain(), 32, encounterLayout(true)), player = { x: 0, z: 0 };
    sim.robots.forEach(r => { r.alerted = true; });
    for (let frame = 0; frame < 60 * 40; frame++) { step(sim, player); sim.hp = 100; }
    const contact = sim.robots.filter(r => Math.hypot(r.x - player.x, r.z - player.z) <= COMBAT.robot.contactRange + 0.05).length;
    const sectors = new Set(sim.robots.filter(r => Math.hypot(r.x, r.z) < 4).map(r => Math.floor((Math.atan2(r.x, r.z) + Math.PI) / (Math.PI / 4)) % 8));
    assert.ok(contact >= 4, `${contact} robôs em contato`);
    assert.ok(sectors.size >= 6, `cerco em ${sectors.size} de 8 setores`);
    assert.ok(sim.robots.every(r => Math.hypot(r.x, r.z) < 6), 'todos chegam ao cerco');
});

test('ao avistar o jogador o robô acelera o passo um pouco, sem tranco', () => {
    assert.ok(COMBAT.robot.chaseSpeed / COMBAT.robot.speed > 1.15 && COMBAT.robot.chaseSpeed / COMBAT.robot.speed < 1.35, 'aumento pequeno');
    assert.ok(COMBAT.robot.chaseSpeed < 4.2 * 0.6, 'explorador continua mais rápido');
    const sim = new CombatSimulation(openTerrain, 1), r = sim.robots[0];
    let from = { x: r.x, z: r.z };
    step(sim, { x: 19, z: 19 }, 1);
    assert.equal(r.alerted, false);
    assert.ok(Math.abs(Math.hypot(r.x - from.x, r.z - from.z) - COMBAT.robot.speed) < 0.05, 'patrulha no passo normal');
    Object.assign(r, { x: 0, z: -15, angle: 0, path: [], repath: 0 });
    const player = { x: 0, z: -5.6 };
    step(sim, player);
    assert.equal(r.alerted, true);
    assert.ok(r.pace > COMBAT.robot.speed && r.pace < COMBAT.robot.speed + 0.05, 'acelera gradualmente');
    step(sim, player, 1.5);
    from = { x: r.x, z: r.z };
    step(sim, player, 0.5);
    assert.ok(Math.abs(Math.hypot(r.x - from.x, r.z - from.z) / 0.5 - COMBAT.robot.chaseSpeed) < 0.08, 'perseguição no passo acelerado');
});

test('caminho suavizado continua livre de prédios e corta a escada da grade', () => {
    const world = createWorld(), nav = new Navigation(world, COMBAT.robot.radius, COMBAT.grid), start = { x: -14, z: -16 }, goal = { x: 4, z: 16 };
    const raw = nav.path(start, goal), rawLength = raw.length, path = smoothPath(start, raw, world, COMBAT.robot.radius);
    assert.ok(path.length < rawLength / 4, `${rawLength} → ${path.length} nós`);
    let previous = start;
    for (const p of path) { assert.ok(clearSegment(previous, p, world, COMBAT.robot.radius)); previous = p; }
    assert.deepEqual(path.at(-1), goal);
});

test('hordas 13 → 26 → 32 → 44 nascem na borda, em pontos distintos, longe do jogador e uma por vez', () => {
    const terrain = createPhase01Terrain(), sim = new CombatSimulation(terrain, HORDE_ENCOUNTER, encounterLayout(true));
    const player = { x: data.exit.x, z: data.exit.z }, b = terrain.bounds, waves = HORDE_TOTALS;
    assert.deepEqual([...waves], [13, 26, 32, 44]);
    assert.equal(sim.total, 115); assert.equal(sim.robots.length, 44); assert.equal(sim.drops.length, 127);
    assert.ok(sim.robots.every(r => !r.spawned && r.hp === 0), 'nenhum robô antes da primeira horda');
    assert.deepEqual([sim.snapshot.wave, sim.snapshot.waves, sim.snapshot.nextWave, sim.snapshot.cleared], [0, 4, COMBAT.hordes.firstDelay, false]);
    step(sim, player, 2, true);
    assert.equal(sim.waveLeft, COMBAT.hordes.firstDelay, 'pausa congela a contagem');
    let previous = new Set(), drops = new Set();
    for (let w = 1; w <= 4; w++) {
        for (let guard = 0; sim.wave < w; guard++) { assert.ok(guard < 60 * 10, `horda ${w} começa`); step(sim, player); }
        const alive = sim.robots.filter(r => r.hp > 0), points = new Set(alive.map(r => `${r.x},${r.z}`));
        assert.equal(alive.length, waves[w - 1]);
        assert.equal(points.size, alive.length, 'um ponto por robô');
        assert.ok(alive.filter(r => !previous.has(`${r.x},${r.z}`)).length >= alive.length * 0.7, 'pontos diferentes da horda anterior');
        for (const r of alive) {
            const edge = Math.min(r.x - b.minX, b.maxX - r.x, r.z - b.minZ, b.maxZ - r.z);
            assert.ok(Math.abs(edge - Math.max(COMBAT.hordes.edgeInset, robotConfig(r).radius + .2)) < 1e-6, `robô ${r.id} no limite do mapa`);
            assert.ok(traversable(r, terrain, robotConfig(r).radius));
            assert.ok(Math.hypot(r.x - player.x, r.z - player.z) >= COMBAT.hordes.minPlayerDistance);
            assert.equal(r.alerted, false); assert.equal(r.routeIndex, -1);
            assert.ok(!drops.has(r.drop), 'slot de peças novo a cada vida'); drops.add(r.drop);
        }
        const sides = new Set(alive.map(r => { const d = [r.z - b.minZ, b.maxZ - r.z, r.x - b.minX, b.maxX - r.x]; return d.indexOf(Math.min(...d)); }));
        assert.equal(sides.size, 4, 'chegam pelos quatro lados');
        assert.ok(sim.hearts.every(h => h.active), 'corações repostos');
        assert.ok(sim.ammo + sim.reserve >= alive.reduce((hits,r)=>hits+Math.ceil(robotConfig(r).hp/COMBAT.rifle.damage),0) * COMBAT.hordes.ammoMargin, 'reabastecimento proporcional à vida de cada tipo');
        previous = points;
        step(sim, player, 3);
        assert.equal(sim.wave, w, 'próxima horda espera a atual');
        assert.equal(sim.snapshot.alive, waves[w - 1]);
        for (const r of sim.robots) r.hp = 0;
        step(sim, player);
        assert.equal(sim.waveLeft, w < 4 ? COMBAT.hordes.intermission : 0);
        assert.equal(sim.cleared, w === 4);
    }
    step(sim, player, 10);
    assert.equal(sim.wave, 4); assert.equal(sim.snapshot.cleared, true); assert.equal(sim.alive, 0);
});

test('horda marcha da borda até o jogador e acelera ao avistá-lo', () => {
    const sim = new CombatSimulation(createPhase01Terrain(), HORDE_ENCOUNTER, encounterLayout(true)), player = { x: data.exit.x, z: data.exit.z };
    while (sim.wave === 0) step(sim, player);
    const starts = sim.robots.slice(0, 10).map(r => ({ x: r.x, z: r.z }));
    for (let frame = 0; frame < 60 * 45; frame++) { step(sim, player); sim.hp = 100; }
    sim.robots.slice(0, 10).forEach((r, i) => assert.ok(Math.hypot(r.x - starts[i].x, r.z - starts[i].z) > 15, `robô ${r.id} saiu da borda`));
    const near = sim.robots.filter(r => r.hp > 0 && Math.hypot(r.x - player.x, r.z - player.z) < 4);
    assert.ok(near.length >= 8, `${near.length} robôs junto ao jogador`);
    assert.ok(near.every(r => r.alerted && r.pace > COMBAT.robot.chaseSpeed - 0.05), 'avistaram e aceleraram');
});

test('seletor aceita hordas como padrão e mantém as patrulhas de teste', () => {
    const store = useCombatStore;
    assert.equal(store.getState().encounter, HORDE_ENCOUNTER);
    assert.equal(encounterTotal(HORDE_ENCOUNTER), 115);
    store.getState().selectEncounter(32); assert.equal(store.getState().encounter, 32);
    store.getState().selectEncounter(7); assert.equal(store.getState().encounter, 32, 'valor fora da lista é ignorado');
    store.getState().restart(); assert.equal(store.getState().total, 32);
    store.getState().selectEncounter(HORDE_ENCOUNTER); store.getState().restart();
    assert.equal(store.getState().total, 115); assert.equal(store.getState().wave, 0);
});
