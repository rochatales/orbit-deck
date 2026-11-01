import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Box3, Vector3 } from 'three';
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

test('Rifle laser: fica fora do jogo até o encaixe na mão do novo explorador', () => {
    const player = fs.readFileSync('src/characters/player/Player.tsx', 'utf8');
    assert.doesNotMatch(player, /rifle-laser|from "\.\/PlayerRifle"/);
    assert.equal(fs.existsSync('src/assets/weapons/rifle-laser-v001.glb'), false);
    assert.match(player, /name="RifleBarrel"/);
});

test('Rifle laser: encaixe no explorador rigado fecha as duas mãos na pose de tiro', () => {
    const fit = JSON.parse(fs.readFileSync(art + 'notas/encaixe-explorador-v001.json', 'utf8'));
    assert.equal(fit.osso, 'mixamorig:RightHand');
    const pose = fit.conferencia.find(c => c.clip === fit.pose_de_encaixe.clip && c.quadro === fit.pose_de_encaixe.quadro);
    assert.ok(pose.folga_mao_esquerda_m < 0.05);
    const [, altura, frente] = pose.muzzle_lado_altura_frente_m;
    assert.ok(altura > 0.8 && altura < 1.3 && frente > 0.4);
});
