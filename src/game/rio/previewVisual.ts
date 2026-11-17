import { Group, Mesh, type Material } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import mapUrl from '../../assets/rio-fase01/rio-fase01.glb';
import limitsUrl from '../../assets/rio-fase01/rio-limites-v003.glb';
import type { OfficeWorld } from '../../world/createOfficeMap';
import { BuildingFade } from '../shanghai/buildingFade';
import { disposeWorld } from '../worldUtils';
import { createRioTerrain, RIO_LAYOUT } from './layout';
import { attachRioWater } from './world';
import { buildRioCoastalWater } from './waterVisual';

import { removeRioStaticCoast } from './previewCoast';

async function loadRioPreviewVisual(world: OfficeWorld) {
    const loader = new GLTFLoader();
    const [map, limits] = await Promise.allSettled([loader.loadAsync(mapUrl), loader.loadAsync(limitsUrl)]);
    if (map.status === 'rejected' || limits.status === 'rejected') {
        if (map.status === 'fulfilled') disposeWorld({ ...world, group: map.value.scene });
        if (limits.status === 'fulfilled') disposeWorld({ ...world, group: limits.value.scene });
        throw map.status === 'rejected' ? map.reason : limits.status === 'rejected' ? limits.reason : new Error('Visual do Rio indisponível');
    }
    const land = map.value.scene, border = limits.value.scene;
    world.group.add(land, border);
    land.name = 'RioV005Mapa';
    border.name = 'RioV005Limites';
    try {
        removeRioStaticCoast(world, land, border);
        world.group.traverse(object => {
            if (!(object instanceof Mesh)) return;
            object.castShadow = true;
            object.receiveShadow = true;
        });
        world.group.userData.buildingFade = new BuildingFade(land, RIO_LAYOUT.buildings);
        const coastalWater = buildRioCoastalWater(world.group);
        // O lote da praia já foi retirado. Todo o resto de 'areia' usa o mesmo grão em metros.
        const replaced = new Set<Material>();
        land.traverse(node => {
            if (node instanceof Mesh && !Array.isArray(node.material) && node.material.name === 'areia') {
                replaced.add(node.material);
                node.material = coastalWater.beachMesh.material;
            }
        });
        // O mapa é de uso exclusivo deste mundo. O loader recicla o material dentro dos lotes.
        if (replaced.size) {
            const retired = new Group();
            retired.add(new Mesh(undefined, [...replaced]));
            disposeWorld({ ...world, group: retired });
        }
        return coastalWater;
    } catch (error) {
        disposeWorld(world);
        throw error;
    }
}

export async function createWorld() {
    const world = createRioTerrain();
    return attachRioWater(world, await loadRioPreviewVisual(world));
}
