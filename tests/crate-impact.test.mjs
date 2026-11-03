import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';
const { CRATE_IMPACT, crateSeat, impactScarGeometry, impactChunks, chunkGeometry } = loadSource('src/game/props/crateImpact.ts');
const { SHANGHAI_SUPPLY_CRATES } = loadSource('src/game/props/supplyCrate.ts');
const { phase01SurfaceGrid } = loadSource('src/game/shanghai/surfaceGrid.ts');
const height = phase01SurfaceGrid();

test('Baús caídos: cabine enterrada abaixo do piso mais baixo e pendendo para fora do meio-fio', () => {
  let curbs = 0;
  for (const p of SHANGHAI_SUPPLY_CRATES) {
    const seat = crateSeat(p, height);
    let low = Infinity;
    for (const u of [-.85, 0, .85]) for (const v of [-.85, 0, .85]) low = Math.min(low, height(p.x + u, p.z + v), height(p.x + v, p.z + u));
    assert.ok(seat.y <= low - .02 && seat.y >= low - .1, `${p.id} enterrado ${(low - seat.y).toFixed(3)} m`);
    assert.ok(Math.hypot(seat.tiltX, seat.tiltZ) < .1, `${p.id} inclinação discreta`);
    if (seat.curb) { curbs++; assert.ok(Math.hypot(seat.tiltX, seat.tiltZ) > .01); }
    assert.deepEqual(crateSeat(p, height), seat, 'determinístico por id');
  }
  assert.ok(curbs >= 1, 'cabine sobre o meio-fio (sudoeste) detectada');
});

test('Cicatriz de impacto copia a altura da calçada e da rua vértice a vértice', () => {
  const geometry = impactScarGeometry(SHANGHAI_SUPPLY_CRATES, height), pos = geometry.attributes.position;
  assert.ok(geometry.index.count / 3 <= SHANGHAI_SUPPLY_CRATES.length * 1700, 'orçamento leve de triângulos');
  let off = 0;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    // Float32 pode cruzar a linha exata do meio-fio; o resto cola no piso.
    if (Math.abs(pos.getY(i) - height(x, z) - CRATE_IMPACT.scarLift) > 1e-4) off++;
    const near = Math.min(...SHANGHAI_SUPPLY_CRATES.map(p => Math.hypot(x - p.x, z - p.z)));
    assert.ok(near <= CRATE_IMPACT.scarRadius * Math.SQRT2 + .01);
  }
  assert.ok(off / pos.count < .01, `${off} vértices fora do piso`);
  for (let i = 0; i < geometry.attributes.normal.count; i += 97) assert.ok(geometry.attributes.normal.getY(i) > 0, 'face para cima');
});

test('Placas levantadas: em volta da base, baixas e da cor do piso onde caem', () => {
  for (const p of SHANGHAI_SUPPLY_CRATES) {
    const chunks = impactChunks(p, height);
    assert.equal(chunks.length, CRATE_IMPACT.chunks);
    for (const c of chunks) {
      const r = Math.hypot(c.x - p.x, c.z - p.z);
      assert.ok(r >= CRATE_IMPACT.baseHalf && r <= CRATE_IMPACT.scarRadius, `${p.id} placa a ${r.toFixed(2)} m`);
      assert.ok(c.h <= CRATE_IMPACT.chunkHeight + 1e-9, 'não vira obstáculo visual');
      assert.equal(c.sidewalk, height(c.x, c.z) > .06);
    }
  }
  assert.equal(chunkGeometry().attributes.position.count / 3, 16);
});
