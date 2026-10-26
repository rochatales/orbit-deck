import test from 'node:test';
import assert from 'node:assert/strict';
import { AnimationClip, Group } from 'three';
import { loadSource } from './load-source.mjs';
import { motionTrial } from '../docs/handoffs/s3.3-mutante-grande/complemento-26-10/motion-trial.mjs';

const { smoothEnemyHeading, ENEMY_MOTION } = loadSource('src/combat/enemyMotion.ts');
const { PatrolUnitRig } = loadSource('src/combat/patrolUnit.ts');

test('Marcha em grupo real: quatro tipos entre nove robôs sem giro abrupto ou troca rápida de locomoção', async () => {
    const report = await motionTrial('test', process.cwd(), false);
    assert.equal(report.cases.length, 4);
    for (const r of report.cases) {
        assert.equal(r.neighbors, 9);
        assert.equal(r.invalid, 0, `${r.kind}: nenhum sólido invadido`);
        assert.ok(r.maxVisualAngleDegrees <= 2.3, `${r.kind}: ${r.maxVisualAngleDegrees}° por quadro de 60 Hz`);
        assert.ok(r.minClipInterval === null || r.minClipInterval >= 1 - 1e-8, `${r.kind}: intervalo ${r.minClipInterval}`);
        assert.ok(r.locomotionChanges > 0, `${r.kind}: começa a andar, em vez de mascarar o problema em Idle`);
    }
});

test('Rumo visual limita velocidade em 30/60/144 Hz, cruza ±PI pelo lado curto e congela na pausa', () => {
    for (const hz of [30, 60, 144]) {
        let angle = 0;
        for (let frame = 0; frame < hz * 2; frame++) {
            const next = smoothEnemyHeading(angle, Math.PI / 2, 1 / hz);
            assert.ok(Math.abs(next - angle) <= ENEMY_MOTION.yawRate / hz + 1e-9);
            angle = next;
        }
        assert.ok(Math.abs(angle - Math.PI / 2) < .03);
        assert.equal(smoothEnemyHeading(angle, -Math.PI / 2, 0), angle);
    }
    const nearPi = Math.PI - .05;
    assert.ok(smoothEnemyHeading(nearPi, -Math.PI + .05, 1 / 60) > nearPi);
});

function rigFixture() {
    const clips = ['Idle', 'PatrolWalk', 'ChaseRun', 'AggressiveLunge', 'DamagedDeath'].map(name => new AnimationClip(name, 1, []));
    return new PatrolUnitRig(new Group(), clips, 'largeMutant');
}

test('Filtro não oscila entre andar/Idle com passos bloqueados alternados; ataque e morte permanecem imediatos', () => {
    const rig = rigFixture(), dt = 1 / 60;
    const r = { x: 0, z: 0, hp: 280, flash: 0, alerted: true, angle: 0 };
    rig.update(r, 100, 100, 2.06, dt);
    for (let f = 0; f < 120; f++) {
        if (f % 2) r.z += 2.2 * dt;
        rig.update(r, 100, 100, 2.06, dt);
        if (f > 20) assert.equal(rig.clip, 'ChaseRun');
    }
    const speed = rig.visualSpeed, angle = rig.visualAngle, time = rig.actions.get(rig.clip).time;
    r.angle = Math.PI;
    rig.update(r, 100, 100, 2.06, 0);
    assert.equal(rig.visualSpeed, speed);
    assert.equal(rig.visualAngle, angle);
    assert.equal(rig.actions.get(rig.clip).time, time);
    rig.update(r, r.x, r.z, 2.06, dt);
    assert.equal(rig.clip, 'AggressiveLunge');
    r.hp = 0;
    rig.update(r, 100, 100, 2.06, dt);
    assert.equal(rig.clip, 'DamagedDeath');
    rig.respawn(); r.hp = 280; r.x = 45; r.z = -45; r.angle = -2;
    rig.update(r, 100, 100, 2.06, dt);
    assert.equal(rig.clip, 'Idle');
    assert.equal(rig.visualAngle, -2);
    assert.equal(rig.visualSpeed, 0, 'teleporte de respawn não vira velocidade');
    rig.dispose();
});

test('Parada sustentada volta a Idle e cessa passos sem herdar a cadência da marcha', () => {
    const rig = rigFixture(), dt = 1 / 60;
    const r = { x: 0, z: 0, hp: 280, flash: 0, alerted: true, angle: 0 };
    for (let f = 0; f < 120; f++) { r.z += 2.2 * dt; rig.update(r, 100, 100, 2.06, dt); }
    for (let f = 0; f < 120; f++) rig.update(r, 100, 100, 2.06, dt);
    assert.equal(rig.clip, 'Idle');
    assert.equal(rig.stepSound, false);
    assert.ok(rig.visualSpeed < .001);
    rig.dispose();
});
