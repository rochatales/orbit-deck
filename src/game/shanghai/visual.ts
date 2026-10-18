import { Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import assetUrl from '../../assets/shanghai-fase01/shanghai-fase01.glb';
import type { OfficeWorld } from '../../world/createOfficeMap';
import { disposeWorld } from '../worldUtils';
/** Recursos próprios por carregamento; nunca compartilha/dispose o cache de personagens. */
export async function loadPhase01Visual(world: OfficeWorld, cancelled: () => boolean) {
    const gltf = await new GLTFLoader().loadAsync(assetUrl);
    if (cancelled()) {
        disposeWorld({ ...world, group: gltf.scene });
        return;
    }
    gltf.scene.traverse(o => { if (o instanceof Mesh) { o.castShadow = true; o.receiveShadow = true; } });
    gltf.scene.name = 'ShanghaiFase01Visual';
    world.group.add(gltf.scene);
}
