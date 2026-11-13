import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rio = JSON.parse(readFileSync('art-source/rio-fase01/export/layout.json', 'utf8'));
const shanghai = JSON.parse(readFileSync('src/assets/shanghai-fase01/layout.json', 'utf8'));
const overlaps = (a, b) => a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ;
const inside = (p, b) => p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ;

test('Level 02 Rio: planta v0 tem a dimensão e o contrato de dados de Shanghai', () => {
    assert.deepEqual(rio.bounds, shanghai.bounds);
    assert.equal(rio.bounds.maxX - rio.bounds.minX, 102);
    assert.equal(rio.bounds.maxZ - rio.bounds.minZ, 108);
    for (const key of Object.keys(shanghai)) assert.ok(key in rio, `chave ausente: ${key}`);
    // Mesma reserva de pouso de Shanghai (10 x 13 m) e saída a 3,5 m da nave.
    const size = box => [box.maxX - box.minX, box.maxZ - box.minZ];
    assert.deepEqual(size(rio.landingReservation), size(shanghai.landingReservation));
    assert.equal(Math.hypot(rio.ship.x - rio.exit.x, rio.ship.z - rio.exit.z), 3.5);
});

test('Level 02 Rio: faixas cobrem o mapa do morro ao mar e o mar não é caminhável', () => {
    assert.equal(rio.bands[0].minX, rio.bounds.minX);
    assert.equal(rio.bands.at(-1).maxX, rio.bounds.maxX);
    for (let i = 1; i < rio.bands.length; i++) assert.equal(rio.bands[i].minX, rio.bands[i - 1].maxX);
    const sea = rio.bands.at(-1);
    assert.equal(sea.id, 'mar');
    assert.equal(rio.walkableAreas.length, 1);
    assert.equal(rio.walkableAreas[0].maxX, sea.minX);
    assert.deepEqual(rio.limits.map(limit => limit.kind).sort(), ['escombros', 'mar', 'morro', 'morro_escombros']);
    assert.ok(rio.limitColliders.some(collider => collider.id === 'COL_Limite_Mar' && collider.minX === sea.minX));
});

test('Level 02 Rio: colisores dentro do mapa, sem sobreposição e fora da reserva de pouso', () => {
    assert.equal(rio.buildings.length, 8);
    assert.equal(rio.obstacles.length, 10);
    for (const [i, a] of rio.obstacles.entries()) {
        assert.ok(a.minX >= rio.bounds.minX && a.maxX <= rio.bounds.maxX && a.minZ >= rio.bounds.minZ && a.maxZ <= rio.bounds.maxZ, a.id);
        assert.ok(!overlaps(a, rio.landingReservation), `${a.id} invade o pouso`);
        for (const b of rio.obstacles.slice(i + 1)) assert.ok(!overlaps(a, b), `${a.id} × ${b.id}`);
    }
    // O croqui tem um prédio por quadra; nenhum invade a avenida, o calçadão ou a areia.
    const avenue = rio.bands.find(band => band.id === 'calcada_orla').minX;
    for (const building of rio.buildings) assert.ok(building.x + building.w / 2 <= avenue, building.id);
});

test('Level 02 Rio: saída, suprimentos, rotas e entradas de inimigos ficam em piso livre', () => {
    const points = [rio.exit, ...rio.loot, ...rio.spawns, ...rio.patrolRoutes.flat(), ...rio.routes.flat(), ...rio.viewpoints];
    for (const point of points) {
        assert.ok(inside(point, rio.walkableAreas[0]), JSON.stringify(point));
        assert.ok(!rio.obstacles.some(obstacle => inside(point, obstacle)), JSON.stringify(point));
    }
    // Mesma regra de Shanghai: nenhum inimigo nasce a menos de 14 m do desembarque.
    for (const spawn of rio.spawns) assert.ok(Math.hypot(spawn.x - rio.exit.x, spawn.z - rio.exit.z) >= 14, spawn.id);
    assert.ok(inside(rio.exit, rio.landingReservation));
    // Spawns no formato de Shanghai: cada um aponta para um waypoint de uma rota existente.
    for (const spawn of rio.spawns) {
        assert.ok(Number.isInteger(spawn.routeIndex) && spawn.routeIndex < rio.patrolRoutes.length, spawn.id);
        assert.ok(Number.isInteger(spawn.waypoint) && spawn.waypoint < rio.patrolRoutes[spawn.routeIndex].length, spawn.id);
    }
    assert.deepEqual(Object.keys(shanghai.spawns[0]).filter(key => !(key in rio.spawns[0])), []);
});
