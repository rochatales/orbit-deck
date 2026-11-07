import test from 'node:test';
import assert from 'node:assert/strict';
import { createSourceLoader, loadSource } from './load-source.mjs';

const C = loadSource('src/game/campaign.ts');
const S = loadSource('src/game/campaignSave.ts');
const profile = { displayName: 'Campanha', color: '#abcdef' };
const cargo = { iron: 4, copper: 4, titanium: 0, organic: 0 };
const events = ['finish-engineer-briefing', 'finish-copper-expedition', 'activate-eden', 'finish-eden-briefing', 'pick-up-sword', 'finish-organic-expedition', 'activate-synthesizer'];
const memoryStorage = () => {
    const values = new Map(), reads = [], writes = [];
    return { values, reads, writes, getItem(key) { reads.push(key); return values.get(key) ?? null; }, setItem(key, value) { writes.push(key); values.set(key, value); } };
};
function fixture(storage = memoryStorage()) {
    globalThis.localStorage = storage;
    const load = createSourceLoader();
    const { useExpeditionStore: expedition } = load('src/state/useExpeditionStore.ts');
    const { useCampaignStore: campaign } = load('src/state/useCampaignStore.ts');
    const { useCombatStore: combat, combatRuntime } = load('src/state/useCombatStore.ts');
    const { useShipCargoStore: ship } = load('src/state/useShipCargoStore.ts');
    return { load, expedition, campaign, combat, combatRuntime, ship, storage };
}
const enterCopper = () => C.transitionCampaign(C.createCampaign(), 'finish-engineer-briefing');

test('Campanha: sequência completa, quotas entregues e ativações sem consumo', () => {
    let state = C.createCampaign();
    const stages = [state.stage];
    for (const event of events) {
        if (event === 'finish-copper-expedition') state = C.depositExpedition(state, { id: 'cobre-1', copper: 4, organic: 0 });
        if (event === 'finish-organic-expedition') state = C.depositExpedition(state, { id: 'organica-1', copper: 0, organic: 10 });
        const previous = state;
        state = C.transitionCampaign(state, event);
        assert.notEqual(state, previous, event);
        assert.equal(C.transitionCampaign(state, event), state, 'repetição conserva referência');
        assert.ok(C.parseCampaignState(state));
        stages.push(state.stage);
    }
    assert.deepEqual(stages, [...C.CAMPAIGN_STAGES]);
    assert.deepEqual([state.edenActive, state.swordReceived, state.synthesizerActive], [true, true, true]);
    assert.equal(state.copperDelivered, 4); assert.equal(state.organicDelivered, 10);
    assert.equal(state.lastExpeditionId, 'organica-1');
});

test('Campanha: fora de ordem, sem quota ou por morte/restart, não conclui nem deposita', () => {
    const initial = Object.freeze(C.createCampaign());
    for (const event of [...events.slice(1), 'defeat', 'restart', 'board', 'kill-enemy']) assert.equal(C.transitionCampaign(initial, event), initial);
    assert.equal(C.depositExpedition(initial, { id: 'cedo', copper: 4, organic: 10 }), initial);
    let state = enterCopper();
    for (const event of ['finish-copper-expedition', 'activate-eden', 'defeat', 'restart', 'board', 'kill-enemy']) assert.equal(C.transitionCampaign(state, event), state);
    assert.equal(state.copperDelivered, 0); assert.equal(state.lastExpeditionId, null);
    state = C.depositExpedition(state, { id: 'parcial', copper: 3, organic: 0 });
    assert.equal(C.transitionCampaign(state, 'finish-copper-expedition'), state);
    assert.equal(state.stage, 'expedition-copper');
});

test('Campanha: quota parcial em duas expedições e A → B → A contam uma vez por ID', () => {
    let state = enterCopper();
    state = C.depositExpedition(state, { id: 'A', copper: 2, organic: 0 });
    assert.equal(C.depositExpedition(state, { id: 'A', copper: 100, organic: 100 }), state);
    state = C.depositExpedition(state, { id: 'B', copper: 2, organic: 0 });
    assert.equal(C.depositExpedition(state, { id: 'A', copper: 2, organic: 0 }), state);
    assert.equal(state.copperDelivered, 4); assert.equal(state.lastExpeditionId, 'B');
    assert.deepEqual(state.depositedExpeditionIds, ['A', 'B']);
    state = C.transitionCampaign(state, 'finish-copper-expedition');
    assert.equal(state.stage, 'eden-activation');
    for (const event of ['activate-eden', 'finish-eden-briefing', 'pick-up-sword']) state = C.transitionCampaign(state, event);
    state = C.depositExpedition(state, { id: 'C', copper: 0, organic: 4 });
    assert.equal(C.transitionCampaign(state, 'finish-organic-expedition'), state);
    state = C.depositExpedition(state, { id: 'D', copper: 0, organic: 6 });
    assert.equal(C.transitionCampaign(state, 'finish-organic-expedition').stage, 'synthesizer-activation');
    for (const delivery of [{ id: '', copper: 1, organic: 0 }, { id: 'X', copper: -1, organic: 0 }, { id: 'X', copper: 1.5, organic: 0 }, { id: 'X', copper: 0, organic: Infinity }]) assert.equal(C.depositExpedition(state, delivery), state);
});

test('Campanha: save versionado ida/volta, inválido nulo e armazenamento indisponível', () => {
    const storage = memoryStorage(), saved = S.createCampaignSave(profile);
    assert.ok(S.saveCampaignSave(saved, () => storage));
    assert.deepEqual(S.loadCampaignSave(() => storage), saved);
    assert.deepEqual(storage.writes, [S.CAMPAIGN_SAVE_KEY]);
    for (const raw of [null, '{inválido', 'null', '[]', '{}', JSON.stringify({ ...saved, version: 2 }), JSON.stringify({ ...saved, campaign: { ...saved.campaign, edenActive: true } }), JSON.stringify({ ...saved, cargo: { ...cargo, copper: -1 } }),
        ...[
            { ...saved.campaign, stage: 'eden-activation' },
            { ...saved.campaign, stage: 'expedition-copper', copperDelivered: 2, depositedExpeditionIds: ['A', 'A'], lastExpeditionId: 'A' },
            { ...saved.campaign, stage: 'expedition-copper', copperDelivered: 2, depositedExpeditionIds: ['A'], lastExpeditionId: 'B' },
            { ...saved.campaign, stage: 'expedition-copper', copperDelivered: 4 }
        ].map(campaign => JSON.stringify({ ...saved, campaign }))]) assert.equal(S.parseCampaignSave(raw), null);
    assert.equal(S.loadCampaignSave(() => { throw new Error('sem localStorage'); }), null);
    assert.equal(S.saveCampaignSave(saved, () => { throw new Error('sem localStorage'); }), false);
    assert.equal(S.loadCampaignSave(() => ({ getItem() { throw new Error('leitura bloqueada'); } })), null);
    assert.equal(S.saveCampaignSave(saved, () => ({ setItem() { throw new Error('quota'); } })), false);
    let copper = C.depositExpedition(enterCopper(), { id: 'A', copper: 2, organic: 0 });
    copper = C.depositExpedition(copper, { id: 'B', copper: 2, organic: 0 });
    const roundTrip = S.parseCampaignSave(JSON.stringify({ ...saved, campaign: copper }));
    assert.equal(C.depositExpedition(roundTrip.campaign, { id: 'A', copper: 2, organic: 0 }), roundTrip.campaign, 'IDs persistem no reload');
});

test('Campanha: sem save próprio, store mantém perfil e carga de desenvolvimento atuais', () => {
    const storage = memoryStorage();
    storage.values.set('exoden:hub:v1', JSON.stringify({ version: 1, profile: { ...profile, displayName: 'Dev' }, briefingSeen: true }));
    storage.values.set('exoden-carga-aeronave-v1', JSON.stringify(cargo));
    const f = fixture(storage);
    assert.equal(f.campaign.getState().mode, 'development'); assert.equal(f.campaign.getState().inGame, false);
    assert.equal(f.campaign.getState().saved, null);
    assert.equal(f.expedition.getState().profile.displayName, 'Dev'); assert.equal(f.expedition.getState().briefingSeen, true);
    assert.deepEqual(f.expedition.getState().session, f.load('src/game/session.ts').INITIAL_SESSION);
    assert.deepEqual(f.ship.getState().cargo, cargo); assert.equal(storage.writes.length, 0);
});

test('Campanha: entrar, mover carga, abrir EDEN e sair preserva saves dev byte a byte', () => {
    const storage = memoryStorage(), devHub = '{ "version":1, "profile":{"displayName":"Autor Dev","color":"#123456"}, "briefingSeen":true }', devCargo = '{"iron":4,"copper":8,"titanium":2,"organic":9}';
    storage.values.set('exoden:hub:v1', devHub); storage.values.set('exoden-carga-aeronave-v1', devCargo);
    const f = fixture(storage);
    assert.ok(f.expedition.getState().enterCampaign(profile));
    assert.deepEqual(f.ship.getState().cargo, { iron: 0, copper: 0, titanium: 0, organic: 0 });
    f.campaign.getState().dispatch('finish-engineer-briefing');
    const reads = storage.reads.length;
    const sim = { ...cargo, dead: false, get snapshot() { return { ...f.combat.getState(), iron: this.iron, copper: this.copper, titanium: this.titanium, organic: this.organic }; } };
    f.combatRuntime.simulation = sim;
    assert.equal(f.ship.getState().deposit(), 8);
    assert.equal(f.ship.getState().withdraw('copper', 1), 1);
    assert.equal(f.campaign.getState().saved.campaign.copperDelivered, 0, 'porão não é consolidação de expedição');
    assert.equal(storage.reads.length, reads, 'carga de campanha não lê a chave de desenvolvimento');
    f.expedition.getState().setReady(true);
    f.load('src/state/playerTransient.ts').placePlayer(f.load('src/game/config.ts').EDEN.position);
    f.expedition.getState().openEden();
    assert.equal(f.campaign.getState().saved.briefingSeen, false, 'EDEN desligada não abre');
    assert.equal(f.campaign.getState().saved.campaign.stage, 'expedition-copper');
    assert.equal(f.campaign.getState().enterDevelopment(), false, 'modo fixo até sair');
    assert.equal(f.campaign.getState().resumeCampaign(), false);
    f.expedition.getState().returnHome();
    assert.equal(f.expedition.getState().profile.displayName, 'Autor Dev');
    assert.deepEqual(f.ship.getState().cargo, JSON.parse(devCargo));
    assert.ok(f.expedition.getState().enterDevelopment());
    assert.equal(storage.values.get('exoden:hub:v1'), devHub);
    assert.equal(storage.values.get('exoden-carga-aeronave-v1'), devCargo);
    assert.ok(storage.writes.every(key => key === S.CAMPAIGN_SAVE_KEY));
});

test('Campanha: reload retoma perfil/carga próprios; recomeçar exige substituição explícita', () => {
    const storage = memoryStorage(), f = fixture(storage);
    assert.ok(f.expedition.getState().enterCampaign(profile));
    f.campaign.getState().dispatch('finish-engineer-briefing');
    f.campaign.getState().depositExpedition({ id: 'cobre', copper: 4, organic: 0 });
    f.campaign.getState().dispatch('finish-copper-expedition');
    f.campaign.getState().setCargo(cargo);
    f.expedition.getState().returnHome();
    const reloaded = fixture(storage);
    assert.equal(reloaded.campaign.getState().mode, 'development', 'reload abre entrada, sem escolher modo automaticamente');
    assert.equal(reloaded.expedition.getState().profile, null, 'perfil de campanha não ocupa o perfil dev');
    assert.ok(reloaded.expedition.getState().enterCampaign());
    assert.equal(reloaded.expedition.getState().profile.displayName, 'Campanha');
    assert.equal(reloaded.campaign.getState().saved.campaign.stage, 'eden-activation');
    assert.deepEqual(reloaded.ship.getState().cargo, cargo);
    reloaded.expedition.getState().returnHome();
    const before = storage.values.get(S.CAMPAIGN_SAVE_KEY);
    assert.equal(reloaded.expedition.getState().enterCampaign(profile), false, 'sem confirmação não substitui');
    assert.equal(storage.values.get(S.CAMPAIGN_SAVE_KEY), before);
    assert.ok(reloaded.expedition.getState().enterCampaign(profile, true));
    assert.deepEqual(reloaded.campaign.getState().saved.campaign, C.createCampaign());
    assert.deepEqual(reloaded.ship.getState().cargo, { iron: 0, copper: 0, titanium: 0, organic: 0 });
});

test('Campanha: morte não avança; restart zera HUD da mochila, sem consolidar', () => {
    const f = fixture(); f.expedition.getState().enterCampaign(profile);
    f.campaign.getState().dispatch('finish-engineer-briefing');
    const state = f.campaign.getState().saved.campaign;
    f.campaign.getState().setCargo(cargo);
    f.combat.setState({ hp: 0, dead: true });
    assert.deepEqual(f.ship.getState().cargo, cargo, 'carga de visitas anteriores preservada');
    assert.equal(f.campaign.getState().saved.campaign, state);
    f.expedition.setState({ ready: true, session: { map: 'shanghai', phase: 'walking', destination: null, revision: 1 } });
    f.campaign.getState().setCargo(cargo);
    f.combat.setState({ copper: 4 });
    assert.equal(f.combat.getState().copper, 4);
    f.expedition.getState().restartMission();
    assert.deepEqual(f.ship.getState().cargo, cargo, 'carga de visitas anteriores preservada');
    assert.equal(f.campaign.getState().saved.campaign, state);
    assert.equal(f.combat.getState().dead, false); assert.equal(f.combat.getState().copper, 0);
    assert.equal(f.campaign.getState().saved.campaign.lastExpeditionId, null);
});

test('Campanha: localStorage ausente não quebra entrada e erro é visível', () => {
    const f = fixture({ getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } });
    assert.equal(f.campaign.getState().saved, null);
    assert.ok(f.expedition.getState().enterCampaign(profile));
    assert.match(f.campaign.getState().saveError, /salvar a campanha/);
    f.campaign.getState().setCargo(cargo);
    assert.deepEqual(f.ship.getState().cargo, cargo);
    f.expedition.getState().returnHome();
    assert.equal(f.campaign.getState().mode, 'development');
});


test('Campanha: importação do porão já nesse modo não lê a carga dev', () => {
    const storage = memoryStorage(); globalThis.localStorage = storage;
    storage.values.set(S.CAMPAIGN_SAVE_KEY, JSON.stringify({ ...S.createCampaignSave(profile), cargo }));
    storage.values.set('exoden-carga-aeronave-v1', '{"iron":99,"copper":0,"titanium":0,"organic":0}');
    const load = createSourceLoader(), { useCampaignStore } = load('src/state/useCampaignStore.ts');
    assert.ok(useCampaignStore.getState().resumeCampaign());
    storage.reads.length = 0;
    const { useShipCargoStore } = load('src/state/useShipCargoStore.ts');
    assert.deepEqual(useShipCargoStore.getState().cargo, cargo);
    assert.ok(!storage.reads.includes('exoden-carga-aeronave-v1'), 'nenhuma leitura de localStorage da carga de desenvolvimento');
});


test('Desenvolvimento: erro de escrita do perfil não desaparece na entrada de teste', () => {
    const f = fixture({ getItem: () => null, setItem() { throw new Error('quota'); } });
    f.expedition.getState().start('Teste sem storage', '#abcdef');
    assert.match(f.expedition.getState().saveError, /salvar/);
    assert.ok(f.expedition.getState().enterDevelopment());
    assert.match(f.expedition.getState().saveError, /salvar/);
    f.expedition.getState().returnHome();
    assert.match(f.expedition.getState().saveError, /salvar/);
});

test('Modos: rádio inicial não carrega a última transmissão da outra sessão', () => {
    const f = fixture(), initial = f.expedition.getState().radio;
    f.expedition.getState().start('Dev', '#abcdef');
    f.expedition.getState().enterCampaign(profile);
    f.expedition.getState().setRadio('Mensagem anterior de Shanghai');
    f.expedition.getState().returnHome();
    assert.equal(f.expedition.getState().radio, initial);
    f.expedition.getState().enterDevelopment();
    assert.equal(f.expedition.getState().radio, initial);
});
