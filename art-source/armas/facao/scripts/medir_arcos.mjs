// Ajusta um arco de círculo à ponta da lâmina em cada corte do combo (pulso conduzindo) e grava
// o resultado no corpo do jogador: +Z à frente, Y para cima, origem nos pés.
// node art-source/armas/facao/scripts/medir_arcos.mjs
import fs from 'node:fs';
import { AnimationMixer, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
const { loadSource } = await import(new URL('../../../../tests/load-source.mjs', import.meta.url));
const { loadGlb } = await import(new URL('../../../../tests/load-glb.mjs', import.meta.url));
const { attachMachete, MacheteGripRig } = loadSource('src/characters/player/macheteAttachment.ts');
const clips = JSON.parse(fs.readFileSync('src/characters/player/swordClips.json', 'utf8'));
const player = await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
const sup = await loadGlb('src/assets/characters/player/explorador-espada-v002.glb');
const sword = await loadGlb('src/assets/weapons/facao-v001.glb');
const clip = sup.animations.find(c => c.name === 'Sword_Combo');
const c = clone(player.scene), w = sword.scene.clone(true), m = new AnimationMixer(c);
attachMachete(c, w); const rig = new MacheteGripRig(c, w); m.clipAction(clip).play();
const REACH = -.92; // mesma extensão visual para além da lâmina curta
const arcs = clips.cuts.map(cut => {
  const pts = [], [from, to] = cut.trail;
  for (let i = 0; i <= 48; i++) {
    m.setTime(from + (to - from) * i / 48); rig.update(true, 1); c.updateMatrixWorld(true);
    pts.push(w.localToWorld(new Vector3(0, REACH, 0)));
  }
  const mean = pts.reduce((s, p) => s.add(p), new Vector3()).multiplyScalar(1 / pts.length);
  const normal = new Vector3();
  for (let i = 0; i + 1 < pts.length; i++) normal.add(pts[i].clone().sub(mean).cross(pts[i + 1].clone().sub(mean)));
  normal.normalize();
  const u = pts[0].clone().sub(mean); u.addScaledVector(normal, -u.dot(normal)).normalize();
  const v = normal.clone().cross(u);
  // Círculo por mínimos quadrados (Kåsa) no plano do corte.
  const flat = pts.map(p => { const d = p.clone().sub(mean); return [d.dot(u), d.dot(v)]; });
  let suu = 0, suv = 0, svv = 0, s1 = 0, s2 = 0;
  for (const [a, b] of flat) { const q = a * a + b * b; suu += a * a; suv += a * b; svv += b * b; s1 += a * q; s2 += b * q; }
  const det = suu * svv - suv * suv, ca = (s1 * svv - s2 * suv) / (2 * det), cb = (s2 * suu - s1 * suv) / (2 * det);
  const radius = flat.reduce((s, [a, b]) => s + Math.hypot(a - ca, b - cb), 0) / flat.length;
  const center = mean.clone().addScaledVector(u, ca).addScaledVector(v, cb);
  const angles = flat.map(([a, b]) => Math.atan2(b - cb, a - ca));
  for (let i = 1; i < angles.length; i++) angles[i] = angles[i - 1] + ((angles[i] - angles[i - 1] + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  const round = n => +n.toFixed(4);
  // Crescente, nunca um círculo: no giro do corpo a varredura real passa de uma volta.
  const last = angles[angles.length - 1], total = last - angles[0], MAX_SWEEP = 200 * Math.PI / 180;
  angles[0] = last - Math.sign(total) * Math.min(Math.abs(total), MAX_SWEEP);
  return { center: center.toArray().map(round), u: u.toArray().map(round), v: v.toArray().map(round), radius: round(radius),
    from: round(angles[0]), to: round(angles[angles.length - 1]), rms: round(Math.sqrt(flat.reduce((s, [a, b]) => s + (Math.hypot(a - ca, b - cb) - radius) ** 2, 0) / flat.length)) };
});
fs.writeFileSync('src/characters/player/swordArcs.json', JSON.stringify(arcs) + '\n');
for (const a of arcs) console.log('raio', a.radius, 'varredura', Math.round(Math.abs(a.to - a.from) * 180 / Math.PI) + '°', 'erro', a.rms, 'centro', a.center);
