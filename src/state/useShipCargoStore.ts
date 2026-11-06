import { engineerBriefingRequired } from '../game/campaignPolicy';
import { create } from 'zustand';
import { BACKPACK, EMPTY_CARGO, type ResourceCargo } from '../game/backpackConfig';
import { SHIP_CARGO, loadShipCargo, saveShipCargo, transfer, transferAll, type ResourceKind } from '../game/shipCargo';
import { combatRuntime, useCombatStore } from './useCombatStore';
import { useCampaignStore } from './useCampaignStore';

function developmentStorage() {
  try { return localStorage; } catch { return undefined; }
}
let developmentCargo: ResourceCargo | null = null;
function readCargo(): ResourceCargo {
  const mode = useCampaignStore.getState();
  return mode.mode === 'campaign' ? { ...(mode.saved?.cargo ?? EMPTY_CARGO) } : { ...(developmentCargo ??= loadShipCargo(developmentStorage())) };
}
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
  if (engineerBriefingRequired() || !sim || sim.dead) return 0;
  const ship = { ...get().cargo }, moved = move(sim, ship);
  if (!moved) return 0;
  set({ cargo: ship });
  if (useCampaignStore.getState().mode === 'campaign') useCampaignStore.getState().transferCargo(ship);
  else { developmentCargo = ship; saveShipCargo(ship, developmentStorage()); }
  useCombatStore.getState().publish(sim.snapshot);
  return moved;
}

export const useShipCargoStore = create<ShipCargoState>((set, get) => ({
  cargo: readCargo(),
  deposit: (kind, amount) => withBackpack((backpack, ship) => kind ? transfer(backpack, ship, kind, SHIP_CARGO.capacityKg, amount) : transferAll(backpack, ship, SHIP_CARGO.capacityKg), get, set),
  withdraw: (kind, amount) => withBackpack((backpack, ship) => kind ? transfer(ship, backpack, kind, BACKPACK.capacityKg, amount) : transferAll(ship, backpack, BACKPACK.capacityKg), get, set)
}));

// Troca o porão só na entrada/saída; em campanha não consulta a chave de desenvolvimento.
useCampaignStore.subscribe((state, previous) => {
  if (state.mode !== previous.mode || (state.mode === 'campaign' && state.saved?.cargo !== previous.saved?.cargo))
    useShipCargoStore.setState({ cargo: readCargo() });
});
