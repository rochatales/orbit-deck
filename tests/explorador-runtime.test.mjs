import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AnimationMixer } from 'three';
import ts from 'typescript';
import { loadGlb } from './load-glb.mjs';
import { loadPlayerRuntime } from './load-player-runtime.mjs';
import { loadSource } from './load-source.mjs';
const config = loadPlayerRuntime('src/characters/characterAssetConfig.ts');
const choice = loadPlayerRuntime('src/characters/player/playerAssetChoice.ts');
const locomotion = loadSource('src/characters/player/locomotionClips.ts');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('S6.8 F2: astronauta com loops armados padrão, r7/atual reversíveis na mesma cápsula', () => {
    for (const query of ['', '?personagem=astronauta', '?personagem=invalido']) assert.equal(choice.varianteInicial(query), 'astronauta');
    for (const variant of ['r7', 'atual']) assert.equal(choice.varianteInicial('?personagem=' + variant), variant);
    const asset = config.PLAYER_ASSET_VARIANTS.astronauta;
    assert.equal(asset.id, 'player-astronauta'); assert.equal(asset.scale, 1);
    assert.deepEqual(asset.positionOffset, [0, 0, 0]); assert.deepEqual(asset.rotationOffset, [0, 0, 0]);
    assert.equal(asset.materialProfile, 'preservar');
    assert.equal(hash(asset.assetPath), hash('art-source/personagens/explorador-astronauta/export/explorador-astronauta-rig-v009.glb'));
    // Troca em runtime afeta só escolha/clipes, sem remount do PlayerPhysicsBody.
    for (const variant of ['r7', 'atual', 'astronauta']) {
        choice.usePlayerAsset.getState().setVariant(variant);
        assert.equal(choice.usePlayerAsset.getState().variant, variant);
    }
    const player = fs.readFileSync('src/characters/player/Player.tsx', 'utf8');
    assert.match(player, /<PlayerModel motionRef=\{motionRef\} combat=\{combat\}/);
    assert.doesNotMatch(player, /key=|personagem|variant/);
    const { PLAYER_MOVEMENT: p } = loadSource('src/characters/player/playerConfig.ts');
    assert.deepEqual([p.colliderRadius, p.colliderHeight, p.visualHeight, p.runSpeed, p.backSpeed], [.32, 1.25, 1.5, 4.2, 1.2]);
});

test('S6.8 F2: ações reais seguem passada calibrada; variantes antigas mantêm fallback', async () => {
    const gltf = await loadGlb(config.EXPLORADOR_ASTRONAUTA_ASSET.assetPath), mixer = new AnimationMixer(gltf.scene);
    const actions = Object.fromEntries(gltf.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
    const calibration = locomotion.locomotionCalibration(config.EXPLORADOR_ASTRONAUTA_ASSET);
    locomotion.updateLocomotionRates(actions, actions.Run, 'walking', 4.2, calibration);
    close(actions.Run.timeScale, 4.2 / 2.1189701557);
    locomotion.updateLocomotionRates(actions, actions.Backward, 'backward', 1.2, calibration);
    close(actions.Backward.timeScale, 1.2 / 1.4012);
    for (const variant of ['r7', 'atual']) {
        const old = locomotion.locomotionCalibration(config.PLAYER_ASSET_VARIANTS[variant]);
        close(old.runReferenceSpeed, 1.6); close(old.backwardReferenceSpeed, .8);
        assert.deepEqual(old.backwardTimeScale, [.5, 2]);
        locomotion.updateLocomotionRates(actions, actions.Backward, 'backward', 1.2, old);
        close(actions.Backward.timeScale, 1.5);
    }
    locomotion.updateLocomotionRates(actions, actions.Idle, 'idle', 0, calibration);
    assert.equal(actions.Run.timeScale, 1); assert.equal(actions.Backward.timeScale, 1);
    assert.equal(locomotion.pickTargetAction('idle', actions, true), actions.Aim_Rifle);
    assert.equal(locomotion.pickTargetAction('idle', actions, false), actions.Idle);
    assert.equal(locomotion.pickTargetAction('walking', actions, true), actions.Run);
    assert.equal(locomotion.pickTargetAction('walking', actions, false), actions.Run);
    assert.equal(locomotion.pickTargetAction('falling', actions, true), actions.Fall);
    assert.equal(locomotion.pickTargetAction('idle', { Idle: actions.Idle }, true), actions.Idle);
});


test('S6.8 PBR: cópia runtime e prepareScene preservar mantêm MeshStandardMaterial com metalness zero', async () => {
    const file = config.EXPLORADOR_ASTRONAUTA_ASSET.assetPath;
    const bytes = fs.readFileSync(file), raw = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
    for (const material of raw.materials) {
        assert.equal(material.pbrMetallicRoughness.metallicFactor, 0);
        assert.ok((material.pbrMetallicRoughness.roughnessFactor ?? 1) >= .8);
        assert.ok((material.extensions?.KHR_materials_specular?.specularColorFactor ?? [1, 1, 1]).every(v => v <= 1));
    }
    // Carrega ESM, como o GLTFLoader: duas instâncias CJS/ESM do Three quebram instanceof Mesh.
    const code = ts.transpileModule(fs.readFileSync('src/characters/prepareCharacterScene.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 }
    }).outputText.replace(/from "([^"]+)"/g, (_, name) => `from "${import.meta.resolve(name)}"`);
    const { prepareScene } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
    assert.match(fs.readFileSync('src/characters/GLBCharacter.tsx', 'utf8'), /import \{ prepareScene \} from "\.\/prepareCharacterScene"/);
    const gltf = await loadGlb(file), originalMaterials = [];
    gltf.scene.traverse(o => { if (o.isMesh) originalMaterials.push(...(Array.isArray(o.material) ? o.material : [o.material])); });
    const prepared = prepareScene(gltf.scene, '#66e6ff', 'preservar');
    assert.notEqual(prepared.scene, gltf.scene);
    assert.ok(prepared.materials.length > 0);
    for (const material of prepared.materials) {
        assert.equal(material.isMeshStandardMaterial, true);
        assert.equal(material.metalness, 0);
        assert.ok(material.roughness >= .8);
        assert.ok(!originalMaterials.includes(material), 'material clonado por instância');
        assert.ok(originalMaterials.some(m => m.color.equals(material.color)), 'cor da fonte preservada');
        material.dispose();
    }
    assert.ok(originalMaterials.every(m => m.metalness === 0));
    assert.equal(prepared.visorMaterials.length, 0, 'sem escurecimento adicional do visor');
});
