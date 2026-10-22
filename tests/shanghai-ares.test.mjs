import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { BufferGeometry, BufferAttribute, Group, Mesh, MeshStandardMaterial, Box3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadSource } from './load-source.mjs';

const { ARES_LANDING, ARES_COLLIDERS } = loadSource('src/game/shanghai/aresLanding.ts');
const { prepareAresVisual, removeOldLandingPatch } = loadSource('src/game/shanghai/aresVisual.ts');
const { createPhase01Terrain, SHANGHAI_PHASE01: layout } = loadSource('src/game/shanghai/layout.ts');
const { MAPS } = loadSource('src/game/config.ts');
const { isNearShip } = loadSource('src/state/playerTransient.ts');
const { Navigation, traversable, clearSegment } = loadSource('src/combat/navigation.ts');
const { circleIntersectsRect } = loadSource('src/utils/math.ts');
const manifest = JSON.parse(fs.readFileSync('src/assets/ares-lander/manifesto.json', 'utf8'));
const bytes = fs.readFileSync('src/assets/ares-lander/ares-lander.glb');
const assetScene = async () => (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;

test('ARES: export só de nave/impacto, agrupado sem perder triângulos do estudo aprovado', async () => {
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), manifest.glb_sha256);
    assert.equal(manifest.fonte_commit, 'e31162a');
    assert.equal(manifest.pecas.length, 465);
    assert.equal(new Set(manifest.pecas.map(p => p.id)).size, 465);
    assert.equal(manifest.pecas.filter(p => p.conjunto === 'nave').reduce((sum, p) => sum + p.triangulos, 0), 98202);
    const scene = await assetScene(), ids = new Set();
    let triangles = 0, burns = 0, meshes = 0;
    scene.traverse(o => {
        assert.ok(!o.isLight && !o.isCamera);
        if (!o.isMesh) return;
        assert.ok(o.userData.id_estavel && !ids.has(o.userData.id_estavel));
        ids.add(o.userData.id_estavel); meshes++;
        assert.ok(['nave', 'impacto'].includes(o.userData.conjunto));
        triangles += o.geometry.index.count / 3;
        if (o.userData.material_fonte === 'SH_Carbone_Diffus') {
            burns++;
            assert.equal(o.geometry.attributes.color.itemSize, 4, 'alpha gradiente no GLB');
            assert.equal(o.material.transparent, true);
        }
    });
    assert.equal(meshes, 18, '465 peças agrupadas em 18 lotes');
    assert.equal(triangles, 114241);
    assert.equal(burns, 1, 'duas queimaduras no mesmo lote');
    prepareAresVisual(scene);
    assert.deepEqual(scene.position.toArray(), [0.72, 0.012, 13.52]);
    let points = 0;
    scene.traverse(o => { if (o.isPointLight) { points++; assert.equal(o.castShadow, false); } });
    assert.equal(points, 3, 'iluminação local sem shadow maps adicionais');
    const box = new Box3().setFromObject(scene);
    assert.ok(box.min.x > -12 && box.max.x < 12 && box.min.z > 1 && box.max.z < 26, 'pouso fica junto ao quarteirão central');
    const duplicate = await assetScene();
    duplicate.children[1].userData.id_estavel = duplicate.children[0].userData.id_estavel;
    assert.throws(() => prepareAresVisual(duplicate), /duplicado/);
});

test('ARES: [E], desembarque e retry mantêm o contrato, com espaço livre no pé da escada', () => {
    assert.deepEqual({ ...MAPS.shanghai.exit }, { x: 0, y: 0, z: 9.5 });
    assert.deepEqual({ ...layout.ship }, { x: 0, y: 0, z: 13 });
    assert.deepEqual({ ...ARES_LANDING.boarding }, { ...MAPS.shanghai.exit });
    const p = ARES_LANDING.position;
    assert.ok(Math.abs(p.x - 0.72) < 1e-6 && Math.abs(p.z - 4.02 - MAPS.shanghai.exit.z) < 1e-6);
    const world = createPhase01Terrain(), exit = MAPS.shanghai.exit;
    assert.equal(isNearShip('shanghai', exit), true);
    assert.equal(world.obstacles.length, layout.obstacles.length + 2 + ARES_COLLIDERS.length);
    for (const radius of [0.32, 0.36, 0.42]) {
        assert.ok(traversable(exit, world, radius));
        assert.ok(clearSegment(exit, { x: -8, z: 9.5 }, world, radius));
        assert.ok(clearSegment(exit, { x: 8, z: 9.5 }, world, radius));
        assert.ok(clearSegment(exit, { x: 0, z: 5 }, world, radius));
    }
    for (const box of ARES_COLLIDERS) {
        const center = { x: p.x + (box.minX + box.maxX) / 2, z: p.z + (box.minZ + box.maxZ) / 2 };
        assert.ok(!traversable(center, world, .32), box.id + ' sólido');
    }
    const nav = new Navigation(world, .36, .5);
    for (const destination of [...layout.spawns, ...layout.loot]) assert.ok(nav.path(exit, destination).length);
    // O pouso fica dentro da reserva existente; não invade prédios ou caixas.
    for (const box of world.obstacles.slice(-ARES_COLLIDERS.length)) {
        assert.ok(box.minX >= layout.landingReservation.minX && box.maxX <= layout.landingReservation.maxX);
        assert.ok(box.minZ >= layout.landingReservation.minZ && box.maxZ <= layout.landingReservation.maxZ);
        assert.ok(!circleIntersectsRect(exit.x, exit.z, .42, box));
    }
});

// Lê só a geometria real do lote de concreto: nenhum decoder de imagem necessário.
function concreteScene() {
    const raw = fs.readFileSync('src/assets/shanghai-fase01/shanghai-fase01.glb');
    const length = raw.readUInt32LE(12), json = JSON.parse(raw.subarray(20, 20 + length));
    const bin = raw.subarray(20 + length + 8);
    const node = json.nodes.find(n => n.extras?.id_estavel === 'SETOR_11_concreto');
    const primitive = json.meshes[node.mesh].primitives[0];
    const accessor = id => {
        const a = json.accessors[id], view = json.bufferViews[a.bufferView];
        const Type = { 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[a.componentType];
        const size = a.type === 'VEC3' ? 3 : 1, start = (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
        assert.ok(!view.byteStride || view.byteStride === Type.BYTES_PER_ELEMENT * size);
        return new BufferAttribute(new Type(bin.buffer.slice(bin.byteOffset + start, bin.byteOffset + start + a.count * size * Type.BYTES_PER_ELEMENT)), size);
    };
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', accessor(primitive.attributes.POSITION));
    geometry.setIndex(accessor(primitive.indices));
    const mesh = new Mesh(geometry, new MeshStandardMaterial()); mesh.userData = node.extras;
    const scene = new Group(); scene.add(mesh); return { scene, mesh };
}

test('ARES: remove apenas o remendo Chegada do lote original, mantendo todos os demais triângulos', () => {
    const { scene, mesh } = concreteScene();
    const before = Array.from(mesh.geometry.index.array), positions = mesh.geometry.attributes.position.array.slice();
    assert.equal(removeOldLandingPatch(scene), 12);
    const after = Array.from(mesh.geometry.index.array);
    assert.equal(before.length - after.length, 36);
    assert.deepEqual(mesh.geometry.attributes.position.array, positions, 'nenhuma posição ou UV do mapa mudou');
    const original = new Set();
    for (let i = 0; i < before.length; i += 3) original.add(before.slice(i, i + 3).join(','));
    for (let i = 0; i < after.length; i += 3) assert.ok(original.has(after.slice(i, i + 3).join(',')));
    assert.throws(() => removeOldLandingPatch(scene), /0\/12/, 'falha explícita para asset incompatível');
});
