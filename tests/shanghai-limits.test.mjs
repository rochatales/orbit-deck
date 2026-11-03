import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { loadSource } from './load-source.mjs';
import { Box3, Vector3, OrthographicCamera, Group, Mesh, BoxGeometry, MeshBasicMaterial } from 'three';

const { SHANGHAI_LIMITS, LimitsRuinFade, RUIN_FADED } = loadSource('src/game/shanghai/limits.ts');
const { createPhase01Terrain, SHANGHAI_PHASE01: d } = loadSource('src/game/shanghai/layout.ts');
const { Navigation, traversable, clearSegment } = loadSource('src/combat/navigation.ts');

test('S6.3 Limites: manifesto e geometria dos limites respeitam contratos do mapa', () => {
    assert.equal(SHANGHAI_LIMITS.version, 's6.3-limites-v002');
    assert.deepEqual(SHANGHAI_LIMITS.bounds, { minX: -51, maxX: 51, minZ: -54, maxZ: 54 });

    // 3 ruínas altas (fundo oeste, fundo leste, frente centro)
    assert.equal(SHANGHAI_LIMITS.ruins.length, 3);
    const ids = SHANGHAI_LIMITS.ruins.map(r => r.id);
    assert.ok(ids.includes('Ruina_Fundo_Oeste'), 'ruína fundo oeste presente');
    assert.ok(ids.includes('Ruina_Fundo_Leste'), 'ruína fundo leste presente');
    assert.ok(ids.includes('Ruina_Frente_Centro'), 'ruína frente centro presente');

    for (const r of SHANGHAI_LIMITS.ruins) {
        assert.ok(r.height >= 18.0, `${r.id} é um prédio alto (>= 18m)`);
        // Prédios ficam fora do distrito jogável
        const outside = r.maxX <= -51 || r.minX >= 51 || r.maxZ <= -54 || r.minZ >= 54;
        assert.ok(outside, `${r.id} fica fora do distrito jogável`);
    }

    // Colisores das bordas ficam fora ou no perímetro
    assert.ok(SHANGHAI_LIMITS.colliders.length >= 4, 'tem pelo menos 4 colisores de borda');
    for (const c of SHANGHAI_LIMITS.colliders) {
        assert.ok(c.maxY >= 3.0, `${c.id} tem altura suficiente para bloquear projéteis`);
    }
});

test('S6.3 Limites: GLB versionado existe, tem cabeçalho válido e orçamento de triângulos', () => {
    const glbPath = 'src/assets/shanghai-limites/shanghai-limites-v001.glb';
    assert.ok(existsSync(glbPath), 'GLB dos limites existe');

    const buffer = readFileSync(glbPath);
    assert.ok(buffer.length > 50000, 'GLB tem tamanho condizente');
    // Header glTF binário: magic 'glTF' = 0x46546C67
    assert.equal(buffer.readUInt32LE(0), 0x46546C67, 'magic glTF válido');
    assert.equal(buffer.readUInt32LE(4), 2, 'glTF versão 2');

    const jsonLength = buffer.readUInt32LE(12);
    const gltfJson = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
    assert.ok(gltfJson.nodes.length >= 5, 'nós de ruínas e terreno presentes');

    const materials = gltfJson.materials.map(m => m.name);
    assert.ok(materials.includes('entulho'));
    assert.ok(materials.includes('concreto'));
    assert.ok(materials.includes('terra'));

    // Verifica notas do asset
    const assetMeta = JSON.parse(readFileSync('art-source/shanghai-limites/notas/asset.json', 'utf8'));
    assert.ok(assetMeta.triangles <= 35000, `Orçamento de triângulos respeitado (${assetMeta.triangles} <= 35000)`);
});

test('S6.3 Limites: nenhum spawn, rota de patrulha ou loot é obstruído', () => {
    const world = createPhase01Terrain();

    // Spawns
    for (const p of d.spawns) {
        assert.ok(traversable(p, world, 0.36), `Spawn ${p.id} desobstruído`);
    }

    // Loot (incluindo Alumínio 5 em (48, -51) e Alumínio 6 em (48, 51))
    for (const loot of d.loot) {
        assert.ok(traversable(loot, world, 0.36), `Loot ${loot.id} em (${loot.x}, ${loot.z}) desobstruído`);
    }

    // Patrulhas
    for (const route of d.patrolRoutes) {
        for (let i = 0; i < route.length; i++) {
            assert.ok(clearSegment(route[i], route[(i + 1) % route.length], world, 0.42), 'segmento de patrulha livre');
        }
    }
});

test('S6.3 Limites: LimitsRuinFade esmaece ruínas quando encobrem o jogador e restaura opacidade', () => {
    const root = new Group();
    const ruinGroup = new Group();
    ruinGroup.name = 'Ruina_Frente_Centro';

    const mesh = new Mesh(new BoxGeometry(12, 20, 11), new MeshBasicMaterial({ color: '#c4b695', opacity: 1 }));
    mesh.name = 'Ruina_Frente_Centro_bege';
    mesh.position.set(0, 10, -61.5);
    ruinGroup.add(mesh);
    root.add(ruinGroup);

    const fader = new LimitsRuinFade(root);
    assert.equal(fader.opacity, 1.0);

    // Câmera posicionada ao sul olhando para norte (passando pela ruína frontal em z=-61.5)
    const camera = new OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
    // Câmera em (0, 5, -80) olhando para (0, 5, 0) -> direção do olhar é (0, 0, 1)
    camera.position.set(0, 5, -80);
    camera.lookAt(0, 5, 0);

    // Jogador em (0, 0, -50): a ruína em (0, 10, -61.5) está entre a câmera e o jogador!
    // Ray do jogador em direção à câmera (direção oposta ao olhar: (0, 0, -1)) atinge a ruína!
    const isBlocked = fader.blocked(0, -50, camera);
    assert.equal(isBlocked, true, 'ruína bloqueia linha de visão do jogador');

    // Simula 20 quadros com blocked
    for (let i = 0; i < 20; i++) {
        fader.update(0, -50, camera, 0.05);
    }
    assert.ok(fader.opacity <= RUIN_FADED + 0.05, `opacidade esmaeceu para perto de ${RUIN_FADED} (atual: ${fader.opacity})`);

    // Quando a câmera ou jogador mudam de ângulo (ex: câmera ao norte (0, 5, 80) olhando para (0, 5, 0)),
    // a ruína ao sul em z=-61.5 não está mais entre a câmera e o jogador:
    camera.position.set(0, 5, 80);
    camera.lookAt(0, 5, 0);

    assert.equal(fader.blocked(0, 0, camera), false, 'ruína não bloqueia mais');

    for (let i = 0; i < 35; i++) {
        fader.update(0, 0, camera, 0.05);
    }
    assert.ok(fader.opacity >= 0.95, `opacidade recuperada para próximo de 1.0 (atual: ${fader.opacity})`);

    fader.dispose();
});

test('S6.3 Limites: textura da atmosfera de nuvens existe e é carregável', () => {
    const cloudPath = 'src/assets/shanghai-limites/nuvem.png';
    assert.ok(existsSync(cloudPath), 'textura nuvem.png existe no diretório de assets');
    const buf = readFileSync(cloudPath);
    assert.ok(buf.length > 500, 'textura nuvem.png tem conteúdo válido');
    // Magic PNG: 0x89 0x50 0x4E 0x47
    assert.equal(buf[0], 0x89);
    assert.equal(buf[1], 0x50);
    assert.equal(buf[2], 0x4E);
    assert.equal(buf[3], 0x47);
});
