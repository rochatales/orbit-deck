import { useEffect } from 'react';
import { useWeaponStore } from '../../state/useWeaponStore';
import { useExpeditionStore } from '../../state/useExpeditionStore';
import { useCombatStore } from '../../state/useCombatStore';
import { simulationBlocked } from '../../game/simulationGate';
import type { PlayerWeapon } from '../../combat/melee';

export function equipPlayerWeapon(weapon: PlayerWeapon) {
  if (useExpeditionStore.getState().session.map !== 'shanghai' || simulationBlocked()) return;
  useWeaponStore.getState().equip(weapon);
}
export function WeaponControls() {
  const map = useExpeditionStore(s => s.session.map), run = useCombatStore(s => s.run);
  useEffect(() => { useWeaponStore.getState().equip('rifle'); }, [map, run]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.repeat || (event.target instanceof HTMLElement && (event.target.matches('input,textarea,select') || event.target.isContentEditable))) return;
      if (event.code !== 'Digit1' && event.code !== 'Digit2' && event.code !== 'Numpad1' && event.code !== 'Numpad2') return;
      if (useExpeditionStore.getState().session.map !== 'shanghai' || simulationBlocked()) return;
      event.preventDefault(); equipPlayerWeapon(event.code.endsWith('1') ? 'rifle' : 'machete');
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  return null;
}
