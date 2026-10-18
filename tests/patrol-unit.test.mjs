import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { AnimationClip, BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { loadSource } from './load-source.mjs';

const { nextPatrolUnitClip, walkTimeScale, PatrolUnitRig, PATROL_UNIT, PLAYER_HEIGHT, PATROL_UNIT_MODEL_HEIGHT } = loadSource('src/combat/patrolUnit.ts');
const { COMBAT } = loadSource('src/combat/config.ts');

test('S6.1: Patrol Unit do autor entra sem alteração, com os clipes e o orçamento do modelo', () => {
    const bytes = fs.readFileSync('src/assets/enemies/patrol-unit.glb');
    // Mesmo arquivo de art-source/patrol-unit/export/patrol_unit_shanghai_v001.glb (checkout principal).
    assert.equal(createHash('sha256').update(bytes).digest('hex'), 'c01d3ea675c0bd10bee6ac4b45df59c3fd289f343ebb337c4bfd495412b339ad');
    const j = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    assert.deepEqual(j.animations.map(a => a.name).sort(), ['AggressiveLunge', 'DamagedDeath', 'Idle', 'PatrolWalk', 'ShockAttack']);
    assert.equal(j.skins[0].joints.length, 24);
    assert.equal(j.meshes.length, 1);
    assert.equal(j.meshes[0].primitives.length, 1, 'uma draw call por robô');
    const primitive = j.meshes[0].primitives[0];
    assert.ok(j.accessors[primitive.indices].count / 3 <= 10000, 'até 10 mil triângulos');
    const pos = j.accessors[primitive.attributes.POSITION];
    const height = pos.max[1] - pos.min[1];
    assert.ok(Math.abs(height - 1.49) < 0.02 && Math.abs(pos.min[1]) < 0.01, `1,49 m, pés em y = 0 (${height})`);
    assert.ok(Math.abs(height - PATROL_UNIT_MODEL_HEIGHT) < 0.005);
    // Pedidos do autor: 1/3 maior que o Explorador (1,50 m) e mais 1/3 → 2,67 m.
    assert.ok(Math.abs(height * PATROL_UNIT.scale - PLAYER_HEIGHT * 16 / 9) < 0.01, `altura no jogo ${(height * PATROL_UNIT.scale).toFixed(3)} m`);
});

test('S6.1: clipe pelo estado publicado pela simulação, com histerese e cadência pela velocidade', () => {
    assert.equal(nextPatrolUnitClip('Idle', { alive: true, speed: 0.2, attacking: false }), 'Idle');
    assert.equal(nextPatrolUnitClip('Idle', { alive: true, speed: 0.35, attacking: false }), 'PatrolWalk');
    assert.equal(nextPatrolUnitClip('PatrolWalk', { alive: true, speed: 0.2, attacking: false }), 'PatrolWalk', 'histerese');
    assert.equal(nextPatrolUnitClip('PatrolWalk', { alive: true, speed: 0.1, attacking: false }), 'Idle');
    assert.equal(nextPatrolUnitClip('PatrolWalk', { alive: true, speed: 1.6, attacking: true }), 'AggressiveLunge');
    assert.equal(nextPatrolUnitClip('AggressiveLunge', { alive: false, speed: 0, attacking: true }), 'DamagedDeath');
    assert.equal(walkTimeScale(COMBAT.robot.speed), 1, 'velocidade do robô = clipe a 1×');
    assert.equal(walkTimeScale(0.1), PATROL_UNIT.walkRate[0]);
    assert.equal(walkTimeScale(9), PATROL_UNIT.walkRate[1]);
});

test('S6.1: rig por robô anda, ataca no contato, morre e some; flash e alerta só no material próprio', () => {
    const source = new Group();
    const shared = new MeshStandardMaterial({ color: '#808080' });
    source.add(new Mesh(new BoxGeometry(1, 1.5, 0.6), shared));
    const clips = ['Idle', 'PatrolWalk', 'AggressiveLunge', 'DamagedDeath'].map(name => new AnimationClip(name, 1, []));
    const rig = new PatrolUnitRig(source, clips);
    assert.equal(rig.root.scale.x, PATROL_UNIT.scale);
    const material = rig.root.children[0].material;
    assert.notEqual(material, shared, 'cache do GLTF intacto');
    const robot = { x: 0, z: 0, hp: 75, flash: 0, alerted: false };
    const dt = 1 / 60;
    for (let i = 0; i < 30; i++) { robot.z += COMBAT.robot.speed * dt; rig.update(robot, 20, 20, COMBAT.robot.contactRange, dt); }
    assert.equal(rig.clip, 'PatrolWalk');
    robot.alerted = true;
    rig.update(robot, robot.x, robot.z + COMBAT.robot.contactRange - 0.1, COMBAT.robot.contactRange, dt);
    assert.equal(rig.clip, 'AggressiveLunge');
    assert.deepEqual(material.emissive.toArray(), PATROL_UNIT.alertTint.toArray());
    robot.flash = 0.1;
    rig.update(robot, 20, 20, COMBAT.robot.contactRange, dt);
    assert.ok(Math.abs(material.color.r - shared.color.r * PATROL_UNIT.flashColor) < 1e-6);
    assert.equal(shared.color.getHexString(), '808080');
    robot.hp = 0; robot.flash = 0;
    rig.update(robot, 20, 20, COMBAT.robot.contactRange, dt);
    assert.equal(rig.clip, 'DamagedDeath');
    assert.equal(rig.visible, true, 'fica no chão durante a morte');
    for (let t = 0; t < PATROL_UNIT.deathVisible + 0.1; t += dt) rig.update(robot, 20, 20, COMBAT.robot.contactRange, dt);
    assert.equal(rig.visible, false);
    rig.dispose();
});

test('S6.1: CombatScene troca as caixas pelo Patrol Unit sem mudar a simulação', () => {
    const scene = fs.readFileSync('src/combat/CombatScene.tsx', 'utf8');
    assert.match(scene, /new PatrolUnitRig\(patrolUnit\.scene, patrolUnit\.animations\)/);
    assert.match(scene, /<primitive object=\{rigs\[i\]\.root\}\/>/);
    assert.doesNotMatch(scene, /boxGeometry args=\{\[0\.65, 0\.85, 0\.45\]\}/, 'corpo provisório removido');
});
