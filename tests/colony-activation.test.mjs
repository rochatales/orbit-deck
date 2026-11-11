import test from 'node:test';
import assert from 'node:assert/strict';
import { Color, Mesh, MeshStandardMaterial, ShaderLib } from 'three';
import { readFileSync } from 'node:fs';
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
        'control-room': [0, 1, 1, 1], 'data-center': [1, 1, 1, 1], 'meeting-room': [0, 1, 1, 1],
        barracks: [0, 1, 1, 1], workshop: [1, 1, 1, 1], hangar: [.16, 1, 1, 1],
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
    assert.equal(animation.buildingPower('meeting-room', true, true), 0);
    // Oficina e Data Center funcionam desde o início e não piscam na sequência de EDEN.
    assert.equal(animation.buildingPower('data-center', true, true), 1);
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
    // Luz branca de teto pelo material: piso (normal para cima) recebe mais e clareia a cor.
    assert.match(shader.fragmentShader, /irradiance \+= colonyLight \* \(1\.40 \+ 1\.60 \* colonyUp\)/);
    assert.match(shader.fragmentShader, /pow\(material\.diffuseColor, vec3\(0\.45\)\), colonyUp \* colonyLift\)/);
    assert.equal(shader.uniforms.colonyLift.value, 1);
    assert.ok(shader.uniforms.colonyLight.value.r > .9 && shader.uniforms.colonyLight.value.b > .9);
});

test('S6.19: luz interna segue a energia, fica vermelha na emergência e apaga com o prédio desligado', () => {
    const load = createSourceLoader();
    const { interiorLightColor } = load('src/scene/marsColony/colonyPower.ts');
    const { COLONY_POWER } = load('src/scene/marsColony/colonyPowerConfig.ts');
    const off = interiorLightColor(new Color(), 0, COLONY_POWER['control-room'].initial);
    assert.deepEqual([off.r, off.g, off.b], [0, 0, 0]);
    const on = interiorLightColor(new Color(), 1, COLONY_POWER.hangar.initial);
    assert.ok(Math.min(on.r, on.g, on.b) > .9);
    const emergency = interiorLightColor(new Color(), COLONY_POWER.hangar.initial, COLONY_POWER.hangar.initial);
    assert.ok(emergency.r > emergency.g * 2 && emergency.r < .2);
    assert.equal(COLONY_POWER.workshop.initial, 1);
    assert.equal(COLONY_POWER['data-center'].initial, 1);
});

test('S6.19: pavimento compartilhado acende por sala sem alterar o material do cache', () => {
    const values = new Map();
    globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const load = createSourceLoader();
    const { bindSharedFloorPower } = load('src/scene/marsColony/colonyPower.ts');
    const { COLONY_POWER } = load('src/scene/marsColony/colonyPowerConfig.ts');
    const { useCampaignStore } = load('src/state/useCampaignStore.ts');
    const cached = new MeshStandardMaterial({ color: '#444' }), floor = new Mesh(undefined, cached);
    const bound = bindSharedFloorPower(floor);
    assert.notEqual(floor.material, cached);
    assert.equal(cached.onBeforeCompile.toString(), new MeshStandardMaterial().onBeforeCompile.toString());
    const shader = { uniforms: {}, vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader };
    floor.material.onBeforeCompile(shader);
    const ids = Object.keys(COLONY_POWER), at = id => ids.indexOf(id);
    assert.equal(shader.uniforms.colonyRooms.value.length, 9);
    assert.match(shader.fragmentShader, /for \(int i = 0; i < 9; i\+\+\)/);
    assert.match(shader.fragmentShader, /if \(colonyInterior\) directLight.color \*= 0.0/);
    bound.update();
    // Desenvolvimento: todas as salas ligadas.
    assert.ok(shader.uniforms.colonyLifts.value.every(lift => lift === 1));
    useCampaignStore.getState().startCampaign({ displayName: 'Piso QA', color: '#abcdef' });
    bound.update();
    const lifts = shader.uniforms.colonyLifts.value, lights = shader.uniforms.colonyLights.value;
    assert.equal(lifts[at('workshop')], 1);
    assert.equal(lifts[at('data-center')], 1);
    assert.equal(lifts[at('control-room')], 0);
    assert.equal(lights[at('laboratory')].r, 0);
    assert.ok(lights[at('workshop')].g > .9);
    bound.dispose();
});

test('S5.3: fumaça da Oficina e corrente do Data Center usam a implantação real e o cabo do masterplan', () => {
    const load = createSourceLoader();
    const { WORKSHOP_SMOKE, SOLAR_CURRENT, COLONY_POWER } = load('src/scene/marsColony/colonyPowerConfig.ts');
    const { COLONY_BUILDINGS } = load('src/game/colonyBuildingsLayout.ts');
    const workshop = COLONY_BUILDINGS.find(building => building.id === 'workshop');
    const { x, z, rotationY } = workshop.placement, cos = Math.cos(rotationY), sin = Math.sin(rotationY);
    const chimney = { x: x + WORKSHOP_SMOKE.local.x * cos + WORKSHOP_SMOKE.local.z * sin, z: z - WORKSHOP_SMOKE.local.x * sin + WORKSHOP_SMOKE.local.z * cos };
    const roof = COLONY_POWER.workshop.bounds;
    assert.ok(chimney.x > roof.minX && chimney.x < roof.maxX && chimney.z > roof.minZ && chimney.z < roof.maxZ);
    assert.ok(WORKSHOP_SMOKE.local.y > COLONY_POWER.workshop.ceiling);
    // A fumaça nasce na boca do cilindro da chaminé medido no GLB, não no alçapão central.
    const roofMesh = loadGlbPositions('src/assets/buildings/workshop.glb', 'Building_Roof')
        .filter(([vx, , vz]) => Math.hypot(vx - WORKSHOP_SMOKE.local.x, vz - WORKSHOP_SMOKE.local.z) < .35);
    assert.ok(roofMesh.length >= 100);
    const top = Math.max(...roofMesh.map(vertex => vertex[1]));
    assert.ok(WORKSHOP_SMOKE.local.y >= top && WORKSHOP_SMOKE.local.y - top < .1);
    const original = JSON.stringify(load('src/assets/colony-v007.manifest.json'));
    const cable = JSON.parse(original.slice(original.indexOf('"bounds"', original.indexOf('"name":"Cabo_Solar_Data"')) + 9, original.indexOf('}', original.indexOf('"bounds"', original.indexOf('"name":"Cabo_Solar_Data"'))) + 1));
    assert.ok(Math.abs((cable.minX + cable.maxX) / 2 - SOLAR_CURRENT.x) < .01);
    assert.ok(Math.abs(cable.minZ - SOLAR_CURRENT.fromZ) < .01);
    // Termina na face norte do Data Center; a corrente corre da fazenda solar para o prédio.
    const dataCenter = COLONY_BUILDINGS.find(building => building.id === 'data-center').visual;
    assert.ok(Math.abs(SOLAR_CURRENT.toZ - dataCenter.minZ) < .05 && SOLAR_CURRENT.toZ > SOLAR_CURRENT.fromZ);
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

test('S6.19: Salvager recebe a luz da sala ligada, perde o sol dentro e volta ao normal fora', () => {
    const values = new Map();
    globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const load = createSourceLoader();
    const power = load('src/scene/marsColony/colonyPower.ts');
    const { useCampaignStore } = load('src/state/useCampaignStore.ts');
    useCampaignStore.getState().startCampaign({ displayName: 'Luz QA', color: '#abcdef' });
    // Oficina ligada, Control Room desligada, pátio fora de qualquer prédio.
    assert.equal(power.interiorPowerAt(-12, 11.2), 1);
    assert.equal(power.interiorPowerAt(0, -12), 0);
    assert.equal(power.interiorPowerAt(0, 26), -1);
    const material = new MeshStandardMaterial();
    let chained = 0;
    material.onBeforeCompile = () => { chained++; };
    power.bindCharacterInteriorLight(new Mesh(undefined, material));
    const shader = { uniforms: {}, vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader };
    material.onBeforeCompile(shader);
    assert.equal(chained, 1);
    assert.match(shader.fragmentShader, /directLight\.color \*= 1\.0 - colonyInside/);
    assert.match(shader.fragmentShader, /getAmbientLightIrradiance\( ambientLightColor \) \+ colonyCharacterLight/);
    assert.equal(shader.uniforms.colonyInside, power.characterInterior.inside);
    for (let i = 0; i < 80; i++) power.updateCharacterInterior(-12, 11.2, .2);
    assert.ok(power.characterInterior.inside.value > .99 && power.characterInterior.light.value.g > .7);
    for (let i = 0; i < 80; i++) power.updateCharacterInterior(0, -12, .2);
    assert.ok(power.characterInterior.inside.value > .99);
    assert.equal(power.characterInterior.light.value.g, 0);
    for (let i = 0; i < 80; i++) power.updateCharacterInterior(0, 26, .2);
    assert.ok(power.characterInterior.inside.value < .01 && power.characterInterior.light.value.g < .01);
    power.updateCharacterInterior(-12, 11.2, 1);
    power.resetCharacterInterior();
    assert.equal(power.characterInterior.inside.value, 0);
    assert.equal(power.characterInterior.light.value.r, 0);
});

function loadGlbPositions(path, nodeName) {
    const file = readFileSync(path), jsonLength = file.readUInt32LE(12), json = JSON.parse(file.subarray(20, 20 + jsonLength).toString('utf8'));
    const bin = file.subarray(20 + jsonLength + 8), node = json.nodes.find(candidate => candidate.name === nodeName), out = [];
    for (const primitive of json.meshes[node.mesh].primitives) {
        const accessor = json.accessors[primitive.attributes.POSITION], view = json.bufferViews[accessor.bufferView];
        const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0), stride = view.byteStride ?? 12;
        for (let i = 0; i < accessor.count; i++) out.push([0, 4, 8].map(at => bin.readFloatLE(offset + i * stride + at)));
    }
    return out;
}
