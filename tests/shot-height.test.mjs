import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadSource } from './load-source.mjs';
import { measureEnemyHeights } from './measure-enemy-height.mjs';
const { traceShot, CombatSimulation, canSeePlayer } = loadSource('src/combat/simulation.ts');
const { RIFLE_POSE, RIFLE_MASK, COMBAT, LARGE_PATROL, SMALL_MUTANT, robotConfig } = loadSource('src/combat/config.ts');
const { Navigation, clearSegment, traversable } = loadSource('src/combat/navigation.ts');
const { createPhase01Terrain, SHANGHAI_PHASE01 } = loadSource('src/game/shanghai/layout.ts');
const { SHANGHAI_SUPPLY_CRATES, crateObstacle, openCrate, advanceCrate } = loadSource('src/game/props/supplyCrate.ts');
const b = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 }, ground = { bounds: b, walkableAreas: [b], obstacles: [] };
const a = { x: 0, z: 0 }, end = { x: 0, z: 9 };
const box = (minY, maxY) => ({ minX: -1, maxX: 1, minZ: 3, maxZ: 4, minY, maxY });
const trace = (terrain, height = RIFLE_POSE.height, robots = []) => traceShot(a, end, terrain, robots, RIFLE_MASK, undefined, height);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≠ ${expected}`);

test('S2.12 B2: limites verticais inclusivos, abaixo/acima livres; metadados ausentes bloqueiam toda altura', () => {
    const terrain = { ...ground, obstacles: [box(.85, 1.195)] };
    for (const height of [.85 - 1e-6, 1.195 + 1e-6]) { assert.equal(trace(terrain, height).blocked, false); assert.deepEqual(trace(terrain, height).to, end); }
    for (const height of [.85, 1, 1.195]) { const hit = trace(terrain, height); assert.equal(hit.blocked, true); close(hit.to.z, 3); }
    const { minY, maxY, ...footprint } = box(0, 1);
    for (const height of [-1000, 0, .85, 1000]) assert.equal(trace({ ...ground, obstacles: [footprint] }, height).blocked, true);
    assert.equal(trace({ ...ground, obstacles: [box(undefined, 1)] }, -1000).blocked, true);
    assert.equal(trace({ ...ground, obstacles: [box(1, undefined)] }, 1000).blocked, true);
    assert.equal(trace({ ...ground, obstacles: [box(1, undefined)] }, .85).blocked, false);
});

test('S2.12 B2: mais próximo válido vence, ignorando volumes fora da altura; empate continua da parede', () => {
    const near = box(0, 1), far = { ...box(0, 1), minZ: 7, maxZ: 8 }, high = { ...box(1, 2), minZ: 1, maxZ: 2 };
    const robot = { x: 0, z: 5, hp: 75, kind: 'patrol' };
    const terrain = { ...ground, obstacles: [far, high, near] };
    close(trace(terrain, .85, [robot]).to.z, 3); assert.equal(trace(terrain, .85, [robot]).robot, null);
    terrain.obstacles = [high, far]; assert.equal(trace(terrain, .85, [robot]).robot, robot);
    const nearer = { ...robot, z: 2 }; assert.equal(trace(terrain, .85, [robot, nearer]).robot, nearer);
    terrain.obstacles = [near]; assert.equal(trace(terrain, .85, [{ ...robot, z: 3 + COMBAT.robot.radius }]).robot, null);
    assert.equal(trace(ground, .85, [{ ...robot, hp: 0 }]).blocked, false);
});

test('S2.12 B2: centro→cano usa os mesmos limites inclusivos a 0,85 m; alvo atrás só sofre dano se livre', () => {
    for (const [minY, maxY, blocked] of [[0, .85, true], [.85, 2, true], [0, .85 - 1e-6, false], [.85 + 1e-6, 2, false]]) {
        const terrain = { ...ground, obstacles: [{ ...box(minY, maxY), minZ: .5, maxZ: .6 }] };
        const sim = new CombatSimulation(terrain, 1), robot = sim.robots[0];
        Object.assign(robot, { x: .34, z: 4, hp: 75 });
        sim.step(1 / 60, { player: a, aim: { x: .34, z: 8 }, facingAngle: 0, firing: true, reload: false });
        const shot = sim.shots[0]; assert.equal(shot.hit, !blocked); assert.equal(robot.hp, blocked ? 75 : 50);
        if (blocked) { assert.deepEqual(shot.from, a); close(shot.to.z, .5); }
        else { close(shot.from.x, .34); close(shot.from.z, .95); }
    }
});

test('S2.12 B2: 36 alturas exportadas preservadas; caixas e seis volumes ARES-I bloqueiam o tiro real', () => {
    const world = createPhase01Terrain(), exported = SHANGHAI_PHASE01.obstacles;
    assert.equal(exported.length, 36); assert.equal(world.obstacles.length, 44);
    for (let i = 0; i < exported.length; i++) {
        const o = exported[i], actual = world.obstacles[i];
        assert.deepEqual(actual, { minX:o.minX, maxX:o.maxX, minZ:o.minZ, maxZ:o.maxZ, minY:o.minY, maxY:o.maxY });
        assert.ok(Number.isFinite(o.minY) && Number.isFinite(o.maxY)); assert.ok(o.minY <= .85 && o.maxY >= .85);
    }
    for (let i = 0; i < world.obstacles.length; i++) {
        const o = world.obstacles[i], x = (o.minX + o.maxX) / 2;
        const hit = traceShot({x,z:o.minZ-1}, {x,z:o.maxZ+1}, {...world,obstacles:[o]}, []);
        assert.equal(hit.blocked, true); close(hit.to.z,o.minZ);
        if (i >= 38) { assert.equal(o.minY, undefined); assert.equal(o.maxY, undefined); }
    }
});

test('S2.12 B2: caixas têm corpo fixo 0–1,195 m, tampa/estado não ampliam volume de tiro', () => {
    for (const p of SHANGHAI_SUPPLY_CRATES) {
        const before = crateObstacle(p), state = { phase:'closed', elapsed:0 }, x=p.x;
        assert.deepEqual([before.minY,before.maxY],[0,1.195]);
        for (const height of [0,.85,1.195]) assert.equal(traceShot({x,z:p.z+2},{x,z:p.z-2},{...ground,obstacles:[before]},[],RIFLE_MASK,undefined,height).blocked,true);
        assert.equal(traceShot({x,z:p.z+2},{x,z:p.z-2},{...ground,obstacles:[before]},[],RIFLE_MASK,undefined,1.195+1e-6).blocked,false);
        assert.equal(openCrate(state,p.x,p.z+1.1,p.x,p.z+1.1),true);
        advanceCrate(state,1); assert.equal(state.phase,'opening'); assert.deepEqual(crateObstacle(p),before);
        advanceCrate(state,10); assert.equal(state.phase,'open'); assert.deepEqual(crateObstacle(p),before);
    }
});

test('S2.12 B2: faixa própria de cada inimigo com extremos inclusivos; cano a 0,85 m fere os três tipos', () => {
    for (const [kind,maxY] of [['patrol',2.31],['largePatrol',3.28],['smallMutant',1.20]]) {
        const r={x:0,z:5,hp:75,kind};assert.deepEqual({...robotConfig(r).hitHeight},{minY:0,maxY});
        for (const height of [0,.85,maxY]) assert.equal(trace(ground,height,[r]).robot,r);
        for (const height of [-1e-6,maxY+1e-6]) assert.equal(trace(ground,height,[r]).robot,null);
        const sim=new CombatSimulation(ground,1),live=sim.robots[0],hp=robotConfig(r).hp;
        Object.assign(live,{kind,x:.34,z:5,hp});
        sim.step(1/60,{player:a,aim:{x:.34,z:8},facingAngle:0,firing:true,reload:false});
        assert.equal(live.hp,hp-25);assert.equal(sim.shots[0].hit,true);
    }
});

test('S2.12 B2: metadados de altura não mudam movimento/grade/visão; perfis vigentes da etapa 3', () => {
    const tall={...ground,obstacles:[box(10,20)]},flat={...ground,obstacles:[{minX:-1,maxX:1,minZ:3,maxZ:4}]};
    assert.equal(trace(tall).blocked,false);assert.equal(clearSegment(a,end,tall,.32),false);assert.equal(traversable({x:0,z:3.5},tall,.32),false);
    const observer={x:0,z:0,angle:0,kind:'patrol'};assert.equal(canSeePlayer(observer,end,tall),false);
    const nav=new Navigation(tall,.42,.5),old=new Navigation(flat,.42,.5);assert.deepEqual(nav.points,old.points);assert.deepEqual(nav.edges,old.edges);
    assert.deepEqual([COMBAT.robot.radius,COMBAT.robot.spacing,COMBAT.robot.separation,COMBAT.robot.contactRange],[.67,1.34,1.6,1.07]);
    assert.deepEqual([LARGE_PATROL.radius,LARGE_PATROL.spacing,LARGE_PATROL.separation,LARGE_PATROL.contactRange],[1.65,3.3,3.6,2.5]);
    assert.deepEqual([SMALL_MUTANT.radius,SMALL_MUTANT.spacing,SMALL_MUTANT.separation,SMALL_MUTANT.contactRange],[.5,.65,1.1,.9]);
});

test('S2.12 B2: envelopes reais dos clipes vivos a 120 Hz cabem nas faixas estáveis por tipo', async () => {
    const measured=await measureEnemyHeights(),saved=JSON.parse(fs.readFileSync('docs/handoffs/s2.12-b/alturas-etapa-2.json'));
    for (const [kind,row] of Object.entries(measured.types)) {
        const height=robotConfig({kind}).hitHeight;
        assert.equal(row.sha256,saved.types[kind].sha256);assert.equal(row.scale,saved.types[kind].scale);
        close(row.maxY,saved.types[kind].maxY);assert.ok(row.maxY<height.maxY);assert.equal(height.minY,0);
        assert.ok(row.minY<0,'patas/pés penetram visualmente no piso; faixa de acerto começa no chão');
        assert.equal(row.clips.DamagedDeath,undefined);assert.equal(row.clips.ShockAttack,undefined);
    }
});
