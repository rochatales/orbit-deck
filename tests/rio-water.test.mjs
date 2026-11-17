import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Vector3 } from 'three';
import { loadSource } from './load-source.mjs';

const {
    RIO_LAYOUT: rio,
    RIO_WATER_CONFIG,
    createRioTerrain,
    isOnRioPierDeck,
    isRioShallowWalkable,
    rioSandWetness,
    rioSeabedHeight,
    rioWaterDepth,
    rioWaterSurfaceHeight,
    rioWaveSwashFrontX,
} = loadSource('src/game/rio/layout.ts');
const { createWorld: createRioWorld } = loadSource('src/game/rio/world.ts');
const { RioWaterContactPool, WATER_CONTACT } = loadSource('src/game/rio/waterContact.ts');
const { approachSupportHeight } = loadSource('src/game/supportHeight.ts');
const { constrainToWalkableAreas } = loadSource('src/characters/player/playerMovement.ts');
const {
    PLAYER_COLLIDER_CENTER_Y: centerY,
    PLAYER_COLLIDER_HALF_HEIGHT: halfHeight,
    PLAYER_MOVEMENT: moveConfig,
    PLAYER_PHYSICS: physicsConfig,
} = loadSource('src/characters/player/playerConfig.ts');
const { COMBAT, PATROL_KINDS, encounterLayout, robotConfig, RIFLE_POSE } = loadSource('src/combat/config.ts');
const { Navigation, clearSegment, traversable } = loadSource('src/combat/navigation.ts');
const { CombatSimulation, traceShot, validContactSpawn } = loadSource('src/combat/simulation.ts');
const { createPhase01Terrain } = loadSource('src/game/shanghai/layout.ts');
const { createWorld: createMarsWorld } = loadSource('src/game/marsWorld.ts');

test('Rio v005: remove praia estática, piso e marcas do pouso, preservando areia decorativa e faixas da avenida', () => {
    const { BufferGeometry, Group, Mesh, MeshStandardMaterial } = createRequire(import.meta.url)('three');
    const { removeRioStaticCoast } = loadSource('src/game/rio/previewCoast.ts');
    const world = createRioTerrain();

    function fixture(file) {
        const glb = readFileSync(`src/assets/rio-fase01/${file}`);
        const data = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)));
        const materials = data.materials.map(({ name }) => Object.assign(new MeshStandardMaterial(), { name }));
        const scene = new Group();
        for (const node of data.nodes) {
            const [primitive] = data.meshes[node.mesh].primitives;
            const mesh = new Mesh(new BufferGeometry(), materials[primitive.material]);
            mesh.name = node.name;
            mesh.userData.bounds = data.accessors[primitive.attributes.POSITION];
            scene.add(mesh);
        }
        return scene;
    }

    const land = fixture('rio-fase01.glb'), border = fixture('rio-limites-v003.glb');
    const beach = land.getObjectByName('RIO_mapa_21_areia');
    const pierSand = land.getObjectByName('RIO_mapa_20_areia');
    const plazaSand = land.getObjectByName('RIO_mapa_12_areia');
    const wetSand = border.getObjectByName('RIO_limites_11_areia_molhada');
    const deck = land.getObjectByName('RIO_mapa_22_concreto');
    const landingPaint = land.getObjectByName('RIO_mapa_22_faixa');
    const roadPaint = land.getObjectByName('RIO_mapa_12_faixa');
    const footprint = rio.parts.find(part => part.id === 'Deck_Pouso');
    assert.deepEqual(deck.userData.bounds.max.map(x => Math.round(x * 100) / 100), [footprint.maxX, .02, footprint.maxZ]);
    assert.equal(landingPaint.userData.bounds.count, 96, 'quatro caixas de pintura');
    assert.equal(roadPaint.material, landingPaint.material);
    assert.deepEqual(beach.userData.bounds.max, [36, 0, 54]);
    assert.equal(beach.userData.bounds.min[0], 15);
    assert.equal(beach.userData.bounds.min[2], -54);
    assert.equal(beach.material, pierSand.material);
    let beachDisposals = 0, sharedSandDisposals = 0;
    beach.geometry.addEventListener('dispose', () => beachDisposals++);
    beach.material.addEventListener('dispose', () => sharedSandDisposals++);

    removeRioStaticCoast(world, land, border);

    assert.equal(land.getObjectByName(beach.name), undefined);
    assert.equal(land.getObjectByName(deck.name), undefined);
    assert.equal(land.getObjectByName(landingPaint.name), undefined);
    assert.equal(land.getObjectByName(roadPaint.name), roadPaint);
    assert.equal(land.getObjectByName('RIO_mapa_11_costa_praia'), undefined);
    assert.equal(border.getObjectByName(wetSand.name), undefined);
    assert.equal(border.getObjectByName('RIO_limites_11_mar'), undefined);
    assert.equal(land.getObjectByName(pierSand.name), pierSand);
    assert.equal(land.getObjectByName(plazaSand.name), plazaSand);
    assert.equal(beachDisposals, 1);
    assert.equal(sharedSandDisposals, 0);
});

test('Rio água (1): igualdade byte a byte entre a planta exportada e a cópia do runtime', () => {
    const exported = readFileSync('art-source/rio-fase01/export/layout.json');
    const runtimeCopy = readFileSync('src/assets/rio-fase01/layout.json');
    assert.deepEqual(runtimeCopy, exported);
    assert.equal(rio.shallowWater.minX, 36);
    assert.equal(rio.shallowWater.maxX, 39.2);
    assert.equal(rio.shallowWater.minZ, -45.2);
    assert.equal(rio.shallowWater.maxZ, 54);
    assert.equal(rio.shallowWater.maxDepth, 0.30);
});

test('Rio água (2): apoio físico contínuo na entrada e saída da água, separado da superfície visual', () => {
    const terrain = createRioTerrain();
    const z = 4.0;
    // Cidade e areia seca permanecem exatamente em Y = 0
    for (const x of [-40, -10, 0, 15, 25, 33.9]) {
        assert.equal(terrain.supportHeight(x, z), 0);
        assert.equal(terrain.surfaceHeight(x, z), 0);
        assert.equal(rioWaterDepth(x, z), 0);
    }

    // Descida monotônica e suave da areia úmida (X = 34) até o limite raso (X = 39.2, Y = -0.30 m)
    let prevY = terrain.supportHeight(34.0, z);
    assert.equal(prevY, 0);
    for (let x = 34.1; x <= RIO_WATER_CONFIG.shallowLimitX + 1e-6; x += 0.1) {
        const y = terrain.supportHeight(x, z);
        const surfY = rioWaterSurfaceHeight(x, z);
        const depth = rioWaterDepth(x, z);
        assert.equal(surfY, 0, 'superfície de repouso em Y = 0');
        assert.ok(y <= prevY + 1e-9, `descida monotônica em x=${x.toFixed(2)}: ${y} <= ${prevY}`);
        assert.ok(Math.abs(y - prevY) < 0.015, `sem degrau invisível em x=${x.toFixed(2)}: delta=${Math.abs(y - prevY)}`);
        assert.ok(Math.abs(depth - (-y)) < 1e-9, 'profundidade = superfície - fundo');
        prevY = y;
    }
    const edgeHeight = terrain.supportHeight(RIO_WATER_CONFIG.shallowLimitX, z);
    assert.ok(Math.abs(edgeHeight - (-0.30)) < 1e-6, `apoio na borda rasa = -0.30 m (obtido ${edgeHeight})`);

    // Simula caminhada de entrada (X = 32 -> 38.8) e saída (X = 38.8 -> 32) a 60 Hz sem teletransporte vertical
    let feetY = 0;
    const dt = 1 / 60;
    const stepX = moveConfig.runSpeed * dt;
    for (let x = 32.0; x <= 38.8; x += stepX) {
        const nextY = approachSupportHeight(feetY, terrain.supportHeight(x, z), dt, terrain.supportTransition);
        assert.ok(Math.abs(nextY - feetY) < 0.012, `entrada suave em x=${x.toFixed(2)}`);
        feetY = nextY;
    }
    assert.ok(feetY < -0.22 && feetY >= -0.30, `pés submersos no fundo raso: ${feetY}`);
    for (let x = 38.8; x >= 32.0; x -= stepX) {
        const nextY = approachSupportHeight(feetY, terrain.supportHeight(x, z), dt, terrain.supportTransition);
        assert.ok(Math.abs(nextY - feetY) < 0.012, `saída suave em x=${x.toFixed(2)}`);
        feetY = nextY;
    }
    assert.ok(Math.abs(feetY) < 0.01, `retorno suave ao nível da areia seca: ${feetY}`);

    // O tablado do píer sobre o mar mantém apoio plano em Y = 0 e profundidade nos pés = 0
    for (const x of [30, 36, 40, 45.5]) {
        assert.equal(isOnRioPierDeck(x, -50), true);
        assert.equal(terrain.supportHeight(x, -50), 0);
        assert.equal(rioWaterDepth(x, -50), 0);
    }
});

test('Rio água (3): ausência de passagem para água profunda, inclusive no dash, e impossibilidade de contornar o píer', async () => {
    const req = createRequire(import.meta.url);
    const R = createRequire(req.resolve('@react-three/rapier'))('@dimforge/rapier3d-compat');
    await R.init();

    const terrain = createRioTerrain();
    const physics = new R.World({ x: 0, y: 0, z: 0 });
    try {
        // Registra todos os colisores de obstáculos e limites do Rio, como em OfficeColliders
        for (const box of terrain.obstacles) {
            const hx = (box.maxX - box.minX) / 2;
            const hz = (box.maxZ - box.minZ) / 2;
            const hy = ((box.maxY ?? 4) - (box.minY ?? 0)) / 2;
            const cx = (box.minX + box.maxX) / 2;
            const cz = (box.minZ + box.maxZ) / 2;
            const cy = (box.minY ?? 0) + hy;
            const fixed = physics.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(cx, cy, cz));
            physics.createCollider(R.ColliderDesc.cuboid(hx, hy, hz), fixed);
        }

        const body = physics.createRigidBody(
            R.RigidBodyDesc.kinematicPositionBased().setTranslation(33.0, centerY, 0),
        );
        const capsule = physics.createCollider(R.ColliderDesc.capsule(halfHeight, moveConfig.colliderRadius), body);
        const controller = physics.createCharacterController(physicsConfig.controllerOffset);
        const allowed = { x: 0, z: 0 };
        const dt = 1 / 60;

        function stepMove(vx, vz, frames) {
            for (let i = 0; i < frames; i++) {
                const p = body.translation();
                constrainToWalkableAreas(
                    p.x, p.z, vx * dt, vz * dt,
                    terrain.bounds, terrain.walkableAreas, moveConfig.colliderRadius, allowed,
                );
                const targetSupport = terrain.supportHeight(p.x + allowed.x, p.z + allowed.z);
                const dy = centerY + approachSupportHeight(p.y - centerY, targetSupport, dt, terrain.supportTransition) - p.y;
                controller.computeColliderMovement(capsule, { x: allowed.x, y: dy, z: allowed.z });
                const corr = controller.computedMovement();
                const nx = p.x + corr.x;
                const nz = p.z + corr.z;
                const ny = centerY + approachSupportHeight(p.y - centerY, terrain.supportHeight(nx, nz), dt, terrain.supportTransition);
                body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
                physics.step();
            }
            return body.translation();
        }

        // 1. Caminhada e Dash em direção ao mar profundo (+X): entra na faixa rasa (X > 38) mas para antes de 39.2
        const afterWalk = stepMove(moveConfig.runSpeed, 0, 120);
        assert.ok(afterWalk.x > 38.0, `personagem entrou na água rasa: x=${afterWalk.x}`);
        assert.ok(afterWalk.x <= RIO_WATER_CONFIG.shallowLimitX - moveConfig.colliderRadius + 1e-4);

        const afterDash = stepMove(moveConfig.dashSpeed, 0, 60);
        assert.ok(
            afterDash.x <= RIO_WATER_CONFIG.shallowLimitX - moveConfig.colliderRadius + 1e-4,
            `dash não atravessa para água profunda: x=${afterDash.x}`,
        );
        assert.ok(Math.abs((afterDash.y - centerY) - terrain.supportHeight(afterDash.x, afterDash.z)) < 1e-3);

        // 2. Na água rasa (X = 37.8), tenta avançar para o norte (-Z) rumo à lateral do píer e ponta desabada
        body.setNextKinematicTranslation({ x: 37.8, y: centerY + terrain.supportHeight(37.8, -42.0), z: -42.0 });
        physics.step();
        const atPierChannel = stepMove(0, -moveConfig.dashSpeed, 90);
        assert.ok(
            atPierChannel.z >= RIO_WATER_CONFIG.shallowMinZ - 1e-4,
            `faixa rasa termina antes do canal do píer: z=${atPierChannel.z}`,
        );
        assert.ok(atPierChannel.z > -47.0, 'não alcança a lateral sul do píer pela água');

        // 3. No fim do tablado do píer (X = 45.4, Z = -50), tenta usar dash para a ponta caída (X = 46..51) ou para o mar ao sul
        body.setNextKinematicTranslation({ x: 44.0, y: centerY, z: -50.0 });
        physics.step();
        const atBrokenTip = stepMove(moveConfig.dashSpeed, 0, 60);
        assert.ok(atBrokenTip.x <= 46.0 - moveConfig.colliderRadius + 1e-4, `ponta desabada bloqueada no dash: x=${atBrokenTip.x}`);
        const sideAttempt = stepMove(0, moveConfig.dashSpeed, 60);
        assert.ok(sideAttempt.z <= -47.0 + 1e-4, `lateral sul do píer bloqueada: z=${sideAttempt.z}`);
    } finally {
        physics.free();
    }
});

test('Rio água (4): ida e volta dos quatro tipos de inimigo pela área rasa e combate/tiros sobre o fundo inclinado', () => {
    const world = createRioTerrain();
    const beachStart = { x: 28.0, z: 6.0 };
    const shallowTarget = { x: 38.5, z: 6.0 };
    const shallowCornerNearPier = { x: 38.5, z: -44.8 };

    assert.equal(isRioShallowWalkable(shallowTarget.x, shallowTarget.z), true);
    for (const kind of PATROL_KINDS) {
        const { radius, contactRange } = robotConfig({ kind });
        const nav = new Navigation(world, radius, COMBAT.grid);
        const maxReachableX = RIO_WATER_CONFIG.shallowLimitX - radius - 0.04;
        const enemyInShallow = { x: Math.min(38.0, maxReachableX), z: 6.0 };

        assert.equal(traversable(enemyInShallow, world, radius), true, `${kind} cabe na faixa rasa em x=${enemyInShallow.x}`);
        // Ida: da praia para o jogador na borda da água rasa (inclusive perto do canal do píer)
        assert.ok(
            validContactSpawn(world, nav, beachStart, shallowTarget, radius, contactRange),
            `${kind}: ida praia -> água rasa`,
        );
        assert.ok(
            validContactSpawn(world, nav, beachStart, shallowCornerNearPier, radius, contactRange),
            `${kind}: alcança jogador no canto norte da faixa rasa`,
        );
        // Volta: de dentro da água rasa de volta para a praia e para o desembarque
        assert.ok(
            validContactSpawn(world, nav, enemyInShallow, beachStart, radius, contactRange),
            `${kind}: volta água rasa -> praia`,
        );
        assert.ok(
            validContactSpawn(world, nav, enemyInShallow, rio.exit, radius, contactRange),
            `${kind}: volta água rasa -> desembarque`,
        );
        // Água profunda e ponta desabada continuam inacessíveis
        assert.equal(traversable({ x: 40.2, z: 6.0 }, world, radius), false, `${kind}: água profunda inacessível`);
        assert.equal(traversable({ x: 47.5, z: -50.0 }, world, radius), false, `${kind}: ponta desabada inacessível`);
    }

    // Tiros entre praia e água rasa: a água visual não bloqueia tiros e a altura acompanha surfaceHeight
    const sim = new CombatSimulation(world, 1, encounterLayout('rio'));
    const enemy = sim.robots[0];
    enemy.x = 38.2;
    enemy.z = 0.0;
    enemy.hp = 75;
    const playerInShallowY = world.supportHeight(37.5, 0.0);
    const shotHeight = RIFLE_POSE.height + playerInShallowY;
    const trace = traceShot({ x: 32.0, z: 0.0 }, { x: 40.0, z: 0.0 }, world, [enemy], undefined, undefined, shotHeight);
    assert.equal(trace.robot, enemy, 'disparo atinge inimigo na água rasa sem bloqueio pela água');
});

test('Rio água (5): memória de areia molhada, congelamento em pausa e efeitos de contato apenas em movimento na água', () => {
    const z = 0;
    // Busca o instante em que a onda avança mais para a praia (-X) e o instante em que recua (+X)
    const period = (Math.PI * 2) / RIO_WATER_CONFIG.speed;
    let minFrontT = 0, minFrontX = Infinity;
    let maxFrontT = 0, maxFrontX = -Infinity;
    for (let i = 0; i < 60; i++) {
        const t = (i / 60) * period;
        const fx = rioWaveSwashFrontX(z, t);
        if (fx < minFrontX) { minFrontX = fx; minFrontT = t; }
        if (fx > maxFrontX) { maxFrontX = fx; maxFrontT = t; }
    }
    assert.ok(maxFrontX - minFrontX > 1.2, `amplitude horizontal do swash > 1,2 m (${(maxFrontX - minFrontX).toFixed(2)} m)`);

    // Ponto na zona de arrebentação que fica coberto no avanço e descoberto logo após o recuo
    const sampleX = (minFrontX + maxFrontX) * 0.5;
    const wetAtAdvance = rioSandWetness(sampleX, z, minFrontT);
    const wetJustAfterRecede = rioSandWetness(sampleX, z, minFrontT + period * 0.35);
    assert.equal(wetAtAdvance, 1, 'areia debaixo da água está 100% saturada');
    assert.ok(wetJustAfterRecede > 0.55, `areia recém-descoberta mantém umidade alta por histerese (${wetJustAfterRecede.toFixed(2)})`);
    assert.equal(rioSandWetness(22.0, z, minFrontT), 0, 'areia seca longe da linha d’água tem umidade 0');

    // Efeitos de contato: não ativam na areia seca nem parado; ativam em movimento na água proporcional à velocidade
    const pool = new RioWaterContactPool();
    pool.step(28.0, 0, 1 / 60);
    pool.step(28.5, 0, 1 / 60);
    assert.equal(pool.activeRippleCount, 0, 'sem ondulações na areia seca');
    assert.equal(pool.activeSplashCount, 0, 'sem respingos na areia seca');

    // Dentro da água rasa (X = 37.6), parado: zero emissões
    pool.reset();
    for (let i = 0; i < 20; i++) pool.step(37.6, 0, 1 / 60);
    assert.equal(pool.activeRippleCount, 0, 'parado na água não gera ondulações');

    // Caminhando na água rasa: gera ondulações e respingos em coordenadas de mundo
    let zPos = 0;
    for (let i = 0; i < 30; i++) {
        zPos += (moveConfig.runSpeed / 60);
        pool.step(37.6, zPos, 1 / 60);
    }
    assert.ok(pool.activeRippleCount > 0, 'movimento na água rasa gera ondulações');
    assert.ok(pool.activeSplashCount > 0, 'movimento na água rasa gera respingos');

    // Pausa (dt = 0) congela exatamente o tempo da água e os efeitos de contato
    const rioWorld = createRioWorld();
    const coastal = rioWorld.group.userData.coastalWater;
    const pos = new Vector3(37.6, -0.18, 2.0);
    coastal.update(pos, 0.25);
    const timeBeforePause = coastal.getSimulationTime();
    const snapshotBeforePause = JSON.stringify(coastal.contactPool.ripples);
    coastal.update(pos, 0);
    assert.equal(coastal.getSimulationTime(), timeBeforePause, 'tempo da água congelado durante pausa');
    assert.equal(JSON.stringify(coastal.contactPool.ripples), snapshotBeforePause, 'ondulações congeladas durante pausa');
});

test('Rio água (6): preservação de Shanghai e Marte', () => {
    const shanghai = createPhase01Terrain();
    const shanghaiJson = JSON.parse(readFileSync('src/assets/shanghai-fase01/layout.json', 'utf8'));
    assert.deepEqual(shanghai.bounds, shanghaiJson.bounds);
    assert.equal(shanghai.walkableAreas.length, shanghaiJson.walkableAreas.length);
    assert.equal(shanghai.surfaceHeight(shanghaiJson.exit.x, shanghaiJson.exit.z), 0);

    const mars = createMarsWorld();
    assert.ok(mars.walkableAreas.length > 10);
    assert.equal(mars.supportHeight(0, 14), 0.16);
    assert.equal(mars.supportHeight(0, 25), 0);
});
