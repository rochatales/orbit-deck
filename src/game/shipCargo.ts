import { BACKPACK, EMPTY_CARGO, cargoWeight, type ResourceCargo } from './backpackConfig';
import { MAPS } from './config';
import type { MapId } from './session';

/** Porão da aeronave: 5× a mochila. O que entra aqui fica a salvo da tentativa (morte/reinício). */
export const SHIP_CARGO = { capacityKg: 150, slots: 12, radius: 6 } as const;
export type ResourceKind = keyof ResourceCargo;
export const RESOURCE_KINDS: readonly ResourceKind[] = ['iron', 'copper', 'titanium', 'organic'];
export const RESOURCE_LABEL: Record<ResourceKind, string> = { iron: 'Ferro', copper: 'Cobre', titanium: 'Titânio', organic: 'Matéria orgânica' };

/** Pedido de abrir o porão vindo do mundo 3D (balão da aeronave); o App decide se pode. */
export const OPEN_CARGO_EVENT = 'exoden:abrir-carga';
export const requestShipCargo = () => window.dispatchEvent(new Event(OPEN_CARGO_EVENT));

export const isNearCargo = (map: MapId, p: { x: number; z: number }) =>
  Math.hypot(p.x - MAPS[map].exit.x, p.z - MAPS[map].exit.z) <= SHIP_CARGO.radius;

/** Quantas unidades de `kind` cabem em `cargo` sem passar de `capacityKg`. */
export function roomFor(cargo: ResourceCargo, kind: ResourceKind, capacityKg: number) {
  return Math.max(0, Math.floor((capacityKg - cargoWeight(cargo)) / BACKPACK.itemKg[kind] + 1e-6));
}

/** Move até `amount` (todas, se omitido) de `from` para `to`, respeitando a capacidade de destino. */
export function transfer(from: ResourceCargo, to: ResourceCargo, kind: ResourceKind, capacityKg: number, amount = Infinity) {
  const moved = Math.min(from[kind], amount, roomFor(to, kind, capacityKg));
  if (moved <= 0) return 0;
  from[kind] -= moved; to[kind] += moved;
  return moved;
}

/** Tudo que couber, na ordem fixa da grade (ferro, cobre, titânio, orgânica). */
export function transferAll(from: ResourceCargo, to: ResourceCargo, capacityKg: number) {
  let moved = 0;
  for (const kind of RESOURCE_KINDS) moved += transfer(from, to, kind, capacityKg);
  return moved;
}

/** Pilhas da grade (uma por recurso não vazio), como os slots da referência. */
export function cargoStacks(cargo: ResourceCargo) {
  return RESOURCE_KINDS.filter(kind => cargo[kind] > 0).map(kind => ({ kind, count: cargo[kind], kg: cargo[kind] * BACKPACK.itemKg[kind] }));
}

const KEY = 'exoden-carga-aeronave-v1';
export function loadShipCargo(storage?: Pick<Storage, 'getItem'>): ResourceCargo {
  try {
    const raw = JSON.parse(storage?.getItem(KEY) ?? 'null');
    const cargo = { ...EMPTY_CARGO };
    for (const kind of RESOURCE_KINDS) if (Number.isInteger(raw?.[kind]) && raw[kind] > 0) cargo[kind] = raw[kind];
    return cargoWeight(cargo) <= SHIP_CARGO.capacityKg + 1e-6 ? cargo : { ...EMPTY_CARGO };
  } catch { return { ...EMPTY_CARGO }; }
}
export function saveShipCargo(cargo: ResourceCargo, storage?: Pick<Storage, 'setItem'>) {
  try { storage?.setItem(KEY, JSON.stringify(cargo)); return true; } catch { return false; }
}
