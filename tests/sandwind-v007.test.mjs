import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Group, SRGBColorSpace, MeshStandardMaterial, BoxGeometry, Mesh } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadSource } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';
const { SandwindController, sandwindResources } = loadSource('src/scene/marsColony/SandwindController.ts');
const { sandwindTargets } = loadSource('src/scene/marsColony/sandwindTargets.ts');
const { MasterplanRuntime } = loadSource('src/scene/marsColony/masterplanRuntime.ts');
const { GreenhouseRuntime, removeProvisionalGreenhouse } = loadSource('src/scene/marsColony/greenhouseRuntime.ts');
const { HangarRuntime } = loadSource('src/scene/marsColony/hangarRuntime.ts');
const { removeDockForHangar } = loadSource('src/scene/marsColony/hangarColony.ts');
const { createDeckProps } = loadSource('src/scene/marsColony/landingProps.ts');
const { QuartelRuntime } = loadSource('src/scene/marsColony/quartelRuntime.ts');
const { removeRoomForQuartel } = loadSource('src/scene/marsColony/quartelColony.ts');
const { QUARTEL } = loadSource('src/game/quartelLayout.ts');
const { HANGAR } = loadSource('src/game/hangarLayout.ts');
const manifest = JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json'));
const greenManifest = JSON.parse(fs.readFileSync('src/assets/greenhouse/greenhouse-v001.manifest.json'));
const urls = ['colony-v007.glb', 'hangar/hangar-v002.glb', 'greenhouse/greenhouse-v001.glb', 'colony-v006.glb', 'ares-lander/ares-lander.glb', 'ares-mars/deck-mars.glb', 'quartel/barracks-v006.glb'];
const sources = await Promise.all(urls.map(url => loadGlb(`src/assets/${url}`)));
const settings = { enabled: true, culling: true, wind: true, profile: 'compact' };
const eachMaterial = (root, fn) => root.traverse(n => { if (n.isMesh) for (const m of Array.isArray(n.material) ? n.material : [n.material]) fn(m, n); });
const visible = node => { for (let n = node; n; n = n.parent) if (!n.visible) return false; return true; };

function fixture() {
    const scope = new Group(), architecture = sources[0].scene.clone(true), geometries = [];
    const filtered = removeRoomForQuartel(architecture, removeDockForHangar(architecture, removeProvisionalGreenhouse(architecture, manifest), geometries), geometries);
    const master = new MasterplanRuntime(architecture, filtered); scope.add(architecture);
    const hangar = clone(sources[1].scene); hangar.name = 'Hangar';
    const hangarRuntime = new HangarRuntime(hangar, sources[1].animations);
    const placement = new Group(); placement.position.set(HANGAR.placement.x, HANGAR.placement.y, HANGAR.placement.z); placement.add(hangar); scope.add(placement);
    const green = sources[2].scene.clone(true); green.name = 'Greenhouse';
    const greenRuntime = new GreenhouseRuntime(green, greenManifest); scope.add(green);
    const props = createDeckProps(sources[3].scene); scope.add(props);
    const ares = sources[4].scene.clone(true), deck = sources[5].scene.clone(true), privateAres = [];
    for (const root of [ares, deck]) eachMaterial(root, () => {});
    for (const root of [ares, deck]) root.traverse(n => {
        if (!n.isMesh) return;
        const own = m => { const c = m.clone(); privateAres.push(c); return c; };
        n.material = Array.isArray(n.material) ? n.material.map(own) : own(n.material);
    });
    ares.name = 'MarsARES'; ares.position.set(.72, .012, 33.52);
    deck.name = 'MarsARESDeck'; deck.position.set(0, 0, 33); scope.add(ares, deck);
    const quartel = sources[6].scene.clone(true), qRoot = new Group(); qRoot.name='Quartel'; qRoot.position.set(QUARTEL.placement.x,0,0); qRoot.rotation.y=QUARTEL.placement.rotationY; qRoot.add(quartel); scope.add(qRoot);
    const quartelRuntime = new QuartelRuntime(quartel,sources[6].animations);
    const targets = sandwindTargets(scope, architecture, filtered);
    const install = () => new SandwindController(scope, sources.map(s => s.scene), targets, SRGBColorSpace);
    const update = (p, dt) => { master.update(p, dt); greenRuntime.update(p, dt); hangarRuntime.update(p, dt); quartelRuntime.update(p,dt); };
    const dispose = () => { master.dispose(); quartelRuntime.dispose(); greenRuntime.dispose(); hangarRuntime.dispose(); geometries.forEach(g => g.dispose()); privateAres.forEach(m => m.dispose()); };
    return { scope, architecture, master, quartel, quartelRuntime, qRoot, hangar, hangarRuntime, green, greenRuntime, props, ares, deck, targets, install, update, dispose };
}

test('Sandwind v007: prédios, telhados, portas, estufa, ARES e DeckProps recebem pais completos sem mudar transforms', () => {
    const f = fixture(); f.scope.updateMatrixWorld(true);
    const matrices = new Map(); f.scope.traverse(n => matrices.set(n, n.matrixWorld.clone()));
    const originalChildren = f.architecture.children.slice();
    const controller = f.install(); f.scope.updateMatrixWorld(true);
    for (const [node, matrix] of matrices) assert.ok(node.matrixWorld.equals(matrix), node.name);
    for (const id of ['hangar', 'greenhouse', 'deck-props', 'ares', 'room_brand-brain', 'quartel']) assert.ok(f.scope.getObjectByName(`SandwindDistance_${id}`), id);
    controller.update(200, 200, .2, settings, false);
    for (let i = 0; i < 60; i++) {
        f.update({ x: 0, z: 0 }, 1/60);
        controller.update(200, 200, 1/60, settings, false);
        for (const root of [f.hangar, f.green, f.props, f.ares, f.deck, f.qRoot]) {
            assert.equal(root.visible, true, 'Sandwind não escreve nos filhos');
            assert.equal(visible(root), false, root.name);
        }
    }
    f.greenRuntime.setState('ONLINE'); f.hangarRuntime.setDeparture(true);
    f.update({ x: 0, z: 15.8 }, 1/60);
    assert.equal(visible(f.green), false); assert.equal(visible(f.hangar), false);
    assert.equal(f.hangar.getObjectByName('HangarFloorBridge').parent, f.hangar);
    controller.update(0, 20, .2, settings, false);
    for (const root of [f.hangar, f.green, f.props, f.ares, f.deck, f.qRoot]) assert.equal(visible(root), true, root.name);
    controller.dispose();
    assert.deepEqual(f.architecture.children, originalChildren);
    for (const root of [f.hangar, f.green, f.props, f.ares, f.deck, f.qRoot]) assert.ok(!root.parent.name.startsWith('SandwindDistance'));
    f.dispose();
});

test('Sandwind v007: descarte não reinicia nem rompe fade de telhado em andamento', () => {
    const f = fixture(), baseline = fixture(), controller = f.install();
    const roof = f.hangar.getObjectByName('TETO_Hangar');
    for (let i = 0; i < 6; i++) { f.update({ x: 0, z: 15.8 }, 1/60); baseline.update({ x: 0, z: 15.8 }, 1/60); }
    assert.ok(roof.material.opacity > .01 && roof.material.opacity < .9);
    controller.update(200, 200, .2, settings, false);
    for (let i = 0; i < 50; i++) {
        const p = i < 15 ? { x: 0, z: 15.8 } : { x: 0, z: 28 };
        f.update(p, 1/60); baseline.update(p, 1/60);
        assert.equal(roof.material.opacity, baseline.hangar.getObjectByName('TETO_Hangar').material.opacity);
        assert.equal(roof.visible, baseline.hangar.getObjectByName('TETO_Hangar').visible);
        assert.equal(visible(f.hangar), false);
    }
    controller.update(0, 20, .2, settings, false);
    assert.equal(visible(f.hangar), true);
    assert.equal(roof.material.opacity, baseline.hangar.getObjectByName('TETO_Hangar').material.opacity);
    controller.dispose(); f.dispose(); baseline.dispose();
});

test('Sandwind v007: materiais finais privados, vãos pretos e estados preservam identidade, opacidade e emissão', () => {
    const f = fixture(), before = new Map(); eachMaterial(f.scope, m => before.set(m, [m.opacity, m.emissiveIntensity]));
    const roofMaterial = f.hangar.getObjectByName('TETO_Hangar').material;
    const black = f.hangar.getObjectByName('HangarMesh').material[1];
    const controller = f.install();
    assert.equal(f.hangar.getObjectByName('TETO_Hangar').material, roofMaterial);
    assert.equal(f.hangar.getObjectByName('HangarMesh').material[1], black);
    assert.equal(black.color.getHex(), 0x050505); assert.equal(black.emissiveIntensity, before.get(black)[1]);
    const shared = new Set(); for (const source of sources) eachMaterial(source.scene, m => shared.add(m));
    eachMaterial(f.scope, m => {
        assert.ok(!shared.has(m), m.name);
        const shader = { uniforms: {}, vertexShader: '#include <project_vertex>', fragmentShader: '#include <fog_fragment>' };
        m.onBeforeCompile(shader, {});
        assert.equal(shader.uniforms.swCenter, controller.uniforms.swCenter, m.name);
        if (before.has(m)) { assert.equal(m.opacity, before.get(m)[0]); assert.equal(m.emissiveIntensity, before.get(m)[1]); }
    });
    f.greenRuntime.setState('ONLINE'); f.update({ x: 50, z: 50 }, 1/60);
    assert.equal(f.green.userData.operationalState, 'ONLINE');
    f.hangarRuntime.setDeparture(true); f.update({ x: 50, z: 50 }, 1/60);
    assert.equal(f.hangarRuntime.status.alert, true);
    assert.notEqual(f.hangar.getObjectByName('HangarMesh').material[0].emissiveIntensity, before.get(f.hangar.getObjectByName('HangarMesh').material[0])[1]);
    controller.dispose(); f.dispose();
});

test('Sandwind v007: callbacks de shader/cache existentes são encadeados e restaurados', () => {
    const scope = new Group(), material = new MeshStandardMaterial(), mesh = new Mesh(new BoxGeometry(), material);
    let calls = 0; const compile = shader => { calls++; shader.vertexShader = '// anterior\n' + shader.vertexShader; };
    const key = () => 'chave-anterior'; material.onBeforeCompile = compile; material.customProgramCacheKey = key; scope.add(mesh);
    const controller = new SandwindController(scope, [], [{ id: 'private', nodes: [mesh] }], SRGBColorSpace);
    const shader = { uniforms: {}, vertexShader: '#include <project_vertex>', fragmentShader: '#include <fog_fragment>' };
    mesh.material.onBeforeCompile(shader, {}); assert.equal(calls, 1); assert.match(shader.vertexShader, /anterior/);
    assert.match(mesh.material.customProgramCacheKey(), /chave-anterior:exoden-sandwind-v007/);
    controller.dispose(); assert.equal(material.onBeforeCompile, compile); assert.equal(material.customProgramCacheKey, key);
});

test('Sandwind v007: caixa completa protege prédio grande, terreno e passarelas fora dos gates', () => {
    const f = fixture(), controller = f.install();
    const gate = f.scope.getObjectByName('SandwindDistance_hangar');
    controller.update(HANGAR.bridge.maxX, (HANGAR.bridge.minZ + HANGAR.bridge.maxZ) / 2, .2, settings, false);
    assert.equal(gate.visible, true);
    for (const part of manifest.parts.filter(p => (p.papel === 'floor' || p.id === 'TER_Solo') && p.ambiente !== 'design')) {
        const node = f.architecture.children.find(n => n.userData.id_estavel === part.id);
        assert.ok(node, part.id); assert.equal(node.parent, f.architecture);
    }
    controller.dispose(); f.dispose();
});

test('Sandwind v007: três ciclos de montagem/viagem não acumulam patches ou clones; cache sem Sandwind', () => {
    const callbacks = new Map(); for (const source of sources) eachMaterial(source.scene, m => callbacks.set(m, m.onBeforeCompile));
    for (let cycle = 0; cycle < 3; cycle++) {
        const f = fixture(), controller = f.install();
        assert.equal(sandwindResources.controllers, 1);
        assert.equal(sandwindResources.patches, controller.stats.materials);
        assert.equal(sandwindResources.clones, controller.stats.clones);
        controller.update(200, 200, .2, settings, false); f.update({ x: 0, z: 15.8 }, 1/60);
        // Também suporta o cleanup dos runtimes antes do efeito passivo React.
        if (cycle % 2) { f.dispose(); controller.dispose(); } else { controller.dispose(); f.dispose(); }
        controller.dispose();
        assert.equal(sandwindResources.controllers, 0); assert.equal(sandwindResources.patches, 0); assert.equal(sandwindResources.clones, 0);
        for (const [m, callback] of callbacks) assert.equal(m.onBeforeCompile, callback);
    }
});

test('Sandwind v007: caminho desativado preserva contratos visuais e está restrito a Marte na integração', () => {
    const f = fixture(), baseline = fixture(), controller = f.install();
    controller.update(200, 200, .2, { ...settings, enabled: false }, false);
    for (let i = 0; i < 90; i++) { f.update({ x: 0, z: 15.8 }, 1/60); baseline.update({ x: 0, z: 15.8 }, 1/60); }
    assert.equal(controller.stats.hidden, 0);
    assert.deepEqual(f.hangarRuntime.status, baseline.hangarRuntime.status);
    assert.equal(f.hangar.getObjectByName('TETO_Hangar').material.opacity, baseline.hangar.getObjectByName('TETO_Hangar').material.opacity);
    const integration = fs.readFileSync('src/scene/marsColony/MarsColony.tsx', 'utf8');
    assert.match(integration, /return preview \?/); assert.match(integration, /: visuals/);
    assert.match(fs.readFileSync('src/scene/OfficeScene.tsx', 'utf8'), /map === 'mars' \? <MarsColony/);
    controller.dispose(); f.dispose(); baseline.dispose();
});

test('Sandwind v007: poses de QA exigem três flags e não alteram sessão fora de Marte caminhando', () => {
    const { sandwindQAEnabled, sandwindQAPose } = loadSource('src/scene/marsColony/sandwindQA.ts');
    const { useExpeditionStore } = loadSource('src/state/useExpeditionStore.ts');
    const { useGameStore } = loadSource('src/state/useGameStore.ts');
    const state = useExpeditionStore.getState(), game = useGameStore.getState();
    const query = '?sandwindPreview&perf&sandwindQA';
    assert.equal(sandwindQAEnabled('?perf&sandwindQA'), false);
    assert.equal(sandwindQAEnabled('?sandwindPreview&perf'), false);
    try {
        useExpeditionStore.setState({ ready: true, session: { map: 'mars', phase: 'walking', destination: null, revision: 10 } });
        assert.equal(sandwindQAPose('?sandwindPreview', 'deck'), false);
        assert.equal(sandwindQAPose(query, 'deck'), true);
        assert.equal(useExpeditionStore.getState().spawn.z, 29.5);
        assert.equal(useExpeditionStore.getState().session.revision, 11);
        assert.equal(useGameStore.getState().nearShip, true);
        assert.equal(sandwindQAPose('?perf&sandwindQA','quartel'),false);
        assert.equal(sandwindQAPose(query,'quartel'),true);
        assert.deepEqual(useExpeditionStore.getState().spawn,{x:12,y:.2625,z:0});
        assert.equal(useGameStore.getState().nearShip, false);
        assert.equal(sandwindQAPose('?perf&sandwindQA','bathroom-inside'),false);
        assert.equal(sandwindQAPose(query,'bathroom-inside'),true);
        assert.deepEqual(useExpeditionStore.getState().spawn,{x:15.225,y:.2625,z:2.9});
        useExpeditionStore.setState({ session: { map: 'shanghai', phase: 'walking', destination: null, revision: 12 } });
        assert.equal(sandwindQAPose(query, 'plaza'), false);
        assert.equal(useExpeditionStore.getState().session.revision, 12);
    } finally { useExpeditionStore.setState(state, true); useGameStore.setState(game, true); }
});

test('Quartel/Sandwind: fade, portas e caixas de colisão continuam sob descarte do pai, com material privado final',()=>{
 const f=fixture(),baseline=fixture(),roof=f.quartel.getObjectByName('Building_Roof'),original=sources[6].scene.getObjectByName('Building_Roof').material;
 const material=roof.material,controller=f.install();assert.equal(roof.material,material);assert.notEqual(material,original);
 for(let i=0;i<6;i++){f.update({x:10.5,z:0},1/60);baseline.update({x:10.5,z:0},1/60);}
 assert.ok(material.opacity>.01&&material.opacity<.9);
 for(let i=0;i<60;i++){
  const p=i<15?{x:10.5,z:0}:i<30?{x:6.75,z:0}:i<45?{x:13.125,z:2.9}:{x:0,z:0};
  controller.update(i%2?200:10.5,i%2?200:0,.2,settings,false);
  f.update(p,1/60);baseline.update(p,1/60);
  assert.deepEqual(f.quartelRuntime.status,baseline.quartelRuntime.status);
  assert.deepEqual(f.quartelRuntime.motions,baseline.quartelRuntime.motions);
  assert.equal(material.opacity,baseline.quartel.getObjectByName('Building_Roof').material.opacity);
  assert.equal(roof.visible,baseline.quartel.getObjectByName('Building_Roof').visible);
 }
 assert.equal(original.opacity,1);
 const shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <fog_fragment>'};material.onBeforeCompile(shader,{});assert.equal(shader.uniforms.swCenter,controller.uniforms.swCenter);
 controller.dispose();f.dispose();baseline.dispose();
});
