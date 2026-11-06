import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { loadSource, createSourceLoader } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';
import { AnimationMixer, Box3, Vector3 } from 'three';
const { EngineerRoutine, ENGINEER, engineerIsCalm, engineerPreviewMood, engineerDoorClear } = loadSource('src/npcs/engineerRoutine.ts');
const { createWorld } = loadSource('src/game/marsWorld.ts');
const { traversable, clearSegment } = loadSource('src/combat/navigation.ts');
const { ColonyBuildingRuntime } = loadSource('src/scene/marsColony/colonyBuildingRuntime.ts');
const { COLONY_BUILDINGS } = loadSource('src/game/colonyBuildingsLayout.ts');
const far = { x: 20, z: -18 };
const file = 'src/assets/characters/npcs/engenheiro-v001.glb';
const hash = path => createHash('sha256').update(fs.readFileSync(path)).digest('hex');

test('Engenheiro: GLB próprio, dez clipes, 33 ossos e fontes preservadas pelo manifesto', async () => {
    const info = JSON.parse(fs.readFileSync('art-source/personagens/engenheiro/notas/export-v001.json'));
    assert.equal(hash(file), info.output.sha256);
    for (const s of info.sources) assert.equal(hash(`art-source/personagens/engenheiro/fontes/${s.file}`), s.sha256);
    const g = await loadGlb(file);
    assert.deepEqual(g.animations.map(a => a.name).sort(), ['Idle','Acknowledging','Yelling','Sitting','CrouchToStand','CrouchDown','Crouch','ShovedReaction','StartWalking','Walk'].sort());
    let skeleton, triangles = 0;
    g.scene.traverse(o => { if (o.isSkinnedMesh) { skeleton = o.skeleton; triangles += o.geometry.index.count / 3; } });
    assert.equal(skeleton.bones.length, 33); assert.equal(triangles, 3214);
    assert.ok(fs.statSync(file).size < 4_000_000);
    assert.ok(info.walk.speed_m_s > .7 && info.walk.speed_m_s < .9);
});

test('Engenheiro: animações reais sem deriva horizontal ou pés abaixo do piso', async () => {
    const g = await loadGlb(file), mixer = new AnimationMixer(g.scene), p = new Vector3(), box = new Box3();
    const hip = g.scene.getObjectByName('mixamorigHips') ?? g.scene.getObjectByName('mixamorig:Hips');
    assert.ok(hip);
    for (const clip of g.animations) {
        mixer.stopAllAction(); const action = mixer.clipAction(clip); action.play(); let origin;
        for (const fraction of [0, .25, .5, .75, .999]) {
            mixer.setTime(clip.duration * fraction); g.scene.updateMatrixWorld(true);
            hip.getWorldPosition(p);
            if (!origin) origin = [p.x, p.z];
            assert.ok(Math.hypot(p.x - origin[0], p.z - origin[1]) < .002, `${clip.name}: quadril sem deslocamento XZ`);
            g.scene.traverse(o => { if (o.isSkinnedMesh) o.computeBoundingBox(); });
            box.setFromObject(g.scene);
            assert.ok(box.min.y > -.015, `${clip.name}: apoio ${box.min.y}`);
            assert.ok(box.max.y < 2.7, `${clip.name}: altura ${box.max.y}`);
        }
    }
});

test('Engenheiro: Oficina/Data Center/assento com caminhos livres e loop contínuo', () => {
    const world = createWorld(), routine = new EngineerRoutine({ ...world, movingCuboids: [] }), phases = new Set();
    for (let i = 0; i < routine.paths.length; i++) {
        let prev = i === 0 ? ENGINEER.start : ENGINEER.stops[i === 1 ? 0 : i === 2 ? 1 : 2];
        for (const p of routine.paths[i]) { assert.ok(clearSegment(prev, p, world, ENGINEER.radius)); prev = p; }
    }
    for (let f = 0; f < 240 * 60; f++) {
        routine.update(1/60, far); phases.add(routine.state.phase);
        assert.ok(traversable(routine.state, world, ENGINEER.radius));
    }
    assert.ok(routine.state.cycles >= 2, `ciclos: ${routine.state.cycles}`);
    assert.deepEqual([...phases].sort(), ['walk','crouch-down','crouch','stand-up','sit'].sort());
});

test('Engenheiro: portas reais abrem para o NPC e ele não atravessa folhas fechadas', async () => {
    const world = createWorld(), routine = new EngineerRoutine(world), doors = [];
    for (const id of ['data-center','workshop']) {
        const g = await loadGlb(`src/assets/buildings/${id}.glb`);
        doors.push(new ColonyBuildingRuntime(g.scene, g.animations, COLONY_BUILDINGS.find(b => b.id === id), world.movingCuboids));
    }
    for (let f = 0; f < 240 * 60; f++) {
        for (const door of doors) door.update(far, 1/60, routine.state);
        const x = routine.state.x, z = routine.state.z;
        routine.update(1/60, far);
        if (routine.state.moving) assert.ok(engineerDoorClear({ x, z }, routine.state, world.movingCuboids, { minX:0,maxX:0,minZ:0,maxZ:0 }));
    }
    assert.ok(routine.state.cycles >= 2, `ciclos com portas: ${routine.state.cycles}`);
    doors.forEach(d => d.dispose());
});

test('Engenheiro: esbarrão uma vez por aproximação, sem dano ou deslocamento da reação', () => {
    const world = createWorld(), r = new EngineerRoutine({ ...world, movingCuboids: [] }), s = r.state;
    r.update(1/60, { x:s.x + 2, z:s.z });
    const x = s.x, z = s.z;
    r.update(1/60, { x:x + .75, z });
    assert.equal(s.animation, 'ShovedReaction');
    for (let f = 0; f < 60; f++) r.update(1/60, { x:x + .75, z });
    assert.equal(s.x, x); assert.equal(s.z, z);
    for (let f = 0; f < 5 * 60; f++) r.update(1/60, { x:x + .75, z });
    assert.equal(s.animation, 'Idle', 'não repete enquanto encostado');
    r.update(1/60, { x:x + 2, z }); r.update(1/60, { x:s.x + .75, z:s.z });
    assert.equal(s.animation, 'ShovedReaction', 'rearma depois de afastar');
});

test('Engenheiro: conversa interrompe tarefa, escolhe Yelling/Acknowledging e pausa congela', () => {
    const r = new EngineerRoutine({ ...createWorld(), movingCuboids: [] });
    for (let f = 0; f < 120; f++) r.update(1/60, far);
    const before = { x:r.state.x, z:r.state.z, phase:r.state.phase };
    r.update(1/60, far, true, false); assert.equal(r.state.animation, 'Yelling');
    for (let f = 0; f < 120; f++) r.update(1/60, far, true, true);
    assert.equal(r.state.animation, 'Acknowledging'); assert.equal(r.state.x, before.x); assert.equal(r.state.z, before.z); assert.equal(r.state.phase, before.phase);
    const paused = JSON.stringify(r.state); r.update(10, far, false, false, true); assert.equal(JSON.stringify(r.state), paused);
    for (let f = 0; f < 120; f++) r.update(1/60, far);
    assert.ok(Math.hypot(r.state.x-before.x,r.state.z-before.z) > .2);
    assert.equal(engineerIsCalm('campaign', false, true), false, 'prévia não desbloqueia campanha');
    assert.equal(engineerIsCalm('campaign', true, false), true);
    assert.equal(engineerIsCalm('development', false, null), true);
    assert.equal(engineerIsCalm('development', false, engineerPreviewMood('?engineerEden=0')), false);
});

test('Engenheiro: E valida mapa, distância e paredes e não grava/avança campanha', () => {
    const values = new Map(); globalThis.localStorage = { getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v) };
    const load = createSourceLoader(), { useExpeditionStore:s } = load('src/state/useExpeditionStore.ts'), { engineerPresence:p } = load('src/npcs/engineerPresence.ts');
    const { placePlayer } = load('src/state/playerTransient.ts');
    s.getState().enterCampaign({displayName:'QA',color:'#abcdef'}); const raw = values.get('exoden:campaign:v1');
    const world = createWorld(); Object.assign(p,{active:true,world,x:-6.1,y:0,z:6});
    s.getState().setReady(true); placePlayer({x:0,y:0,z:6}); s.getState().openEngineer(); assert.equal(s.getState().panel,null);
    placePlayer({x:-5,y:0,z:6}); s.getState().openEngineer(); assert.equal(s.getState().panel,'engineer');
    s.getState().closePanel(); assert.equal(s.getState().panel,null); assert.equal(values.get('exoden:campaign:v1'),raw);
    world.obstacles.push({minX:-5.8,maxX:-5.6,minZ:4,maxZ:8}); s.getState().openEngineer(); assert.equal(s.getState().panel,null);
    Object.assign(p,{active:false,world:null});
});

test('Interação móvel: balão e E leem a posição atual, sem registro por passo', () => {
    const { InteractionRegistry } = loadSource('src/interactions/interactionRegistry.ts'), registry = new InteractionRegistry(), point = { x:0,z:0 };
    let calls=0; const target={id:'engineer',x:0,z:0,point,radius:2,priority:30,onInteract:()=>calls++};
    const release=registry.register(target); assert.equal(registry.activate({x:1,z:0}),true);
    point.x=10; assert.equal(registry.activate({x:1,z:0}),false); assert.equal(registry.activate({x:9,z:0}),true); assert.equal(calls,2);
    release(); assert.equal(registry.select({x:9,z:0}),null);
});

test('Engenheiro: mixer e materiais próprios, descarte sem invalidar geometria compartilhada', async () => {
    const { clone } = await import('three/examples/jsm/utils/SkeletonUtils.js');
    const { EngineerRig } = loadSource('src/npcs/engineerRig.ts');
    const g = await loadGlb(file), a = new EngineerRig(clone(g.scene), g.animations), b = new EngineerRig(clone(g.scene), g.animations);
    const meshes = root => { const out=[]; root.traverse(o=>{if(o.isSkinnedMesh)out.push(o);}); return out; };
    const source=meshes(g.scene)[0], own=meshes(a.root)[0], second=meshes(b.root)[0];
    assert.notEqual(own.material, source.material); assert.notEqual(own.material, second.material); assert.equal(own.geometry, source.geometry);
    const state = { ...ENGINEER.start, y:0, angle:.5, phase:'walk', animation:'Yelling', moving:false, cycles:0 };
    for (let i=0;i<60;i++) a.update(state,1/60);
    assert.ok(a.actions.get('Yelling').time > .9); assert.equal(b.actions.get('Yelling').time,0);
    const frozen=a.actions.get('Yelling').time; a.update(state,0); assert.equal(a.actions.get('Yelling').time,frozen);
    let geometryDisposed=0, materialDisposed=0, boneTextureDisposed=0, sourceBoneDisposed=0;
    assert.notEqual(own.skeleton, source.skeleton);
    own.skeleton.computeBoneTexture(); source.skeleton.computeBoneTexture();
    own.skeleton.boneTexture.addEventListener('dispose',()=>boneTextureDisposed++);
    source.skeleton.boneTexture.addEventListener('dispose',()=>sourceBoneDisposed++);
    source.geometry.addEventListener('dispose',()=>geometryDisposed++); own.material.addEventListener('dispose',()=>materialDisposed++);
    a.dispose(); a.dispose(); assert.equal(materialDisposed,1); assert.equal(geometryDisposed,0);
    assert.equal(boneTextureDisposed,1); assert.equal(sourceBoneDisposed,0);
    b.dispose(); source.skeleton.dispose();
});
