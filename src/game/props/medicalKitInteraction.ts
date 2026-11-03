import { combatRuntime, useCombatStore } from '../../state/useCombatStore';
import { useExpeditionStore } from '../../state/useExpeditionStore';
import { playerPosition } from '../../state/playerTransient';
import { simulationBlocked } from '../simulationGate';

export function collectMedicalKit() {
  if (simulationBlocked() || useExpeditionStore.getState().session.map !== 'shanghai') return false;
  const sim = combatRuntime.simulation;
  if (!sim?.collectMedicalKit(playerPosition)) return false;
  useCombatStore.getState().publish(sim.snapshot);
  return true;
}
export function useStoredMedicalKit() {
  if (simulationBlocked() || useExpeditionStore.getState().session.map !== 'shanghai') return false;
  const sim = combatRuntime.simulation;
  if (!sim?.useMedicalKit()) return false;
  useCombatStore.getState().publish(sim.snapshot);
  return true;
}
