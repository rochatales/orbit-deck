import test from 'node:test';
import assert from 'node:assert/strict';
import { createSourceLoader } from './load-source.mjs';

test('Rio/S3.9: limpeza só após as quatro hordas, sem fila ou vivos; publicação única e derrota não limpa', () => {
    const load = createSourceLoader();
    const { createRioTerrain } = load('src/game/rio/layout.ts');
    const { CombatSimulation } = load('src/combat/simulation.ts');
    const { COMBAT, HORDE_ENCOUNTER, encounterLayout } = load('src/combat/config.ts');
    const { useCombatStore: store } = load('src/state/useCombatStore.ts');
    const layout = encounterLayout('rio');
    const sim = new CombatSimulation(createRioTerrain(), HORDE_ENCOUNTER, layout);
    const input = { player: layout.arrival, aim: layout.arrival, firing: false, reload: false };
    store.getState().restart();
    let publications = 0;
    const off = store.subscribe((state, previous) => { if (state.cleared && !previous.cleared) publications++; });
    const advance = () => {
        sim.step(COMBAT.fixedStep, input, false);
        store.getState().publish(sim.snapshot);
    };
    try {
        for (let wave = 1; wave <= 4; wave++) {
            assert.equal(sim.cleared, false);
            for (let guard = 0; sim.wave < wave || sim.queued > 0; guard++) {
                assert.ok(guard < 1200, `horda ${wave} deve nascer`);
                advance();
                sim.hp = 100;
                assert.equal(sim.cleared, false, 'intervalo/fila/inimigos vivos impedem limpeza');
            }
            assert.ok(sim.alive > 0);
            for (const robot of sim.robots.filter(r => r.hp > 0)) {
                sim.damageRobot(robot, 10000, 0, 1);
                sim.damageRobot(robot, 10000, 0, 1);
            }
            advance();
            assert.equal(sim.cleared, wave === 4);
        }
        const clearTime = sim.clearTime;
        assert.ok(clearTime > 0);
        assert.equal(sim.queued, 0);
        assert.equal(sim.alive, 0);
        assert.equal(sim.kills, sim.total);
        advance(); advance();
        assert.equal(sim.clearTime, clearTime);
        assert.equal(publications, 1);
        sim.hp = 0;
        assert.equal(sim.snapshot.cleared, false);
        store.getState().markClearPresented();
        store.getState().restart();
        assert.equal(store.getState().cleared, false);
        assert.equal(store.getState().clearPresented, false);
    } finally { off(); }
});
