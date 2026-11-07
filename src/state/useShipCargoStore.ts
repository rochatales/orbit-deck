import { engineerBriefingRequired, expeditionQuotaKind, missionDepositRemaining } from '../game/campaignPolicy';
import { create } from 'zustand';
import { BACKPACK, EMPTY_CARGO, type ResourceCargo } from '../game/backpackConfig';
import { depositIntoShip, isNearMissionDeposit, loadShipCargo, saveShipCargo, transfer, transferAll, type ResourceKind } from '../game/shipCargo';
import { combatRuntime, useCombatStore } from './useCombatStore';
import { useCampaignStore } from './useCampaignStore';
import { useExpeditionStore } from './useExpeditionStore';
import { playerPosition } from './playerTransient';

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
function withBackpack(depositing: boolean, move: (backpack: ResourceCargo, ship: ResourceCargo) => number, get: () => ShipCargoState, set: (s: Partial<ShipCargoState>) => void) {
  const sim = combatRuntime.simulation;
  if (engineerBriefingRequired() || !sim || sim.dead) return 0;
  const { session, panel, ready, quotaAnnounced } = useExpeditionStore.getState();
  if (missionDepositRemaining(session.map) !== null && (!depositing || panel !== 'deposit' || session.phase !== 'walking'
    || !ready || !quotaAnnounced || !isNearMissionDeposit(playerPosition))) return 0;
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
  deposit: (kind, amount) => withBackpack(true, (backpack, ship) => {
    const campaign = useCampaignStore.getState();
    const remaining = missionDepositRemaining(useExpeditionStore.getState().session.map, campaign) ?? 0;
    return depositIntoShip(backpack, ship, kind, amount, expeditionQuotaKind(campaign.saved?.campaign.stage), remaining);
  }, get, set),
  withdraw: (kind, amount) => withBackpack(false, (backpack, ship) => kind ? transfer(ship, backpack, kind, BACKPACK.capacityKg, amount) : transferAll(ship, backpack, BACKPACK.capacityKg), get, set)
}));

// Troca o porão só na entrada/saída; em campanha não consulta a chave de desenvolvimento.
useCampaignStore.subscribe((state, previous) => {
  if (state.mode !== previous.mode || (state.mode === 'campaign' && state.saved?.cargo !== previous.saved?.cargo))
    useShipCargoStore.setState({ cargo: readCargo() });
});
