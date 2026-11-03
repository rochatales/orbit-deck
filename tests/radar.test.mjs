import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';
const { RADAR, radarProject, collectBlips } = loadSource('src/ui/radar.ts');
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

test('Radar: alinhado à câmera — o que está à frente na tela aparece no topo', () => {
  // Câmera ao norte (+z) olhando para o sul: -z é o topo da tela, +x a direita.
  let p = radarProject(0, -RADAR.rangeM / 2, Math.PI / 2); close(p.x, 0); close(p.y, .5);
  p = radarProject(RADAR.rangeM / 2, 0, Math.PI / 2); close(p.x, .5); close(p.y, 0);
  // Câmera padrão (45°): o ponto na direção oposta à câmera fica no topo.
  p = radarProject(-10, -10, Math.PI / 4); close(p.x, 0); assert.ok(p.y > 0);
  // Longe: preso na borda, mesma direção.
  p = radarProject(0, -500, Math.PI / 2); assert.ok(p.clamped); close(Math.hypot(p.x, p.y), 1); close(p.y, 1);
});

test('Radar: vermelho = inimigos vivos, rosa = kits de vida, amarelo = loot, ciano = aeronave', () => {
  const sim = {
    robots: [{ x: 9, z: 9, hp: 3 }, { x: 8, z: 8, hp: 0 }],
    hearts: [{ x: 1, z: 1, active: true }, { x: 2, z: 2, active: false }],
    drops: [{ x: 3, z: 3, active: true, spawned: true }, { x: 4, z: 4, active: false, spawned: true }, { x: 5, z: 5, active: false, spawned: false }],
    crates: [{ x: 6, z: 6, phase: 'closed' }, { x: 7, z: 7, phase: 'open' }]
  };
  const out = [];
  collectBlips(out, sim, { x: 0, z: 9.5 });
  assert.deepEqual(out.map(b => b.kind), ['enemy', 'life', 'loot', 'loot', 'aircraft']);
  assert.notEqual(RADAR.colors.enemy, RADAR.colors.life, 'vida não se confunde com inimigo');
  const again = collectBlips(out, null, { x: 0, z: 9.5 });
  assert.equal(again, out, 'reaproveita o mesmo array');
  assert.deepEqual(out.map(b => b.kind), ['aircraft'], 'em Marte só a aeronave');
});
