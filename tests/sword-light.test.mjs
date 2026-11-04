import test from 'node:test';
import assert from 'node:assert/strict';
import { AnimationMixer, Group, LoopOnce, Raycaster, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';

const { writeVisorLight } = loadSource('src/scene/visorPose.ts');
const { VISOR_LIGHT } = loadSource('src/scene/lightingConfig.ts');
const { attachMachete, MacheteGripRig } = loadSource('src/characters/player/macheteAttachment.ts');
const { attachBackRifle } = loadSource('src/characters/player/rifleAttachment.ts');

test('Espada: farol distante livre do corpo e das armas em repouso, corrida, recuo, combo, giro e Dash', async () => {
  const player = await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
  const base = await loadGlb('src/assets/characters/player/explorador-facao-v001.glb');
  const sword = await loadGlb('src/assets/characters/player/explorador-espada-v002.glb');
  const weapon = await loadGlb('src/assets/weapons/facao-v001.glb');
  const rifle = await loadGlb('src/assets/weapons/rifle-laser-v001.glb');
  const character = clone(player.scene), body = new Group(), floor = .25, angle = .8;
  body.position.set(3, floor + .02, -2); body.rotation.y = angle; body.add(character);
  attachMachete(character, weapon.scene); attachBackRifle(character, rifle.scene);
  const grip = new MacheteGripRig(character, weapon.scene), mixer = new AnimationMixer(character);
  const origin = new Vector3(), target = new Vector3(), direction = new Vector3(), ray = new Raycaster();
  const physical = { x: 3, y: floor, z: -2 };
  const clips = [...player.animations, ...base.animations, ...sword.animations]
    .filter(c => ['Dash', 'Machete_Idle', 'Machete_Run', 'Machete_Backward', 'Sword_Combo', 'Sword_Turn'].includes(c.name));
  assert.equal(clips.length, 6);
  let oldBlocked = 0;
  for (const clip of clips) {
    mixer.stopAllAction(); mixer.clipAction(clip).setLoop(LoopOnce, 1).play();
    for (let frame = 0; frame < 60; frame++) {
      mixer.setTime(clip.duration * frame / 60); grip.update(clip.name !== 'Dash', 1);
      body.updateMatrixWorld(true);
      character.traverse(n => { if (n.isSkinnedMesh) { n.skeleton.update(); n.computeBoundingSphere(); } });
      writeVisorLight(origin, target, physical, angle);
      direction.subVectors(target, origin); ray.far = direction.length(); ray.set(origin, direction.normalize());
      assert.equal(ray.intersectObject(character, true).length, 0, `${clip.name}/${frame}: jogador não bloqueia o centro do farol`);
      assert.equal(origin.y, floor + VISOR_LIGHT.height);
      assert.ok(Math.abs(Math.hypot(target.x - physical.x, target.z - physical.z) - VISOR_LIGHT.aimDistance) < 1e-8);
      // A origem anterior ficava dentro do capacete e perdia o feixe também no Dash.
      origin.set(physical.x + Math.sin(angle) * .26, floor + 1.32, physical.z + Math.cos(angle) * .26);
      direction.subVectors(target, origin); ray.far = direction.length(); ray.set(origin, direction.normalize());
      if (ray.intersectObject(character, true).length) oldBlocked++;
    }
  }
  assert.ok(oldBlocked > 100, `regressão reproduzida em ${oldBlocked} poses da origem antiga`);
});
