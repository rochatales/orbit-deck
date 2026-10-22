import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Box3, OrthographicCamera } from 'three';
import { loadSource } from './load-source.mjs';

globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillText() {} }) }) };
const { createWorld: createShanghai } = loadSource('src/game/shanghaiWorld.ts');
const { MAPS } = loadSource('src/game/config.ts');
const { circleIntersectsRect } = loadSource('src/utils/math.ts');
const { RocketFade, ROCKET_FADED } = loadSource('src/game/rocketFade.ts');
const rocket = JSON.parse(fs.readFileSync('src/assets/rocket-b3/rocket-b3.json', 'utf8'));

async function rocketScene() {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const bytes = fs.readFileSync('src/assets/rocket-b3/rocket-b3.glb');
    return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
}

test('S6.3: blockout de comparação preserva o foguete da colônia, sem base', async () => {
    const scene = await rocketScene();
    const names = [], materials = new Set();
    let triangles = 0;
    scene.traverse(o => {
        if (o.parent === scene) names.push(o.name);
        if (o.isMesh) { triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3; materials.add(o.material.name); }
    });
    assert.deepEqual(names, ['PLAT_B3_Foguete'], 'nenhuma base nem estrutura de serviço');
    assert.equal(triangles, 2656, 'mesma malha do colony-v006.glb');
    assert.deepEqual([...materials].sort(), ['M_Estrutura', 'M_Foguete_Casco', 'M_Foguete_Motor', 'M_LuzAmbar', 'M_MetalEscuro', 'M_Vidro']);
    const box = new Box3().setFromObject(scene);
    assert.ok(Math.abs(box.min.y) < 1e-4, 'motores tocam o solo');
    assert.ok(Math.abs(box.max.y - rocket.height) < 1e-3);
    assert.ok(Math.abs(box.min.x - rocket.footprint.minX) < 1e-4 && Math.abs(box.max.z - rocket.footprint.maxZ) < 1e-4);
    const component = fs.readFileSync('src/game/Spacecraft.tsx', 'utf8');
    assert.match(component, /map === 'shanghai'\) return <ParkedRocket/);
});

test('S6.3: blockout anterior preserva colisão do foguete e saída alcançável', () => {
    const { x, z } = MAPS.shanghai.ship;
    const expected = { minX: x + rocket.footprint.minX, maxX: x + rocket.footprint.maxX, minZ: z + rocket.footprint.minZ, maxZ: z + rocket.footprint.maxZ };
    for (const world of [createShanghai()]) {
        assert.deepEqual(world.obstacles.at(-1), expected);
        assert.ok(!world.obstacles.some(o => Math.abs(o.maxX - o.minX - 0.45) < 1e-6), 'paredes da cabine provisória removidas');
        const exit = MAPS.shanghai.exit;
        assert.ok(!world.obstacles.some(o => circleIntersectsRect(exit.x, exit.z, 0.36, o)), 'desembarque livre');
        assert.ok(Math.hypot(exit.x - x, exit.z - expected.minZ) <= 2.7, 'borda do foguete dentro do raio de embarque');
    }
});

test('S6.3: foguete esmaece ao encobrir o jogador, volta depois e não escreve profundidade translúcido', async () => {
    const scene = await rocketScene();
    const { x, z } = MAPS.shanghai.ship;
    scene.position.set(x, 0, z);
    const fade = new RocketFade(scene);
    const camera = new OrthographicCamera(-720, 720, 450, -450, 0.1, 480);
    const look = (angle, px, pz) => {
        camera.position.set(px + Math.cos(angle) * 55, 39.55, pz + Math.sin(angle) * 55);
        camera.lookAt(px, 0.55, pz);
        camera.updateMatrixWorld();
    };
    const exit = MAPS.shanghai.exit;
    const materials = [];
    scene.traverse(o => { if (o.isMesh) materials.push(o.material); });
    // Câmera ao sul (+z): o foguete fica entre ela e o jogador no desembarque.
    look(Math.PI / 2, exit.x, exit.z);
    assert.equal(fade.blocked(exit.x, exit.z, camera), true);
    for (let i = 0; i < 60; i++) fade.update(exit.x, exit.z, camera, 1 / 60);
    assert.ok(fade.opacity < ROCKET_FADED + 0.01);
    assert.ok(materials.every(m => !m.depthWrite), 'translúcido não escreve profundidade');
    // Câmera ao norte: livre; só volta depois de 1,2 s.
    look(-Math.PI / 2, exit.x, exit.z);
    for (let i = 0; i < 60; i++) fade.update(exit.x, exit.z, camera, 1 / 60);
    assert.ok(fade.opacity < 0.2, 'ainda esmaecido antes de 1,2 s');
    for (let i = 0; i < 120; i++) fade.update(exit.x, exit.z, camera, 1 / 60);
    assert.equal(fade.opacity, 1);
    assert.ok(materials.some(m => m.depthWrite));
    // Embarcado (dentro da pegada), o foguete fica opaco em qualquer giro.
    look(Math.PI / 2, x, z);
    assert.equal(fade.blocked(x, z, camera), false);
});
