import { useStoredMedicalKit } from '../../game/props/medicalKitInteraction';
import { useEffect } from 'react';
import { useWeaponStore } from '../../state/useWeaponStore';
import { useExpeditionStore } from '../../state/useExpeditionStore';
import { useCombatStore } from '../../state/useCombatStore';
import { useGameStore } from '../../state/useGameStore';
import type { PlayerWeapon } from '../../combat/melee';

export function canEquipPlayerWeapon(source: 'shortcut' | 'inventory' = 'shortcut') {
  const s = useExpeditionStore.getState();
  return s.ready && s.panel === null && s.session.phase === 'walking'
    && !(s.session.map === 'shanghai' && useCombatStore.getState().dead)
    && (source === 'inventory' || !useGameStore.getState().isPaused);
}
export function equipPlayerWeapon(weapon: PlayerWeapon, source: 'shortcut' | 'inventory' = 'shortcut') {
  if (!canEquipPlayerWeapon(source)) return false;
  useWeaponStore.getState().equip(weapon);
  return true;
}
export function WeaponControls() {
  // Seleção da arma principal pertence à sessão, não ao mapa ou à tentativa.
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.repeat || (event.target instanceof HTMLElement && (event.target.matches('input,textarea,select') || event.target.isContentEditable))) return;
      if (event.code === 'Digit3' || event.code === 'Numpad3') { if (useStoredMedicalKit()) event.preventDefault(); return; }
      if (event.code !== 'Digit1' && event.code !== 'Digit2' && event.code !== 'Numpad1' && event.code !== 'Numpad2') return;
      if (!canEquipPlayerWeapon()) return;
      event.preventDefault(); equipPlayerWeapon(event.code.endsWith('1') ? 'rifle' : 'machete');
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  return null;
}
