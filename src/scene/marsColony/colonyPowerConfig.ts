import { COLONY_BUILDINGS } from '../../game/colonyBuildingsLayout';
import { CONTROL_ROOM } from '../../game/controlRoomLayout';
import { HANGAR } from '../../game/hangarLayout';
import { LABORATORIO } from '../../game/laboratorioLayout';
import { QUARTEL } from '../../game/quartelLayout';
import greenhouse from '../../assets/greenhouse/greenhouse-v001.manifest.json';

const roof = (id: string) => COLONY_BUILDINGS.find(building => building.id === id)!.roofArea;

export const COLONY_POWER = {
    'control-room': { flag: 'edenActive', delay: 1.5, bounds: CONTROL_ROOM.roofArea, ceiling: 2.55, initial: 0 },
    'data-center': { flag: 'edenActive', delay: 2.1, bounds: roof('data-center'), ceiling: 2.55, initial: 1 },
    'meeting-room': { flag: 'edenActive', delay: 2.7, bounds: roof('meeting-room'), ceiling: 2.55, initial: 0 },
    barracks: { flag: 'edenActive', delay: 3.3, bounds: QUARTEL.roofArea, ceiling: 2.6, initial: 0 },
    workshop: { flag: 'edenActive', delay: 3.3, bounds: roof('workshop'), ceiling: 2.55, initial: 1 },
    hangar: { flag: 'edenActive', delay: 3.3, bounds: HANGAR.walkableAreas[0], ceiling: 3.45, initial: 0.16 },
    laboratory: { flag: 'synthesizerActive', delay: 2.2, bounds: LABORATORIO.roofArea, ceiling: 2.65, initial: 0 },
    greenhouse: { flag: 'synthesizerActive', delay: 3, bounds: greenhouse.walkableAreas[0], ceiling: 2.5, initial: 0 },
    cafeteria: { flag: 'synthesizerActive', delay: 3.8, bounds: roof('cafeteria'), ceiling: 2.55, initial: 0 }
} as const;

export type PoweredBuilding = keyof typeof COLONY_POWER;
export type ActivationKind = 'edenActive' | 'synthesizerActive';
export const ACTIVATION_DURATION = { edenActive: 4.4, synthesizerActive: 5 } as const;
export const POWER_RAMP = 1;
/** Luz branca de teto aplicada pelo material: o piso (normal para cima) recebe base + floor.
 * Referência externa em Marte: hemisférica 0,35 + sol rasante ≈ 0,57 no chão. */
export const INTERIOR_LIGHT = { color: '#f4f8ff', emergency: '#ff5836', base: 1.4, floor: 1.6, floorGamma: .45, hemisphere: .28, characters: 6, character: .9 } as const;
/** Sinais externos de funcionamento. Pontos locais ao GLB; a cena aplica a implantação do prédio. */
/** Boca da chaminé cilíndrica do telhado (Building_Roof: x 2,61–3,19; z −2,10…−1,50; topo 4,41), indicada pelo autor. */
export const WORKSHOP_SMOKE = { local: { x: 2.9, y: 4.43, z: -1.8 }, puffs: 26, rise: 4.2, life: 6, drift: { x: 1.3, z: .5 }, size: 2.3, color: '#c4b8b0', opacity: .5 } as const;
/** Cabo_Solar_Data do masterplan v007: da fazenda solar até a parede norte do Data Center. */
export const SOLAR_CURRENT = { x: -14.5, y: .12, fromZ: -9.3, toZ: -5.6, width: .5, pulses: 3, speed: 1.8, color: '#63f3ff' } as const;
