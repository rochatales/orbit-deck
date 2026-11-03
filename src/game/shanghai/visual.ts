import { createDestroyedCars, removeLegacyCars, stripCarPlate } from './propVisuals';
import carUrl from '../../assets/props/shanghai/rusted-car.glb';
import { Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import assetUrl from '../../assets/shanghai-fase01/shanghai-fase01.glb';
import aresUrl from '../../assets/ares-lander/ares-lander.glb';
import limitsUrl from '../../assets/shanghai-limites/shanghai-limites-v001.glb';
import type { OfficeWorld } from '../../world/createOfficeMap';
import { disposeWorld } from '../worldUtils';
import { prepareAresVisual, removeOldLandingPatch } from './aresVisual';
import { LimitsRuinFade, createBorderWrecks, shareMapMaterials } from './limits';
/** Recursos próprios por carregamento; nunca compartilha/dispose o cache de personagens. */
export async function loadPhase01Visual(world: OfficeWorld, cancelled: () => boolean) {
    const loader = new GLTFLoader();
    const results = await Promise.allSettled([
        loader.loadAsync(assetUrl),
        loader.loadAsync(aresUrl),
        loader.loadAsync(carUrl),
        loader.loadAsync(limitsUrl)
    ]);
    const release = () => {
        for (const result of results) if (result.status === 'fulfilled')
            disposeWorld({ ...world, group: result.value.scene });
    };
    const [map, ship, cars, limits] = results;
    if (cancelled() || map.status === 'rejected' || ship.status === 'rejected' || cars.status === 'rejected' || limits.status === 'rejected') {
        release();
        if (cancelled()) return;
        const failed = results.find(r => r.status === 'rejected');
        throw failed?.status === 'rejected' ? failed.reason : new Error('Visual de Shanghai indisponível');
    }
    try {
        removeOldLandingPatch(map.value.scene);
        removeLegacyCars(map.value.scene);
        stripCarPlate(cars.value.scene);
        prepareAresVisual(ship.value.scene);
        map.value.scene.traverse(o => { if (o instanceof Mesh) { o.castShadow = true; o.receiveShadow = true; } });
        map.value.scene.name = 'ShanghaiFase01Visual';
        shareMapMaterials(limits.value.scene, map.value.scene);
        limits.value.scene.traverse(o => { if (o instanceof Mesh) { o.castShadow = true; o.receiveShadow = true; } });
        limits.value.scene.name = 'ShanghaiLimitesVisual';
        world.group.userData.limitsRuinFade = new LimitsRuinFade(limits.value.scene);
        world.group.add(map.value.scene, ship.value.scene, createDestroyedCars(cars.value.scene, world.surfaceHeight ?? (() => 0)), limits.value.scene, createBorderWrecks(cars.value.scene));
    } catch (error) {
        release();
        throw error;
    }
}
