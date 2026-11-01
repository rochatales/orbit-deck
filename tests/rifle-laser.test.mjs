import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AnimationMixer, Box3, Vector3 } from 'three';
import { loadSource } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';

const art = 'art-source/armas/rifle-laser/';
const exported = art + 'export/rifle-laser-v001.glb';
const report = JSON.parse(fs.readFileSync(art + 'notas/medidas-v001.json', 'utf8'));
const hash = path => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');

test('Rifle laser: GLB exportado confere com as medidas, fonte preservada e tamanho contido', () => {
    assert.equal(hash(exported), report.sha256.glb);
    assert.equal(hash(art + 'fontes/rifle-laser-original.glb'), report.sha256.fonte_glb);
    assert.ok(fs.statSync(exported).size < 3.5e6);
    assert.equal(report.materiais, 1);
    assert.ok(report.triangulos <= 6000);
});

test('Rifle laser: escala real, cano para +Z, origem no punho e vazios Grip_R/Grip_L/Muzzle', async () => {
    const gltf = await loadGlb(exported);
    gltf.scene.updateMatrixWorld(true);
    const size = new Box3().setFromObject(gltf.scene).getSize(new Vector3());
    assert.ok(Math.abs(size.z - report.comprimento_m) < 0.005, `comprimento ${size.z}`);
    const at = name => {
        const node = gltf.scene.getObjectByName(name);
        assert.ok(node, name);
        return node.getWorldPosition(new Vector3());
    };
    const grip = at('Grip_R'), support = at('Grip_L'), muzzle = at('Muzzle');
    assert.ok(grip.length() < 1e-4);
    assert.ok(muzzle.z > support.z && support.z > grip.z, 'boca à frente do apoio, apoio à frente do punho');
    assert.ok(muzzle.y > grip.y, 'cano acima do punho');
    assert.deepEqual(report.vazios_gltf_m.Muzzle.map(v => Math.round(v * 100)), [muzzle.x, muzzle.y, muzzle.z].map(v => Math.round(v * 100)));
});

test('Rifle laser: encaixe real no RightHand em Aim_Rifle t=0; mira/tiro na altura da boca a 1,09 m', async () => {
    const character = await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
    const weapon = await loadGlb('src/assets/weapons/rifle-laser-v001.glb');
    const { attachRifle, detachRifle } = loadSource('src/characters/player/rifleAttachment.ts');
    const mixer = new AnimationMixer(character.scene);
    mixer.clipAction(character.animations.find(c => c.name === 'Aim_Rifle')).play();
    mixer.update(0);
    assert.equal(attachRifle(character.scene, weapon.scene), true);
    character.scene.updateMatrixWorld(true);
    const at = name => character.scene.getObjectByName(name).getWorldPosition(new Vector3());
    const palm = side => ['Hand', 'HandIndex1', 'HandMiddle1', 'HandRing1']
        .reduce((sum, suffix) => sum.add(at('mixamorig' + side + suffix)), new Vector3()).multiplyScalar(.25);
    assert.ok(at('Grip_R').distanceTo(palm('Right')) < .0001, 'punho fecha na palma direita');
    assert.ok(at('Grip_L').distanceTo(palm('Left')) < .05, 'apoio a menos de 5 cm da palma esquerda');
    const muzzle = at('Muzzle'), direction = weapon.scene.getObjectByName('Muzzle').getWorldDirection(new Vector3());
    assert.ok(Math.abs(muzzle.x - .001) < .005 && Math.abs(muzzle.y - 1.071) < .01 && Math.abs(muzzle.z - .718) < .01, `Muzzle ${muzzle.toArray()}`);
    assert.ok(direction.z > .94 && Math.abs(direction.x) < .30 && Math.abs(direction.y) < .15, `cano +Z: ${direction.toArray()}`);
    const { RIFLE_POSE, writeRifleMuzzle } = loadSource('src/combat/config.ts');
    const { PLAYER_COLLIDER_CENTER_Y, PLAYER_MODEL_ROOT_Y } = loadSource('src/characters/player/playerConfig.ts');
    assert.equal(RIFLE_POSE.height, 1.09);
    const worldMuzzleHeight = muzzle.y + PLAYER_COLLIDER_CENTER_Y + PLAYER_MODEL_ROOT_Y;
    assert.ok(Math.abs(RIFLE_POSE.height - worldMuzzleHeight) < .002, `altura do cano real ${worldMuzzleHeight}`);
    const physical = { x: 0, z: 0 }; writeRifleMuzzle(physical, 0, 0, 0);
    assert.equal(physical.x, .34); assert.equal(physical.z, .95);
    assert.equal(hash('src/assets/weapons/rifle-laser-v001.glb'), hash(exported));
    const initial = muzzle.clone(); mixer.update(.1); character.scene.updateMatrixWorld(true);
    assert.ok(at('Muzzle').distanceTo(initial) > 1e-5, 'cano acompanha a mão animada');
    detachRifle(weapon.scene); assert.equal(weapon.scene.parent, null);
    const hand = character.scene.getObjectByName('mixamorigRightHand');
    hand.name = 'mixamorig:RightHand'; // também aceita o nome original, antes da sanitização do loader
    assert.equal(attachRifle(character.scene, weapon.scene), true);
    detachRifle(weapon.scene);
    assert.equal(attachRifle(weapon.scene, character.scene), false, 'rig sem RightHand conserva fallback');
});

test('Rifle laser: encaixe no explorador rigado fecha as duas mãos na pose de tiro', () => {
    const fit = JSON.parse(fs.readFileSync(art + 'notas/encaixe-explorador-v001.json', 'utf8'));
    assert.equal(fit.osso, 'mixamorig:RightHand');
    const pose = fit.conferencia.find(c => c.clip === fit.pose_de_encaixe.clip && c.quadro === fit.pose_de_encaixe.quadro);
    assert.ok(pose.folga_mao_esquerda_m < 0.05);
    const [, altura, frente] = pose.muzzle_lado_altura_frente_m;
    assert.ok(altura > 0.8 && altura < 1.3 && frente > 0.4);
});
