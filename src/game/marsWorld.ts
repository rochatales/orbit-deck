import { addControlRoomTerrain, retainControlRoomCollider } from './controlRoomLayout';
import { addLaboratorioTerrain, retainLaboratorioCollider, retainLaboratorioFloor } from './laboratorioLayout';
import { addQuartelTerrain, retainQuartelCollider, retainQuartelFloor } from './quartelLayout';
import { addHangarTerrain, retainColonyCollider, retainColonyFloor } from './hangarLayout';
import { Group } from 'three';
import type { OfficeWorld } from '../world/createOfficeMap';
import { MAPS } from './config';
import { addMarsLanding } from './marsLanding';
import manifest from '../assets/colony-v007.manifest.json';
import greenhouse from '../assets/greenhouse/greenhouse-v001.manifest.json';

/** Pisos exatos e colisores retangulares do mesmo masterplan usado no Blender.
 * Não instancia a arquitetura nem os obstáculos antigos de createOfficeMap.
 */
export function createWorld(): OfficeWorld {
    const world: OfficeWorld = {
        group: new Group(),
        bounds: { ...MAPS.mars.bounds },
        obstacles: [...manifest.colliders.filter(retainColonyCollider).filter(retainQuartelCollider).filter(retainLaboratorioCollider).filter(retainControlRoomCollider), ...greenhouse.colliders].map(({ minX, maxX, minZ, maxZ }) => ({ minX, maxX, minZ, maxZ })),
        walkableAreas: manifest.walkableAreas.filter(retainColonyFloor).filter(retainQuartelFloor).filter(retainLaboratorioFloor).map(({ minX, maxX, minZ, maxZ }) => ({ minX, maxX, minZ, maxZ })),
        update: () => {}
    };
    addHangarTerrain(world);
    addMarsLanding(world);
    addQuartelTerrain(world);
    addLaboratorioTerrain(world);
    addControlRoomTerrain(world);
    return world;
}
