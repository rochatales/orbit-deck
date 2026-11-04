import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AnimationMixer, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadSource } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';
const { MACHETE, MACHETE_COMBO, meleeLungeBlocked } = loadSource('src/combat/melee.ts');
const { CombatSimulation } = loadSource('src/combat/simulation.ts');
const { patrolChoice, robotConfig } = loadSource('src/combat/config.ts');
const { SWORD_CLIPS, SWORD_TURN_MIN_ANGLE, comboClipTime, comboTrailProgress, comboLungeSpeed, turnBodyOffset, turnClipYaw, turnSweep, wrapAngle } = loadSource('src/characters/player/swordClips.ts');
const { MacheteAnimationLayers, weldLoop } = loadSource('src/characters/player/macheteAnimationLayers.ts');
const { attachMachete, MacheteGripRig } = loadSource('src/characters/player/macheteAttachment.ts');
const { SWORD_LIGHT, SWORD_NEON, bladeTriangles, createSwordLight, createSwordNeon } = loadSource('src/characters/player/swordNeon.ts');
const { SWORD_TRAIL, SwordTrail, arcGeometry } = loadSource('src/characters/player/swordTrail.ts');
const arcs = JSON.parse(fs.readFileSync('src/characters/player/swordArcs.json', 'utf8'));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const bounds = { minX: -60, maxX: 60, minZ: -60, maxZ: 60 }, world = { bounds, walkableAreas: [bounds], obstacles: [] };
const input = { player: { x: 0, z: 0 }, aim: { x: 0, z: 2 }, facingAngle: 0, firing: false, reload: false, weapon: 'machete' };
const frames = (s, n, i = input) => { for (let f = 0; f < n; f++) s.step(1 / 60, i, false); };
const player = await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
const base = await loadGlb('src/assets/characters/player/explorador-facao-v001.glb');
const swordClips = await loadGlb('src/assets/characters/player/explorador-espada-v002.glb');
const sword = await loadGlb('src/assets/weapons/facao-v001.glb');
function setup(kind = 'largePatrol') {
  const s = new CombatSimulation(world, patrolChoice(kind, 1)), r = s.robots[0];
  Object.assign(r, { x: 0, z: robotConfig(r).contactRange, pace: 0, alerted: true }); s.invulnerable = 999;
  return s;
}
function layersRig() {
  const character = clone(player.scene), mixer = new AnimationMixer(character);
  const actions = Object.fromEntries([...player.animations, ...base.animations, ...swordClips.animations].map(c => [c.name, mixer.clipAction(c)]));
  return { character, mixer, layers: new MacheteAnimationLayers(actions) };
}

test('Espada: fontes do autor por SHA, três clipes no bind do jogador e astronauta aprovado intacto', () => {
  const root = 'art-source/armas/facao/', sources = JSON.parse(fs.readFileSync(root + 'notas/fontes-v002.json'));
  assert.equal(sources.length, 3); for (const f of sources) assert.equal(hash(root + f.copy), f.sha256);
  const notes = JSON.parse(fs.readFileSync(root + 'notas/clipes-v002.json'));
  assert.equal(hash('src/assets/characters/player/explorador-espada-v002.glb'), notes.glb.sha256);
  assert.equal(hash('src/assets/characters/player/explorador-astronauta.glb'), notes.base_glb_sha256);
  assert.ok(notes.clipes.every(c => c.bind_delta < 1e-5));
  assert.deepEqual(swordClips.animations.map(c => c.name).sort(), ['Sword_Combo', 'Sword_Death', 'Sword_Turn']);
  const a = [], b = []; player.scene.traverse(n => { if (n.isBone) a.push(n.name); }); swordClips.scene.traverse(n => { if (n.isBone) b.push(n.name); });
  assert.deepEqual(a.sort(), b.sort());
});

test('Espada: combo de três cortes com o mesmo dano por segundo e o dano no contato de cada corte', () => {
  assert.ok(Math.abs(MACHETE_COMBO.reduce((sum, c) => sum + c.interval, 0) / 3 - MACHETE.interval) < 1e-9);
  const s = setup(), r = s.robots[0], hit = { ...input, firing: true };
  for (let cut = 0; cut < 3; cut++) {
    const hp = r.hp; r.hp = 1e6; const before = r.hp;
    s.step(1 / 60, hit); assert.equal(s.comboStage, cut); assert.equal(s.swingId, cut + 1);
    const { interval, impact } = MACHETE_COMBO[cut];
    let frame = 1; while (r.hp === before && frame < 90) { s.step(1 / 60, input); frame++; }
    assert.ok(Math.abs(frame / 60 - impact) <= 2 / 60, `corte ${cut}: ${frame / 60}`);
    assert.equal(r.hp, before - MACHETE.damage);
    assert.ok(Math.abs(comboClipTime(cut, interval - impact) - SWORD_CLIPS.cuts[cut].contact) < 1e-9);
    frames(s, Math.ceil((interval - frame / 60) * 60) + 1); r.hp = hp;
  }
  s.step(1 / 60, hit); assert.equal(s.comboStage, 0, 'o quarto golpe recomeça o combo');
});

test('Espada: fora da janela, Dash ou troca de arma o combo volta ao primeiro corte', () => {
  const s = setup(), hit = { ...input, firing: true };
  s.step(1 / 60, hit); frames(s, Math.ceil((MACHETE_COMBO[0].interval + MACHETE.chainWindow) * 60) + 2);
  s.step(1 / 60, hit); assert.equal(s.comboStage, 0, 'esperou demais');
  frames(s, 45); s.step(1 / 60, hit); assert.equal(s.comboStage, 1, 'continuou dentro da janela');
  s.step(1 / 60, { ...input, dashing: true }); assert.equal(s.meleeLeft, 0);
  frames(s, 60); s.step(1 / 60, hit); assert.equal(s.comboStage, 0, 'Dash zera');
  frames(s, 45); s.step(1 / 60, { ...input, weapon: 'rifle' }); s.step(1 / 60, hit); assert.equal(s.comboStage, 0, 'troca zera');
});

test('Espada: clipe contínuo entre cortes; rastro só no trecho rápido e nunca em repouso', () => {
  for (let cut = 0; cut < 3; cut++) {
    const { interval } = MACHETE_COMBO[cut], { start, end, trail } = SWORD_CLIPS.cuts[cut];
    assert.ok(Math.abs(comboClipTime(cut, interval) - start) < 1e-9); assert.ok(Math.abs(comboClipTime(cut, 0) - end) < 1e-9);
    if (cut) assert.equal(start, SWORD_CLIPS.cuts[cut - 1].end);
    let previous = -1, on = 0;
    for (let i = 0; i <= 200; i++) {
      const left = interval * (1 - i / 200), time = comboClipTime(cut, left); assert.ok(time >= previous); previous = time;
      const progress = comboTrailProgress(cut, left); if (progress >= 0) { on++; assert.ok(time >= trail[0] && time <= trail[1] && progress <= 1); }
    }
    assert.ok(on > 20 && on < 180);
    assert.equal(comboTrailProgress(cut, 0), -1);
  }
});

test('Espada: o passo do golpe soma o avanço do clipe e para diante do inimigo', () => {
  for (let cut = 0; cut < 3; cut++) {
    const { interval } = MACHETE_COMBO[cut], { start, end } = SWORD_CLIPS.cuts[cut], table = SWORD_CLIPS.rootForward;
    let distance = 0; for (let f = 0; f < 240; f++) distance += comboLungeSpeed(cut, interval * (1 - f / 240)) * interval / 240;
    assert.ok(Math.abs(distance - (table[Math.round(end * 30)] - table[Math.round(start * 30)])) < .03, `corte ${cut}: ${distance}`);
  }
  assert.equal(comboLungeSpeed(0, 0), 0);
  const me = { x: 0, z: 0 };
  assert.equal(meleeLungeBlocked(me, 0, [{ x: 0, z: 1.8, hp: 50 }]), true);
  assert.equal(meleeLungeBlocked(me, 0, [{ x: 0, z: 1.2, hp: 0 }]), false, 'morto não segura');
  assert.equal(meleeLungeBlocked(me, 0, [{ x: 0, z: -1.2, hp: 50 }]), false, 'atrás não segura');
  assert.equal(meleeLungeBlocked(me, 0, [{ x: 0, z: 4.5, hp: 50 }]), false, 'longe não segura');
});

test('Espada: parado usa o corpo todo do clipe; correndo, pernas da marcha com a torção do quadril na coluna', () => {
  const { layers } = layersRig(), { interval } = MACHETE_COMBO[0], idle = layers.legs.Idle;
  assert.equal(layers.legsAction('idle', interval), layers.legs.Slash);
  assert.equal(layers.legsAction('walking', interval), null);
  assert.ok(layers.legs.Slash.getClip().tracks.some(t => /Hips/.test(t.name)));
  layers.update('idle', interval * .5, 0, idle, false);
  const standing = layers.upperAction;
  assert.ok(Math.abs(standing.time - comboClipTime(0, interval * .5)) < 1e-9); assert.equal(layers.legs.Slash.time, standing.time);
  layers.update('walking', interval * .4, 0, layers.legs.Run, false);
  const running = layers.upperAction; assert.notEqual(running, standing);
  assert.ok(running.getClip().tracks.every(t => !/Hips|Foot|Leg|Toe/.test(t.name)));
  const spine = c => c.tracks.find(t => /Spine\.quaternion$/.test(t.name)), a = spine(standing.getClip()), b = spine(running.getClip());
  const at = 3 * SWORD_CLIPS.fps * 0 + Math.round(.9 * 30) * 4;
  assert.ok(Math.abs(a.values[at] - b.values[at]) + Math.abs(a.values[at + 1] - b.values[at + 1]) > .01, 'coluna recebe a torção');
  layers.dispose();
});

test('Espada: giro só em virada grande, termina na mira sem salto e a pausa o congela', () => {
  const { layers } = layersRig(), aim = Math.PI * .9;
  layers.prepare('idle', 0, 1, 0, false, 1 / 60, false); assert.equal(layers.legsAction('idle', 0), null, 'virada pequena fica na mira');
  layers.prepare('walking', 0, aim, 0, false, 1 / 60, false); assert.equal(layers.legsAction('walking', 0), null, 'correndo não gira');
  layers.prepare('idle', 0, aim, 0, false, 1 / 60, false); assert.equal(layers.legsAction('idle', 0), layers.legs.Turn);
  assert.equal(layers.legsFade(), 0);
  const frozen = layers.bodyYaw; layers.prepare('idle', 0, aim, 0, false, 1 / 60, true); assert.equal(layers.bodyYaw, frozen);
  layers.prepare('idle', .2, aim, MACHETE.interval, false, 1 / 60, false); assert.equal(layers.legsAction('idle', 0), null, 'golpe cancela o giro');
  layers.dispose();
  const way = turnSweep(0, aim);
  assert.ok(way < 0, 'o clipe gira sempre no mesmo sentido');
  assert.ok(Math.abs(wrapAngle(turnBodyOffset(0, 0, way, 0) + SWORD_CLIPS.turnYaw[0])) < 1e-6, 'começa na orientação antiga');
  assert.ok(Math.abs(wrapAngle(turnBodyOffset(SWORD_CLIPS.turnDuration, 0, way, aim))) < 1e-6, 'termina na mira, sem correção');
  assert.equal(turnClipYaw(SWORD_CLIPS.turnDuration), 0); assert.ok(Math.abs(wrapAngle(turnSweep(0, aim) - aim)) < 1e-9);
  assert.ok(SWORD_TURN_MIN_ANGLE > Math.PI / 2);
});

test('Espada: morte toca até o fim, sobrepõe o resto e larga o clipe ao reiniciar', () => {
  const { layers } = layersRig();
  layers.prepare('idle', 0, 0, MACHETE.interval, true, 1 / 60, true);
  assert.equal(layers.legsAction('idle', MACHETE.interval), layers.legs.Death); assert.equal(layers.dying, true);
  layers.update('idle', MACHETE.interval, 0, layers.legs.Idle, true);
  for (let f = 0; f < 240; f++) { layers.prepare('idle', 0, 0, 0, true, 1 / 60, true); layers.update('idle', 0, 0, layers.legs.Idle, true); }
  assert.ok(Math.abs(layers.upperAction.time - SWORD_CLIPS.deathDuration) < 1e-6); assert.equal(layers.upperAction.paused, true);
  layers.prepare('idle', 0, 0, 0, false, 1 / 60, false);
  assert.equal(layers.dying, false); assert.equal(layers.legsAction('idle', 0), null);
  layers.dispose();
  const hud = fs.readFileSync('src/combat/CombatHud.tsx', 'utf8');
  assert.ok(hud.includes('s.dead && deathPanel')); assert.ok(hud.includes("weapon !== 'machete'"), 'rifle segue imediato');
});

test('Espada: no corte a lâmina segue o pulso sem salto nem chão, com a mão esquerda no cabo', () => {
  const clip = swordClips.animations.find(c => c.name === 'Sword_Combo'), character = clone(player.scene), weapon = sword.scene.clone(true), mixer = new AnimationMixer(character);
  assert.equal(attachMachete(character, weapon), true);
  const rig = new MacheteGripRig(character, weapon); mixer.clipAction(clip).play();
  const tip = new Vector3(), grip = new Vector3(), now = new Vector3(), palm = new Vector3(), other = new Vector3(), left = new Vector3(), last = new Vector3();
  let worst = 0, low = Infinity, hand = 0, away = 0;
  for (let i = 0; i <= 536; i++) {
    mixer.setTime(clip.duration * i / 536); rig.update(true, 1); character.updateMatrixWorld(true);
    weapon.getObjectByName('Tip').getWorldPosition(tip); weapon.getObjectByName('Grip_R').getWorldPosition(grip); now.copy(tip).sub(grip).normalize();
    if (i) worst = Math.max(worst, last.angleTo(now) * 180 / Math.PI);
    last.copy(now); low = Math.min(low, tip.y);
    character.getObjectByName('mixamorigLeftHandIndex1').getWorldPosition(palm); character.getObjectByName('mixamorigLeftHandThumb2').getWorldPosition(other); palm.add(other).multiplyScalar(.5);
    weapon.getObjectByName('Grip_L').getWorldPosition(left); hand = Math.max(hand, left.distanceTo(palm)); if (left.distanceTo(palm) > .07) away++;
  }
  assert.ok(worst < 12, `salto ${worst}`); assert.ok(low > -.12, `a ponta só raspa o chão: ${low}`); assert.ok(hand < .2, `mão esquerda ${hand}`); assert.ok(away / 537 < .12, `só solta o cabo no giro do terceiro corte: ${away}`);
  weapon.removeFromParent();
});

test('Neon: envolve só a lâmina, sem textura nova, sem mexer na arma e sem vazar ao descartar', () => {
  const weapon = sword.scene.clone(true); let blade; weapon.traverse(n => { if (!blade && n.isMesh) blade = n; });
  const triangles = bladeTriangles(blade.geometry), y = blade.geometry.getAttribute('position');
  assert.ok(triangles.length / 3 > 1000 && triangles.length / 3 < 3500);
  for (const i of triangles) assert.ok(y.getY(i) < SWORD_NEON.bladeTop);
  const children = blade.children.length, neon = createSwordNeon(weapon);
  assert.equal(neon.meshes.length, 2); assert.equal(blade.children.length, children + 2);
  for (const mesh of neon.meshes) { assert.equal(mesh.isMesh, true); assert.equal(mesh.castShadow, false); assert.equal(mesh.material.uniforms.map, undefined); }
  assert.equal(neon.meshes[0].geometry.getAttribute('position'), y, 'reaproveita os vértices da arma');
  for (const mesh of neon.meshes) assert.match(mesh.material.fragmentShader, /\n\s*#include <colorspace_fragment>\s*\n/, 'diretiva em linha própria');
  neon.update(1, 1.5); assert.ok(neon.meshes[0].material.uniforms.power.value > 1);
  neon.dispose(); assert.equal(blade.children.length, children);
});

test('Rastro: crescente medida em cada corte, sobre o chão, com avanço, apagamento e pausa', () => {
  assert.equal(arcs.length, 3);
  for (const arc of arcs) {
    assert.ok(arc.rms < .2 && arc.radius > .3 && arc.radius < 2.2, `arco ${JSON.stringify(arc)}`);
    assert.ok(Math.abs(arc.to - arc.from) > Math.PI / 3 && Math.abs(arc.to - arc.from) < Math.PI * 1.2, 'crescente, não círculo');
    const position = arcGeometry(arc).getAttribute('position');
    for (let i = 0; i < position.count; i++) assert.ok(position.getY(i) >= SWORD_TRAIL.floor - 1e-6);
  }
  const trail = new SwordTrail(), { head, tail } = trail.mesh.material.uniforms;
  assert.equal(trail.mesh.visible, false);
  trail.update(1 / 60, 1, .5, 2, 0, 3, .4);
  assert.equal(trail.mesh.visible, true); assert.equal(head.value, .5); assert.equal(tail.value, 0);
  assert.deepEqual(trail.mesh.position.toArray(), [2, 0, 3]); assert.equal(trail.mesh.rotation.y, .4);
  const geometry = trail.mesh.geometry; trail.update(1 / 60, 1, 1, 2, 0, 3, .4); assert.equal(trail.mesh.geometry, geometry, 'sem malha nova no quadro');
  trail.update(1 / 60, 1, -1, 9, 0, 9, 1); assert.deepEqual(trail.mesh.position.toArray(), [2, 0, 3], 'fica no mundo'); assert.ok(tail.value > 0 && tail.value < 1);
  const fading = tail.value; trail.update(0, 1, -1, 9, 0, 9, 1); assert.equal(tail.value, fading, 'pausa congela');
  for (let i = 0; i < Math.ceil(SWORD_TRAIL.fade * 60) + 1; i++) trail.update(1 / 60, 1, -1, 9, 0, 9, 1);
  assert.equal(trail.mesh.visible, false, 'apaga sozinho');
  trail.update(1 / 60, 2, 0, 0, 0, 0, 0); assert.notEqual(trail.mesh.geometry, geometry, 'cada corte tem seu arco');
  trail.clear(); assert.equal(trail.mesh.visible, false); trail.dispose();
  assert.match(trail.mesh.material.fragmentShader, /\n\s*#include <colorspace_fragment>\s*\n/);
});

test('Reinício: nada chama dispose() em objeto de <primitive dispose={null}>, que o R3F zera e derrubava a cena', () => {
  for (const [file, names] of [['src/game/props/SupplyCrates.tsx', ['light', 'pieces', 'scar']], ['src/game/props/SupplyBeaconLights.tsx', ['light']], ['src/scene/ShanghaiDecay.tsx', ['debrisMesh', 'weedMesh', 'decalMesh']]]) {
    const source = fs.readFileSync(file, 'utf8');
    for (const name of names) assert.ok(!new RegExp(`\\b${name}\\.dispose\\(\\)`).test(source), `${file}: ${name}.dispose()`);
  }
});

test('Corrida: a lâmina fica rígida no pulso, sem o balanço de pena, e a mão esquerda segue no cabo', () => {
  const clip = base.animations.find(c => c.name === 'Machete_Run');
  const measure = led => {
    const character = clone(player.scene), weapon = sword.scene.clone(true), mixer = new AnimationMixer(character); attachMachete(character, weapon);
    const rig = new MacheteGripRig(character, weapon); mixer.clipAction(clip).play();
    const tip = new Vector3(), grip = new Vector3(), palm = new Vector3(), other = new Vector3(), left = new Vector3(), dirs = [], mean = new Vector3(); let hand = 0;
    for (let i = 0; i <= 144; i++) {
      mixer.setTime(clip.duration * i / 144); rig.update(true, led); character.updateMatrixWorld(true);
      weapon.getObjectByName('Tip').getWorldPosition(tip); weapon.getObjectByName('Grip_R').getWorldPosition(grip); const dir = tip.clone().sub(grip).normalize(); dirs.push(dir); mean.add(dir);
      character.getObjectByName('mixamorigLeftHandIndex1').getWorldPosition(palm); character.getObjectByName('mixamorigLeftHandThumb2').getWorldPosition(other); palm.add(other).multiplyScalar(.5);
      weapon.getObjectByName('Grip_L').getWorldPosition(left); hand = Math.max(hand, left.distanceTo(palm));
    }
    mean.normalize(); return { swing: Math.max(...dirs.map(d => d.angleTo(mean))) * 180 / Math.PI, hand };
  };
  const loose = measure(0), rigid = measure(1);
  assert.ok(loose.swing > 20, `antes ${loose.swing}`); assert.ok(rigid.swing < 10, `agora ${rigid.swing}`); assert.ok(rigid.hand < .07, `mão ${rigid.hand}`);
  const source = fs.readFileSync('src/characters/player/PlayerMachete.tsx', 'utf8');
  assert.match(source, /left > 0 \|\| moving \? 1 : 0/);
});

test('Alcance: efeito à frente, na mira, até perto do limite do dano; a luz da lâmina é real e nasce apagada', () => {
  assert.equal(MACHETE.range, 2.6);
  for (const arc of arcs) {
    const p = arcGeometry(arc).getAttribute('position'), mid = (SWORD_TRAIL.columns >> 1) * 2;
    assert.ok(Math.abs(Math.atan2(p.getX(mid), p.getZ(mid))) < .25, 'meio do arco na mira');
    assert.ok(Math.abs(p.getZ(mid) - SWORD_TRAIL.front) < .25 && SWORD_TRAIL.front <= MACHETE.range, `frente ${p.getZ(mid)}`);
  }
  const light = createSwordLight();
  assert.equal(light.isPointLight, true); assert.equal(light.intensity, 0); assert.equal(light.castShadow, false); assert.ok(SWORD_LIGHT.intensity > 0 && SWORD_LIGHT.reach > 3);
  const model = fs.readFileSync('src/characters/player/PlayerModel.tsx', 'utf8');
  assert.match(model, /combat && <primitive object=\{swordLight\}/, 'montada em combate qualquer que seja a arma');
});

test('Atordoamento: inimigo atingido pela espada não golpeia nem anda; volta depois e o tiro não atordoa', () => {
  const s = setup(), r = s.robots[0], { impact } = MACHETE_COMBO[0];
  s.invulnerable = 0; r.hp = 1e6; r.alerted = true;
  s.step(1 / 60, { ...input, firing: true }); s.invulnerable = 999; frames(s, Math.ceil(impact * 60) + 1);
  assert.ok(r.staggerLeft > 0, 'atordoado no impacto');
  s.invulnerable = 0; const hp = s.hp, x = r.x, z = r.z;
  frames(s, Math.floor((MACHETE.stagger - .05) * 60));
  assert.equal(s.hp, hp, 'sem golpe durante o atordoamento'); assert.equal(r.x, x); assert.equal(r.z, z);
  frames(s, 20); assert.ok(r.staggerLeft === 0); assert.ok(s.hp < hp, 'volta a golpear');
  assert.ok(MACHETE.stagger > (MACHETE_COMBO[2].interval - MACHETE_COMBO[2].impact) + MACHETE_COMBO[0].impact, 'combo contínuo segura o inimigo');
  const rifle = setup(); rifle.step(1 / 60, { ...input, weapon: 'rifle', firing: true, muzzle: { x: 0, z: 0, y: 1 } }); frames(rifle, 3, { ...input, weapon: 'rifle', muzzle: { x: 0, z: 0, y: 1 } });
  assert.equal(rifle.robots[0].staggerLeft, 0);
});

test('Atordoamento: cancela a investida do mutante grande e a pose de ataque', () => {
  const s = setup('largeMutant'), r = s.robots[0];
  r.chargePhase = 'windup'; r.chargeLeft = 5; r.staggerLeft = .5; frames(s, 1);
  assert.notEqual(r.chargePhase, 'windup');
  assert.match(fs.readFileSync('src/combat/patrolUnit.ts', 'utf8'), /staggerLeft \?\? 0\) > 0/);
});

test('Recuo: a emenda do ciclo não dá mais tranco na cabeça e o clipe aprovado fica intacto', () => {
  const source = base.animations.find(c => c.name === 'Machete_Backward'), before = source.tracks[0].values.slice();
  const seam = clip => {
    const character = clone(player.scene), mixer = new AnimationMixer(character); mixer.clipAction(clip).play();
    const head = character.getObjectByName('mixamorigHead'), a = new Vector3(), b = new Vector3(); let worst = 0;
    for (let i = 0; i <= 288; i++) { mixer.setTime(clip.duration * (1 + i / 144)); character.updateMatrixWorld(true); head.getWorldPosition(a); if (i) worst = Math.max(worst, a.distanceTo(b)); b.copy(a); }
    return worst;
  };
  const antes = seam(source), depois = seam(weldLoop(source));
  assert.ok(antes > .02, `antes ${antes}`); assert.ok(depois < .012, `depois ${depois}`);
  assert.deepEqual(Array.from(source.tracks[0].values), Array.from(before));
});
