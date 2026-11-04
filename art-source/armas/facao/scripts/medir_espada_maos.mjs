// Mão esquerda x cabo e ponta da lâmina para cada intensidade de condução pelo pulso.
import { AnimationMixer, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
const { loadSource } = await import(new URL('../../../../tests/load-source.mjs', import.meta.url));
const { loadGlb } = await import(new URL('../../../../tests/load-glb.mjs', import.meta.url));
const { attachMachete, MacheteGripRig } = loadSource('src/characters/player/macheteAttachment.ts');
const player = await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
const sup = await loadGlb('src/assets/characters/player/explorador-espada-v002.glb');
const sword = await loadGlb('src/assets/weapons/facao-v001.glb');
const clip = sup.animations.find(c => c.name === 'Sword_Combo');
for (const led of [1, .85, .7, .5]) {
  const c = clone(player.scene), w = sword.scene.clone(true), m = new AnimationMixer(c); attachMachete(c, w); const rig = new MacheteGripRig(c, w); m.clipAction(clip).play();
  const t = new Vector3(), g = new Vector3(), d = new Vector3(), last = new Vector3(), p = new Vector3(), o = new Vector3(), l = new Vector3();
  let worst = 0, low = 9, over = [], hand = 0;
  for (let i = 0; i <= 536; i++) {
    m.setTime(clip.duration * i / 536); rig.update(true, led); c.updateMatrixWorld(true);
    w.getObjectByName('Tip').getWorldPosition(t); w.getObjectByName('Grip_R').getWorldPosition(g); d.copy(t).sub(g).normalize();
    if (i) worst = Math.max(worst, last.angleTo(d) * 180 / Math.PI); last.copy(d); low = Math.min(low, t.y);
    c.getObjectByName('mixamorigLeftHandIndex1').getWorldPosition(p); c.getObjectByName('mixamorigLeftHandThumb2').getWorldPosition(o); p.add(o).multiplyScalar(.5);
    w.getObjectByName('Grip_L').getWorldPosition(l); const e = l.distanceTo(p); hand = Math.max(hand, e); if (e > .07) over.push(+(1 + i / 8).toFixed(1));
  }
  console.log('pulso', led, 'salto', worst.toFixed(1), 'ponta', low.toFixed(2), 'mao esq max', hand.toFixed(3), 'quadros >7cm', over.length ? `${over[0]}..${over[over.length - 1]} (${over.length}/537)` : 'nenhum');
}
