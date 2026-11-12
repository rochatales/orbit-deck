import { COLONY_BUILDINGS } from '../../game/colonyBuildingsLayout';
import { CONTROL_ROOM } from '../../game/controlRoomLayout';
import { HANGAR } from '../../game/hangarLayout';
import { LABORATORIO } from '../../game/laboratorioLayout';
import { QUARTEL } from '../../game/quartelLayout';
import greenhouse from '../../assets/greenhouse/greenhouse-v001.manifest.json';

const roof = (id: string) => COLONY_BUILDINGS.find(building => building.id === id)!.roofArea;

/** `glow: false` remove toda face emissiva do prédio; nos demais só o interior brilha (ver colonyPower.ts). */
export const COLONY_POWER = {
    'control-room': { flag: 'edenActive', delay: 1.5, bounds: CONTROL_ROOM.roofArea, ceiling: 2.55, initial: 0, glow: true },
    'data-center': { flag: 'edenActive', delay: 2.1, bounds: roof('data-center'), ceiling: 2.55, initial: 1, glow: true },
    'meeting-room': { flag: 'edenActive', delay: 2.7, bounds: roof('meeting-room'), ceiling: 2.55, initial: 0, glow: true },
    barracks: { flag: 'edenActive', delay: 3.3, bounds: QUARTEL.roofArea, ceiling: 2.6, initial: 0, glow: true },
    workshop: { flag: 'edenActive', delay: 3.3, bounds: roof('workshop'), ceiling: 2.55, initial: 1, glow: true },
    hangar: { flag: 'edenActive', delay: 3.3, bounds: HANGAR.walkableAreas[0], ceiling: 3.45, initial: 0.16, glow: false },
    laboratory: { flag: 'synthesizerActive', delay: 2.2, bounds: LABORATORIO.roofArea, ceiling: 2.65, initial: 0, glow: true },
    greenhouse: { flag: 'synthesizerActive', delay: 3, bounds: greenhouse.walkableAreas[0], ceiling: 2.5, initial: 0, glow: true },
    cafeteria: { flag: 'synthesizerActive', delay: 3.8, bounds: roof('cafeteria'), ceiling: 2.55, initial: 0, glow: true }
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
/** Trechos dos cabos do masterplan até as paredes de cada prédio. */
export const SOLAR_CURRENT = {
    y: .12, width: .5, pulses: 3, speed: 1.8, color: '#63f3ff',
    'data-center': { fromX: -14.5, fromZ: -9.3, toX: -14.5, toZ: -5.6 },
    'control-room': { fromX: -14.4, fromZ: -10.5, toX: CONTROL_ROOM.roofArea.minX, toZ: -10.5 }
} as const;
