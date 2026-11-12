import test from 'node:test';
import assert from 'node:assert/strict';
import { createSourceLoader } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';

test('S5.3: monitores de pé e telas ligadas depois da sala, com estado final ao retomar', async () => {
    const storage = new Map();
    globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
    const load = createSourceLoader(), folder = 'src/scene/marsColony/';
    const { bindControlRoomScreens } = load(folder + 'controlRoomScreens.ts');
    const { beginActivation, advanceActivation, finishActivation, buildingPower } = load(folder + 'activationSequence.ts');
    const { useCampaignStore } = load('src/state/useCampaignStore.ts');
    const campaign = useCampaignStore.getState();
    campaign.startCampaign({ displayName: 'Telas QA', color: '#abcdef' });
    campaign.dispatch('finish-engineer-briefing');
    campaign.depositExpedition({ id: 'cobre', copper: 4, organic: 0 });
    campaign.dispatch('finish-copper-expedition');
    campaign.dispatch('finish-engineer-return-briefing');

    const asset = await loadGlb('src/assets/control-room/control-room-v002.glb');
    const scene = asset.scene.clone(true), desk = scene.getObjectByName('PROP_Control_Consoles_N');
    const source = desk.geometry, original = source.getAttribute('position');
    const screens = bindControlRoomScreens(scene), display = scene.getObjectByName('ControlRoomScreens');
    try {
        assert.notEqual(desk.geometry, source);
        const upright = desk.geometry.getAttribute('position'), normal = desk.geometry.getAttribute('normal');
        const turned = [];
        for (let i = 0; i < upright.count; i++) {
            if (Math.abs(upright.getY(i) - original.getY(i)) > .0001) turned.push(i);
        }
        assert.ok(turned.length > 100);
        for (const i of turned) {
            assert.ok(Math.abs(normal.getY(i)) < .0001 || Math.abs(normal.getY(i)) > .9999);
        }
        const surfaces = display.geometry.getAttribute('position');
        assert.equal(surfaces.count, 52);
        // Vidro e suporte ficam sobre o tampo, e a face emissiva acompanha o vidro.
        for (const center of [.42, 1.2, 1.98]) {
            let front = -Infinity, feet = 0;
            for (let i = 0; i < upright.count; i++) {
                const x = original.getX(i), y = original.getY(i), z = original.getZ(i);
                if (Math.abs(Math.abs(x - center) - .07) < .0001 && Math.abs(y - 1.11) < .0001
                    && Math.abs(Math.abs(z + 2.34) - .045) < .0001) {
                    assert.ok(Math.abs(upright.getZ(i) - (z - .25)) < .0001);
                    feet++;
                }
                if (Math.abs(x - center) <= .321 && upright.getY(i) > 1.2)
                    front = Math.max(front, upright.getZ(i) + desk.position.z);
            }
            assert.ok(feet > 0);
            assert.ok(front < -12.97, 'o vidro recuado deixa espaço até a borda do tampo em -12,8');
            const i = [.42, 1.2, 1.98].indexOf(center) * 4;
            assert.ok(Math.abs(surfaces.getZ(i) - front - .002) < .0001);
        }
        assert.ok(display.material.isMeshStandardMaterial);
        const update = () => screens.update(buildingPower('control-room', true, useCampaignStore.getState().saved.campaign.edenActive));
        update();
        assert.equal(display.material.emissiveIntensity, 0);
        campaign.dispatch('activate-eden');
        beginActivation('edenActive', false);
        advanceActivation(1.95);
        assert.ok(buildingPower('control-room', true, true) > 0);
        update();
        assert.equal(display.material.emissiveIntensity, 0);
        advanceActivation(.55);
        update();
        assert.ok(display.material.emissiveIntensity > 0);
        finishActivation();
        update();
        const full = display.material.emissiveIntensity;
        const reload = createSourceLoader();
        assert.equal(reload('src/state/useCampaignStore.ts').useCampaignStore.getState().saved.campaign.edenActive, true);
        const afterReload = reload(folder + 'controlRoomScreens.ts').bindControlRoomScreens(asset.scene);
        afterReload.update(reload(folder + 'activationSequence.ts').buildingPower('control-room', true, true));
        assert.equal(asset.scene.getObjectByName('ControlRoomScreens').material.emissiveIntensity, full);
        afterReload.dispose();
    } finally { screens.dispose(); }
    assert.equal(desk.geometry, source);
    assert.equal(scene.getObjectByName('ControlRoomScreens'), undefined);
});

test('S5.3: cabo de EDEN da fazenda solar à parede oeste recebe energia com a sala', () => {
    const load = createSourceLoader();
    const { SOLAR_CURRENT } = load('src/scene/marsColony/colonyPowerConfig.ts');
    const { buildingPower, beginActivation, advanceActivation } = load('src/scene/marsColony/activationSequence.ts');
    const { parts } = load('src/assets/colony-v007.manifest.json');
    const { bounds } = parts.find(part => part.id === 'Cabo_Solar_EDEN');
    const cable = SOLAR_CURRENT['control-room'];
    assert.ok(Math.abs(cable.fromX - bounds.minX) < .001 && Math.abs(cable.toX - bounds.maxX) < .001);
    assert.ok(Math.abs(cable.fromZ - (bounds.minZ + bounds.maxZ) / 2) < .001);
    assert.equal(cable.fromZ, cable.toZ);
    assert.equal(buildingPower('control-room', true, false), 0);
    beginActivation('edenActive', false);
    assert.equal(buildingPower('control-room', true, true), 0);
    advanceActivation(2);
    assert.ok(buildingPower('control-room', true, true) > 0);
    assert.equal(buildingPower('control-room', false, false), 1);
});
