import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';
const D = loadSource('src/game/shanghai/urbanDecay.ts');
const { stripCratePlate, CRATE_IMPACT } = loadSource('src/game/props/crateImpact.ts');
const { phase01SurfaceGrid } = loadSource('src/game/shanghai/surfaceGrid.ts');
const { SHANGHAI_PHASE01: layout } = loadSource('src/game/shanghai/layout.ts');
const height = phase01SurfaceGrid();
const decals = D.createDecals(height), debris = D.createDebris(height, decals), weeds = D.createWeeds(height, decals);
const inBuilding = (x, z) => layout.buildings.some(b => Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2);

test('Destruição urbana: decalques de rua e calçada inteiros no mesmo piso, sem dobrar no meio-fio', () => {
  const street = decals.filter(d => d.ground === 'rua'), walk = decals.filter(d => d.ground === 'calcada');
  assert.ok(street.length >= 300 && walk.length >= 300, `${street.length} na rua, ${walk.length} na calçada`);
  assert.ok(street.some(d => D.POTHOLES.has(d.cell)) && walk.some(d => D.MISSING_TILES.has(d.cell)), 'buracos e ladrilhos faltando');
  for (const d of decals) {
    for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) assert.equal(D.groundAt(d.x + dx * d.size / 2, d.z + dz * d.size / 2, height), d.ground);
    assert.ok(Math.abs(d.y - height(d.x, d.z) - (d.ground === 'rua' ? D.DECAY.streetLift : D.DECAY.sidewalkLift)) < 1e-9);
  }
  assert.deepEqual(D.createDecals(height), decals, 'mesma cidade em toda sessão');
});

test('Destroços: soltos no piso, baixos, fora de prédios e da área de pouso', () => {
  assert.ok(debris.length >= 600 && debris.length * 16 <= 24000, `${debris.length} pedaços`);
  const L = layout.landingReservation;
  for (const p of debris) {
    assert.ok(!inBuilding(p.x, p.z));
    assert.ok(p.h <= .2, 'não vira obstáculo');
    assert.ok(Math.abs(p.y - height(p.x, p.z)) < .1);
  }
  const clustered = debris.filter(p => p.x > L.minX && p.x < L.maxX && p.z > L.minZ && p.z < L.maxZ);
  assert.ok(clustered.every(p => p.tone === 'asfalto' || p.tone === 'ladrilho'), 'pouso só recebe lascas de buraco/ladrilho vizinho');
});

test('Mato: concentrado em calçada envelhecida, meio-fio e ladrilho faltando', () => {
  assert.ok(weeds.length >= 700 && weeds.length <= D.DECAY.weedMax);
  const sidewalk = weeds.filter(w => height(w.x, w.z) > .05);
  assert.ok(sidewalk.length / weeds.length > .7, 'maioria na calçada');
  const oldSide = sidewalk.filter(w => D.ageAt(w.x, w.z) > .5).length;
  assert.ok(oldSide > sidewalk.length / 2, 'calçada velha tem mais mato');
  for (const w of weeds) { assert.ok(!inBuilding(w.x, w.z)); assert.ok(w.height <= .9); }
});

test('Baú sem a chapa: some terra/laje/trinca do GLB e a cabine desce o topo da chapa', async () => {
  const glb = await loadGlb('src/assets/props/shanghai/emergency-locker.glb'), visual = glb.scene.clone(true);
  assert.equal(stripCratePlate(visual), 3);
  assert.equal(visual.position.y, -CRATE_IMPACT.plateTop);
  const kept = [];
  visual.traverse(o => { if (o.isMesh && o.visible) kept.push(o.material.name); });
  for (const name of ['Brick', 'Rebar', 'Sign_Blue', 'Sign_White', 'Concrete_Dark', 'Paint_Orange']) assert.ok(kept.includes(name), `${name} mantido`);
  glb.scene.traverse(o => { if (o.isMesh) assert.equal(o.visible, true, 'cache do GLB intacto'); });
});
