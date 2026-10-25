import type { ResourceDrop } from './simulation';
import { RESOURCE_VISUAL } from './resourceVisual';

/** Uma consulta por item ao nascer. Valores ficam no drop até a coleta; nenhum raycast/consulta por frame. */
export function placeResourceDrop(drop: ResourceDrop, x: number, z: number, kind: ResourceDrop['kind'], surfaceHeight?: (x: number, z: number) => number) {
    drop.x = x; drop.z = z; drop.kind = kind;
    drop.surfaceIron = kind === 'metals' ? surfaceHeight?.(x - RESOURCE_VISUAL.metalOffset, z) ?? 0 : 0;
    drop.surfaceCopper = kind === 'metals' ? surfaceHeight?.(x + RESOURCE_VISUAL.metalOffset, z) ?? 0 : 0;
    drop.surfaceTitanium = kind === 'titanium' ? surfaceHeight?.(x, z) ?? 0 : 0;
    drop.spawned = true; drop.active = true;
}
