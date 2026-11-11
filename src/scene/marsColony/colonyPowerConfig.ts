import { COLONY_BUILDINGS } from '../../game/colonyBuildingsLayout';
import { CONTROL_ROOM } from '../../game/controlRoomLayout';
import { HANGAR } from '../../game/hangarLayout';
import { LABORATORIO } from '../../game/laboratorioLayout';
import { QUARTEL } from '../../game/quartelLayout';
import greenhouse from '../../assets/greenhouse/greenhouse-v001.manifest.json';

const roof = (id: string) => COLONY_BUILDINGS.find(building => building.id === id)!.roofArea;

export const COLONY_POWER = {
    'control-room': { flag: 'edenActive', delay: 1.5, bounds: CONTROL_ROOM.roofArea, ceiling: 2.55, color: '#75e8ff', emergency: false },
    'data-center': { flag: 'edenActive', delay: 2.1, bounds: roof('data-center'), ceiling: 2.55, color: '#c5e5ff', emergency: false },
    'meeting-room': { flag: 'edenActive', delay: 2.7, bounds: roof('meeting-room'), ceiling: 2.55, color: '#e6e7ff', emergency: false },
    barracks: { flag: 'edenActive', delay: 3.3, bounds: QUARTEL.roofArea, ceiling: 2.6, color: '#e9e7cd', emergency: false },
    workshop: { flag: 'edenActive', delay: 3.3, bounds: roof('workshop'), ceiling: 2.55, color: '#ffbf80', emergency: true },
    hangar: { flag: 'edenActive', delay: 3.3, bounds: HANGAR.walkableAreas[0], ceiling: 3.45, color: '#ffe1a1', emergency: true },
    laboratory: { flag: 'synthesizerActive', delay: 2.2, bounds: LABORATORIO.roofArea, ceiling: 2.65, color: '#c5e9ff', emergency: false },
    greenhouse: { flag: 'synthesizerActive', delay: 3, bounds: greenhouse.walkableAreas[0], ceiling: 2.5, color: '#b5f2b6', emergency: false },
    cafeteria: { flag: 'synthesizerActive', delay: 3.8, bounds: roof('cafeteria'), ceiling: 2.55, color: '#ffbd79', emergency: false }
} as const;

export type PoweredBuilding = keyof typeof COLONY_POWER;
export type ActivationKind = 'edenActive' | 'synthesizerActive';
export const ACTIVATION_DURATION = { edenActive: 4.4, synthesizerActive: 5 } as const;
export const POWER_RAMP = 1;
