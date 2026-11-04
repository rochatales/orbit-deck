// Oscilação da lâmina nos ciclos de locomoção, em relação ao corpo, para cada modo de pega.
import { AnimationClip, AnimationMixer, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
const { loadSource } = await import(new URL('../../../../tests/load-source.mjs', import.meta.url));
const { loadGlb } = await import(new URL('../../../../tests/load-glb.mjs', import.meta.url));
const { attachMachete, MacheteGripRig } = loadSource('src/characters/player/macheteAttachment.ts');
const player = await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
const sup = await loadGlb('src/assets/characters/player/explorador-facao-v001.glb');
const sword = await loadGlb('src/assets/weapons/facao-v001.glb');
for (const name of ['Machete_Idle', 'Machete_Run', 'Machete_Backward']) for (const led of [0, .5, 1]) {
  const clip = sup.animations.find(c => c.name === name);
  const c = clone(player.scene), w = sword.scene.clone(true), m = new AnimationMixer(c); attachMachete(c, w);
  const rig = new MacheteGripRig(c, w); m.clipAction(clip).play();
  const t = new Vector3(), g = new Vector3(), d = new Vector3(), last = new Vector3(), mean = new Vector3(), dirs = [], r = new Vector3(), l = new Vector3(), o = new Vector3();
  const N = Math.round(clip.duration * 240); let jump = 0, gapMin = 9, gapMax = 0;
  for (let i = 0; i <= N; i++) {
    m.setTime(clip.duration * i / N); rig.update(true, led); c.updateMatrixWorld(true);
    w.getObjectByName('Tip').getWorldPosition(t); w.getObjectByName('Grip_R').getWorldPosition(g); d.copy(t).sub(g).normalize();
    if (i) jump = Math.max(jump, last.angleTo(d) * 180 / Math.PI); last.copy(d); dirs.push(d.clone()); mean.add(d);
    c.getObjectByName('mixamorigRightHandIndex1').getWorldPosition(r); c.getObjectByName('mixamorigRightHandThumb2').getWorldPosition(o); r.add(o).multiplyScalar(.5);
    w.getObjectByName('Grip_L').getWorldPosition(l); const gap = l.distanceTo(g);
    gapMin = Math.min(gapMin, r.distanceTo(g)); gapMax = Math.max(gapMax, gap);
  }
  mean.normalize(); const swing = Math.max(...dirs.map(x => x.angleTo(mean))) * 180 / Math.PI;
  console.log(name, 'pulso', led, '| oscilação ±', swing.toFixed(1) + '°', '| salto em 1/240 s', jump.toFixed(1) + '°', '| velocidade', (jump * 240).toFixed(0) + '°/s');
}
