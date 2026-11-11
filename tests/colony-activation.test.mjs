import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, MeshStandardMaterial, ShaderLib } from 'three';
import { createSourceLoader } from './load-source.mjs';

test('S5.3: nove prédios seguem a tabela de energia da campanha e ficam ligados no desenvolvimento', () => {
    const load = createSourceLoader();
    const { COLONY_POWER } = load('src/scene/marsColony/colonyPowerConfig.ts');
    const { buildingPower } = load('src/scene/marsColony/activationSequence.ts');
    const states = Object.fromEntries(Object.entries(COLONY_POWER).map(([id, { flag }]) => [id, [
        buildingPower(id, true, false), buildingPower(id, true, flag === 'edenActive'),
        buildingPower(id, true, true), buildingPower(id, false, false)
    ]]));
    assert.deepEqual(states, {
        'control-room': [0, 1, 1, 1], 'data-center': [0, 1, 1, 1], 'meeting-room': [0, 1, 1, 1],
        barracks: [0, 1, 1, 1], workshop: [.16, 1, 1, 1], hangar: [.16, 1, 1, 1],
        laboratory: [0, 0, 1, 1], greenhouse: [0, 0, 1, 1], cafeteria: [0, 0, 1, 1]
    });
});

test('S5.3: ligação salva primeiro, monta final no reload e pula com Escape ou movimento reduzido', () => {
    const values = new Map([['exoden:hub:v1', '{"version":1,"briefingSeen":false}'],
        ['exoden-carga-aeronave-v1', '{ "iron": 5, "copper": 4, "titanium": 3, "organic": 2 }']]);
    const dev = [...values];
    globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const load = createSourceLoader();
    const { useCampaignStore } = load('src/state/useCampaignStore.ts');
    const store = useCampaignStore.getState();
    store.startCampaign({ displayName: 'Energia QA', color: '#abcdef' });
    store.dispatch('finish-engineer-briefing');
    store.depositExpedition({ id: 'cobre', copper: 4, organic: 0 });
    store.dispatch('finish-copper-expedition');
    store.dispatch('finish-engineer-return-briefing');
    assert.ok(store.dispatch('activate-eden'));
    const saved = values.get('exoden:campaign:v1');
    assert.equal(JSON.parse(saved).campaign.edenActive, true);
    const animation = load('src/scene/marsColony/activationSequence.ts');
    assert.equal(animation.beginActivation('edenActive', false), true);
    animation.advanceActivation(1.75);
    assert.ok(animation.buildingPower('control-room', true, true) > 0);
    assert.equal(animation.buildingPower('data-center', true, true), 0);
    assert.equal(animation.beginActivation('edenActive', false), false);
    assert.equal(store.dispatch('activate-eden'), false);
    assert.equal(values.get('exoden:campaign:v1'), saved);
    const reload = createSourceLoader();
    assert.equal(reload('src/state/useCampaignStore.ts').useCampaignStore.getState().saved.campaign.edenActive, true);
    assert.equal(reload('src/scene/marsColony/activationSequence.ts').buildingPower('control-room', true, true), 1);
    assert.equal(animation.finishActivation(), true);
    assert.equal(animation.finishActivation(), false);
    assert.equal(animation.buildingPower('workshop', true, true), 1);
    assert.equal(animation.beginActivation('synthesizerActive', true), false);
    assert.equal(animation.buildingPower('cafeteria', true, true), 1);
    for (const [key, bytes] of dev) assert.equal(values.get(key), bytes);
});

test('S6.19: material do interior corta o sol, reduz a hemisférica e mantém emissivos no modo dev', () => {
    const load = createSourceLoader();
    const { bindBuildingPower } = load('src/scene/marsColony/colonyPower.ts');
    const material = new MeshStandardMaterial({ emissive: 'cyan', emissiveIntensity: 2 });
    const update = bindBuildingPower(new Mesh(undefined, material), 'control-room');
    assert.equal(update(), 1);
    assert.equal(material.emissiveIntensity, 2);
    const shader = { uniforms: {}, vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader };
    material.onBeforeCompile(shader);
    assert.match(shader.fragmentShader, /if \(colonyInterior\) directLight.color \*= 0.0/);
    assert.match(shader.fragmentShader, /colonyInterior \? 0.28 : 1.0/);
    assert.equal(shader.uniforms.colonyCeiling.value, 2.55);
});

test('S6.19: piscina de luzes mantém o teto e as sombras têm malhas independentes do fade', async () => {
    const [{ readFileSync }, { createRequire }, { runInThisContext }, { default: ts }] = await Promise.all([
        import('node:fs'), import('node:module'), import('node:vm'), import('typescript')
    ]);
    const native = createRequire(import.meta.url), load = createSourceLoader();
    const folder = 'src/scene/marsColony/';
    const code = ts.transpileModule(readFileSync(folder + 'ColonyInteriorLights.tsx', 'utf8'), {
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText;
    let frame;
    const module = { exports: {} };
    runInThisContext('(function(require,exports){' + code + '\n})')(spec => {
        if (spec === 'react') return { useRef: current => ({ current }) };
        if (spec === '@react-three/fiber') return { useFrame: callback => { frame = callback; } };
        if (spec.startsWith('.')) return load(folder + spec + '.ts');
        return native(spec);
    }, module.exports);
    const node = module.exports.ColonyInteriorLights();
    const [roofs, slots] = node.props.children;
    assert.equal(roofs.length, 9);
    for (const roof of roofs) {
        assert.equal(roof.props.castShadow, true);
        assert.equal(roof.props.visible, undefined);
        assert.equal(roof.props.children[1].props.colorWrite, false);
    }
    assert.ok(slots.length > 0 && slots.length <= 4);
    const { PointLight } = native('three');
    const lights = slots.map(slot => {
        const light = new PointLight(0xffffff, 0);
        slot.ref(light);
        return light;
    });
    const { playerPosition } = load('src/state/playerTransient.ts');
    for (const x of [0, 20, -20, 0]) {
        playerPosition.x = x;
        for (let i = 0; i < 60; i++) frame(null, 1 / 60);
        assert.equal(lights.filter(light => light.intensity > .02).length, slots.length);
        assert.ok(lights.every(light => !light.castShadow));
        assert.ok(roofs.every(roof => roof.props.castShadow));
    }
});
