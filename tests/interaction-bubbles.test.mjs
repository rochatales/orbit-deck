import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadSource } from './load-source.mjs';
const { InteractionRegistry } = loadSource('src/interactions/interactionRegistry.ts');
const { interactionTargets, activateWorldInteraction } = loadSource('src/interactions/runtime.ts');
const { useExpeditionStore: expedition } = loadSource('src/state/useExpeditionStore.ts');
const { useGameStore: game } = loadSource('src/state/useGameStore.ts');
const { useCombatStore: combat, combatRuntime } = loadSource('src/state/useCombatStore.ts');
const { placePlayer, playerPosition, SHIP_INTERACTION_RADIUS } = loadSource('src/state/playerTransient.ts');
const { EDEN, MAPS } = loadSource('src/game/config.ts');
const { CombatSimulation } = loadSource('src/combat/simulation.ts');
const { createPhase01Terrain } = loadSource('src/game/shanghai/layout.ts');
const { SUPPLY_CRATE, SHANGHAI_SUPPLY_CRATES } = loadSource('src/game/props/supplyCrate.ts');
const { interactWithSupplyCrate } = loadSource('src/game/props/crateInteraction.ts');
function walking(map = 'mars') {
    game.setState({ isPaused: false }); combat.setState({ dead: false });
    expedition.setState({ ready: true, panel: null, session: { map, phase: 'walking', destination: null, revision: 0 } });
}
function snapshot() {
    const e = expedition.getState(), g = game.getState(), c = combat.getState(), p = { ...playerPosition }, sim = combatRuntime.simulation;
    return () => { expedition.setState(e); game.setState(g); combat.setState(c); placePlayer(p); combatRuntime.simulation = sim; };
}

test('Balões: proximidade, prioridade única, mais perto em empate e montagem/desmontagem sem alvo antigo', () => {
    const r = new InteractionRegistry(), hit = [];
    const ship = { id: 'ship', x: 0, z: 0, radius: 2.7, priority: 10, onInteract: () => hit.push('ship') };
    const npc = { id: 'npc', x: 1, z: 0, radius: 2.7, priority: 30, onInteract: () => hit.push('npc') };
    const a = r.register(ship), b = r.register(npc);
    assert.equal(r.select({ x: 10, z: 10 }), null); assert.equal(r.select({ x: 0, z: 0 }), npc);
    assert.equal(r.activate({ x: 0, z: 0 }), true); assert.deepEqual(hit, ['npc'], 'uma ação por E');
    b(); assert.equal(r.select({ x: 2.7, z: 0 }), ship); assert.equal(r.select({ x: 2.701, z: 0 }), null);
    const far = { ...ship, id: 'far', x: 1.5 }, remove = r.register(far);
    assert.equal(r.select({ x: 1.4, z: 0 }), far); remove(); a(); assert.equal(r.select({ x: 0, z: 0 }), null);
    assert.equal(r.select({ x: NaN, z: 0 }), null);
});

test('Balões: clique e E revalidam estado/alcance atual, sem confiar no último aviso visível', () => {
    const r = new InteractionRegistry(); let available = true, count = 0;
    const target = { id: 'crate', x: 0, z: 0, radius: 1.8, priority: 20, available: () => available, onInteract: () => { count++; available = false; } };
    r.register(target); const position = { x: 0, z: 0 };
    assert.equal(r.select(position), target); position.x = 3; assert.equal(r.activate(position, 'crate'), false);
    position.x = 0; assert.equal(r.activate(position, 'outro-alvo'), false); assert.equal(r.activate(position, 'crate'), true);
    assert.equal(r.select(position), null); assert.equal(r.activate(position), false); assert.equal(count, 1);
});

test('Balões: EDEN e nave usam ações reais; pausa, diálogo, morte, viagem e carregamento bloqueiam interação', () => {
    const restore = snapshot(); let remove;
    try {
        walking(); placePlayer({ x: 0, y: 0, z: -8.9 });
        remove = interactionTargets.register({ id: 'test-eden', x: EDEN.position.x, z: EDEN.position.z, radius: EDEN.interactionRadius, priority: 30, onInteract: () => expedition.getState().openEden() });
        assert.equal(activateWorldInteraction('test-eden'), true); assert.equal(expedition.getState().panel, 'eden');
        assert.equal(activateWorldInteraction(), false); expedition.getState().closePanel();
        game.setState({ isPaused: true }); assert.equal(activateWorldInteraction(), false); game.setState({ isPaused: false });
        expedition.setState({ ready: false }); assert.equal(activateWorldInteraction(), false); expedition.setState({ ready: true });
        remove(); placePlayer(MAPS.mars.exit);
        remove = interactionTargets.register({ id: 'test-ship', x: MAPS.mars.exit.x, z: MAPS.mars.exit.z, radius: SHIP_INTERACTION_RADIUS, priority: 10, onInteract: () => expedition.getState().send('board') });
        assert.equal(activateWorldInteraction(), true); assert.equal(expedition.getState().session.phase, 'aboard');
        assert.equal(activateWorldInteraction(), false); expedition.getState().send('exit'); assert.equal(expedition.getState().session.phase, 'walking');
        walking('shanghai'); combat.setState({ dead: true }); assert.equal(activateWorldInteraction(), false);
        combat.setState({ dead: false }); expedition.setState({ session: { ...expedition.getState().session, phase: 'travelling' } });
        assert.equal(activateWorldInteraction(), false);
    } finally { remove?.(); restore(); }
});

test('Balões: caixa real exige aproximação válida e some ao abrir, preservando recompensa e retry', () => {
    const restore = snapshot(); let remove;
    try {
        walking('shanghai'); const terrain = createPhase01Terrain(), sim = new CombatSimulation(terrain, 1, undefined, SHANGHAI_SUPPLY_CRATES);
        combatRuntime.simulation = sim; const crate = sim.crates[0];
        placePlayer({ x: crate.marker.x, y: terrain.surfaceHeight(crate.marker.x, crate.marker.z), z: crate.marker.z });
        remove = interactionTargets.register({ id: 'test-crate', x: crate.marker.x, z: crate.marker.z, radius: SUPPLY_CRATE.radius, priority: 20,
            available: () => combatRuntime.simulation?.nearbySupplyCrate(playerPosition)?.id === crate.id, onInteract: interactWithSupplyCrate });
        assert.equal(interactionTargets.select(playerPosition)?.id, 'test-crate');
        assert.equal(activateWorldInteraction('test-crate'), true); assert.equal(crate.phase, 'opening');
        assert.equal(interactionTargets.select(playerPosition), null); assert.equal(activateWorldInteraction(), false);
        const reserve = sim.reserve; sim.robots.forEach(r => r.hp = 0);
        sim.step(.8, { player: playerPosition, aim: { x: 0, z: -3 }, facingAngle: 0, firing: false, reload: false });
        assert.equal(sim.reserve, reserve + SUPPLY_CRATE.ammo);
        combatRuntime.simulation = new CombatSimulation(terrain, 1, undefined, SHANGHAI_SUPPLY_CRATES); assert.equal(interactionTargets.select(playerPosition)?.id, 'test-crate');
    } finally { remove?.(); restore(); }
});

test('Balões: estilo e componente compartilhados em Sintetizadora, nave, caixas e NPC; sem atalho E duplicado', () => {
    const bubble = fs.readFileSync('src/interactions/InteractionBubble.tsx', 'utf8');
    const app = fs.readFileSync('src/app/App.tsx', 'utf8'), lab = fs.readFileSync('src/scene/marsColony/Laboratorio.tsx', 'utf8');
    const world = fs.readFileSync('src/interactions/WorldInteractionBubbles.tsx', 'utf8');
    assert.match(bubble, /<Html position=\{position\} center/); assert.match(bubble, /E · \{label\}/);
    assert.match(bubble, /activateWorldInteraction\(id\)/); assert.match(bubble, /wasVisible\.current/);
    assert.match(lab, /<InteractionBubble id="synthesizer"/); assert.doesNotMatch(lab, /KeyE/);
    assert.match(app, /activateWorldInteraction\(\)/); assert.doesNotMatch(app, /className="interaction"/);
    assert.match(app, /state\.send\('exit'\)/); assert.match(app, /state\.closePanel\(\)/);
    assert.match(world, /<NpcInteractionBubble npc=\{EDEN\}/); assert.match(world, /Entrar na aeronave/);
    assert.match(world, /nearbySupplyCrate\(playerPosition\)\?\.id === crate\.id/);
    assert.match(fs.readFileSync('src/styles/global.css', 'utf8'), /\.interaction-bubble.*#20282ded/);
});
