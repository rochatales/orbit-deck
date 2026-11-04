import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AnimationMixer, Box3, Group, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';

const GLB = 'src/assets/characters/npcs/eden-v002.glb';
const { EDEN_FIGURE_SCALE: SCALE, EdenRuntime } = loadSource('src/scene/marsColony/edenRuntime.ts');
const { CONTROL_ROOM } = loadSource('src/game/controlRoomLayout.ts');
const { EDEN } = loadSource('src/game/config.ts');
const { sandwindTargets } = loadSource('src/scene/marsColony/sandwindTargets.ts');
const eden = await loadGlb(GLB), room = await loadGlb('src/assets/control-room/control-room-v002.glb');
const skinnedMesh = scene => { let found = null; scene.traverse(node => { if (node.isSkinnedMesh) found = node; }); return found; };
const roomBox = name => new Box3().setFromObject(room.scene.getObjectByName(name));
const clipNamed = name => eden.animations.find(clip => clip.name === name);
const FAR = { x: 100, z: 100 };
const steps = (runtime, player, seconds, talking = false) => { for (let i = 0; i < seconds * 60; i++) runtime.update(player, 1 / 60, talking); };

/** Vértices por osso, para medir o que cada clipe move de fato. */
function vertexOf(mesh, bone) {
    const index = mesh.skeleton.bones.findIndex(b => b.name === bone), joints = mesh.geometry.attributes.skinIndex, weights = mesh.geometry.attributes.skinWeight;
    for (let i = 0; i < joints.count; i++) if (joints.getX(i) === index && weights.getX(i) > .99) return i;
    throw new Error(`Osso sem malha: ${bone}`);
}
function displacement(clipName, bone, time) {
    const scene = clone(eden.scene), mesh = skinnedMesh(scene), vertex = vertexOf(mesh, bone), rest = new Vector3(), posed = new Vector3();
    scene.updateMatrixWorld(true); mesh.getVertexPosition(vertex, rest);
    const mixer = new AnimationMixer(scene); mixer.clipAction(clipNamed(clipName)).play(); mixer.setTime(time);
    scene.updateMatrixWorld(true); mesh.getVertexPosition(vertex, posed);
    return posed.distanceTo(rest);
}

test('EDEN v002: asset conferido, dentro do orçamento e com os quatro clipes', () => {
    const notes = JSON.parse(fs.readFileSync('art-source/eden-control-room/notas/export_runtime.json'));
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(GLB)).digest('hex'), notes.glb_sha256);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(notes.fonte)).digest('hex'), notes.fonte_sha256);
    const mesh = skinnedMesh(eden.scene), triangles = (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
    assert.equal(triangles, 3620); assert.ok(triangles <= 10000); assert.equal(mesh.skeleton.bones.length, 27);
    assert.deepEqual(eden.animations.map(clip => clip.name).sort(), ['Comm_Alert', 'Coordinate_Telemetry', 'Heart_Surge', 'Idle_Float']);
});

test('EDEN v002: os clipes movem as peças de cada osso, não só o tronco', () => {
    // No eden_v001 só havia cinco grupos de vértices: estes deslocamentos eram zero.
    assert.ok(displacement('Coordinate_Telemetry', 'Hand_R', 1) > .1);
    assert.ok(displacement('Coordinate_Telemetry', 'Forearm_R', 1) > .05);
    assert.ok(displacement('Coordinate_Telemetry', 'Hand_L', 1) < .001, 'só o braço direito gesticula');
    assert.ok(displacement('Idle_Float', 'Winglet_Upper_L', .6) > .01);
    assert.ok(displacement('Heart_Surge', 'Heart_Core', .5) > .005);
    assert.ok(displacement('Comm_Alert', 'Winglet_Upper_R', .75) > .01);
});

test('EDEN no pedestal: flutua sobre o emissor, dentro dos anéis e abaixo do teto em todos os clipes', () => {
    const emitter = roomBox('PROP_Control_EDEN_Emissor'), rings = roomBox('PROP_Control_EDEN_Projecao'), ceiling = roomBox('TET_Control');
    const anchor = CONTROL_ROOM.hologramAnchor, ringRadius = (rings.max.x - rings.min.x) / 2;
    assert.deepEqual([anchor.x, anchor.z], [EDEN.position.x, EDEN.position.z]);
    const scene = clone(eden.scene), mesh = skinnedMesh(scene), mixer = new AnimationMixer(scene), point = new Vector3();
    const count = mesh.geometry.attributes.position.count;
    for (const clip of eden.animations) {
        const action = mixer.clipAction(clip); action.play();
        for (let t = 0; t <= clip.duration; t += clip.duration / 8) {
            mixer.setTime(t); scene.updateMatrixWorld(true);
            let top = -Infinity, bottom = Infinity, radius = 0;
            for (let i = 0; i < count; i++) {
                mesh.getVertexPosition(i, point);
                top = Math.max(top, point.y); bottom = Math.min(bottom, point.y); radius = Math.max(radius, Math.hypot(point.x, point.z));
            }
            assert.ok(anchor.y + top * SCALE < ceiling.min.y, `${clip.name} ${t}: topo ${anchor.y + top * SCALE}`);
            assert.ok(anchor.y + bottom * SCALE > emitter.max.y, `${clip.name} ${t}: base ${anchor.y + bottom * SCALE}`);
            assert.ok(radius * SCALE < ringRadius, `${clip.name} ${t}: raio ${radius * SCALE}`);
        }
        action.stop();
    }
});

test('EDEN no pedestal: mesma altura do Explorador e balão acima do halo', () => {
    const size = new Box3().setFromObject(eden.scene).getSize(new Vector3());
    assert.ok(Math.abs(size.y * SCALE - 1.48985) < .05, `${size.y * SCALE}`);
    const world = fs.readFileSync('src/interactions/WorldInteractionBubbles.tsx', 'utf8');
    const height = Number(world.match(/<NpcInteractionBubble npc=\{EDEN\} height=\{([\d.]+)\}/)[1]);
    assert.ok(height > CONTROL_ROOM.hologramAnchor.y + 1.991 * SCALE + .3, 'topo do halo girando no Idle_Float');
});

test('EDEN runtime: recebe, conversa e volta ao repouso', () => {
    const r = new EdenRuntime(clone(eden.scene), eden.animations), near = { x: EDEN.position.x, z: EDEN.position.z + 1.6 };
    steps(r, FAR, .5); assert.equal(r.status.clip, 'Idle_Float'); assert.equal(r.status.near, false);
    r.update(near, 1 / 60, false); assert.equal(r.status.clip, 'Heart_Surge');
    steps(r, near, clipNamed('Heart_Surge').duration + .1); assert.equal(r.status.clip, 'Idle_Float');
    r.update(near, 1 / 60, true); assert.equal(r.status.clip, 'Coordinate_Telemetry');
    steps(r, near, 3, true); assert.equal(r.status.clip, 'Coordinate_Telemetry', 'segue gesticulando enquanto o painel está aberto');
    r.update(near, 1 / 60, false); assert.equal(r.status.clip, 'Idle_Float');
    steps(r, near, 1); assert.equal(r.status.clip, 'Idle_Float', 'quem continua perto não é recebido de novo');
    steps(r, FAR, .1); r.update(near, 1 / 60, false); assert.equal(r.status.clip, 'Heart_Surge');
    r.dispose();
});

test('EDEN runtime: conversa aberta durante a recepção vence e termina em repouso', () => {
    const r = new EdenRuntime(clone(eden.scene), eden.animations), near = { x: EDEN.position.x, z: EDEN.position.z + 1.6 };
    r.update(near, 1 / 60, false); assert.equal(r.status.clip, 'Heart_Surge');
    r.update(near, 1 / 60, true); assert.equal(r.status.clip, 'Coordinate_Telemetry');
    r.update(near, 1 / 60, false); assert.equal(r.status.clip, 'Idle_Float');
    r.dispose();
});

test('EDEN runtime: vira para quem está na área de conversa, pelo caminho curto, e volta para a porta sul', () => {
    const scene = clone(eden.scene), r = new EdenRuntime(scene, eden.animations);
    steps(r, { x: EDEN.position.x + 2, z: EDEN.position.z }, 3); assert.ok(Math.abs(r.status.yaw - Math.PI / 2) < .01); assert.equal(scene.rotation.y, r.status.yaw);
    steps(r, { x: EDEN.position.x - .1, z: EDEN.position.z - 2 }, 3); assert.ok(Math.abs(Math.abs(r.status.yaw) - Math.PI) < .1);
    steps(r, { x: EDEN.position.x, z: EDEN.position.z - EDEN.interactionRadius - .1 }, 3); assert.ok(Math.abs(Math.sin(r.status.yaw)) < .01);
    r.dispose();
});

test('EDEN runtime: delta zero congela pose e giro', () => {
    const scene = clone(eden.scene), r = new EdenRuntime(scene, eden.animations), player = { x: EDEN.position.x + 2, z: EDEN.position.z };
    steps(r, player, .5);
    const hips = scene.getObjectByName('Hips'), position = hips.position.clone(), yaw = r.status.yaw;
    for (let i = 0; i < 30; i++) r.update(player, 0, false);
    assert.ok(hips.position.equals(position)); assert.equal(r.status.yaw, yaw);
    r.dispose();
});

test('EDEN runtime: material privado, sem alterar o cache, e descarte idempotente', () => {
    const scene = clone(eden.scene), mesh = skinnedMesh(scene), cached = skinnedMesh(eden.scene).material;
    const r = new EdenRuntime(scene, eden.animations);
    assert.notEqual(mesh.material, cached); assert.equal(mesh.material.name, cached.name);
    let disposed = 0; mesh.material.addEventListener('dispose', () => disposed++);
    r.dispose(); r.dispose();
    assert.equal(disposed, 1);
});

test('EDEN runtime: acusa GLB sem os clipes do contrato', () => {
    assert.throws(() => new EdenRuntime(clone(eden.scene), []), /sem o clipe Idle_Float/);
});

test('EDEN na cena: montada na colônia, no descarte da areia e fora dos arquivos aprovados da sala', () => {
    const colony = fs.readFileSync('src/scene/marsColony/MarsColony.tsx', 'utf8');
    assert.match(colony, /<ControlRoom\/><ControlRoomEden\/>/);
    assert.ok(!fs.readFileSync('src/scene/marsColony/ControlRoom.tsx', 'utf8').includes('Eden'));
    const scope = new Group(), figure = new Group(); figure.name = 'ControlRoomEden'; scope.add(figure);
    const target = sandwindTargets(scope, new Group(), { parts: [] }).find(item => item.id === 'control-room-eden');
    assert.deepEqual(target?.nodes, [figure]);
});
