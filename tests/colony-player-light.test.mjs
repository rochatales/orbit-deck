import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AnimationMixer, Group, Matrix4, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';
const { createColonyVisor } = loadSource('src/characters/player/colonyVisorAttachment.ts');
const { createBackpackVisual } = loadSource('src/characters/player/backpackAttachment.ts');
const player = await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
const backpack = await loadGlb('src/assets/characters/player/backpack.glb');

test('Colônia: mochila sem luz nem emissão; retornar a Shanghai restaura o neon sem alterar o cache', () => {
  const mars = createBackpackVisual(backpack.scene, false);
  const shanghai = createBackpackVisual(backpack.scene, true);
  let lights = 0;
  mars.scene.traverse(n => { if (n.isLight) lights++; });
  assert.equal(lights, 0);
  assert.equal(mars.materials.length, 1);
  assert.equal(mars.materials[0].emissiveIntensity, 0);
  assert.equal(shanghai.materials[0].emissiveIntensity, .8);
  const light = shanghai.scene.getObjectByName('BackpackNeonLight');
  assert.equal(light.intensity, 1.5); assert.equal(light.distance, 3.5);
  let original;
  backpack.scene.traverse(n => { if (n.isMesh) for (const m of Array.isArray(n.material) ? n.material : [n.material]) if (m.name === 'Glow_Cyan') original = m; });
  assert.equal(original.emissiveIntensity, 6);
  assert.notEqual(mars.materials[0], shanghai.materials[0]);
  assert.equal(backpack.scene.getObjectByName('BackpackNeonLight'), undefined);
  for (const visual of [mars, shanghai]) visual.materials.forEach(m => m.dispose());
});

test('Colônia: faixa azul abaixo do capacete e foco suave frontal presos à cabeça, inclusive em movimento/pausa', () => {
  const character = clone(player.scene), visor = createColonyVisor(character);
  assert.ok(visor); visor.head.add(visor.group);
  const mixer = new AnimationMixer(character);
  const initialMaterials = [];
  character.traverse(n => { if (n.isSkinnedMesh) initialMaterials.push(n.material); });
  const local = new Matrix4();
  visor.group.updateMatrix(); local.copy(visor.group.matrix);
  for (const name of ['Idle_Colony', 'Run_Colony', 'Backward_Colony']) {
    mixer.stopAllAction();
    const clip = player.animations.find(c => c.name === name); assert.ok(clip, name);
    mixer.clipAction(clip).play();
    for (let frame = 0; frame < 30; frame++) {
      mixer.setTime(clip.duration * frame / 30); character.updateMatrixWorld(true);
      const relative = new Matrix4().copy(visor.head.matrixWorld).invert().multiply(visor.group.matrixWorld);
      assert.ok(relative.elements.every((v, i) => Math.abs(v - local.elements[i]) < 1e-6));
    }
  }
  mixer.stopAllAction(); mixer.clipAction(player.animations.find(c => c.name === 'Idle_Colony')).play();
  mixer.setTime(0); character.updateMatrixWorld(true);
  const positions = visor.stripe.geometry.attributes.position, point = new Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i); visor.stripe.localToWorld(point);
    assert.ok(point.y > 1.17 && point.y < 1.22, 'faixa inferior a aproximadamente 1,20 m');
    assert.ok(point.z > .16 && point.z < .28, 'faixa na frente do capacete');
  }
  assert.equal(visor.stripe.material.color.getHexString(), '4bd4ff');
  assert.equal(visor.stripe.material.toneMapped, false);
  assert.equal(visor.light.castShadow, false);
  assert.equal(visor.light.penumbra, 1);
  assert.ok(visor.light.intensity > 0 && visor.light.intensity <= 3);
  const origin = visor.light.getWorldPosition(new Vector3()), target = visor.light.target.getWorldPosition(new Vector3());
  assert.ok(target.z - origin.z > 2.5 && target.y < origin.y);
  const paused = visor.light.matrixWorld.clone(); mixer.timeScale = 0; mixer.update(1); character.updateMatrixWorld(true);
  assert.ok(visor.light.matrixWorld.equals(paused));
  let disposed = 0; visor.stripe.geometry.addEventListener('dispose', () => disposed++);
  visor.dispose(); assert.equal(disposed, 1); assert.equal(visor.group.parent, null);
  assert.equal(character.getObjectByName('ColonyPlayerVisor'), undefined);
  const after = []; character.traverse(n => { if (n.isSkinnedMesh) after.push(n.material); });
  assert.deepEqual(after, initialMaterials);
  assert.equal(createColonyVisor(new Group()), null);
  const colon = new Group(); const head = new Group(); head.name = 'mixamorig:Head'; colon.add(head);
  const legacy = createColonyVisor(colon); assert.equal(legacy.head, head); legacy.dispose();
});

test('Iluminação por mapa: visor novo somente em Marte; Shanghai mantém farol e mochila atuais', () => {
  const model = fs.readFileSync('src/characters/player/PlayerModel.tsx', 'utf8');
  assert.match(model, /<PlayerBackpack scene=\{scene\} illuminated=\{combat\}/);
  assert.match(model, /!combat && <ColonyPlayerVisor/);
  const office = fs.readFileSync('src/scene/OfficeScene.tsx', 'utf8');
  assert.match(office, /map === 'shanghai'[^\n]*<PlayerVisorLight/);
});
