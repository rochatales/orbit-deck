import { BACKPACK, EMPTY_CARGO, cargoWeight, type ResourceCargo } from './backpackConfig';
import { MAPS } from './config';
import type { MapId } from './session';
import { ARES_LANDING } from './shanghai/aresLanding';
import { isShanghaiPhase01 } from './shanghai/previewMode';
import { CAMPAIGN_QUOTAS } from './campaign';

/** Porão da aeronave: 5× a mochila. O que entra aqui fica a salvo da tentativa (morte/reinício). */
export const SHIP_CARGO = { capacityKg: 150, slots: 12, radius: 6 } as const;
/** Espaço de emergência para a cota, inclusive em saves antigos com porão cheio. */
export const CAMPAIGN_CARGO_LIMIT = SHIP_CARGO.capacityKg
  + CAMPAIGN_QUOTAS.copper * BACKPACK.itemKg.copper + CAMPAIGN_QUOTAS.organic * BACKPACK.itemKg.organic;
export const shipCapacityLabel = (weight: number) => weight > SHIP_CARGO.capacityKg + 1e-6 ? `${SHIP_CARGO.capacityKg} kg + reserva` : `${SHIP_CARGO.capacityKg} kg`;
export type ResourceKind = keyof ResourceCargo;
export const RESOURCE_KINDS: readonly ResourceKind[] = ['iron', 'copper', 'titanium', 'organic'];
export const RESOURCE_LABEL: Record<ResourceKind, string> = { iron: 'Ferro', copper: 'Cobre', titanium: 'Titânio', organic: 'Matéria orgânica' };

/** Pedido de abrir o porão vindo do mundo 3D (balão da aeronave); o App decide se pode. */
export const OPEN_CARGO_EVENT = 'exoden:abrir-carga';
export const requestShipCargo = () => window.dispatchEvent(new Event(OPEN_CARGO_EVENT));

export const isNearCargo = (map: MapId, p: { x: number; z: number }) =>
  Math.hypot(p.x - MAPS[map].exit.x, p.z - MAPS[map].exit.z) <= SHIP_CARGO.radius;

export const MISSION_DEPOSIT_RADIUS = 1.3;
export const MISSION_DEPOSIT_POINT = isShanghaiPhase01()
  ? { x: ARES_LANDING.position.x + 5.35, z: ARES_LANDING.position.z }
  : { x: MAPS.shanghai.ship.x, z: MAPS.shanghai.ship.z + 3 };
export function isNearMissionDeposit(p: { x: number; z: number }) {
  const point = MISSION_DEPOSIT_POINT;
  return Math.hypot(p.x - point.x, p.z - point.z) <= MISSION_DEPOSIT_RADIUS;
}

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

export function depositIntoShip(backpack: ResourceCargo, ship: ResourceCargo, kind?: ResourceKind, amount = Infinity,
  quotaKind?: ResourceKind | null, quotaRemaining = 0) {
  // Prioriza a cota na transferência. Só a quantidade ainda necessária usa a reserva.
  const quotaMoved = quotaKind && (!kind || kind === quotaKind) && quotaRemaining > 0
    ? transfer(backpack, ship, quotaKind, CAMPAIGN_CARGO_LIMIT, Math.min(quotaRemaining, amount)) : 0;
  return quotaMoved + (kind ? transfer(backpack, ship, kind, SHIP_CARGO.capacityKg, amount - quotaMoved)
    : transferAll(backpack, ship, SHIP_CARGO.capacityKg));
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
