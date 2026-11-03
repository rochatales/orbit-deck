/** Valores iniciais do beta para playtest; não representam progressão desbloqueada. */
export const BACKPACK = {
  capacityKg: 30,
  itemKg: { iron: .5, copper: .3, titanium: .4, organic: .2 },
  energy: { max: 2, dashCost: 1, secondsToFull: 5 },
  equipmentSlots: 4
} as const;
export interface ResourceCargo { iron: number; copper: number; titanium: number; organic: number }
export const EMPTY_CARGO: ResourceCargo = { iron: 0, copper: 0, titanium: 0, organic: 0 };
export function cargoWeight(cargo: ResourceCargo): number {
  const w = BACKPACK.itemKg;
  return cargo.iron * w.iron + cargo.copper * w.copper + cargo.titanium * w.titanium + cargo.organic * w.organic;
}
export function resourceDropWeight(kind: 'metals' | 'titanium' | 'organic'): number {
  const w = BACKPACK.itemKg;
  return kind === 'metals' ? w.iron + w.copper : w[kind];
}
export function canCarryDrop(cargo: ResourceCargo, kind: 'metals' | 'titanium' | 'organic'): boolean {
  return cargoWeight(cargo) + resourceDropWeight(kind) <= BACKPACK.capacityKg + 1e-8;
}
export interface BackpackEnergy { value: number }
/** Tempo fixo da simulação: pausa/diálogo não regeneram energia. */
export function recoverBackpackEnergy(energy: BackpackEnergy, dt: number) {
  energy.value = Math.min(BACKPACK.energy.max, energy.value + Math.max(0, dt) * BACKPACK.energy.max / BACKPACK.energy.secondsToFull);
}
export function consumeDashEnergy(energy: BackpackEnergy): boolean {
  if (energy.value + 1e-8 < BACKPACK.energy.dashCost) return false;
  energy.value = Math.max(0, energy.value - BACKPACK.energy.dashCost);
  return true;
}
