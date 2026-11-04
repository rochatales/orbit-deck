// Degrau da corrida (método do handoff s6.8-corrida-sem-degrau): passo da cabeça e do quadril por
// quadro a 144 Hz, na taxa real de 4,2 m/s, duas voltas incluindo a emenda do ciclo.
import { AnimationMixer, LoopRepeat, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
const { loadGlb } = await import(new URL('../../../../tests/load-glb.mjs', import.meta.url));
const player = await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
const sup = await loadGlb('src/assets/characters/player/explorador-facao-v001.glb');
const REF = { Machete_Run: [4.2 / 2.9589122906327248], Machete_Backward: [1.2 / 2.4191343784332275], Run: [1.982094929], Backward_Rifle: [1], Machete_Idle: [1] };
for (const clip of [...player.animations, ...sup.animations].filter(c => REF[c.name])) {
  const c = clone(player.scene), m = new AnimationMixer(c), a = m.clipAction(clip).setLoop(LoopRepeat, Infinity); a.timeScale = REF[clip.name][0]; a.play();
  const head = c.getObjectByName('mixamorigHead'), hips = c.getObjectByName('mixamorigHips'), toe = n => c.getObjectByName(`mixamorig${n}ToeBase`);
  const pH = new Vector3(), pR = new Vector3(), h = new Vector3(), r = new Vector3(), t = new Vector3();
  const frames = Math.ceil(2 * clip.duration / a.timeScale * 144); let maxHead = 0, maxHipsY = 0, atHead = 0, atHips = 0, lowToe = 9, hi = -9, lo = 9;
  for (let f = 0; f <= frames; f++) {
    m.update(f ? 1 / 144 : 0); c.updateMatrixWorld(true); head.getWorldPosition(h); hips.getWorldPosition(r);
    if (f) { const dh = h.distanceTo(pH), dy = Math.abs(r.y - pR.y); if (dh > maxHead) { maxHead = dh; atHead = a.time / clip.duration; } if (dy > maxHipsY) { maxHipsY = dy; atHips = a.time / clip.duration; } }
    pH.copy(h); pR.copy(r); hi = Math.max(hi, r.y); lo = Math.min(lo, r.y);
    lowToe = Math.min(lowToe, toe('Left').getWorldPosition(t).y, toe('Right').getWorldPosition(t).y);
  }
  console.log(clip.name.padEnd(18), `dur ${clip.duration.toFixed(2)}s x${a.timeScale.toFixed(2)}`, `| cabeça ${(maxHead * 100).toFixed(2)} cm @${atHead.toFixed(2)}`, `| quadril Y ${(maxHipsY * 100).toFixed(2)} cm @${atHips.toFixed(2)}`, `| amplitude Y ${((hi - lo) * 100).toFixed(1)} cm`, `| dedo min ${(lowToe * 100).toFixed(1)} cm`);
}
