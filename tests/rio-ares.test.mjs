import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box3 } from 'three';
import { createSourceLoader } from './load-source.mjs';

test('Rio ARES: modelo oficial mantém o encaixe do desembarque na areia e oculta o impacto no asfalto', async () => {
    const load = createSourceLoader();
    const { createRioTerrain, RIO_ARES_POSITION, RIO_LAYOUT } = load('src/game/rio/layout.ts');
    const { prepareAresVisual } = load('src/game/aresVisual.ts');
    const { traversable } = load('src/combat/navigation.ts');
    const glb = readFileSync('src/assets/ares-lander/ares-lander.glb');
    const { scene } = await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '');
    const world = createRioTerrain();
    prepareAresVisual(scene, { position: RIO_ARES_POSITION, name: 'RioARES', impact: false });
    const hull = new Box3();
    scene.traverse(object => {
        if (object.userData.conjunto === 'impacto') assert.equal(object.visible, false);
        if (object.isMesh && object.userData.conjunto === 'nave') hull.union(new Box3().setFromObject(object));
    });
    const { exit, landingReservation: area } = RIO_LAYOUT;
    assert.ok(hull.min.x >= area.minX && hull.max.x <= area.maxX);
    assert.ok(hull.min.z >= area.minZ && hull.max.z <= area.maxZ);
    assert.ok(Math.abs(hull.min.y - world.supportHeight(exit.x, exit.z)) < .04);
    assert.deepEqual([RIO_ARES_POSITION.x - .72, RIO_ARES_POSITION.z - 4.02], [exit.x, exit.z]);
    assert.ok(traversable(exit, world, .32), 'pé da escada permanece acessível');
});

test('Rio ARES: poeira começa ao desembarcar, congela em pausa e termina uma vez por chegada', () => {
    const load = createSourceLoader();
    const { createWorld } = load('src/game/rio/world.ts');
    const { useGameStore } = load('src/state/useGameStore.ts');
    const { useExpeditionStore } = load('src/state/useExpeditionStore.ts');
    const world = createWorld();
    const dust = world.group.getObjectByName('RioARES_Poeira');
    const position = { x: 25, y: 0, z: 43.5 };
    assert.ok(dust.geometry.instanceCount > 0);
    const age = () => dust.material.uniforms.uAge.value;
    useExpeditionStore.setState({ ready: true, panel: 'ship', session: { map: 'rio', phase: 'aboard', revision: 0, destination: null } });
    world.update(position, .1);
    assert.equal(age(), 0);
    useExpeditionStore.setState({ panel: null, session: { map: 'rio', phase: 'walking', revision: 1, destination: null } });
    world.update(position, .1);
    assert.equal(age(), .1);
    assert.equal(dust.visible, true);
    useGameStore.setState({ isPaused: true });
    world.update(position, .1);
    assert.equal(age(), .1);
    useGameStore.setState({ isPaused: false });
    for (let step = 0; step < 45; step++) world.update(position, .1);
    assert.equal(dust.visible, false);
    const finalAge = age();
    useExpeditionStore.setState({ session: { map: 'rio', phase: 'walking', revision: 2, destination: null } });
    world.update(position, .1);
    assert.equal(age(), finalAge);
    assert.equal(dust.visible, false);
});
