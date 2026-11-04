import test from 'node:test';
import assert from 'node:assert/strict';
import { AnimationMixer, Box3, Group, Matrix4, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';

const { attachBackRifle, attachRifle, attachHolsteredRifle } = loadSource('src/characters/player/rifleAttachment.ts');
const { attachBackpack } = loadSource('src/characters/player/backpackAttachment.ts');

test('Espada: rifle vertical ao lado da mochila, preso ao Spine2 durante marcha, combo e Dash', async () => {
  const player = await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
  const base = await loadGlb('src/assets/characters/player/explorador-facao-v001.glb');
  const sword = await loadGlb('src/assets/characters/player/explorador-espada-v002.glb');
  const rifle = await loadGlb('src/assets/weapons/rifle-laser-v001.glb');
  const pack = await loadGlb('src/assets/characters/player/backpack.glb');
  const character = clone(player.scene), weapon = rifle.scene.clone(true), backpack = pack.scene.clone(true);
  attachBackpack(character, backpack); assert.equal(attachBackRifle(character, weapon), true);
  const spine = character.getObjectByName('mixamorigSpine2'), mixer = new AnimationMixer(character);
  assert.equal(weapon.parent, spine); assert.equal(backpack.parent, spine);
  const clips = [...base.animations, ...sword.animations, player.animations.find(c => c.name === 'Dash')];
  const local = weapon.matrix.clone(); weapon.updateMatrix(); local.copy(weapon.matrix);
  for (const clip of clips) {
    mixer.stopAllAction(); mixer.clipAction(clip).play();
    for (let frame = 0; frame < 30; frame++) {
      mixer.setTime(clip.duration * frame / 30); character.updateMatrixWorld(true);
      const relative = new Matrix4().copy(spine.matrixWorld).invert().multiply(weapon.matrixWorld);
      assert.ok(relative.elements.every((v, i) => Math.abs(v - local.elements[i]) < 1e-6), clip.name);
    }
  }
  mixer.stopAllAction(); mixer.clipAction(base.animations.find(c => c.name === 'Machete_Idle')).play();
  mixer.setTime(0); character.updateMatrixWorld(true);
  const grip = weapon.getObjectByName('Grip_R').getWorldPosition(new Vector3());
  assert.ok(grip.distanceTo(new Vector3(-.38, .9, -.20)) < 1e-5);
  assert.ok(weapon.getObjectByName('Muzzle').getWorldDirection(new Vector3()).y > .999);
  const gunBox = new Box3().setFromObject(weapon), packBox = new Box3().setFromObject(backpack);
  assert.ok(gunBox.max.x < packBox.min.x - .025, 'folga entre rifle e lateral da mochila');
  assert.ok(gunBox.min.y > .65 && gunBox.max.y < 1.5, 'coronha e cano na altura das costas');
  assert.equal(attachRifle(character, weapon), true); assert.equal(weapon.parent, character.getObjectByName('mixamorigRightHand'));
  assert.equal(attachHolsteredRifle(character, weapon), true); assert.equal(weapon.parent, character.getObjectByName('mixamorigHips'));
  assert.equal(rifle.scene.parent, null, 'cache preservado');
  assert.equal(attachBackRifle(new Group(), weapon), false);
});
