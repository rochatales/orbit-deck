import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Box3, Vector3 } from 'three';
import { loadGlb } from './load-glb.mjs';

const art = 'art-source/armas/rifle-laser/';
const runtime = 'src/assets/weapons/rifle-laser-v001.glb';
const report = JSON.parse(fs.readFileSync(art + 'notas/medidas-v001.json', 'utf8'));
const hash = path => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');

test('Rifle laser: GLB do jogo é o exportado, fonte preservada e tamanho contido', () => {
    assert.equal(hash(runtime), report.sha256.glb);
    assert.equal(hash(art + 'fontes/rifle-laser-original.glb'), report.sha256.fonte_glb);
    assert.ok(fs.statSync(runtime).size < 3.5e6);
    assert.equal(report.materiais, 1);
    assert.ok(report.triangulos <= 6000);
});

test('Rifle laser: escala real, cano para +Z, origem no punho e vazios Grip_R/Grip_L/Muzzle', async () => {
    const gltf = await loadGlb(runtime);
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

test('Rifle laser: o jogador usa o GLB alinhado à ponta do cano da simulação', () => {
    const player = fs.readFileSync('src/characters/player/Player.tsx', 'utf8');
    const rifle = fs.readFileSync('src/characters/player/PlayerRifle.tsx', 'utf8');
    assert.match(player, /combat && <PlayerRifle\/>/);
    assert.match(rifle, /rifle-laser-v001\.glb/);
    assert.match(rifle, /getObjectByName\("Muzzle"\)/);
    assert.match(rifle, /RIFLE_POSE\.gripForward \+ RIFLE_POSE\.barrelForward \+ RIFLE_POSE\.barrelLength \/ 2/);
});
