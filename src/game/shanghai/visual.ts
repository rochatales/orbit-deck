import { Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import assetUrl from '../../assets/shanghai-fase01/shanghai-fase01.glb';
import aresUrl from '../../assets/ares-lander/ares-lander.glb';
import type { OfficeWorld } from '../../world/createOfficeMap';
import { disposeWorld } from '../worldUtils';
import { prepareAresVisual, removeOldLandingPatch } from './aresVisual';
/** Recursos próprios por carregamento; nunca compartilha/dispose o cache de personagens. */
export async function loadPhase01Visual(world: OfficeWorld, cancelled: () => boolean) {
    const loader = new GLTFLoader();
    const results = await Promise.allSettled([loader.loadAsync(assetUrl), loader.loadAsync(aresUrl)]);
    const release = () => {
        for (const result of results) if (result.status === 'fulfilled')
            disposeWorld({ ...world, group: result.value.scene });
    };
    const [map, ship] = results;
    if (cancelled() || map.status === 'rejected' || ship.status === 'rejected') {
        release();
        if (cancelled()) return;
        throw map.status === 'rejected' ? map.reason : ship.status === 'rejected' ? ship.reason : new Error('ARES indisponível');
    }
    try {
        removeOldLandingPatch(map.value.scene);
        prepareAresVisual(ship.value.scene);
        map.value.scene.traverse(o => { if (o instanceof Mesh) { o.castShadow = true; o.receiveShadow = true; } });
        map.value.scene.name = 'ShanghaiFase01Visual';
        world.group.add(map.value.scene, ship.value.scene);
    } catch (error) {
        release();
        throw error;
    }
}
