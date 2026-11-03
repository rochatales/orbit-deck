import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';
const C = loadSource('src/game/shipCargo.ts');
const { BACKPACK, cargoWeight } = loadSource('src/game/backpackConfig.ts');

test('Carga da aeronave: porão maior que a mochila e transferência respeita a capacidade de destino', () => {
  assert.ok(C.SHIP_CARGO.capacityKg >= BACKPACK.capacityKg * 4);
  const pack = { iron: 10, copper: 10, titanium: 5, organic: 20 }, ship = { iron: 0, copper: 0, titanium: 0, organic: 0 };
  const before = cargoWeight(pack);
  assert.equal(C.transfer(pack, ship, 'iron', C.SHIP_CARGO.capacityKg, 3), 3);
  assert.equal(C.transferAll(pack, ship, C.SHIP_CARGO.capacityKg), 7 + 10 + 5 + 20);
  assert.deepEqual(pack, { iron: 0, copper: 0, titanium: 0, organic: 0 });
  assert.ok(Math.abs(cargoWeight(ship) - before) < 1e-9, 'nada se perde');
  // Volta para a mochila só até 30 kg.
  const big = { iron: 100, copper: 0, titanium: 0, organic: 0 }, back = { iron: 0, copper: 0, titanium: 0, organic: 0 };
  assert.equal(C.transfer(big, back, 'iron', BACKPACK.capacityKg), Math.floor(BACKPACK.capacityKg / BACKPACK.itemKg.iron));
  assert.ok(cargoWeight(back) <= BACKPACK.capacityKg + 1e-9);
  assert.equal(C.roomFor({ iron: 300, copper: 0, titanium: 0, organic: 0 }, 'organic', C.SHIP_CARGO.capacityKg), 0, 'porão cheio');
});

test('Carga da aeronave: pilhas na ordem da grade, proximidade e persistência tolerante', () => {
  assert.deepEqual(C.cargoStacks({ iron: 0, copper: 2, titanium: 0, organic: 1 }).map(s => s.kind), ['copper', 'organic']);
  const exit = loadSource('src/game/config.ts').MAPS.shanghai.exit;
  assert.ok(C.isNearCargo('shanghai', { x: exit.x + 4, z: exit.z }));
  assert.ok(!C.isNearCargo('shanghai', { x: exit.x + 9, z: exit.z }));
  const memory = new Map();
  const storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  assert.ok(C.saveShipCargo({ iron: 4, copper: 3, titanium: 0, organic: 9 }, storage));
  assert.deepEqual(C.loadShipCargo(storage), { iron: 4, copper: 3, titanium: 0, organic: 9 });
  memory.set([...memory.keys()][0], '{"iron":-2,"copper":"x","organic":99999}');
  assert.deepEqual(C.loadShipCargo(storage), { iron: 0, copper: 0, titanium: 0, organic: 0 }, 'dado inválido não entra');
  assert.deepEqual(C.loadShipCargo({ getItem: () => { throw new Error('bloqueado'); } }), { iron: 0, copper: 0, titanium: 0, organic: 0 });
});

test('Carga da aeronave: depositar tira da mochila da simulação e republica o HUD na hora', () => {
  const { useShipCargoStore } = loadSource('src/state/useShipCargoStore.ts');
  const { combatRuntime, useCombatStore } = loadSource('src/state/useCombatStore.ts');
  const sim = { iron: 6, copper: 6, titanium: 2, organic: 3, dead: false, get snapshot() { return { ...useCombatStore.getState(), iron: this.iron, copper: this.copper, titanium: this.titanium, organic: this.organic }; } };
  combatRuntime.simulation = sim;
  useShipCargoStore.setState({ cargo: { iron: 0, copper: 0, titanium: 0, organic: 0 } });
  assert.equal(useShipCargoStore.getState().deposit('iron', 1), 1);
  assert.equal(useShipCargoStore.getState().deposit(), 5 + 6 + 2 + 3);
  assert.deepEqual(useShipCargoStore.getState().cargo, { iron: 6, copper: 6, titanium: 2, organic: 3 });
  assert.equal(useCombatStore.getState().iron, 0, 'HUD da mochila zerado');
  assert.equal(useShipCargoStore.getState().withdraw('organic'), 3);
  assert.equal(sim.organic, 3);
  sim.dead = true;
  assert.equal(useShipCargoStore.getState().deposit(), 0, 'abatido não mexe na carga');
  combatRuntime.simulation = null;
  assert.equal(useShipCargoStore.getState().withdraw(), 0, 'sem mochila ativa (Marte) só consulta');
});
