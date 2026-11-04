// Amostragem fina (240 Hz) do combo: distingue corte rápido de descontinuidade da pega.
import { AnimationMixer, LoopOnce, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
const { loadSource } = await import(new URL('../../../../tests/load-source.mjs', import.meta.url));
const { loadGlb } = await import(new URL('../../../../tests/load-glb.mjs', import.meta.url));
const { attachMachete, MacheteGripRig } = loadSource('src/characters/player/macheteAttachment.ts');
const player = await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
const sup = await loadGlb('src/assets/characters/player/explorador-espada-v002.glb');
const sword = await loadGlb('src/assets/weapons/facao-v001.glb');
const clip = sup.animations.find(c => c.name === 'Sword_Combo');
for (const mode of [true, false]) {
  const c = clone(player.scene), w = sword.scene.clone(true), m = new AnimationMixer(c);
  attachMachete(c, w); const rig = new MacheteGripRig(c, w);
  const a = m.clipAction(clip).setLoop(LoopOnce, 1); a.clampWhenFinished = true; a.play();
  const tip = new Vector3(), grip = new Vector3(), d = new Vector3(), r = new Vector3(), l = new Vector3(), t = new Vector3();
  let prev, worst = [], perFrame = {};
  const N = Math.round(clip.duration * 240);
  for (let i = 0; i <= N; i++) {
    m.setTime(clip.duration * i / N); rig.update(mode); c.updateMatrixWorld(true);
    w.getObjectByName('Tip').getWorldPosition(tip); w.getObjectByName('Grip_R').getWorldPosition(grip); d.copy(tip).sub(grip).normalize();
    c.getObjectByName('mixamorigRightHandIndex1').getWorldPosition(r); c.getObjectByName('mixamorigRightHandThumb2').getWorldPosition(t); r.add(t).multiplyScalar(.5);
    c.getObjectByName('mixamorigLeftHandIndex1').getWorldPosition(l); c.getObjectByName('mixamorigLeftHandThumb2').getWorldPosition(t); l.add(t).multiplyScalar(.5);
    const f = 1 + i / 8, gap = r.distanceTo(l);
    if (prev) { const j = prev.angleTo(d) * 180 / Math.PI; worst.push([+j.toFixed(1), +f.toFixed(2), +gap.toFixed(3)]); }
    prev = d.clone();
    if (i % 8 === 0) perFrame[f] = `${gap.toFixed(2)}|${tip.y.toFixed(2)}`;
  }
  worst.sort((x, y) => y[0] - x[0]);
  console.log(mode ? 'DUAS MAOS' : 'MAO DIREITA', 'piores saltos em 1/240 s [graus, quadro, vão entre palmas]:', JSON.stringify(worst.slice(0, 8)));
  console.log('  vão|y ponta:', Object.entries(perFrame).filter(([f]) => +f % 2 === 1).map(([f, v]) => f + ':' + v).join(' '));
}
