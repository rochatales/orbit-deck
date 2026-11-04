import { AnimationMixer, LoopOnce, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const { loadSource } = await import(new URL('../../../../tests/load-source.mjs', import.meta.url));
const { loadGlb } = await import(new URL('../../../../tests/load-glb.mjs', import.meta.url));
const { attachMachete, MacheteGripRig } = loadSource('src/characters/player/macheteAttachment.ts');
const player = await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
const sup = await loadGlb('src/assets/characters/player/explorador-espada-v002.glb');
const sword = await loadGlb('src/assets/weapons/facao-v001.glb');
console.log(sup.animations.map(c => [c.name, +c.duration.toFixed(3), c.tracks.length]));
for (const mode of ['duas maos', 'mao direita']) for (const clip of sup.animations) {
  const c = clone(player.scene), w = sword.scene.clone(true), m = new AnimationMixer(c);
  attachMachete(c, w); const rig = new MacheteGripRig(c, w);
  const a = m.clipAction(clip).setLoop(LoopOnce, 1); a.clampWhenFinished = true; a.play();
  const N = Math.round(clip.duration * 30); let prev, prevTip, maxJump = 0, jumpAt = 0, maxL = 0, rows = [];
  const tip = new Vector3(), grip = new Vector3(), d = new Vector3(), L = new Vector3(), l1 = new Vector3(), l2 = new Vector3();
  for (let f = 0; f <= N; f++) {
    m.setTime(clip.duration * f / N); rig.update(mode === 'duas maos'); c.updateMatrixWorld(true);
    w.getObjectByName('Tip').getWorldPosition(tip); w.getObjectByName('Grip_R').getWorldPosition(grip);
    d.copy(tip).sub(grip).normalize();
    if (prev) { const j = prev.angleTo(d) * 180 / Math.PI; if (j > maxJump) { maxJump = j; jumpAt = f + 1; } }
    prev = d.clone();
    c.getObjectByName('mixamorigLeftHandIndex1').getWorldPosition(l1); c.getObjectByName('mixamorigLeftHandThumb2').getWorldPosition(l2); l1.add(l2).multiplyScalar(.5);
    w.getObjectByName('Grip_L').getWorldPosition(L); maxL = Math.max(maxL, L.distanceTo(l1));
    const v = prevTip ? tip.distanceTo(prevTip) * 30 : 0; prevTip = tip.clone();
    if (clip.name === 'Sword_Combo' && f % 3 === 0) rows.push(`${f + 1}:${v.toFixed(1)}/y${tip.y.toFixed(2)}`);
  }
  console.log(mode, clip.name, 'salto max lamina', maxJump.toFixed(1), 'graus no quadro', jumpAt, '| erro mao esq max', maxL.toFixed(3));
  if (rows.length) console.log('  v ponta:', rows.join(' '));
}
