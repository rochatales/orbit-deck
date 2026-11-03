import { create } from 'zustand';
import { BACKPACK, type ResourceCargo } from '../game/backpackConfig';
import { SHIP_CARGO, loadShipCargo, saveShipCargo, transfer, transferAll, type ResourceKind } from '../game/shipCargo';
import { combatRuntime, useCombatStore } from './useCombatStore';

const storage = typeof window !== 'undefined' ? window.localStorage : undefined;
interface ShipCargoState {
  cargo: ResourceCargo;
  /** Mochila → aeronave. Sem `kind`: tudo que couber. */
  deposit: (kind?: ResourceKind, amount?: number) => number;
  /** Aeronave → mochila, só onde há mochila ativa (Shanghai). */
  withdraw: (kind?: ResourceKind, amount?: number) => number;
}

/** A mochila vive na simulação de combate; mexe nela e republica o HUD na hora (jogo pausado). */
function withBackpack(move: (backpack: ResourceCargo, ship: ResourceCargo) => number, get: () => ShipCargoState, set: (s: Partial<ShipCargoState>) => void) {
  const sim = combatRuntime.simulation;
  if (!sim || sim.dead) return 0;
  const ship = { ...get().cargo }, moved = move(sim, ship);
  if (!moved) return 0;
  set({ cargo: ship });
  saveShipCargo(ship, storage);
  useCombatStore.getState().publish(sim.snapshot);
  return moved;
}

export const useShipCargoStore = create<ShipCargoState>((set, get) => ({
  cargo: loadShipCargo(storage),
  deposit: (kind, amount) => withBackpack((backpack, ship) => kind ? transfer(backpack, ship, kind, SHIP_CARGO.capacityKg, amount) : transferAll(backpack, ship, SHIP_CARGO.capacityKg), get, set),
  withdraw: (kind, amount) => withBackpack((backpack, ship) => kind ? transfer(ship, backpack, kind, BACKPACK.capacityKg, amount) : transferAll(ship, backpack, BACKPACK.capacityKg), get, set)
}));
