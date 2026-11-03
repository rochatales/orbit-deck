import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, Box3, Vector3 } from 'three';
import { loadSource } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';
const { BuildingFade, BUILDING_FADE } = loadSource('src/game/shanghai/buildingFade.ts');
const { RUIN_FADED } = loadSource('src/game/shanghai/limits.ts');
const { SHANGHAI_PHASE01: layout } = loadSource('src/game/shanghai/layout.ts');
const glb = await loadGlb('src/assets/shanghai-fase01/shanghai-fase01.glb');
const tris = root => { let n = 0; root.traverse(o => { if (o.isMesh) n += o.geometry.index.count / 3; }); return n; };

test('Prédios internos: triângulos dos 2+ andares separados por pegada, sem perder nenhum', () => {
  const map = glb.scene.clone(true), before = tris(map), fade = new BuildingFade(map, layout.buildings);
  map.updateMatrixWorld(true);
  const tall = layout.buildings.filter(b => b.height >= BUILDING_FADE.minHeight);
  assert.equal(fade.entries.length, tall.length);
  assert.equal(tris(map), before, 'mesma contagem: só redistribui o índice');
  for (const entry of fade.entries) {
    const parts = []; map.traverse(o => { if (o.userData.predioFade === entry.id) parts.push(o); });
    assert.ok(parts.length >= 3 && entry.materials.length === parts.length, `${entry.id}: ${parts.length} malhas`);
    // Atributos são compartilhados com o setor: a caixa vem dos vértices do índice.
    const b = layout.buildings.find(q => q.id === entry.id), box = new Box3(), v = new Vector3();
    for (const p of parts) { const idx = p.geometry.index, pos = p.geometry.attributes.position; for (let i = 0; i < idx.count; i++) box.expandByPoint(v.fromBufferAttribute(pos, idx.getX(i)).applyMatrix4(p.matrixWorld)); }
    assert.ok(box.max.y >= b.height - .5, `${entry.id} inteiro até o topo`);
    assert.ok(box.min.x >= b.x - b.w / 2 - 1 && box.max.x <= b.x + b.w / 2 + 1, `${entry.id} só a própria pegada`);
  }
  let ground = 0; map.traverse(o => { if (o.userData.predioFade && BUILDING_FADE.groundMaterials.includes(o.material.name)) ground++; });
  assert.equal(ground, 0, 'asfalto/calçada/faixa nunca esmaecem');
});

test('Prédios internos: só o prédio entre câmera e corpo esmaece, e volta depois', () => {
  const map = glb.scene.clone(true), fade = new BuildingFade(map, layout.buildings);
  const camera = new OrthographicCamera(-10, 10, 10, -10, .1, 400);
  // Jogador ao sul do Predio_100 (-5,5, -40), câmera ao norte olhando para o sul através dele.
  camera.position.set(-5.5, 40, -40 + 55); camera.lookAt(-5.5, 0, -48);
  for (let i = 0; i < 30; i++) fade.update(-5.5, -48, camera, .05);
  const by = id => fade.entries.find(e => e.id === id);
  assert.ok(by('Predio_100').opacity <= RUIN_FADED + .02, 'prédio que encobre fica translúcido');
  assert.ok(by('Predio_100').materials.every(m => !m.material.depthWrite), 'sem escrever profundidade');
  assert.equal(by('Predio_200').opacity, 1, 'os outros seguem opacos');
  camera.position.set(-5.5, 40, -48 - 55); camera.lookAt(-5.5, 0, -48);
  for (let i = 0; i < 40; i++) fade.update(-5.5, -48, camera, .05);
  assert.equal(by('Predio_100').opacity, 1, 'volta quando a visão libera');
  fade.dispose();
});
