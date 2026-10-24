/** Reensaio estático S2.12 B após ARES-I; não altera configuração, assets ou gameplay. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const before = 'aa8765062fd84429ba8e0c34f60621580f50a4d8';
const merged = 'fcdb34e23b0127fd749bce1939c46eeae57b9a41';
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
assert.equal(git('diff', merged, '--', 'src', 'tests/load-source.mjs',
  'art-source/shanghai-fase01/export/layout.json', 'pnpm-lock.yaml'), '',
  'Reproduzir no runtime do merge ARES-I, sem mudanças posteriores de código.');
// A reconstrução anterior usa o módulo exato de antes do merge e dependências idênticas.
assert.equal(git('diff', before, merged, '--', 'src/game/worldUtils.ts',
  'src/game/props/supplyCrate.ts', 'src/assets/shanghai-fase01/layout.json',
  'src/combat/navigation.ts', 'src/combat/config.ts', 'src/combat/simulation.ts'), '');
const { loadSource } = await import(pathToFileURL(path.join(root, 'tests/load-source.mjs')));
const ts = (await import(pathToFileURL(path.join(root, 'node_modules/typescript/lib/typescript.js')))).default;
const nativeRequire = createRequire(path.join(root, 'package.json'));
const previousFile = 'src/game/shanghai/layout.ts';
const previousText = git('show', `${before}:${previousFile}`);
const previousModule = { exports: {} };
const previousRequire = spec => spec.startsWith('.')
  ? loadSource(path.resolve(root, path.dirname(previousFile), spec) + (spec.endsWith('.json') ? '' : '.ts'))
  : nativeRequire(spec);
const previousCode = ts.transpileModule(previousText, { compilerOptions: {
  esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020
} }).outputText;
vm.runInThisContext(`(function(require,module,exports){${previousCode}\n})`,
  { filename: `${before}:${previousFile}` })(previousRequire, previousModule, previousModule.exports);

const { Navigation, traversable, clearSegment, segmentBox } = loadSource('src/combat/navigation.ts');
const { COMBAT } = loadSource('src/combat/config.ts');
const { hordeEdgeSpawns } = loadSource('src/combat/simulation.ts');
const { createPhase01Terrain, SHANGHAI_PHASE01: d } = loadSource(previousFile);
const { ARES_COLLIDERS, ARES_LANDING } = loadSource('src/game/shanghai/aresLanding.ts');
const { SHANGHAI_SUPPLY_CRATES: crates } = loadSource('src/game/props/supplyCrate.ts');
const source = JSON.parse(fs.readFileSync('art-source/shanghai-fase01/export/layout.json', 'utf8'));

// Mesmo envelope conservador de fachadas do apêndice: altura 0,26–2,75 m.
const streets = [];
for (let i = 0; i < d.buildings.length; i += 2) {
  const a = d.buildings[i], b = d.buildings[i + 1];
  const boxes = [a, b].map(v => source.parts
    .filter(p => p.id.startsWith(v.id + '_') && p.y + p.h / 2 > .26 && p.y - p.h / 2 <= 2.75)
    .map(p => ({
      minX: p.x - Math.abs(Math.cos(p.angle)) * p.w / 2 - Math.abs(Math.sin(p.angle)) * p.d / 2,
      maxX: p.x + Math.abs(Math.cos(p.angle)) * p.w / 2 + Math.abs(Math.sin(p.angle)) * p.d / 2,
      minZ: p.z - Math.abs(Math.sin(p.angle)) * p.w / 2 - Math.abs(Math.cos(p.angle)) * p.d / 2,
      maxZ: p.z + Math.abs(Math.sin(p.angle)) * p.w / 2 + Math.abs(Math.cos(p.angle)) * p.d / 2
    })));
  const westMax = Math.max(...boxes[0].map(p => p.maxX));
  const eastMin = Math.min(...boxes[1].map(p => p.minX));
  const mid = (westMax + eastMin) / 2;
  const minZ = Math.max(...boxes.map(box => Math.min(...box.map(p => p.minZ))));
  const maxZ = Math.min(...boxes.map(box => Math.max(...box.map(p => p.maxZ))));
  streets.push({ a: a.id, b: b.id, visualGap: eastMin - westMax,
    from: { x: mid, z: minZ - .5 }, to: { x: mid, z: maxZ + .5 } });
}
function checkPath(nav, a, b) {
  if (!traversable(a, nav.terrain, nav.radius) || !traversable(b, nav.terrain, nav.radius)) return false;
  const route = nav.path(a, b);
  if (!route.length) return false;
  let previous = a;
  for (const p of route) {
    if (!clearSegment(previous, p, nav.terrain, nav.radius)) return false;
    previous = p;
  }
  return Math.hypot(previous.x - b.x, previous.z - b.z) < 1e-8;
}
const result = {
  before, merged, approvedScope: '222bc5b', cell: .5, playerRadius: .36,
  depositsSolid: false, streets, scenarios: []
};
const originalRadius = COMBAT.robot.radius;
try {
  for (const [terrainName, createWorld] of [
    ['anterior', previousModule.exports.createPhase01Terrain], ['ares', createPhase01Terrain]
  ]) for (const radius of [.42, .8]) {
    // hordeEdgeSpawns lê COMBAT.robot.radius: mutação somente neste processo de análise.
    COMBAT.robot.radius = radius;
    const world = createWorld(), nav = new Navigation(world, radius, .5);
    const perimeter = hordeEdgeSpawns(world, nav, d.exit);
    const failedSpawns = d.spawns.flatMap((p, index) => checkPath(nav, p, d.exit) ? [] : [{ index, ...p }]);
    const failedPerimeter = perimeter.filter(p => !checkPath(nav, p, d.exit));
    const blockedAlleys = streets.filter(s => !clearSegment(s.from, s.to, world, radius))
      .map(s => ({ ...s, blockingObstacles: world.obstacles.filter(o => segmentBox(s.from, s.to, o, radius) !== null) }));
    const blockedCorners = d.patrolRoutes.flatMap((route, r) => route.flatMap((p, i) =>
      traversable(p, world, radius) ? [] : [{ route: r, corner: i, ...p }]));
    const blockedPatrol = d.patrolRoutes.flatMap((route, r) => route.flatMap((p, i) =>
      clearSegment(p, route[(i + 1) % route.length], world, radius) ? [] : [{ route: r, edge: i }]));
    // Acesso humano original do apêndice: seis esconderijos + dois depósitos (aproximação) + duas caixas.
    const playerNav = new Navigation(world, .36, .5);
    const targets = [
      ...d.loot.filter(p => p.kind !== 'deposito'),
      ...d.loot.filter(p => p.kind === 'deposito').map(p => ({ x: p.x, z: p.z + 1.5 })),
      ...crates.map(p => ({ id: p.id, x: p.x, z: p.z + 1.1 }))
    ];
    const playerTargets = targets.map(p => ({ ...p, reachable: checkPath(playerNav, d.exit, p) }));
    const crateMarkers = crates.map(p => ({ id: p.id, x: p.x, z: p.z + 1.1,
      reachable: checkPath(playerNav, d.exit, { x: p.x, z: p.z + 1.1 }) }));
    // Complemento: para o raio de ensaio, aproximar além da pegada + raio + folga de 1 cm.
    const crateApproaches = crates.map(p => {
      const approach = { x: p.x, z: p.z + Math.max(1.1, .7 + radius + .01) };
      return { id: p.id, ...approach, reachable: checkPath(nav, d.exit, approach) };
    });
    const row = { terrain: terrainName, radius, obstacles: world.obstacles.length,
      nodes: nav.points.length, arrivalFree: traversable(d.exit, world, radius),
      spawnPaths: d.spawns.length - failedSpawns.length, failedSpawns,
      rawSpawnPaths: d.spawns.filter(p => nav.path(p, d.exit).length).length,
      examplePathEnd: nav.path(d.spawns[0], d.exit).at(-1) ?? null,
      perimeter: perimeter.length, validatedPerimeter: perimeter.length - failedPerimeter.length, failedPerimeter,
      alleyPaths: streets.length - blockedAlleys.length, blockedAlleys, blockedCorners, blockedPatrol,
      playerAccess: playerTargets.filter(p => p.reachable).length, playerTargets,
      crateMarkers, crateApproaches };
    result.scenarios.push(row);
    console.log(JSON.stringify({ terrain: row.terrain, radius, nodes: row.nodes, arrivalFree: row.arrivalFree,
      spawnPaths: row.spawnPaths, perimeter: row.perimeter, validatedPerimeter: row.validatedPerimeter,
      alleyPaths: row.alleyPaths, playerAccess: row.playerAccess }));
  }
} finally { COMBAT.robot.radius = originalRadius; }
result.differences = [.42, .8].map(radius => {
  const [old, current] = result.scenarios.filter(s => s.radius === radius);
  return { radius, nodesDelta: current.nodes - old.nodes, obstaclesDelta: current.obstacles - old.obstacles,
    spawnPathsDelta: current.spawnPaths - old.spawnPaths, perimeterDelta: current.perimeter - old.perimeter,
    validatedPerimeterDelta: current.validatedPerimeter - old.validatedPerimeter,
    alleyPathsDelta: current.alleyPaths - old.alleyPaths, playerAccessDelta: current.playerAccess - old.playerAccess };
});
const afterWorld = createPhase01Terrain();
result.arrival = { ...d.exit, blockers: [.42, .8].map(radius => ({ radius,
  colliders: ARES_COLLIDERS.flatMap(box => {
    const worldBox = { minX: box.minX + ARES_LANDING.position.x,
      maxX: box.maxX + ARES_LANDING.position.x, minZ: box.minZ + ARES_LANDING.position.z,
      maxZ: box.maxZ + ARES_LANDING.position.z };
    return segmentBox(d.exit, d.exit, worldBox, radius) === null ? [] : [{ id: box.id, ...worldBox }];
  })
})) };
result.continuity = {
  status: result.scenarios.every(s => s.arrivalFree && s.spawnPaths === 32 && s.validatedPerimeter === 272) ? 'pass' : 'blocked',
  reason: 'Com raio 0,80 m a chegada exata não cabe junto à escada. Path não vazio pode terminar em nó próximo; não comprova acesso ao destino.'
};
assert.equal(afterWorld.obstacles.length, d.obstacles.length + crates.length + ARES_COLLIDERS.length);
const output = path.join(root, 'docs/handoffs/fechamento-s0-s2/ares-navegacao.json');
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
// Critérios de continuidade do escopo; números de nós podem mudar com a nova pegada.
assert.equal(streets.length, 9);
assert.ok(streets.every(s => s.visualGap >= 2.5));
for (const row of result.scenarios) {
  assert.equal(row.arrivalFree, true);
  assert.equal(row.spawnPaths, 32);
  assert.equal(row.perimeter, 272);
  assert.equal(row.validatedPerimeter, 272);
  assert.equal(row.alleyPaths, 9);
  assert.equal(row.blockedCorners.length, 0);
  assert.equal(row.blockedPatrol.length, 0);
  assert.equal(row.playerAccess, 10);
  assert.ok(row.crateMarkers.every(p => p.reachable));
  assert.ok(row.crateApproaches.every(p => p.reachable));
}
assert.equal(ARES_COLLIDERS.length, 6);
assert.deepEqual({ ...ARES_LANDING.boarding }, { ...d.exit });
console.log('PASS: quatro cenários antes/depois; nove vielas, 32 spawns, 272 pontos de horda e acessos preservados.');
console.log(JSON.stringify(result.differences));
