import { isExpedition } from '../config';
import { combatRuntime, useCombatStore } from '../../state/useCombatStore';
import { useExpeditionStore } from '../../state/useExpeditionStore';
import { simulationBlocked } from '../simulationGate';

export function useStoredMedicalKit() {
  if (simulationBlocked() || !isExpedition(useExpeditionStore.getState().session.map)) return false;
  const sim = combatRuntime.simulation;
  if (!sim?.useMedicalKit()) return false;
  useCombatStore.getState().publish(sim.snapshot);
  return true;
}
