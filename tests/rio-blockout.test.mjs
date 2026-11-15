import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSourceLoader, loadSource } from './load-source.mjs';

const { MAPS, MAP_CAMERA_ANGLE, isExpedition } = loadSource('src/game/config.ts');
const { createRioTerrain, RIO_ARES_POSITION, RIO_LAYOUT: rio } = loadSource('src/game/rio/layout.ts');
const { ARES_COLLIDERS } = loadSource('src/game/aresCollisions.ts');
const { RIO_SUPPLY_CRATES, RIO_MEDICAL_KITS } = loadSource('src/game/rio/supplies.ts');
const { crateMarker } = loadSource('src/game/props/supplyCrate.ts');
const { COMBAT, ENCOUNTER_CHOICES, HORDE_TOTALS, PATROL_KINDS, encounterLayout, encounterTotal, robotConfig } = loadSource('src/combat/config.ts');
const { CombatSimulation, validContactSpawn } = loadSource('src/combat/simulation.ts');
const { Navigation, traversable } = loadSource('src/combat/navigation.ts');

test('Rio: exportação byte a byte, terreno plano, limites da planta e colisão simples do ARES', () => {
    assert.deepEqual(readFileSync('src/assets/rio-fase01/layout.json'), readFileSync('art-source/rio-fase01/export/layout.json'));
    const terrain = createRioTerrain();
    assert.deepEqual(terrain.bounds, rio.bounds);
    assert.deepEqual(terrain.walkableAreas, rio.walkableAreas);
    assert.deepEqual(terrain.obstacles.slice(0, rio.obstacles.length + rio.limitColliders.length), [...rio.obstacles, ...rio.limitColliders]);
    assert.deepEqual(MAPS.rio.exit, rio.exit);
    assert.deepEqual(MAPS.rio.ship, rio.ship);
    assert.equal(MAP_CAMERA_ANGLE.rio, Math.PI / 4);
    assert.equal(isExpedition('rio'), true);
    assert.equal(isExpedition('shanghai'), true);
    assert.equal(isExpedition('mars'), false);
    for (const point of [{ x: 39.3, z: 0 }, { x: 37.5, z: -46.0 }, { x: -51.1, z: -1 }, { x: 7, z: -54.1 }, { x: 12.5, z: 54.1 }]) {
        assert.equal(traversable(point, terrain, .32), false);
    }
    assert.equal(traversable({ x: 37.5, z: 0 }, terrain, .32), true);
    assert.equal(terrain.surfaceHeight(.5, -.5), 0);
    assert.equal(terrain.supportHeight(rio.exit.x, rio.exit.z), 0);
    assert.ok(terrain.supportHeight(37.5, 0) < -0.05 && terrain.supportHeight(37.5, 0) > -0.31);
    assert.ok(traversable(rio.exit, terrain, .32));
    for (const box of ARES_COLLIDERS) {
        const x = RIO_ARES_POSITION.x + (box.minX + box.maxX) / 2;
        const z = RIO_ARES_POSITION.z + (box.minZ + box.maxZ) / 2;
        assert.equal(traversable({ x, z }, terrain, 0), false, box.id);
    }
});

test('Rio: os oito spawns têm caminho válido ao desembarque para todos os raios', () => {
    const world = createRioTerrain(), layout = encounterLayout('rio');
    assert.deepEqual(layout.routes, rio.patrolRoutes);
    assert.deepEqual(layout.spawns, rio.spawns);
    assert.deepEqual(layout.arrival, rio.exit);
    for (const kind of PATROL_KINDS) {
        const { radius, contactRange } = robotConfig({ kind });
        const navigation = new Navigation(world, radius, COMBAT.grid);
        for (const spawn of rio.spawns) {
            assert.ok(validContactSpawn(world, navigation, spawn, layout.arrival, radius, contactRange), `${kind}: ${spawn.id}`);
        }
    }
});

test('Rio: quantidades selecionáveis, quatro hordas na orla e suprimentos acessíveis', () => {
    const world = createRioTerrain(), layout = encounterLayout('rio');
    for (const encounter of ENCOUNTER_CHOICES) {
        const sim = new CombatSimulation(world, encounter, layout, RIO_SUPPLY_CRATES);
        assert.equal(sim.total, encounterTotal(encounter));
        if (encounter === 'hordas') {
            assert.deepEqual(sim.waves, HORDE_TOTALS);
            const input = { player: rio.exit, aim: rio.exit, firing: false, reload: false };
            for (let i = 0; i < HORDE_TOTALS.length; i++) {
                // Usa o relógio da simulação e encerra cada onda para alcançar a próxima.
                for (let j = 0; j < 420 && sim.wave < i + 1; j++) sim.step(COMBAT.fixedStep, input);
                assert.equal(sim.wave, i + 1);
                assert.equal(sim.alive, HORDE_TOTALS[i]);
                assert.equal(sim.queued, 0);
                for (const robot of sim.robots.filter(robot => robot.hp > 0)) {
                    assert.ok(robot.x < layout.perimeter.maxX);
                    assert.ok(traversable(robot, world, robotConfig(robot).radius));
                    robot.hp = 0;
                }
            }
        } else if (typeof encounter === 'number') {
            assert.ok(sim.robots.every(robot => robot.routeIndex >= 0));
        }
    }
    const outsideReservation = ({ x, z }) => x < rio.landingReservation.minX || x > rio.landingReservation.maxX
        || z < rio.landingReservation.minZ || z > rio.landingReservation.maxZ;
    for (const point of [...RIO_MEDICAL_KITS, ...RIO_SUPPLY_CRATES.map(crateMarker)]) {
        assert.ok(outsideReservation(point));
        assert.ok(traversable(point, world, .32));
    }
    assert.ok(RIO_SUPPLY_CRATES.every(outsideReservation));
    const sim = new CombatSimulation(world, 1, layout, RIO_SUPPLY_CRATES);
    assert.ok(sim.openSupplyCrate(crateMarker(RIO_SUPPLY_CRATES[0])));
    assert.ok(sim.collectMedicalKit(RIO_MEDICAL_KITS[0]));
});

test('Rio: ida, nova tentativa e volta no Desenvolvimento preservam saves e porão byte a byte', t => {
    const f = travelFixture(t);
    assert.ok(f.expedition.getState().enterDevelopment());
    f.board('mars');
    f.send('depart', 'rio');
    assert.equal(f.expedition.getState().session.destination, 'rio');
    f.send('depart', 'shanghai');
    assert.equal(f.expedition.getState().session.destination, 'rio');
    f.arrive('rio');
    const run = f.combat.getState().run;
    f.send('arrive');
    assert.equal(f.combat.getState().run, run);
    f.expedition.getState().restartMission();
    assert.equal(f.combat.getState().run, run + 1);
    assert.deepEqual(f.expedition.getState().spawn, MAPS.rio.exit);
    f.board('rio');
    f.send('depart');
    f.arrive('mars');
    f.send('arrive');
    assert.deepEqual(f.ship.getState().cargo, { iron: 5, copper: 2, titanium: 0, organic: 0 });
    assert.deepEqual(f.values, f.original);
    assert.deepEqual(f.writes, []);
});

test('Rio: campanha recusa a decolagem direta ao Rio e mantém Shanghai como destino', t => {
    const f = travelFixture(t);
    assert.ok(f.expedition.getState().enterCampaign());
    f.board('mars');
    const before = f.expedition.getState().session;
    f.send('depart', 'rio');
    assert.strictEqual(f.expedition.getState().session, before);
    assert.deepEqual(f.values, f.original, 'destino Rio recusado não inicia uma tentativa');
    assert.deepEqual(f.writes, []);
    f.send('depart');
    assert.equal(f.expedition.getState().session.destination, 'shanghai');
    f.arrive('shanghai');
    // S3.9 persiste a carga anterior na decolagem válida, para restaurar após derrota.
    const key = f.campaignSaveKey, savedBefore = JSON.parse(f.original.get(key));
    assert.deepEqual(JSON.parse(f.values.get(key)), { ...savedBefore, departureCargo: savedBefore.cargo });
    assert.deepEqual(f.writes, [key]);
    for (const [otherKey, value] of f.original) if (otherKey !== key) assert.equal(f.values.get(otherKey), value);
});

function travelFixture(t) {
    const load = createSourceLoader();
    const { createCampaignSave, CAMPAIGN_SAVE_KEY } = load('src/game/campaignSave.ts');
    const profile = { displayName: 'Explorador Rio', color: '#abcdef' };
    const campaign = createCampaignSave(profile);
    campaign.campaign = { ...campaign.campaign, stage: 'expedition-copper' };
    const values = new Map([
        ['exoden:hub:v1', JSON.stringify({ version: 1, profile, briefingSeen: true }, null, 2)],
        ['exoden-carga-aeronave-v1', '{ "iron": 5, "copper": 2 }'],
        [CAMPAIGN_SAVE_KEY, JSON.stringify(campaign, null, 2)],
    ]);
    const original = new Map(values), writes = [];
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => { writes.push(key); values.set(key, value); },
    } });
    t.after(() => {
        if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
        else delete globalThis.localStorage;
    });
    const { useExpeditionStore: expedition } = load('src/state/useExpeditionStore.ts');
    const { useCombatStore: combat } = load('src/state/useCombatStore.ts');
    const { useShipCargoStore: ship } = load('src/state/useShipCargoStore.ts');
    const { placePlayer } = load('src/state/playerTransient.ts');
    const send = (event, outbound) => expedition.getState().send(event, outbound);
    const board = map => {
        expedition.getState().setReady(true);
        placePlayer(MAPS[map].exit);
        send('board');
        assert.equal(expedition.getState().session.phase, 'aboard');
    };
    const arrive = map => {
        send('arrive');
        assert.equal(expedition.getState().session.map, map);
        assert.equal(expedition.getState().session.phase, 'aboard');
        expedition.getState().setReady(true);
        send('exit');
        assert.equal(expedition.getState().session.phase, 'walking');
        assert.deepEqual(expedition.getState().spawn, MAPS[map].exit);
    };
    return { expedition, combat, ship, send, board, arrive, original, values, writes, campaignSaveKey: CAMPAIGN_SAVE_KEY };
}

test('Rio v1: os quatro tipos de inimigo alcançam o fim do píer e voltam; a ponta desabada é inacessível', () => {
    const world = createRioTerrain(), layout = encounterLayout('rio');
    const pier = rio.walkableAreas[1], middle = (pier.minZ + pier.maxZ) / 2;
    for (const kind of PATROL_KINDS) {
        const { radius, contactRange } = robotConfig({ kind });
        const navigation = new Navigation(world, radius, COMBAT.grid);
        const end = { x: pier.maxX - radius - .4, z: middle };
        assert.ok(traversable(end, world, radius), `${kind}: fim do píer`);
        // Do píer ao desembarque e de um spawn do morro até o píer.
        assert.ok(validContactSpawn(world, navigation, end, layout.arrival, radius, contactRange), `${kind}: píer → desembarque`);
        assert.ok(validContactSpawn(world, navigation, rio.spawns[0], end, radius, contactRange), `${kind}: morro → píer`);
        assert.ok(!traversable({ x: pier.maxX + 1.5, z: middle }, world, radius), `${kind}: ponta desabada`);
        assert.ok(!traversable({ x: 40, z: pier.maxZ + 2 }, world, radius), `${kind}: mar`);
    }
});
